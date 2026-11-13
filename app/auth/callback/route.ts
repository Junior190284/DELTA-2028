import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureUserProfileExists,
  sanitizeSafeRedirectPath
} from "@/lib/auth/profile-bootstrap";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");
  const safeNext = sanitizeSafeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");

  if (errorParam) {
    console.error("OAuth provider error:", errorParam, errorDesc);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}&message=${encodeURIComponent(errorDesc || errorParam)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", requestUrl.origin));
  }

  let response = NextResponse.redirect(new URL(safeNext, requestUrl.origin));

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
      new URL(`/login?error=oauth_callback&message=${encodeURIComponent(error.message)}`, requestUrl.origin)
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
