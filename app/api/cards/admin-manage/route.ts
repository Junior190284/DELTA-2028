import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 });
    }

    const admin = createAdminClient();
    const body = await req.json();
    const { action } = body;

    // 1. Grant pack(s) to a user or all users
    if (action === "grant_packs") {
      const { target_user_id, pack_type_id, quantity, reason } = body;
      const packQty = Math.max(1, Math.min(50, parseInt(quantity) || 1));

      let userIds: string[] = [];
      if (target_user_id === "all") {
        const { data: allUsers } = await admin.from("profiles").select("id");
        userIds = (allUsers || []).map(u => u.id);
      } else {
        userIds = [target_user_id];
      }

      const rowsToInsert: any[] = [];
      for (const uid of userIds) {
        for (let i = 0; i < packQty; i++) {
          rowsToInsert.push({
            user_id: uid,
            pack_type_id,
            source_reason: reason || "Nagroda od trenera",
            is_opened: false
          });
        }
      }

      const { error } = await admin.from("user_unopened_packs").insert(rowsToInsert);
      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: `Pomyślnie przyznano ${rowsToInsert.length} paczek.` 
      });
    }

    // 2. Delete a single card from user's collection
    if (action === "delete_card") {
      const { user_card_id } = body;
      if (!user_card_id) {
        return NextResponse.json({ error: "Brak user_card_id" }, { status: 400 });
      }

      const { error } = await admin
        .from("user_cards")
        .delete()
        .eq("id", user_card_id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Karta została usunięta z kolekcji." });
    }

    // 3. Clear all cards for a specific user
    if (action === "clear_user_cards") {
      const { target_user_id } = body;
      if (!target_user_id) {
        return NextResponse.json({ error: "Brak target_user_id" }, { status: 400 });
      }

      const { error } = await admin
        .from("user_cards")
        .delete()
        .eq("user_id", target_user_id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Kolekcja użytkownika została wyczyszczona." });
    }

    // 4. Clear all cards for all users (Global reset)
    if (action === "clear_all_cards") {
      const { error } = await admin
        .from("user_cards")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Wszystkie kolekcje zostały zresetowane." });
    }

    // 5. Grant specific card directly to user
    if (action === "grant_card") {
      const { target_user_id, card_id } = body;
      if (!target_user_id || !card_id) {
        return NextResponse.json({ error: "Brak target_user_id lub card_id" }, { status: 400 });
      }

      // Check if user already owns it
      const { data: existing } = await admin
        .from("user_cards")
        .select("id, duplicates_count")
        .eq("user_id", target_user_id)
        .eq("card_id", card_id)
        .maybeSingle();

      if (existing) {
        await admin
          .from("user_cards")
          .update({ duplicates_count: (existing.duplicates_count || 0) + 1 })
          .eq("id", existing.id);
      } else {
        await admin
          .from("user_cards")
          .insert({
            user_id: target_user_id,
            card_id,
            duplicates_count: 0,
            is_favorite: false
          });
      }

      return NextResponse.json({ success: true, message: "Karta została dodana do kolekcji użytkownika." });
    }

    // 6. Fetch cards for a specific user
    if (action === "get_user_cards") {
      const { target_user_id } = body;
      const { data: cards, error } = await admin
        .from("user_cards")
        .select(`
          id,
          card_id,
          acquired_at,
          duplicates_count,
          card_definition:card_definitions(
            id,
            card_name,
            title,
            rarity,
            card_type,
            player:players(id, display_name, shirt_number)
          )
        `)
        .eq("user_id", target_user_id)
        .order("acquired_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ cards: cards || [] });
    }

    return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
  } catch (err: any) {
    console.error("[AdminCardsManage] Error:", err);
    return NextResponse.json({ error: err.message || "Błąd operacji" }, { status: 500 });
  }
}
