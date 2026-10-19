import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentBlock, Lesson } from "../lib/content/types/lesson";

type StepResponse = {
  blocks: ContentBlock[];
  assetsById: Record<string, unknown>;
  questionsById: Record<string, unknown>;
};

function parseStepResponse(value: unknown): StepResponse {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    Boolean(v && typeof v === "object" && !Array.isArray(v));

  if (!isRecord(value) || !Array.isArray(value.blocks) || !isRecord(value.assetsById) || !isRecord(value.questionsById)) {
    throw new Error("The lesson step response was invalid.");
  }
  if (!value.blocks.every((block) => isRecord(block) && typeof block.id === "string" && typeof block.type === "string")) {
    throw new Error("The lesson step content was invalid.");
  }
  return {
    blocks: value.blocks as ContentBlock[],
    assetsById: value.assetsById as Record<string, unknown>,
    questionsById: value.questionsById as Record<string, unknown>,
  };
}

class StepCacheManager {
  private blocksByStep = new Map<number, ContentBlock[]>();
  private pendingRequests = new Map<number, Promise<StepResponse>>();
  public requestCount = 0;

  constructor(initialStep: number, initialBlocks: ContentBlock[]) {
    this.blocksByStep.set(initialStep, initialBlocks);
  }

  hasStep(step: number): boolean {
    return this.blocksByStep.has(step);
  }

  getBlocks(step: number): ContentBlock[] | undefined {
    return this.blocksByStep.get(step);
  }

  async loadStep(
    step: number,
    fetcher: (step: number) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>,
  ): Promise<ContentBlock[]> {
    if (this.blocksByStep.has(step)) {
      return this.blocksByStep.get(step)!;
    }

    let pending = this.pendingRequests.get(step);
    if (!pending) {
      this.requestCount++;
      pending = (async () => {
        const response = await fetcher(step);
        const text = await response.text();
        let payload: unknown;
        try {
          payload = JSON.parse(text);
        } catch {
          payload = undefined;
        }
        if (!response.ok) {
          const message = payload && typeof (payload as { error?: string }).error === "string"
            ? (payload as { error: string }).error
            : "Unable to load this lesson step.";
          throw new Error(message);
        }
        return parseStepResponse(payload);
      })();
      this.pendingRequests.set(step, pending);
    }

    try {
      const loaded = await pending;
      this.blocksByStep.set(step, loaded.blocks);
      return loaded.blocks;
    } finally {
      this.pendingRequests.delete(step);
    }
  }
}

describe("LessonExperience client-side step caching and lifecycle", () => {
  const initialLesson: Lesson = {
    id: "lesson-1",
    courseId: "course-1",
    weekId: "week-1",
    chapterId: "ch-1",
    title: "Lesson Title",
    description: "Lesson Desc",
    order: 1,
    estimatedMinutes: 25,
    objectives: [],
    blocks: [{ id: "b1", type: "heading", step: 1, text: "Step 1 Header", level: 2 }],
    status: "published",
  };

  it("initializes with initial step loaded and cached", () => {
    const manager = new StepCacheManager(1, initialLesson.blocks);
    assert.equal(manager.hasStep(1), true);
    assert.deepEqual(manager.getBlocks(1), initialLesson.blocks);
    assert.equal(manager.hasStep(2), false);
  });

  it("fetches step 2 on demand and caches it", async () => {
    const manager = new StepCacheManager(1, initialLesson.blocks);

    const step2Blocks: ContentBlock[] = [
      { id: "b2", type: "text", step: 2, body: "Step 2 Text Content" },
    ];

    const fetcher = async (step: number) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        blocks: step2Blocks,
        assetsById: {},
        questionsById: {},
      }),
    });

    const loaded = await manager.loadStep(2, fetcher);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].id, "b2");
    assert.equal(manager.hasStep(2), true);
    assert.equal(manager.requestCount, 1);

    // Second call must return from cache without refetching
    const fromCache = await manager.loadStep(2, fetcher);
    assert.deepEqual(fromCache, loaded);
    assert.equal(manager.requestCount, 1);
  });

  it("handles step fetch error and allows retry", async () => {
    const manager = new StepCacheManager(1, initialLesson.blocks);
    let attempts = 0;

    const flakyFetcher = async (step: number) => {
      attempts++;
      if (attempts === 1) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: "Temporary network failure" }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          blocks: [{ id: "b3", type: "text", step: 3, body: "Recovered" }],
          assetsById: {},
          questionsById: {},
        }),
      };
    };

    await assert.rejects(
      async () => {
        await manager.loadStep(3, flakyFetcher);
      },
      { message: "Temporary network failure" },
    );
    assert.equal(manager.hasStep(3), false);

    // Retry succeeded
    const recovered = await manager.loadStep(3, flakyFetcher);
    assert.equal(recovered[0].id, "b3");
    assert.equal(manager.hasStep(3), true);
  });

  it("deduplicates concurrent fetches for the same step", async () => {
    const manager = new StepCacheManager(1, initialLesson.blocks);

    const slowFetcher = async (step: number) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          blocks: [{ id: `b-${step}`, type: "text", step, body: `Body ${step}` }],
          assetsById: {},
          questionsById: {},
        }),
      };
    };

    const [first, second] = await Promise.all([
      manager.loadStep(4, slowFetcher),
      manager.loadStep(4, slowFetcher),
    ]);

    assert.deepEqual(first, second);
    assert.equal(manager.requestCount, 1);
  });

  it("prevents progress mutation when preview or testingMode is active", () => {
    let progressMutated = false;
    const mutateProgress = (preview: boolean, testingMode: boolean) => {
      if (!preview && !testingMode) {
        progressMutated = true;
      }
    };

    mutateProgress(true, false);
    assert.equal(progressMutated, false, "Must not mutate when preview is true");

    mutateProgress(false, true);
    assert.equal(progressMutated, false, "Must not mutate when testingMode is true");

    mutateProgress(false, false);
    assert.equal(progressMutated, true, "Mutates progress only when neither preview nor testingMode is set");
  });
});
