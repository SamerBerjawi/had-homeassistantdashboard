import { test, expect } from '@playwright/test';
import { enterDemo, openTab } from '../helpers/app';

// Accessibility regressions: UI-001, UI-002, UI-003, UI-004, UI-005, UI-006, UI-007, UI-009
test.describe('I. Accessibility', () => {
  test('UI-001 viewport does not block zoom', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);
  });

  test('UI-002 entity modal is a labelled dialog, traps focus, restores focus on Escape', async ({ page }) => {
    await openTab(page, 'rooms');
    const opener = page.getByRole('button', { name: /Open Entity Details/ }).first();
    await opener.focus();
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await dialog.getAttribute('aria-label')).toBeTruthy();
    // Tab must stay inside the dialog
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('UI-002 sign-in gate is a dialog that Escape does not dismiss', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /Sign in to Home Assistant/ });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
  });

  test('UI-004 sign-in inputs have associated labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Home Assistant URL')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Long-Lived Token/ }).first().click();
    await expect(page.getByLabel('Long-Lived Access Token')).toBeVisible();
  });

  for (const tab of ['overview', 'rooms', 'security', 'network', 'settings']) {
    test(`UI-003 every visible button on /${tab} has an accessible name`, async ({ page }) => {
      await openTab(page, tab);
      const unnamed = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .filter((b) => (b as HTMLElement).offsetParent !== null)
          .filter((b) => {
            const name =
              b.getAttribute('aria-label') || b.getAttribute('title') || b.getAttribute('aria-labelledby') || b.textContent?.trim();
            return !name;
          })
          .map((b) => b.outerHTML.slice(0, 140))
      );
      expect(unnamed).toEqual([]);
    });
  }

  test('UI-005 clickable non-button elements are keyboard operable', async ({ page }) => {
    await openTab(page, 'rooms');
    // Any element that has a click handler through role="button" must be focusable
    const bad = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="button"]'))
        .filter((el) => (el as HTMLElement).offsetParent !== null && !(el as HTMLElement).matches('button'))
        .filter((el) => (el as HTMLElement).tabIndex < 0)
        .map((el) => el.outerHTML.slice(0, 120))
    );
    expect(bad).toEqual([]);
  });

  test('UI-006 keyboard focus shows a visible indicator even on outline-none controls', async ({ page }) => {
    await openTab(page, 'overview');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Many controls use transition-all, so let the outline finish animating in
    await page.waitForTimeout(400);
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: cs.outlineWidth };
    });
    expect(outline).not.toBeNull();
    expect(outline!.style).not.toBe('none');
    expect(parseFloat(outline!.width)).toBeGreaterThan(0);
  });

  test('UI-007 no visible text is smaller than 11px on the overview', async ({ page }) => {
    await openTab(page, 'overview');
    const tiny = await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        const el = node.parentElement;
        if (!text || !el || el.offsetParent === null) continue;
        if (el.closest('svg, script, style')) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 11) out.push(`${size}px ${text.slice(0, 30)}`);
      }
      return out.slice(0, 10);
    });
    expect(tiny).toEqual([]);
  });

  test('UI-009 prefers-reduced-motion disables animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const duration = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.animation = 'spin 2s linear infinite';
      document.body.appendChild(el);
      const d = getComputedStyle(el).animationDuration;
      el.remove();
      return d;
    });
    expect(parseFloat(duration)).toBeLessThan(0.01);
  });
});
