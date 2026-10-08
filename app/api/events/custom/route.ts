import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    const { data: events, error } = await supabase
      .from("custom_team_events")
      .select("*")
      .eq("is_active", true)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching custom events:", error);
      return NextResponse.json({ events: [] });
    }

    return NextResponse.json({ events: events || [] });
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

    // Require staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
      return NextResponse.json({ error: "Brak uprawnień do tworzenia wydarzeń." }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description = "",
      event_type = "mini_game",
      event_date,
      start_time = "",
      end_time = "",
      location = "Jordanek / Mokotów",
      image_url = null,
      max_participants = null
    } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: "Tytuł i data są wymagane." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("custom_team_events")
      .insert({
        title,
        description,
        event_type,
        event_date,
        start_time,
        end_time,
        location,
        image_url,
        max_participants,
        created_by: user.id
      })
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
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
      return NextResponse.json({ error: "Brak uprawnień do usuwania wydarzeń." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json({ error: "Brak ID wydarzenia." }, { status: 400 });
    }

    const { error } = await supabase
      .from("custom_team_events")
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

