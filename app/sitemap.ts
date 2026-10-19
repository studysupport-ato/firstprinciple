import type { MetadataRoute } from "next";
import { getCourses, getChapters } from "@/lib/content/access";

const BASE = "https://www.b2bwithkwamina.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Only include courses that are live (not coming-soon and not explicitly hidden)
  const courses = getCourses().filter((c) => !c.comingSoon && c.status !== "draft");

  const courseEntries: MetadataRoute.Sitemap = courses.flatMap((course) => {
    const chapters = getChapters(course.id);

    const chapterEntries: MetadataRoute.Sitemap = chapters.flatMap((chapter) => [
      {
        url: `${BASE}/courses/${course.id}/chapter/${chapter.id}/practice`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
    ]);

    return [
      {
        url: `${BASE}/courses/${course.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${BASE}/courses/${course.id}/roadmap`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
      {
        url: `${BASE}/courses/${course.id}/course-materials`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      ...chapterEntries,
    ];
  });

  return [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // ── Public marketing / info pages ─────────────────────────────────────
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/course-materials`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/course-materials/general`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    // ── Student course pages (dynamic per course) ─────────────────────────
    {
      url: `${BASE}/courses`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...courseEntries,

    // ── Authenticated student pages (lower priority; require login) ────────
    {
      url: `${BASE}/dashboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE}/progress`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${BASE}/questions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE}/settings`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
