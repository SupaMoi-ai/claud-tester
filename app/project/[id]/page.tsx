import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) notFound();

  const { data: pins } = await supabase
    .from("pins")
    .select("id, image_url, pinterest_description, source_url, primary_subject")
    .eq("project_id", project.id)
    .eq("user_id", user.id);

  return (
    <main className="relative z-10 min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <Link
        href="/wall"
        className="text-sm text-ink/50 hover:text-ink/80 transition-colors"
      >
        ← the wall
      </Link>

      <h1 className="font-serif text-4xl mt-8 text-ink leading-tight">
        {project.label}
      </h1>
      {project.explanation && (
        <p className="font-serif text-lg text-ink/65 mt-4 leading-relaxed">
          {project.explanation}
        </p>
      )}

      {project.dominant_palette && project.dominant_palette.length > 0 && (
        <div className="mt-8 flex gap-2 text-xs text-ink/50">
          {project.dominant_palette.map((c: string, i: number) => (
            <span
              key={i}
              className="px-3 py-1 bg-cream rounded-sm border border-ink/5"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {project.tiny_next_step && (
        <div className="mt-10 p-6 soft-card">
          <p className="font-serif text-lg text-ink/85">
            {project.tiny_next_step}
          </p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {(pins ?? []).map((p) => (
          <a
            key={p.id}
            href={p.source_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="pin-card overflow-hidden block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt={p.primary_subject ?? p.pinterest_description ?? ""}
              className="w-full aspect-[3/4] object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </main>
  );
}
