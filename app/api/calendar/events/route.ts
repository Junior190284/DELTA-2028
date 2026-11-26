import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  SmartCalendarItem,
  filterCalendarItemsByPermissions,
  SmartCalendarCategory,
  SmartCalendarVisibility,
  SmartCalendarStatus
} from "@/lib/calendar/smartCalendarTypes";

function sanitizeString(str: string, maxLength = 1000): string {
  if (!str) return "";
  return String(str)
    .trim()
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags against XSS
    .slice(0, maxLength);
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "parent";

    // Sprawdź dzieci rodzica
    const { data: parentLinks } = await supabase
      .from("parent_player_links")
      .select("player_id")
      .eq("parent_id", user.id);

    const childPlayerIds = (parentLinks || []).map(l => l.player_id);

    // Pobierz z team_events
    const { data: rawEvents, error } = await supabase
      .from("team_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalizacja do SmartCalendarItem
    const normalized: SmartCalendarItem[] = (rawEvents || []).map((e: any) => {
      const isOfficial = e.event_type === "training" || e.event_type === "match" || e.visibility === "public";
      return {
        id: e.id,
        title: e.title,
        category: (e.event_type || "info") as SmartCalendarCategory,
        event_date: e.event_date,
        end_date: e.end_date || null,
        start_time: e.start_time ? e.start_time.slice(0, 5) : null,
        end_time: e.end_time ? e.end_time.slice(0, 5) : null,
        is_all_day: Boolean(e.is_all_day),
        location: e.location || null,
        description: e.details || null,
        organizer: isOfficial ? "Sztab Szkoleniowy DELTA" : "Wpis Użytkownika",
        visibility: (e.visibility || "public") as SmartCalendarVisibility,
        status: (e.status || "scheduled") as SmartCalendarStatus,
        is_official: isOfficial,
        is_approved: e.is_approved !== false,
        important: Boolean(e.important),
        player_id: e.player_id || null,
        created_by: e.created_by || null,
        created_at: e.created_at,
      };
    });

    const filtered = filterCalendarItemsByPermissions(normalized, user.id, userRole, childPlayerIds);

    return NextResponse.json({ events: filtered, userRole });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "parent";
    const isStaff = userRole === "admin" || userRole === "coach";

    const body = await req.json();
    const title = sanitizeString(body.title, 120);
    const category = body.category || "other";
    const event_date = body.event_date;
    const end_date = body.end_date || null;
    const start_time = body.start_time || null;
    const end_time = body.end_time || null;
    const is_all_day = Boolean(body.is_all_day);
    const location = sanitizeString(body.location || "", 200);
    const details = sanitizeString(body.description || "", 2000);
    const requestedVisibility = body.visibility || "private";

    if (!title || !event_date) {
      return NextResponse.json({ error: "Tytuł i data rozpoczęcia są wymagane." }, { status: 400 });
    }

    // Walidacja uprawnień: Rodzic nie może utworzyć bezpośrednio zdarzenia 'public'
    let finalVisibility: SmartCalendarVisibility = requestedVisibility;
    if (!isStaff && requestedVisibility === "public") {
      finalVisibility = "team_proposal"; // Auto-degradacja do propozycji dla drużyny
    }

    // Bezpieczny insert
    const insertPayload: any = {
      title,
      event_type: category,
      event_date,
      start_time: is_all_day ? null : start_time,
      end_time: is_all_day ? null : end_time,
      location: location || null,
      details: details || null,
      important: Boolean(body.important && isStaff),
      created_by: user.id,
      player_id: body.player_id || null,
    };

    const { data, error } = await supabase
      .from("team_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "parent";
    const isStaff = userRole === "admin" || userRole === "coach";

    const body = await req.json();
    const eventId = body.id;

    if (!eventId) {
      return NextResponse.json({ error: "Brak ID wydarzenia." }, { status: 400 });
    }

    // Pobierz istniejące wydarzenie
    const { data: existingEvent, error: fetchErr } = await supabase
      .from("team_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchErr || !existingEvent) {
      return NextResponse.json({ error: "Nie znaleziono wydarzenia." }, { status: 404 });
    }

    // Reguła: Rodzic nie może edytować oficjalnych treningów ani meczów
    const isOfficial = existingEvent.event_type === "training" || existingEvent.event_type === "match" || existingEvent.created_by !== user.id;
    if (!isStaff && isOfficial) {
      return NextResponse.json({ error: "Brak uprawnień do edycji oficjalnych wydarzeń klubu." }, { status: 403 });
    }

    const updatePayload: any = {
      title: sanitizeString(body.title, 120) || existingEvent.title,
      event_type: body.category || existingEvent.event_type,
      event_date: body.event_date || existingEvent.event_date,
      start_time: body.is_all_day ? null : (body.start_time ?? existingEvent.start_time),
      end_time: body.is_all_day ? null : (body.end_time ?? existingEvent.end_time),
      location: body.location !== undefined ? sanitizeString(body.location, 200) : existingEvent.location,
      details: body.description !== undefined ? sanitizeString(body.description, 2000) : existingEvent.details,
    };

    const { data, error } = await supabase
      .from("team_events")
      .update(updatePayload)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options))
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isStaff = profile?.role === "admin" || profile?.role === "coach";

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json({ error: "Brak ID wydarzenia." }, { status: 400 });
    }

    const { data: existingEvent, error: fetchErr } = await supabase
      .from("team_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchErr || !existingEvent) {
      return NextResponse.json({ error: "Nie znaleziono wydarzenia." }, { status: 404 });
    }

    // Uprawnienia: Sztab może usunąć dowolne; użytkownik tylko własne
    if (!isStaff && existingEvent.created_by !== user.id) {
      return NextResponse.json({ error: "Brak uprawnień do usunięcia tego wydarzenia." }, { status: 403 });
    }

    const { error } = await supabase
      .from("team_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
