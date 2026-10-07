// app/api/admin/global-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    // 1. Search Players
    const { data: players } = await supabase
      .from('players')
      .select('id, display_name, shirt_number, position, active')
      .ilike('display_name', `%${query}%`)
      .limit(8);

    // 2. Search Matches
    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date, status, home_score, away_score')
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%`)
      .limit(6);

    // 3. Search Events
    const { data: events } = await supabase
      .from('team_events')
      .select('id, title, event_type, event_date, location')
      .ilike('title', `%${query}%`)
      .limit(6);

    const formattedResults = [
      ...(players || []).map(p => ({
        type: 'PLAYER',
        id: p.id,
        title: p.display_name,
        subtitle: `Nr: ${p.shirt_number || '—'} · Poz: ${p.position || '—'} · ${p.active ? 'Aktywny' : 'Nieaktywny'}`,
        link: `/admin?tab=players&playerId=${p.id}`
      })),
      ...(matches || []).map(m => ({
        type: 'MATCH',
        id: m.id,
        title: `${m.home_team} vs ${m.away_team}`,
        subtitle: `Data: ${m.match_date} · Status: ${m.status} ${m.home_score !== null ? `(${m.home_score}:${m.away_score})` : ''}`,
        link: `/admin?tab=matches&matchId=${m.id}`
      })),
      ...(events || []).map(e => ({
        type: 'EVENT',
        id: e.id,
        title: e.title,
        subtitle: `Data: ${e.event_date} · Typ: ${e.event_type} · Miejsce: ${e.location || '—'}`,
        link: `/admin?tab=events&eventId=${e.id}`
      }))
    ];

    return NextResponse.json({
      success: true,
      query,
      results: formattedResults
    });
  } catch (err: any) {
    console.error('Global search error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
