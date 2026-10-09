import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QUIZ_PASS_THRESHOLD_PERCENT, getQuizRewardForLesson, QUIZ_LESSON_REWARDS } from "@/lib/economy/security";

export { QUIZ_PASS_THRESHOLD_PERCENT, getQuizRewardForLesson, QUIZ_LESSON_REWARDS };

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { lessonId, scorePercent, lessonTitle } = body;

    if (!lessonId || typeof scorePercent !== "number") {
      return NextResponse.json({ error: "Nieprawidłowe dane quizu" }, { status: 400 });
    }

    if (scorePercent < QUIZ_PASS_THRESHOLD_PERCENT) {
      return NextResponse.json({
        success: false,
        message: `Wynik poniżej ${QUIZ_PASS_THRESHOLD_PERCENT}%. Spróbuj ponownie, aby odebrać nagrodę!`,
        passed: false,
        pointsAwarded: 0
      });
    }

    // REPLAY PROTECTION: Sprawdzamy, czy użytkownik już odebrał nagrodę za ten quiz
    const { data: existingCompletion, error: compErr } = await supabase
      .from("user_quiz_completions")
      .select("id, points_awarded, completed_at")
      .eq("user_id", user.id)
      .eq("quiz_id", lessonId)
      .maybeSingle();

    if (compErr && compErr.code !== "PGRST116" && compErr.code !== "42P01") {
      console.warn("Sprawdzanie user_quiz_completions ostrzeżenie:", compErr.message);
    }

    if (existingCompletion) {
      return NextResponse.json({
        success: true,
        passed: true,
        lessonId,
        lessonTitle,
        pointsAwarded: 0,
        alreadyClaimed: true,
        message: `Quiz ${lessonTitle || lessonId} został już wcześniej zaliczony. Punkty DELTA przysługują jednorazowo!`
      });
    }

    // Serwerowa nagroda bazowana na istniejącej konfiguracji lekcji (Klient NIE decyduje o wartości nagrody)
    const rewardPoints = getQuizRewardForLesson(lessonId);

    // Pobierz aktualne saldo punktów użytkownika
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points_balance, total_earned")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentBalance = pointsRecord?.points_balance || 0;
    const currentTotal = pointsRecord?.total_earned ?? currentBalance;
    const updatedBalance = currentBalance + rewardPoints;
    const updatedTotal = currentTotal + rewardPoints;

    // 1. Zapis ukończenia quizu w rejestrze
    try {
      await supabase
        .from("user_quiz_completions")
        .insert({
          user_id: user.id,
          quiz_id: lessonId,
          score: scorePercent,
          points_awarded: rewardPoints,
          completed_at: new Date().toISOString()
        });
    } catch (e: any) {
      console.warn("Ostrzeżenie przy zapisie user_quiz_completions:", e?.message);
    }

    // 2. Aktualizacja portfela użytkownika
    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: user.id,
        points_balance: updatedBalance,
        total_earned: updatedTotal,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    // 3. Opcjonalny zapis w ledger transakcji
    try {
      await supabase
        .from("delta_points_transactions")
        .insert({
          user_id: user.id,
          amount: rewardPoints,
          balance_after: updatedBalance,
          transaction_type: "EARN",
          source_type: "QUIZ_COMPLETION",
          source_id: lessonId,
          idempotency_key: `quiz_${user.id}_${lessonId}`,
          metadata: { lessonTitle, scorePercent }
        });
    } catch {
      // Ignorujemy jeśli tabela transakcji nie została jeszcze utworzona na danym środowisku
    }

    return NextResponse.json({
      success: true,
      passed: true,
      lessonId,
      lessonTitle,
      pointsAwarded: rewardPoints,
      newPointsBalance: updatedBalance,
      message: `Gratulacje! Zdobyłeś ${rewardPoints} Punktów DELTA za zdanie quizu: ${lessonTitle || lessonId}!`
    });
  } catch (error: any) {
    console.error("Błąd w API Quiz Kącika Wiedzy:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
