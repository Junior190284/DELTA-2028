// app/api/social/feed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: posts, error } = await supabase
      .from('social_feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch feed posts error:', error);
    }

    const fallbackPosts = posts && posts.length > 0 ? posts : [
      {
        id: 'post_1',
        title: '📢 Oficjalny Komunikat: Treningi na Mokotowie',
        content: 'W najbliższy wtorek i czwartek gramy na pełnym boisku. Prosimy o punktualność na zbiórkach!',
        author_role: 'COACH',
        post_type: 'ANNOUNCEMENT',
        reactions: { applause: 14, fire: 8, ball: 12, heart: 9 },
        created_at: new Date().toISOString()
      },
      {
        id: 'post_2',
        title: '🔥 Ryszard R. zdobył kartę INFERNO PRO!',
        content: 'Pierwsze trafienie legendarnej karty ognia w nowym sezonie jesiennym! Gratulacje!',
        author_role: 'SYSTEM',
        post_type: 'ACHIEVEMENT',
        reactions: { applause: 22, fire: 29, ball: 11, heart: 16 },
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'post_3',
        title: '⭐ Drużyna ukończyła Cel Tygodnia!',
        content: 'Osiągnięto 300 prób w Treningu Celności! Wszyscy zawodnicy mogą odebrać nagrodę +120 XP.',
        author_role: 'SYSTEM',
        post_type: 'GOAL_COMPLETED',
        reactions: { applause: 18, fire: 14, ball: 15, heart: 12 },
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      posts: fallbackPosts
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { postId, reactionType } = body;

    if (!postId || !reactionType) {
      return NextResponse.json({ success: false, error: 'Brak postId lub typu reakcji' }, { status: 400 });
    }

    const { data: post } = await supabase
      .from('social_feed_posts')
      .select('reactions')
      .eq('id', postId)
      .maybeSingle();

    const reactions = post?.reactions || { applause: 0, fire: 0, ball: 0, heart: 0 };
    if (reactions[reactionType] !== undefined) {
      reactions[reactionType] += 1;
    } else {
      reactions[reactionType] = 1;
    }

    await supabase
      .from('social_feed_posts')
      .update({ reactions })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      reactions
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
