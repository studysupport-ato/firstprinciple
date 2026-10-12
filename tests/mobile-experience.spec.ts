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
  const errors = browserErrors.get(page) ?? [];
  // The embedded lesson deliberately blocks remote KaTeX fonts with its iframe CSP.
  const unexpectedErrors = errors.filter(
    (error) => !/cdnjs\.cloudflare\.com\/ajax\/libs\/KaTeX\/0\.16\.9\/fonts\/KaTeX_(?:Main-Regular|Math-Italic)\.woff2/.test(error),
  );
  expect(unexpectedErrors, "Unexpected browser or network errors").toEqual([]);
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
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  }));

  expect(
    dimensions.scrollHeight,
    `Unexpected vertical overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.clientHeight + 120);
}

test.describe("mobile student experience", () => {
  test("opening Dashboard while signed out prompts for sign-in on desktop and mobile", async ({ page }) => {
    for (const size of [{ width: 1440, height: 900 }, phoneSizes[1]]) {
      await page.setViewportSize(size);
      await page.goto("/courses");

      if (size.width < 768) {
        await page.locator('header button[aria-controls="platform-sidebar"]').click();
      }

      await page.locator('#platform-sidebar a[href="/dashboard"]').click();
      await expect(page).toHaveURL(/\/courses$/);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    }
  });

  test("course library, mobile navigation, and auth forms fit at phone sizes", async ({ page }) => {
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await page.goto("/courses");
      await expect(page.getByRole("heading", { name: /course library/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const brandLogo = page.locator('header a[aria-label="Back2Basics with Kwamina home"] img');
      await expect(brandLogo).toBeVisible();
      await expect(brandLogo).toHaveAttribute("src", "/brand-logo.png");

      const menu = page.locator('header button[aria-controls="platform-sidebar"]');
      await expect(menu).toBeVisible();
      expect((await menu.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await menu.click();
      const drawer = page.locator("#platform-sidebar");
      await expect(drawer).toBeVisible();
      await expect.poll(() => drawer.evaluate((element) => getComputedStyle(element).transitionProperty))
        .toContain("translate");
      await expect.poll(() => drawer.evaluate((element) => getComputedStyle(element).transitionDuration))
        .toContain("0.38s");

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
    const menu = page.locator('header button[aria-controls="platform-sidebar"]');
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    const signIn = page.getByRole("button", { name: "Sign in" });
    await expect(signIn).toBeVisible();
    await signIn.click();

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
    await expect(page.getByTestId("mobile-bottom-navigation")).toBeVisible();
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expect(page.getByRole("heading", { name: "Algebra", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /week 1 real number theory/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.getByRole("link", { name: /week 1 real number theory/i }).click();
    const firstLesson = page.getByRole("link", { name: /real numbers/i }).first();
    await expect(firstLesson).toBeVisible();
    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize(phoneSizes[1]);
    const lessonUrl = new URL((await firstLesson.getAttribute("href"))!, page.url());
    lessonUrl.searchParams.set("preview", "1");
    await page.goto(lessonUrl.toString());
    await expect(page.getByTestId("mobile-bottom-navigation")).toHaveCount(0);

    const board = page.locator("iframe");
    await expect(board).toBeVisible();
    const boardBox = await board.boundingBox();
    expect(boardBox).not.toBeNull();
    expect(boardBox!.width).toBeLessThanOrEqual(phoneSizes[1].width);
    const boardFrame = page.frameLocator("iframe");
    await expect(boardFrame.locator("#lb .lb-vp")).toHaveCSS("touch-action", "none");
    await expect(page.getByRole("button", { name: "Back one board" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show all boards" })).toBeVisible();
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
    await expect(page.getByRole("button", { name: "Show all boards" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Scroll lesson content/ })).toHaveCount(0);
    const progressBeforeNext = await boardProgress();
    await nextBoardButton.click();
    await expect.poll(boardProgress).not.toEqual(progressBeforeNext);
    await expect(page.getByRole("button", { name: "Open lesson notes" })).toHaveCount(0);
    await expect(page.locator(".geogebra-responsive-container")).toHaveCount(0);
    const lessonBlockTypes = await page.getByTestId("lesson-content-block").evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute("data-block-type")),
    );
    const boardIndex = lessonBlockTypes.indexOf("visualizer");
    expect(boardIndex).toBeGreaterThan(0);
    expect(boardIndex).toBeLessThan(lessonBlockTypes.length - 1);
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeEnabled();

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
    await expect(continueButton).toBeEnabled();
    const currentLessonStep = Number(await page.getByTestId("lesson-step-indicator").getAttribute("data-current-step"));
    await continueButton.click();
    await expect.poll(async () => Number(await page.getByTestId("lesson-step-indicator").getAttribute("data-current-step")))
      .toBeGreaterThan(currentLessonStep);
    await expectNoHorizontalOverflow(page);
    await expectNoVerticalOverflow(page);

    for (const size of phoneSizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      await expectNoVerticalOverflow(page);
    }

  });

  test("lesson blocks stay in order and GeoGebra loads only when requested", async ({ page }) => {
    await page.setViewportSize(phoneSizes[1]);
    await page.goto(
      "/courses/math-151/chapter/real-number-theory/lesson/math-151-d618bd6e7053-case-2-inequalities?week=1&preview=1",
    );

    const blocks = page.getByTestId("lesson-content-block");
    const blockTypes = await blocks.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-block-type")),
    );
    const boardIndex = blockTypes.indexOf("visualizer");
    expect(boardIndex).toBeGreaterThan(0);
    expect(boardIndex).toBeLessThan(blockTypes.length - 1);
    await expect(blocks.nth(boardIndex).getByTestId("lesson-board")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next board" })).toBeVisible();
    await expect(blocks.nth(boardIndex - 1)).toHaveAttribute("data-block-type", "markdown");
    await expect(blocks.nth(boardIndex + 1)).toHaveAttribute("data-block-type", "markdown");
    await expect(page.locator(".geogebra-responsive-container")).toHaveCount(0);

    await page.getByRole("button", { name: "Open board full screen" }).click();
    const fullScreenBoard = page.getByRole("dialog");
    await expect(fullScreenBoard).toBeVisible();
    await expect(fullScreenBoard.getByRole("button", { name: "Close full-screen board" })).toBeVisible();
    const boardFrame = page.frameLocator("iframe");
    const hasPicture = await boardFrame.locator("#lb-pic:not([hidden]) .lb-pcnt").count() > 0;
    if (hasPicture) {
      await expect(fullScreenBoard.getByRole("button", { name: "Zoom in on board" })).toHaveCount(0);
      await expect(fullScreenBoard.getByRole("button", { name: "Zoom out on board" })).toHaveCount(0);
      await expect(fullScreenBoard.getByRole("button", { name: "Show all boards" })).toHaveCount(0);
      await expect(boardFrame.locator("#lb-pic")).toHaveClass(/lb-zoom/);
    } else {
      await expect(fullScreenBoard.getByRole("button", { name: "Zoom in on board" })).toBeVisible();
      await expect(fullScreenBoard.getByRole("button", { name: "Zoom out on board" })).toBeVisible();
      await boardFrame.locator("#lb-zi").evaluate((element) => {
        element.addEventListener("click", () => element.setAttribute("data-zoom-action", "received"), { once: true });
      });
      await fullScreenBoard.getByRole("button", { name: "Zoom in on board" }).click();
      await expect(boardFrame.locator("#lb-zi")).toHaveAttribute("data-zoom-action", "received");
      await boardFrame.locator("#lb-zo").evaluate((element) => {
        element.addEventListener("click", () => element.setAttribute("data-zoom-action", "received"), { once: true });
      });
      await fullScreenBoard.getByRole("button", { name: "Zoom out on board" }).click();
      await expect(boardFrame.locator("#lb-zo")).toHaveAttribute("data-zoom-action", "received");
      await boardFrame.locator("#lb-all").evaluate((element) => {
        element.addEventListener("click", () => element.setAttribute("data-all-action", "received"), { once: true });
      });
      await fullScreenBoard.getByRole("button", { name: "Show all boards" }).click();
      await expect(boardFrame.locator("#lb-all")).toHaveAttribute("data-all-action", "received");
    }
    const progressLabel = fullScreenBoard.locator(".tabular-nums");
    await expect(progressLabel).toHaveText(/^\d+ \/ \d+$/);
    if (hasPicture) {
      const pictureProgress = () => boardFrame.locator("#lb-pic .lb-pcnt").innerText();
      const start = await pictureProgress();
      const next = fullScreenBoard.getByRole("button", { name: "Next picture frame" });
      const previous = fullScreenBoard.getByRole("button", { name: "Previous picture frame" });
      if (await next.isEnabled()) {
        await next.click();
        await expect.poll(pictureProgress).not.toBe(start);
      } else if (await previous.isEnabled()) {
        await previous.click();
        await expect.poll(pictureProgress).not.toBe(start);
      }
      const playPicture = fullScreenBoard.getByRole("button", { name: "Play picture automatically" });
      const pausePicture = fullScreenBoard.getByRole("button", { name: "Pause picture playback" });
      if (await pausePicture.count()) await pausePicture.click();
      await playPicture.click();
      await expect(pausePicture).toBeVisible();
      await pausePicture.click();
    } else {
      const boardProgress = () => boardFrame.locator("#lb-prog span i").evaluateAll((segments) =>
        segments.map((segment) => (segment as HTMLElement).style.width),
      );
      const progressBeforeNext = await boardProgress();
      await fullScreenBoard.getByRole("button", { name: "Next board" }).click();
      await expect.poll(boardProgress).not.toEqual(progressBeforeNext);
      if (await fullScreenBoard.getByRole("button", { name: "Back one board" }).isEnabled()) {
        const progressBeforePrevious = await boardProgress();
        await fullScreenBoard.getByRole("button", { name: "Back one board" }).click();
        await expect.poll(boardProgress).not.toEqual(progressBeforePrevious);
      }
      const playButton = fullScreenBoard.getByRole("button", { name: "Play board automatically" });
      await playButton.click();
      await expect(fullScreenBoard.getByRole("button", { name: "Pause board playback" })).toBeVisible();
      await fullScreenBoard.getByRole("button", { name: "Pause board playback" }).click();
      await expect(fullScreenBoard.getByRole("button", { name: "Play board automatically" })).toBeVisible();
    }
    await fullScreenBoard.getByRole("button", { name: "Close full-screen board" }).click();
    await expect(page.getByRole("button", { name: "Open board full screen" })).toBeVisible();
    await expect(boardFrame.locator("#lb-thm")).toContainText("Dark page");
  });

  test("complex-number board stacks its picture on mobile and zooms full screen", async ({ page }) => {
    await page.setViewportSize(phoneSizes[1]);
    await page.goto(
      "/courses/math-151/chapter/real-number-theory/lesson/math-151-59aa80ff0fc4-the-argand-complex-plane?week=2&preview=1",
    );

    const boardFrame = page.frameLocator("iframe");
    await boardFrame.locator(".lb-main.lb-side").waitFor();
    const boardLayout = await boardFrame.locator(".lb-main.lb-side").evaluate((main) => {
      const viewport = main.querySelector<HTMLElement>("#lb-vp")!;
      const picture = main.querySelector<HTMLElement>("#lb-pic")!;
      return {
        viewport: viewport.getBoundingClientRect().toJSON(),
        picture: picture.getBoundingClientRect().toJSON(),
      };
    });
    expect(boardLayout.viewport.width).toBeGreaterThan(200);
    expect(boardLayout.picture.width).toBeGreaterThan(280);
    expect(boardLayout.picture.top).toBeGreaterThan(boardLayout.viewport.top);
    await page.locator(".lesson-guided-content").evaluate((content) => {
      const scroller = content.parentElement!;
      scroller.scrollTop = scroller.scrollHeight;
    });
    const boardNavigationIsClear = await page.evaluate(() => {
      const nextBoard = document.querySelector<HTMLElement>('button[aria-label="Next board"]');
      const chatButton = document.querySelector<HTMLElement>('button[aria-label="Open chat"]');
      if (!nextBoard || !chatButton) return false;
      const nextBounds = nextBoard.getBoundingClientRect();
      const chatBounds = chatButton.getBoundingClientRect();
      return nextBounds.right <= chatBounds.left
        || nextBounds.left >= chatBounds.right
        || nextBounds.bottom <= chatBounds.top
        || nextBounds.top >= chatBounds.bottom;
    });
    expect(boardNavigationIsClear).toBe(true);
    await expect.poll(() => boardFrame.locator(".lb-main.lb-side").evaluate((main) => {
      const picture = main.querySelector<HTMLElement>("#lb-pic")!;
      const mainBounds = main.getBoundingClientRect();
      const pictureBounds = picture.getBoundingClientRect();
      const controls = main.ownerDocument.querySelector<HTMLElement>("#lb .lb-ctl")!;
      const controlsBounds = controls.getBoundingClientRect();
      return main.scrollHeight <= main.clientHeight + 2
        && pictureBounds.bottom <= mainBounds.bottom + 2
        && pictureBounds.bottom <= controlsBounds.top;
    })).toBe(true);
    const embeddedFrameHeight = await page.locator("iframe").evaluate((frame) => frame.getBoundingClientRect().height);
    expect(embeddedFrameHeight).toBeGreaterThan(700);
    expect(embeddedFrameHeight).toBeLessThanOrEqual(1400);

    await boardFrame.getByRole("button", { name: /Zoom in/ }).click();
    const fullScreenBoard = page.getByRole("dialog");
    await expect(fullScreenBoard).toBeVisible();
    await expect(fullScreenBoard.getByRole("button", { name: "Close full-screen board" })).toBeVisible();
    await expect(fullScreenBoard.locator(".tabular-nums")).toHaveText(/^\d+ \/ \d+$/);
    await expect(fullScreenBoard.getByRole("button", { name: "Previous picture frame" })).toBeVisible();
    await expect(fullScreenBoard.getByRole("button", { name: "Next picture frame" })).toBeVisible();
    await expect(boardFrame.locator("#lb-pic")).toHaveClass(/lb-zoom/);

    const fullScreenGeometry = await boardFrame.locator("#lb-pic svg").evaluate((svg) => ({
      width: svg.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
    }));
    expect(fullScreenGeometry.width).toBeGreaterThan(250);
    expect(fullScreenGeometry.width).toBeLessThanOrEqual(fullScreenGeometry.viewportWidth);

    const pictureProgress = () => boardFrame.locator("#lb-pic .lb-pcnt").innerText();
    const initialProgress = await pictureProgress();
    const previousPicture = fullScreenBoard.getByRole("button", { name: "Previous picture frame" });
    const nextPicture = fullScreenBoard.getByRole("button", { name: "Next picture frame" });
    if (await previousPicture.isEnabled()) {
      await previousPicture.click();
      await expect.poll(pictureProgress).not.toBe(initialProgress);
      await nextPicture.click();
      await expect.poll(pictureProgress).toBe(initialProgress);
    } else {
      await nextPicture.click();
      await expect.poll(pictureProgress).not.toBe(initialProgress);
    }

    const pausePicture = fullScreenBoard.getByRole("button", { name: "Pause picture playback" });
    const playPicture = fullScreenBoard.getByRole("button", { name: "Play picture automatically" });
    if (await pausePicture.count()) await pausePicture.click();
    await playPicture.click();
    await expect(pausePicture).toBeVisible();
    await pausePicture.click();
    await fullScreenBoard.getByRole("button", { name: "Close full-screen board" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(boardFrame.locator("#lb-pic")).not.toHaveClass(/lb-zoom/);
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

    await page.getByRole("button", { name: /first year/i }).click();
    const practice = page.locator('a[href*="/practice"]').first();
    await expect(practice).toBeVisible();
    const practiceUrl = new URL((await practice.getAttribute("href"))!, page.url());
    practiceUrl.searchParams.set("preview", "1");

    await page.goto(practiceUrl.toString());
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("#platform-root > main")).toBeVisible();
    await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "[0, 0, 1]" }).click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByText("Great Job!")).toBeVisible();
    await page.getByRole("button", { name: /next question/i }).click();
    await expect(page.getByText("Question 2", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/courses/math-151/chapter/complex-numbers/assessment/math151-complex-numbers-checkpoint?preview=1");
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("#platform-root > main")).toBeVisible();
    const assessmentUnavailable = page.getByRole("heading", { name: "This assessment isn’t ready yet." });
    if (await assessmentUnavailable.isVisible()) {
      await expect(page.getByText(/aren’t enough published questions matching/i)).toBeVisible();
    } else {
      await expect(page.getByText("Assessment question")).toBeVisible();
    }
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
    await expect(page.getByRole("heading", { name: "Algebra", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/courses/math-151/roadmap/week/1");
    const firstLesson = page.getByRole("link", { name: /real numbers/i }).first();
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
    await page.goto("/courses/math-151/chapter/complex-numbers/assessment/math151-complex-numbers-checkpoint?preview=1");
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
