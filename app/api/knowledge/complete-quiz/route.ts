import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  QUIZ_PASS_THRESHOLD_PERCENT,
  QUIZ_LESSON_REWARDS,
  getQuizRewardForLesson
} from "@/lib/economy/security";
import { completeQuizServerSide, serializeEconomyError } from "@/lib/economy/server-rpc";

export { QUIZ_PASS_THRESHOLD_PERCENT, QUIZ_LESSON_REWARDS, getQuizRewardForLesson };

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: "Brak konfiguracji serwisowej.", code: "RPC_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await completeQuizServerSide({
      adminClient,
      userId: user.id,
      lessonId: body?.lessonId,
      scorePercent: body?.scorePercent,
      lessonTitle: body?.lessonTitle
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Błąd w API Quiz Kącika Wiedzy:", error);
    const serialized = serializeEconomyError(error, "Błąd serwera");
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
