// app/api/social/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Safe read-only placeholder
  return NextResponse.json({
    success: true,
    trades: []
  });
}

export async function POST(req: NextRequest) {
  // TRADING SECURITY HARD LOCK:
  // Wymiana kart jest tymczasowo zablokowana do czasu wdrożenia pełnego silnika serwerowego.
  // Żaden użytkownik nie może przekazać, otrzymać ani zmodyfikować kart i punktów DP.
  return NextResponse.json({
    success: false,
    error: "Moduł wymiany kart (Trading) jest obecnie wyłączony ze względów bezpieczeństwa ekonomii do czasu wdrożenia pełnego serwerowego silnika bezpiecznej wymiany.",
    code: "TRADING_FEATURE_LOCKED"
  }, { status: 501 });
}
