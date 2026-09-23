import { notFound } from "next/navigation";
import { LessonExperience } from "./LessonExperience";
import { getPublishedDay } from "@/lib/content/publishedDay";
import { createResourceRepository } from "@/lib/content/resourceRepository";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

type LessonPageProps = {
  params: Promise<{ courseId: string; chapterId: string; id: string }>;
  searchParams: Promise<{ preview?: string; week?: string }>;
};

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const route = await params;
  const query = await searchParams;
  const result = await getPublishedDay(route.courseId, query.week, route.id);

  if (result.kind === "not-found") notFound();

  const repository = createResourceRepository("supabase");
  const assetIds = [...new Set(result.lesson.blocks.flatMap((block) => block.type === "image" && block.assetId ? [block.assetId] : []))];
  const assets = await createAssetSupabaseRepository(createSupabaseAdminClient).getAssetsByIds(assetIds);
  const assetsById = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
  const supplementaryResources = await repository.listResourcesForScope(
    { dayId: result.lesson.id },
    {
      visibility: query.preview === "1" ? "all" : "student",
      includeDraft: query.preview === "1",
    },
  );

  return <LessonExperience lesson={result.lesson} courseId={route.courseId} preview={query.preview === "1"} week={query.week} supplementaryResources={supplementaryResources} assetsById={assetsById} />;
}
