import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
    const isLoopback = host.startsWith("localhost") || host.startsWith("127.0.0.1");

    if (isVercel || !isLoopback) {
      return NextResponse.json(
        { success: false, error: "Dev login is restricted to local development only." },
        { status: 403 }
      );
    }

    const { role = "admin" } = await req.json().catch(() => ({ role: "admin" }));
    const cookieStore = await cookies();

    // Set dev user cookie for localhost testing (1 day expiry)
    cookieStore.set("delta_dev_user", role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
