import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureUserProfileExists,
  sanitizeSafeRedirectPath
} from "@/lib/auth/profile-bootstrap";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");
  const errorDesc = request.nextUrl.searchParams.get("error_description");
  const safeNext = sanitizeSafeRedirectPath(request.nextUrl.searchParams.get("next"), "/dashboard");

  if (errorParam) {
    console.error("OAuth provider error:", errorParam, errorDesc);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}&message=${encodeURIComponent(errorDesc || errorParam)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  let response = NextResponse.redirect(new URL(safeNext, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(
      new URL(`/login?error=oauth_callback&message=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // Idempotent, server-side profile bootstrap for brand-new OAuth users (strictly role = 'parent')
  try {
    const verifiedUser = data?.user ?? (await supabase.auth.getUser()).data.user;
    if (verifiedUser?.id) {
      const admin = createAdminClient();
      const bootstrapRes = await ensureUserProfileExists(admin, verifiedUser);
      if (!bootstrapRes.profile && bootstrapRes.error) {
        console.warn("[OAuthCallback] Profile bootstrap deferred:", bootstrapRes.error);
      }
    }
  } catch (bootErr: any) {
    console.warn("[OAuthCallback] Profile bootstrap warning:", bootErr?.message || "unknown");
  }

  return response;
}
