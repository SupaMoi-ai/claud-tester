import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Wall } from "@/components/wall/Wall";
import { layoutPin } from "@/lib/wall/layout";
import type { PinRow, ProjectRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: pinsRaw } = await supabase
    .from("pins")
    .select(
      "id, image_url, source_url, pinterest_description, pinterest_board_name, project_id, position_x, position_y"
    )
    .eq("user_id", user.id)
    .limit(1000);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, label, dominant_palette, status, seed_pin_id")
    .eq("user_id", user.id);

  const pins = (pinsRaw ?? []).map((p, i) => {
    if (p.position_x == null || p.position_y == null) {
      const { x, y } = layoutPin(p.id, i);
      return { ...p, position_x: x, position_y: y };
    }
    return p;
  });

  return (
    <Wall
      pins={pins as Pick<PinRow, "id" | "image_url" | "source_url" | "pinterest_description" | "pinterest_board_name" | "project_id" | "position_x" | "position_y">[]}
      projects={(projects ?? []) as Pick<ProjectRow, "id" | "label" | "dominant_palette" | "status" | "seed_pin_id">[]}
    />
  );
}
