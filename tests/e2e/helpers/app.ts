import { expect, type Page } from '@playwright/test';

export const MOCK_TOKEN = 'test_qa_token';

/** Load the app and enter demo mode via the AuthModal. */
export async function enterDemo(page: Page, path = '/') {
  await page.goto(path);
  const demo = page.getByRole('button', { name: /Explore Demo Dashboard/i }).first();
  await demo.waitFor({ timeout: 15_000 });
  await demo.click();
  await expect(page.getByRole('button', { name: /Explore Demo Dashboard/i })).toHaveCount(0, { timeout: 10_000 });
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

export const AUTH = { Authorization: `Bearer ${MOCK_TOKEN}` };

/** Demo-mode page load that fails the test on uncaught page errors and horizontal overflow. */
export async function openTab(page: Page, tab: string) {
  const errors = collectErrors(page);
  await enterDemo(page, '/');
  await page.goto('/' + tab);
  await page.waitForTimeout(1500);
  return errors;
}

/** Find a control by accessible name, tab role, title/aria-label, or visible text (the app mixes all four). */
export function ctl(page: Page, name: string | RegExp, exact = false) {
  return page
    .getByRole('button', { name, exact })
    .or(page.getByRole('tab', { name, exact }))
    .or(page.getByTitle(name, { exact }))
    .or(page.getByLabel(name, { exact }))
    .or(page.getByText(name, { exact }))
    .filter({ visible: true });
}

/** On narrow viewports the primary nav lives behind a "More" menu; open it if the target is not visible. */
export async function revealNav(page: Page, name: string | RegExp, exact = false) {
  const target = ctl(page, name, exact).first();
  if (await target.isVisible().catch(() => false)) return target;
  const more = page.getByTitle(/More views and options/i).or(page.getByLabel(/More views and options/i)).first();
  if (await more.isVisible().catch(() => false)) await more.click();
  return ctl(page, name, exact).first();
}
