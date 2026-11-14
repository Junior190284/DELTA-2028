import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentProfile();
    if (!user || authError) {
      return NextResponse.json({ success: false, error: "Brak autoryzacji sesji użytkownika" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, playerId, status } = body;

    if (!matchId || !playerId || !status) {
      return NextResponse.json(
        { success: false, error: "Wymagane parametry: matchId, playerId, status" },
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
    const isStaff = profile?.role === "coach" || profile?.role === "admin";

    // Sprawdzenie powiązania rodzic - dziecko w tabeli parent_players
    const { data: parentLink } = await admin
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", user.id)
      .eq("player_id", playerId)
      .maybeSingle();

    const isParentOfChild = Boolean(parentLink);

    // Odrzucenie: użytkownik nie jest ani sztabem ani rodzicem tego zawodnika
    if (!isStaff && !isParentOfChild) {
      return NextResponse.json(
        { success: false, error: "Brak uprawnień: nie jesteś powiązanym opiekunem tego zawodnika" },
        { status: 403 }
      );
    }

    // Odrzucenie: rodzic próbuje zatwierdzić status 'present' lub 'absent' (funkcja wyłącznie dla trenera)
    if (!isStaff && (status === "present" || status === "absent")) {
      return NextResponse.json(
        { success: false, error: "Brak uprawnień: tylko trener może zatwierdzać obecność na meczu" },
        { status: 403 }
      );
    }

    // Bezpieczny zapis przez klienta z uprawnieniami serwerowymi
    const { data, error: dbError } = await admin
      .from("match_attendance")
      .upsert(
        {
          match_id: matchId,
          player_id: playerId,
          status,
          updated_by: user.id
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
