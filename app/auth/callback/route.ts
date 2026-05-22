import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Handles Supabase magic-link callback. Exchange the code, then route
// to /wall (or /onboarding if Pinterest isn't connected yet).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
  }

  // After login, decide where to land.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", url.origin));

  const { data: conn } = await supabase
    .from("pinterest_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const target = next.startsWith("/") && next !== "/" ? next : conn ? "/wall" : "/onboarding";
  return NextResponse.redirect(new URL(target, url.origin));
}
