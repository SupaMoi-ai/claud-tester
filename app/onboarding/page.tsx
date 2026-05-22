import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./OnboardingFlow";

interface Props {
  searchParams: { step?: string };
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: conn } = await supabase
    .from("pinterest_connections")
    .select("user_id, last_pin_sync_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const initialStep = conn
    ? conn.last_pin_sync_at
      ? 3
      : 2
    : Number(searchParams.step ?? 1);

  return <OnboardingFlow initialStep={initialStep} hasConnection={!!conn} />;
}
