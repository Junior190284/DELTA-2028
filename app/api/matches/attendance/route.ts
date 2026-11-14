import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentProfile(req);
    if (!user || authError) {
      return NextResponse.json({ success: false, error: "Brak autoryzacji sesji użytkownika" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Nieprawidłowy format treści żądania (wymagany JSON)" }, { status: 400 });
    }

    const { matchId, playerId, status } = body || {};

    if (!matchId || !playerId || !status) {
      return NextResponse.json(
        { success: false, error: "Wymagane parametry: matchId, playerId, status" },
        { status: 400 }
      );
    }

    if (!isValidUuid(matchId) || !isValidUuid(playerId)) {
      return NextResponse.json(
        { success: false, error: "Nieprawidłowy format identyfikatora UUID (matchId lub playerId)" },
        { status: 400 }
      );
    }

    const allowedStatuses = ["yes", "no", "maybe", "present", "absent"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Nieobsługiwany status: ${status}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Sprawdzenie istnienia meczu w bazie
    const { data: match, error: matchErr } = await admin
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .maybeSingle();

    if (matchErr || !match) {
      return NextResponse.json(
        { success: false, error: "Nie znaleziono meczu w bazie danych" },
        { status: 404 }
      );
    }

    // 2. Sprawdzenie istnienia zawodnika w bazie
    const { data: player, error: playerErr } = await admin
      .from("players")
      .select("id")
      .eq("id", playerId)
      .maybeSingle();

    if (playerErr || !player) {
      return NextResponse.json(
        { success: false, error: "Nie znaleziono zawodnika w bazie danych" },
        { status: 404 }
      );
    }

    // 3. Sprawdzenie uprawnień sztabu (admin / coach z uprawnieniami)
    let isStaff = false;
    if (profile?.role === "admin") {
      isStaff = true;
    } else if (profile?.role === "coach") {
      const { data: perm } = await admin
        .from("user_permissions")
        .select("can_manage_matches")
        .eq("user_id", user.id)
        .maybeSingle();

      if (perm) {
        isStaff = Boolean(perm.can_manage_matches);
      } else {
        // Domyślny trener w sztabie DELTA
        isStaff = true;
      }
    }

    // 4. Sprawdzenie powiązania rodzic - dziecko w tabeli parent_players
    const { data: parentLink } = await admin
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", user.id)
      .eq("player_id", playerId)
      .maybeSingle();

    const isParentOfChild = Boolean(parentLink);

    // Odrzucenie: użytkownik nie jest ani uprawnionym sztabem ani rodzicem tego zawodnika
    if (!isStaff && !isParentOfChild) {
      return NextResponse.json(
        { success: false, error: "Brak uprawnień: nie jesteś powiązanym opiekunem tego zawodnika ani uprawnionym sztabem" },
        { status: 403 }
      );
    }

    // Odrzucenie: rodzic próbuje zatwierdzić status 'present' lub 'absent' (funkcja wyłącznie dla trenera)
    if (!isStaff && (status === "present" || status === "absent")) {
      return NextResponse.json(
        { success: false, error: "Brak uprawnień: tylko uprawniony trener może zatwierdzać obecność na meczu" },
        { status: 403 }
      );
    }

    // 5. OCHRONA STATUSU PRESENT / ABSENT:
    // Jeśli obecność została już potwierdzona przez trenera (present / absent), deklaracja rodzica nie może jej nadpisać
    const { data: existing } = await admin
      .from("match_attendance")
      .select("status, updated_by")
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (!isStaff && existing && (existing.status === "present" || existing.status === "absent")) {
      return NextResponse.json(
        {
          success: false,
          error: "Obecność na meczu została już potwierdzona przez trenera. Deklaracja rodzica nie może nadpisać obecności."
        },
        { status: 409 }
      );
    }

    // 6. Bezpieczny zapis przez klienta serwerowego z ignorowaniem sfalszowanego updated_by z żądania
    const { data, error: dbError } = await admin
      .from("match_attendance")
      .upsert(
        {
          match_id: matchId,
          player_id: playerId,
          status,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: "match_id,player_id" }
      )
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Match attendance API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
