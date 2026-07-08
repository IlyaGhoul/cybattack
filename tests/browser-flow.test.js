const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const test = require("node:test");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const pnpmRoot = path.join(
      os.homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      ".pnpm",
    );
    const packageDir = fs.readdirSync(pnpmRoot).find((name) => /^playwright@/.test(name));

    if (!packageDir) {
      throw error;
    }

    return require(path.join(pnpmRoot, packageDir, "node_modules", "playwright"));
  }
}

const { chromium } = loadPlaywright();

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function withPage(callback) {
  const browser = await chromium.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).toString();
    await page.goto(fileUrl);
    await callback(page);
  } finally {
    await browser.close();
  }
}

test("home screen does not show progress controls", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    assert.equal(await page.locator('[data-action="clear-history"]').count(), 0);
  });
});

test("user can select Russian and run a SUSU Russian exam", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-subject="russian"]');
    await page.click('[data-mode="exam"]');
    await page.click('[data-start-exam="susu"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 20);
    await assert.match(await page.locator('[data-testid="timer"]').innerText(), /30:00/);
    await assert.match(await page.locator(".toolbar h2").innerText(), /Экзамен ЮУрГУ/);
  });
});

test("user can select Russian and run the standalone spelling test", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-subject="russian"]');
    await page.click('[data-special-test="russian-spelling-forms"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 60);
    await assert.match(await page.locator(".toolbar h2").innerText(), /Слитное, раздельное и дефисное написание/);
    await assert.match(await page.locator(".question-card").first().innerText(), /диван-кровать/);
  });
});

test("user can select Programming and run a UrFU programming exam", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-subject="programming"]');
    await page.click('[data-mode="exam"]');
    await page.click('[data-start-exam="urfu"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 30);
    await assert.match(await page.locator('[data-testid="timer"]').innerText(), /90:00/);
    await assert.match(await page.locator(".toolbar h2").innerText(), /Экзамен УрФУ/);
  });
});

test("user can select Programming and run the standalone SUSU programming test", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-subject="programming"]');
    await page.click('[data-special-test="susu-programming-full-coverage"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 96);
    await assert.match(await page.locator(".toolbar h2").innerText(), /ЮУрГУ: Основы программирования/);
    await assert.match(await page.locator(".question-card").first().innerText(), /Что такое алгоритм/);
  });
});

test("user can run a generated SUSU exam with timer and result actions", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    assert.equal(await page.locator('[data-mode="exam"]').count(), 1);
    assert.equal(await page.locator('[data-mode="topic"]').count(), 1);

    await page.click('[data-mode="exam"]');
    await page.click('[data-start-exam="susu"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 20);
    await assert.match(await page.locator('[data-testid="timer"]').innerText(), /20:00/);

    await page.locator('.question-card input[type="radio"]').first().check();
    await page.click('[data-testid="submit-quiz"]');

    await page.waitForSelector('[data-testid="result-panel"]');
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await assert.match(await page.locator('[data-testid="score"]').innerText(), /из 20/);
    assert.equal(await page.locator('[data-action="new-attempt"]').count(), 1);
    assert.equal(await page.locator('[data-action="repeat-mistakes"]').count(), 1);
  });
});

test("user can run topic training and return to mode selection", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-mode="topic"]');
    await page.waitForSelector('[data-testid="topic-setup"]');

    await page.selectOption('[data-testid="topic-university"]', "urfu");
    await page.selectOption('[data-testid="topic-select"]', "security");
    await page.click('[data-testid="start-topic"]');

    await page.waitForSelector('[data-testid="quiz-form"]');
    assert.equal(await page.locator(".question-card").count(), 10);

    await page.click('[data-testid="submit-quiz"]');
    await page.waitForSelector('[data-testid="result-panel"]');
    await assert.match(await page.locator('[data-testid="topic-summary"]').innerText(), /Информационная безопасность/);

    assert.equal(await page.locator('[data-action="choose-topic"]').count(), 1);
    await page.click('[data-action="choose-topic"]');
    await page.waitForSelector('[data-testid="topic-setup"]');
    assert.equal(await page.locator('[data-testid="topic-university"]').inputValue(), "urfu");
    assert.equal(await page.locator('[data-testid="topic-select"]').inputValue(), "security");

    await page.click('[data-action="reset"]');
    await page.waitForSelector('[data-testid="mode-selector"]');
  });
});
