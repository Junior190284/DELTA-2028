import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_PERMISSIONS, UserPermissions } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // Verify current user role
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", user.id)
      .single();

    const isAdmin = currentProfile?.role === "admin";
    const isCoach = currentProfile?.role === "coach";

    if (!isAdmin && !isCoach) {
      return NextResponse.json({ error: "Brak uprawnień administratora lub trenera" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const body = await req.json();
    const { action } = body;

    // 1. UPDATE PERMISSIONS (Single key or full object)
    if (action === "update_permission") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Tylko administrator może zarządzać uprawnieniami" }, { status: 403 });
      }

      const { user_id, permissions: userPerms } = body;
      if (!user_id || !userPerms) {
        return NextResponse.json({ error: "Brakujące parametry" }, { status: 400 });
      }

      const payload = {
        user_id,
        role_label: userPerms.role_label || "Rodzic",
        can_manage_matches: Boolean(userPerms.can_manage_matches),
        can_edit_match_events: Boolean(userPerms.can_edit_match_events),
        can_manage_training: Boolean(userPerms.can_manage_training),
        can_manage_training_attendance: Boolean(userPerms.can_manage_training_attendance),
        can_manage_calendar: Boolean(userPerms.can_manage_calendar),
        can_manage_news: Boolean(userPerms.can_manage_news),
        can_manage_players: Boolean(userPerms.can_manage_players),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await adminClient
        .from("user_permissions")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        console.error("Błąd zapisu uprawnień:", error);
        if (error.message?.includes("user_permissions") || error.message?.includes("schema cache")) {
          return NextResponse.json({ 
            error: "Brakuje tabeli uprawnień w bazie Supabase. Uruchom plik 'supabase/v7_permissions_megapack.sql' w Supabase SQL Editor." 
          }, { status: 500 });
        }
        return NextResponse.json({ error: `Błąd bazy danych: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, permissions: data });
    }

    // 2. SET ASSISTANT PRESET
    if (action === "set_preset") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Tylko administrator może zmieniać pakiety uprawnień" }, { status: 403 });
      }

      const { user_id, enable } = body;
      if (!user_id) {
        return NextResponse.json({ error: "Brak ID użytkownika" }, { status: 400 });
      }

      const payload = {
        user_id,
        role_label: enable ? "Pomocnik strony" : "Rodzic",
        can_manage_matches: false,
        can_edit_match_events: false,
        can_manage_training: false,
        can_manage_training_attendance: false,
        can_manage_calendar: Boolean(enable),
        can_manage_news: Boolean(enable),
        can_manage_players: false,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await adminClient
        .from("user_permissions")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        console.error("Błąd zapisu pakietu:", error);
        if (error.message?.includes("user_permissions") || error.message?.includes("schema cache")) {
          return NextResponse.json({ 
            error: "Brakuje tabeli uprawnień w bazie Supabase. Uruchom plik 'supabase/v7_permissions_megapack.sql' w Supabase SQL Editor." 
          }, { status: 500 });
        }
        return NextResponse.json({ error: `Błąd zapisu: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, permissions: data });
    }

    // 3. ADD PARENT LINK (Link parent account to player)
    if (action === "add_parent_link") {
      const { parent_id, player_id } = body;
      if (!parent_id || !player_id) {
        return NextResponse.json({ error: "Wymagane ID rodzica i zawodnika" }, { status: 400 });
      }

      const { error } = await adminClient
        .from("parent_players")
        .upsert({ parent_id, player_id }, { onConflict: "parent_id,player_id" });

      if (error) {
        console.error("Błąd przypisywania zawodnika:", error);
        return NextResponse.json({ error: `Błąd przypisania: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, parent_id, player_id });
    }

    // 4. REMOVE PARENT LINK
    if (action === "remove_parent_link") {
      const { parent_id, player_id } = body;
      if (!parent_id || !player_id) {
        return NextResponse.json({ error: "Wymagane ID rodzica i zawodnika" }, { status: 400 });
      }

      const { error } = await adminClient
        .from("parent_players")
        .delete()
        .eq("parent_id", parent_id)
        .eq("player_id", player_id);

      if (error) {
        console.error("Błąd usuwania powiązania:", error);
        return NextResponse.json({ error: `Błąd usunięcia: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, parent_id, player_id });
    }

    // 5. CHANGE SYSTEM ROLE (admin, coach, parent)
    if (action === "change_system_role") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Tylko administrator może zmieniać role systemowe" }, { status: 403 });
      }

      const { target_user_id, new_role } = body;
      if (!target_user_id || !["parent", "coach", "admin"].includes(new_role)) {
        return NextResponse.json({ error: "Nieprawidłowa rola lub brak użytkownika" }, { status: 400 });
      }

      const { error } = await adminClient
        .from("profiles")
        .update({ role: new_role })
        .eq("id", target_user_id);

      if (error) {
        console.error("Błąd zmiany roli systemowej:", error);
        return NextResponse.json({ error: `Błąd zmiany roli: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, user_id: target_user_id, new_role });
    }

    return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
  } catch (err: any) {
    console.error("Błąd w API uprawnień administratora:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
