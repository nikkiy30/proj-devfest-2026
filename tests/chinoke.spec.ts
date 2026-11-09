import { expect, test, type Page } from "@playwright/test";

const experience = "/experiences/chinoke";
const start = (page: Page) =>
  page.getByRole("button", { name: "🎙️ 10秒間、吐き出す" });
const demo = (page: Page) =>
  page.getByRole("button", { name: /マイクを使わず、デモを試す/ });

declare global {
  interface Window {
    micStreams: MediaStream[];
    micContexts: AudioContext[];
    allowPendingMic?: () => void;
  }
}

async function instrumentMic(page: Page, pending = false) {
  await page.addInitScript((defer) => {
    window.micStreams = [];
    window.micContexts = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (options) => {
      if (defer)
        await new Promise<void>((resolve) => {
          window.allowPendingMic = resolve;
        });
      const stream = await original(options);
      window.micStreams.push(stream);
      return stream;
    };
    const OriginalContext = window.AudioContext;
    window.AudioContext = class extends OriginalContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.micContexts.push(this);
      }
    };
  }, pending);
}

async function expectMicReleased(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.micStreams.length > 0 &&
          window.micStreams.every((stream) =>
            stream.getTracks().every((track) => track.readyState === "ended"),
          ) &&
          window.micContexts.every((context) => context.state === "closed"),
      ),
    )
    .toBe(true);
}

test("home card opens the independent experience; placeholders are not links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "いまの気持ちに",
  );
  await expect(page.getByText("準備中", { exact: true })).toHaveCount(2);
  await page.getByRole("link", { name: /ちょっと、吐き出したいとき/ }).click();
  await expect(page).toHaveURL(new RegExp(experience));
  await expect(start(page)).toBeVisible();
  await page.getByRole("link", { name: "← 体験を選ぶ" }).click();
  await expect(page).toHaveURL("/");
});

test("demo uses the selected category without a microphone or API request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error("Demo must not use microphone");
    };
  });
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") outgoing.push(request.url());
  });
  await page.goto(experience);
  await page.getByRole("radio", { name: "恋愛", exact: true }).check();
  await demo(page).click();
  const panel = page.getByRole("region", { name: "デモの診断結果" });
  await expect(panel).toContainText("87%");
  await expect(panel).toContainText("恋愛");
  await expect(panel).toBeFocused();
  const link = panel.getByRole("link", { name: /献血について知る/ });
  await expect(link).toHaveAttribute("href", "https://www.jrc.or.jp/donation/");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(outgoing).toEqual([]);
});

test("optional text selects a local reply, stays out of requests and storage, and clears on retry", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    requests.push(request.url() + (request.postData() ?? ""));
  });
  await page.goto(experience);
  await page.getByText("ひとことで書いてみる", { exact: false }).click();
  const input = "大学の課題と単位でモヤモヤ TEST_PRIVATE_INPUT";
  await page.getByRole("textbox", { name: "いまの気持ち" }).fill(input);
  await demo(page).click();
  await expect(
    page.getByRole("region", { name: "デモの診断結果" }),
  ).toContainText("勉強・大学");
  expect(
    requests.some(
      (request) =>
        request.includes("TEST_PRIVATE_INPUT") ||
        request.includes("/api/diagnose"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.getByRole("button", { name: "もう一度、吐き出す" }).click();
  await page.getByText("ひとことで書いてみる", { exact: false }).click();
  await expect(page.getByRole("textbox", { name: "いまの気持ち" })).toHaveValue(
    "",
  );
  await expect(start(page)).toBeFocused();
});

test("permission denial explains recovery and keeps demo available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto(experience);
  await start(page).click();
  await expect(page.getByRole("status")).toContainText("ブラウザの許可が必要");
  await expect(start(page)).toBeVisible();
  await demo(page).click();
  await expect(
    page.getByRole("region", { name: "デモの診断結果" }),
  ).toBeVisible();
});

test("real Web Audio with a fake device completes in ten seconds and releases resources", async ({
  page,
}) => {
  await instrumentMic(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      !request.url().startsWith("http://127.0.0.1:3100/")
    )
      requests.push(request.url());
  });
  await page.goto(experience);
  await start(page).click();
  await expect(page.getByRole("status")).toContainText("音量だけに反応");
  await expect(
    page.getByRole("radio", { name: "恋愛", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "血の気診断 結果" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("status")).toHaveText(
    "10秒の吐き出し、おつかれさま。",
  );
  await expectMicReleased(page);
  expect(requests).toEqual([]);
});

test("early finish produces an honest result and releases the microphone", async ({
  page,
}) => {
  await instrumentMic(page);
  await page.goto(experience);
  await start(page).click();
  await page.getByRole("button", { name: "ここで終わる" }).click();
  await expect(
    page.getByRole("region", { name: "血の気診断 結果" }),
  ).toContainText("途中で終了");
  await expect(page.getByRole("status")).toHaveText(
    "ここまでの吐き出し、おつかれさま。",
  );
  await expectMicReleased(page);
});

test("cancel produces no result and permits another attempt", async ({
  page,
}) => {
  await instrumentMic(page);
  await page.goto(experience);
  await start(page).click();
  await page.getByRole("button", { name: "中止する", exact: true }).click();
  await expectMicReleased(page);
  await expect(
    page.getByRole("region", { name: "血の気診断 結果" }),
  ).toHaveCount(0);
  await expect(start(page)).toBeFocused();
  await start(page).click();
  await expect(
    page.getByRole("button", { name: "ここで終わる" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "中止する", exact: true }).click();
  await expectMicReleased(page);
});

test("a microphone allowed after cancellation is immediately stopped", async ({
  page,
}) => {
  await instrumentMic(page, true);
  await page.goto(experience);
  await start(page).click();
  await page.getByRole("button", { name: "マイクの開始をやめる" }).click();
  await page.evaluate(() => window.allowPendingMic?.());
  await expectMicReleased(page);
  await expect(start(page)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "血の気診断 結果" }),
  ).toHaveCount(0);
});

test("client navigation releases the microphone", async ({ page }) => {
  await instrumentMic(page);
  await page.goto(experience);
  await start(page).click();
  await expect(
    page.getByRole("button", { name: "ここで終わる" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← 体験を選ぶ" }).click();
  await expect(page).toHaveURL("/");
  await expectMicReleased(page);
});

test("hiding the page cancels the session", async ({ page }) => {
  await instrumentMic(page);
  await page.goto(experience);
  await start(page).click();
  await expect(
    page.getByRole("button", { name: "ここで終わる" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expectMicReleased(page);
  await expect(page.getByRole("status")).toContainText("画面を離れたため中止");
});

test("narrow screens and reduced motion remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const url of ["/", experience]) {
    await page.goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await demo(page).click();
  await expect(
    page.getByRole("region", { name: "デモの診断結果" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("health is available and the old AI route is disabled", async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const ai = await request.post("/api/diagnose", {
    data: { text: "must not reach Gemini" },
  });
  expect(ai.status()).toBe(503);
  expect((await ai.json()).code).toBe("AI_DISABLED");
});
