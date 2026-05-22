import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { providerMode } from "@/lib/providers";

// Starts Pinterest OAuth. In mock mode, skip Pinterest entirely and seed
// a connection row directly so the rest of the flow runs.
export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (providerMode() === "mock") {
    const svc = createSupabaseServiceClient();
    await svc.from("pinterest_connections").upsert({
      user_id: user.id,
      pinterest_user_id: "mock-user",
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    });
    return NextResponse.redirect(new URL("/onboarding?step=2", req.url));
  }

  const clientId = process.env.PINTEREST_CLIENT_ID;
  const redirectUri =
    process.env.PINTEREST_REDIRECT_URI ??
    new URL("/api/auth/pinterest/callback", req.url).toString();
  if (!clientId) {
    return NextResponse.json({ error: "missing PINTEREST_CLIENT_ID" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "boards:read,pins:read,user_accounts:read",
    state: user.id,
  });

  return NextResponse.redirect(`https://www.pinterest.com/oauth/?${params}`);
}
