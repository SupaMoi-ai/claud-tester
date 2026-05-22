import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { pinterest } from "@/lib/providers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", url.origin));
  if (!code || state !== user.id) {
    return NextResponse.redirect(new URL("/onboarding?error=oauth", url.origin));
  }

  const redirectUri =
    process.env.PINTEREST_REDIRECT_URI ??
    new URL("/api/auth/pinterest/callback", url.origin).toString();

  try {
    const tokens = await pinterest().exchangeCode(code, redirectUri);
    const svc = createSupabaseServiceClient();
    await svc.from("pinterest_connections").upsert({
      user_id: user.id,
      pinterest_user_id: tokens.pinterest_user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_at ?? null,
    });
  } catch {
    return NextResponse.redirect(new URL("/onboarding?error=oauth", url.origin));
  }

  return NextResponse.redirect(new URL("/onboarding?step=2", url.origin));
}
