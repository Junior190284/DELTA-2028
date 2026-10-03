import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie", guest: true }, { status: 401 });
    }

    const { lessonId, scorePercent, pointsAwarded, lessonTitle } = await req.json();

    if (!lessonId || typeof scorePercent !== "number") {
      return NextResponse.json({ error: "Nieprawidłowe dane quizu" }, { status: 400 });
    }

    if (scorePercent < 75) {
      return NextResponse.json({
        success: false,
        message: "Wynik poniżej 75%. Spróbuj ponownie, aby odebrać nagrodę!",
        passed: false
      });
    }

    const amount = Number(pointsAwarded) || 50;

    // Pobierz aktualne saldo punktów użytkownika
    const { data: pointsRecord } = await supabase
      .from("user_delta_points")
      .select("points")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPoints = pointsRecord?.points || 0;
    const updatedPoints = currentPoints + amount;

    await supabase
      .from("user_delta_points")
      .upsert({
        user_id: user.id,
        points: updatedPoints,
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      passed: true,
      lessonId,
      lessonTitle,
      pointsAwarded: amount,
      newPointsBalance: updatedPoints,
      message: `Gratulacje! Zdobyłeś ${amount} Punktów DELTA za zdanie quizu: ${lessonTitle || lessonId}!`
    });
  } catch (error: any) {
    console.error("Błąd w API Quiz Kącika Wiedzy:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera" }, { status: 500 });
  }
}
