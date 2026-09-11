import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000";
const ARTIFACTS = "e2e-artifacts";

fs.mkdirSync(ARTIFACTS, { recursive: true });

const email = `e2e-${Date.now()}@e2e.dev`;
const password = "password123";
const results = [];

function check(name, condition) {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures += 1;
}

let failures = 0;

const db = (sql) =>
  execSync(`docker exec ghostgatevpn-postgres-1 psql -U vpn_user -d vpn_service -t -c "${sql}"`, {
    encoding: "utf8",
  }).trim();

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("dialog", (dialog) => dialog.accept());
page.on("response", async (response) => {
  if (response.url().includes("/subscriptions/purchase") && response.request().method() === "POST") {
    console.log(`[debug] purchase → ${response.status()} ${await response.text()}`);
  }
});

const mockAwg = spawn(process.execPath, ["mock-awg.mjs"], { stdio: "ignore" });
await new Promise((resolve, reject) => {
  mockAwg.once("error", reject);
  setTimeout(resolve, 500);
});
try {
  execSync("docker compose up -d backend", {
    cwd: "..",
    env: { ...process.env, AWG_API_BASE_URL: "http://host.docker.internal:8080" },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      execSync("curl -sf http://localhost:8000/health", { stdio: "ignore" });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
} catch (err) {
  console.error("mock awg / backend restart failed:", err.message);
  mockAwg.kill();
  process.exit(1);
}

try {
  await page.goto(`${BASE}/register`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL(`${BASE}/app`, { timeout: 15000 });
  check("регистрация → редирект на /app", page.url().endsWith("/app"));

  await page.getByRole("link", { name: "Аккаунт" }).click();
  await page.waitForURL(`${BASE}/app/account`);
  await page.getByText("Trial", { exact: true }).waitFor({ timeout: 10000 });
  check("страница аккаунта: trial-подписка видна", true);
  await page.getByText("0 ₽").first().waitFor({ timeout: 10000 });
  check("баланс 0 ₽ до пополнения", true);

  const monthCard = page.locator(".panel.flex", { hasText: "175 ₽" });
  await monthCard.getByRole("button", { name: "Купить" }).click();
  await page.getByText(/Недостаточно средств/).waitFor({ timeout: 10000 });
  check("покупка без денег → «Недостаточно средств»", true);

  db(`INSERT INTO balance_transactions (user_id, amount, reason) SELECT id, 1000, 'topup' FROM users WHERE email = '${email}'`);
  await page.getByRole("button", { name: "История" }).first().click();
  await page.getByText("+1 000 ₽").waitFor({ timeout: 15000 });
  check("пополнение через БД видно в истории (+1 000 ₽)", true);

  await monthCard.getByRole("button", { name: "Купить" }).click();
  await page.getByText(/Тариф оплачен/).waitFor({ timeout: 15000 });
  check("покупка month → успех", true);

  await page.getByText("Активна", { exact: true }).waitFor({ timeout: 15000 });
  check("подписка сменилась на «Активна»", true);

  await page.getByText("825 ₽").first().waitFor({ timeout: 10000 });
  check("баланс стал 825 ₽", true);

  await page.getByText("-175 ₽").waitFor({ timeout: 10000 });
  check("история содержит −175 ₽ за покупку", true);

  await page.getByRole("button", { name: "Получить код привязки" }).click();
  const codeText = await page.locator("code").textContent();
  check("telegram: код привязки /start + 8 hex", /^\/start [0-9a-f]{8}$/.test(codeText ?? ""));
  await page.getByText("Код действует до").waitFor({ timeout: 5000 });
  check("telegram: показан срок действия кода", true);

  await page.goto(`${BASE}/app`);
  await page.locator("span.badge", { hasText: "₽" }).waitFor({ timeout: 10000 });
  check("DownloadPage: чип баланса 825 ₽", (await page.locator("span.badge", { hasText: "₽" }).textContent())?.includes("825") === true);
  check("DownloadPage: ссылка «Аккаунт»", await page.getByRole("link", { name: "Аккаунт" }).isVisible());

  await page.getByRole("heading", { name: "Мои конфиги" }).waitFor({ timeout: 10000 });
  await page.getByText("Конфигов пока нет").waitFor({ timeout: 10000 });
  check("DownloadPage: пустое состояние списка конфигов", true);
  await page.getByRole("button", { name: "Создать конфиг" }).click();
  await page.locator("span.badge", { hasText: "Активен" }).waitFor({ timeout: 15000 });
  check("DownloadPage: создание конфига → бейдж «Активен»", true);
  await page.getByRole("button", { name: "Скачать" }).click();
  await page.getByText("Конфиг скачан").waitFor({ timeout: 15000 });
  check("DownloadPage: скачивание конфига по кнопке", true);

  await page.screenshot({ path: `${ARTIFACTS}/download.png`, fullPage: true });
  await page.goto(`${BASE}/app/account`);
  await page.getByText("Активна", { exact: true }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${ARTIFACTS}/account.png`, fullPage: true });

  // --- Админка (повышаем себя до админа через БД, роль подтянется через /me) ---
  db(`UPDATE users SET role='admin' WHERE email='${email}'`);
  await page.goto(`${BASE}/app`);
  await page.getByRole("link", { name: "Админка" }).waitFor({ timeout: 10000 });
  check("DownloadPage: ссылка «Админка» у админа", true);
  await page.getByRole("link", { name: "Админка" }).click();
  await page.getByRole("heading", { name: "Пользователи" }).waitFor({ timeout: 10000 });
  await page.locator("table").first().getByText(email).first().waitFor({ timeout: 10000 });
  check("AdminPage: список пользователей содержит свой email", true);

  await page.locator("input[type=number]").first().fill("500");
  await page.getByRole("button", { name: "ОК" }).first().click();
  await page.getByText(/Баланс .* обновлён/).waitFor({ timeout: 10000 });
  check("AdminPage: пополнение баланса через UI", true);

  await page.getByRole("button", { name: "Отозвать" }).first().click();
  await page.locator("span.badge", { hasText: "Отозван" }).first().waitFor({ timeout: 15000 });
  check("AdminPage: отзыв конфига через UI", true);
  await page.screenshot({ path: `${ARTIFACTS}/admin.png`, fullPage: true });
} catch (err) {
  failures += 1;
  console.error("UNEXPECTED ERROR:", err.message);
  await page.screenshot({ path: `${ARTIFACTS}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  mockAwg.kill();
}

console.log(`\n${results.length - failures}/${results.length} проверок пройдено (email: ${email})`);
process.exit(failures > 0 ? 1 : 0);
