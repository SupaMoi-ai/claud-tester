import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Landing } from "./_landing/Landing";

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Logged in but no Pinterest connection → onboarding.
    // Logged in and connected → wall.
    const { data: conn } = await supabase
      .from("pinterest_connections")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(conn ? "/wall" : "/onboarding");
  }

  return <Landing />;
}
