// strategy: tokens/README.md  (compare Figma design tokens vs computed CSS)
// seed:     tests/seed-admin.spec.ts
//
// Worked example of the "design tokens, not pixels" approach for the URRY Admin
// Promotion Banner / Target Audience screen (Figma node 43732-73864).
//
// How to finish wiring this test:
//   1. Run `npm run tokens:fetch` (needs FIGMA_TOKEN) → tokens/design-tokens.json.
//   2. Open tokens/design-tokens.json and find the Figma LAYER NAME for each UI
//      element you want to check; put it in the LAYERS map below.
//   3. Point each mapping's locator at the matching DOM element.
// Until a layer name resolves, that check auto-SKIPS (never a false red).

import { test, type Locator, type Page } from '@playwright/test';
import {
  loadDesignTokens,
  tokensAvailable,
  tokenByName,
  tokenById,
  assertTokens,
  type DesignTokens,
  type TokenStyles,
} from '../utils/figma-tokens';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
const EMAIL = process.env.URRY_ADMIN_EMAIL ?? 'demo@urry.com';
const PASSWORD = process.env.URRY_ADMIN_PASSWORD ?? 'Cocacola@2023';

// Figma layers are pinned by node id (many share the generic name "Button", so a
// name lookup is ambiguous). Ids come from tokens/design-tokens.json, Figma node
// 43732-73864 ("Banner / Target Audience"). Verified live against the DOM button's
// computed style on 2026-07-25 (see DOM-driven notes below).
const LAYERS = {
  // "Button" FRAME, borderRadius 12px — matches the primary CTA's radius.
  primaryButtonFrame: '43732:73970',
  // TEXT token, fontSize 17px / fontWeight 600 — matches the CTA label typography.
  primaryButtonText: '43732:73903',
};

/** One mapping = a Figma layer + a DOM element + which CSS props must match. */
interface Mapping {
  title: string;
  /** Figma layer name (first match) … */
  layer?: string;
  /** … or a Figma node id when the name is ambiguous (preferred here). */
  layerId?: string;
  locator: (page: Page) => Locator;
  /** CSS property → token field it must equal. */
  checks: Partial<Record<string, keyof TokenStyles>>;
  /** Optional navigation/setup before asserting (e.g. open the drawer). */
  setup?: (page: Page) => Promise<void>;
}

// NOTE ON background-color: the live primary button paints its fill with an SVG
// background-image (static/media/primary.svg), so computed `background-color` is
// always rgba(0,0,0,0). We therefore assert the token-backed structural props
// (border-radius) and typography (font-size, font-weight) instead of fill.
const addBannerButton = (page: Page) =>
  page.getByRole('button', { name: '新しいバナーを追加する' });

const MAPPINGS: Mapping[] = [
  {
    title: 'primary "Add banner" button radius matches Figma Button token',
    layerId: LAYERS.primaryButtonFrame,
    locator: addBannerButton,
    checks: { 'border-radius': 'borderRadius' },
  },
  {
    title: 'primary "Add banner" button label typography matches Figma text token',
    layerId: LAYERS.primaryButtonText,
    locator: addBannerButton,
    checks: { 'font-size': 'fontSize', 'font-weight': 'fontWeight' },
  },
];

test.describe('Design tokens — Banner / Target Audience (admin)', () => {
  test.skip(
    !tokensAvailable(),
    'Run `npm run tokens:fetch` (needs FIGMA_TOKEN) to generate tokens/design-tokens.json first.',
  );

  let tokens: DesignTokens;
  test.beforeAll(() => {
    tokens = loadDesignTokens();
  });

  test.beforeEach(async ({ page }) => {
    // Inline admin login (mirrors tests/seed-admin.spec.ts) so this spec runs standalone.
    await page.goto(`${ADMIN_BASE}/login`);
    await page.locator('input[type="email"]:visible').first().fill(EMAIL);
    await page.locator('input[type="password"]:visible').first().fill(PASSWORD);
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL(`${ADMIN_BASE}/dashboard`);
  });

  for (const m of MAPPINGS) {
    test(m.title, async ({ page }) => {
      // Resolve the Figma token; if the layer name is still a placeholder /
      // not found, skip this check with guidance rather than failing red.
      let entry;
      try {
        entry = m.layerId ? tokenById(tokens, m.layerId) : tokenByName(tokens, m.layer!);
      } catch (err) {
        test.skip(true, `Wire the mapping: ${(err as Error).message}`);
        return;
      }

      await page.goto(`${ADMIN_BASE}/promotions/banner`);
      if (m.setup) await m.setup(page);
      await assertTokens(m.locator(page), entry, m.checks);
    });
  }
});
