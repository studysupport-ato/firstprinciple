import { expect, test, type Page } from "@playwright/test";

const phoneSizes = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText;
    if (failure && failure !== "net::ERR_ABORTED") {
      errors.push(`${request.method()} ${request.url()}: ${failure}`);
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "Unexpected browser or network errors").toEqual([]);
});

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const overflowingElements = Array.from(document.body.querySelectorAll("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${String(element.className).split(" ").filter(Boolean).join(".")}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80),
        };
      })
      .filter(
        (element) =>
          element.left < -1 ||
          element.right > clientWidth + 1 ||
          element.scrollWidth > element.clientWidth + 1,
      )
      .slice(0, 12);

    return {
      clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowingElements,
    };
  });

  expect(
    dimensions.scrollWidth,
    `Unexpected horizontal overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectNoVerticalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(
    dimensions.scrollHeight,
    `Unexpected vertical overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.clientHeight + 2);
}

test.describe("mobile student experience", () => {
  test("course library, mobile navigation, and auth forms fit at phone sizes", async ({ page }) => {
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await page.goto("/courses");
      await expect(page.getByRole("heading", { name: /course library/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const menu = page.getByRole("button", { name: "Open navigation menu" });
      await expect(menu).toBeVisible();
      expect((await menu.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await menu.click();

      const materialsLink = page.getByRole("link", { name: "Course Materials" });
      await expect(materialsLink).toBeVisible();
      expect((await materialsLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await materialsLink.click();
      await expect(page).toHaveURL(/\/course-materials$/);
      await expect(page.getByRole("textbox", { name: "Search course materials" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize(phoneSizes[0]);
    await page.goto("/courses");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("button", { name: "Sign in" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(phoneSizes[0].width);
    await expect(page.getByRole("button", { name: "Close authentication panel" })).toHaveCSS("width", "44px");

    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /terms and conditions/i })).toBeVisible();
    await page.getByRole("button", { name: "Create account" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("course roadmap and a published lesson remain usable across phone sizes", async ({ page }) => {
    await page.setViewportSize(phoneSizes[0]);
    await page.goto("/courses/math-151/roadmap");
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expect(page.getByRole("heading", { name: /algebra roadmap/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /week 1 real number theory/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.getByRole("link", { name: /week 1 real number theory/i }).click();
    const firstLesson = page.getByRole("link", { name: /day 1 real numbers/i });
    await expect(firstLesson).toBeVisible();
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize(phoneSizes[1]);
    const lessonUrl = new URL((await firstLesson.getAttribute("href"))!, page.url());
    lessonUrl.searchParams.set("preview", "1");
    await page.goto(lessonUrl.toString());

    const board = page.locator("iframe");
    await expect(board).toBeVisible();
    const boardBox = await board.boundingBox();
    expect(boardBox).not.toBeNull();
    expect(boardBox!.width).toBeLessThanOrEqual(phoneSizes[1].width);
    const boardFrame = page.frameLocator("iframe");
    await expect(boardFrame.locator("#lb .lb-vp")).toHaveCSS("touch-action", "none");
    const boardScroller = boardFrame.locator("#lb .lb-lines").first();
    await expect(boardScroller).toHaveCSS("overflow-y", "auto");
    const boardScrollMetrics = await boardScroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(boardScrollMetrics.scrollHeight).toBeGreaterThan(boardScrollMetrics.clientHeight);
    await boardScroller.evaluate((element) => {
      element.scrollTop = 0;
      const startTouch = new Touch({ identifier: 1, target: element, clientX: 40, clientY: 220 });
      const endTouch = new Touch({ identifier: 1, target: element, clientX: 40, clientY: 150 });
      element.dispatchEvent(new TouchEvent("touchstart", { touches: [startTouch], changedTouches: [startTouch], bubbles: true, cancelable: true }));
      element.dispatchEvent(new TouchEvent("touchmove", { touches: [endTouch], changedTouches: [endTouch], bubbles: true, cancelable: true }));
      element.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [endTouch], bubbles: true, cancelable: true }));
    });
    await expect.poll(() => boardScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const boardProgress = () => boardFrame.locator("#lb-prog span i").evaluateAll((segments) => segments.map((segment) => (segment as HTMLElement).style.width));
    const nextBoardButton = page.getByRole("button", { name: "Next board" });
    await expect(nextBoardButton).toBeVisible();
    await expect(page.getByRole("button", { name: "Back one board" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Play board|Pause board playback|Replay board/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Scroll lesson content/ })).toHaveCount(0);
    const progressBeforeNext = await boardProgress();
    await nextBoardButton.click();
    await expect.poll(boardProgress).not.toEqual(progressBeforeNext);
    await expect(page.getByRole("button", { name: "Open lesson notes" })).toBeVisible();
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeDisabled();

    const finalQuiz = boardFrame.locator("#lb .lb-quiz:visible");
    for (let attempt = 0; attempt < 20 && !(await finalQuiz.count()); attempt++) {
      const progressBeforeAdvance = await boardProgress();
      await nextBoardButton.click();
      await expect.poll(boardProgress).not.toEqual(progressBeforeAdvance);
    }
    await expect(finalQuiz).toBeVisible();
    const wrongAnswer = finalQuiz.locator(".lb-opt").filter({ hasNotText: /Integers/i }).first();
    await wrongAnswer.click();
    await expect(wrongAnswer).toHaveClass(/lb-no/);
    await expect(continueButton).toBeDisabled();

    await finalQuiz.getByRole("button", { name: /Integers/i }).click();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expectNoHorizontalOverflow(page);
    await expectNoVerticalOverflow(page);

    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      await expectNoVerticalOverflow(page);
    }
  });

  test("questions, practice, assessment, and protected settings fit on mobile", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(phoneSizes[1]);
    await page.goto("/course-materials");
    await expect(page.getByRole("textbox", { name: "Search course materials" })).toBeVisible();
    await page.getByRole("textbox", { name: "Search course materials" }).fill("Engineering");
    await expectNoHorizontalOverflow(page);

    await page.goto("/questions?preview=1");
    await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const practice = page.getByRole("link", { name: /start practice/i });
    await expect(practice).toBeVisible();
    const practiceUrl = new URL((await practice.getAttribute("href"))!, page.url());
    practiceUrl.searchParams.set("preview", "1");
    const assessment = page.locator('a[href*="/assessment/"]').first();
    await expect(assessment).toBeVisible();
    const assessmentUrl = new URL((await assessment.getAttribute("href"))!, page.url());
    assessmentUrl.searchParams.set("preview", "1");

    await page.goto(practiceUrl.toString());
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("#platform-root > main")).toBeVisible();
    await expect(page.getByText("Practice question")).toBeVisible();
    await page.locator("main button").filter({ hasText: /Quadrant/ }).first().click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByText(/^(Correct|Feedback)$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /next question|finish session/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(assessmentUrl.toString());
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("#platform-root > main")).toBeVisible();
    await expect(page.getByText("Assessment question")).toBeVisible();
    await page.locator("#platform-root > main main button").first().click();

    const questionNavigation = page.locator("main button").filter({ hasText: /^\d+$/ });
    expect(await questionNavigation.count()).toBeGreaterThan(1);
    expect((await questionNavigation.first().boundingBox())?.width).toBeGreaterThanOrEqual(44);
    await questionNavigation.nth(1).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await questionNavigation.last().click();
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByRole("button", { name: "Confirm submit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Confirm submit" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("desktop regression", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test("course, roadmap, and lesson retain desktop sizing", async ({ page }) => {
    await page.goto("/courses");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("complementary")).toBeVisible();

    await page.goto("/courses/math-151/roadmap");
    await expect(page.getByRole("heading", { name: /algebra roadmap/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/courses/math-151/roadmap/week/1");
    const firstLesson = page.getByRole("link", { name: /day 1 real numbers/i });
    const lessonUrl = new URL((await firstLesson.getAttribute("href"))!, page.url());
    lessonUrl.searchParams.set("preview", "1");
    await page.goto(lessonUrl.toString());
    await expect(page.locator("iframe")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoVerticalOverflow(page);

    await page.goto("/course-materials");
    await expect(page.getByRole("textbox", { name: "Search course materials" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/questions?preview=1");
    await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const assessment = page.locator('a[href*="/assessment/"]').first();
    const assessmentUrl = new URL((await assessment.getAttribute("href"))!, page.url());
    assessmentUrl.searchParams.set("preview", "1");
    await page.goto(assessmentUrl.toString());
    await expect(page.locator("#platform-root > main")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
