/**
 * Reusable helpers for asserting that the live app matches Figma design tokens.
 *
 * Flow:
 *   1. `npm run tokens:fetch` (needs FIGMA_TOKEN) writes tokens/design-tokens.json.
 *   2. Tests load it here — NO Figma token needed at test time — and assert with
 *      Playwright's `toHaveCSS`, which compares against computed style.
 *
 * This is the "compare design tokens, not pixels" strategy: far fewer false
 * positives than screenshot diffing, and it pinpoints "dev implemented the spec
 * wrong" (wrong colour / radius / font size) instead of "1px moved".
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator } from '@playwright/test';

/** CSS-ready token values extracted per Figma layer (see fetch-figma-tokens.mjs). */
export interface TokenStyles {
  /** Solid fill as computed-style colour, e.g. "rgb(37, 99, 235)". */
  fill?: string;
  /** Alias of `fill` for text layers (maps to CSS `color`). */
  color?: string;
  stroke?: string;
  borderWidth?: string;
  borderRadius?: string;
  borderRadiiPx?: number[];
  opacity?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  letterSpacing?: string;
  lineHeight?: string;
  textAlign?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  gap?: string;
}

export interface TokenEntry {
  id: string;
  name: string;
  type: string;
  path: string;
  styles: TokenStyles;
}

export interface DesignTokens {
  generatedAt: string;
  fileKey: string;
  screens: Record<string, { label: string; rootName: string; entries: TokenEntry[] }>;
}

export const DESIGN_TOKENS_PATH = path.join(__dirname, '..', '..', 'tokens', 'design-tokens.json');

/** True once `npm run tokens:fetch` has produced the tokens file. */
export function tokensAvailable(file: string = DESIGN_TOKENS_PATH): boolean {
  return fs.existsSync(file);
}

export function loadDesignTokens(file: string = DESIGN_TOKENS_PATH): DesignTokens {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Design tokens not found at ${file}. Run \`npm run tokens:fetch\` (needs FIGMA_TOKEN) first.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as DesignTokens;
}

function allEntries(tokens: DesignTokens, screenId?: string): TokenEntry[] {
  const screens = screenId ? [tokens.screens[screenId]] : Object.values(tokens.screens);
  return screens.flatMap((s) => s?.entries ?? []);
}

/**
 * Look up a Figma layer by its exact name (first match). Layer names come from
 * design-tokens.json — inspect that file to see what's available. Pass a
 * `screenId` (the Figma node id, ":" form) to disambiguate duplicate names.
 */
export function tokenByName(tokens: DesignTokens, name: string, screenId?: string): TokenEntry {
  const hit = allEntries(tokens, screenId).find((e) => e.name === name);
  if (!hit) {
    const names = allEntries(tokens, screenId).map((e) => `"${e.name}"`).slice(0, 40).join(', ');
    throw new Error(`Design-token layer "${name}" not found. Available layers: ${names}`);
  }
  return hit;
}

/** Look up a layer by its Figma node id (exact). */
export function tokenById(tokens: DesignTokens, id: string): TokenEntry {
  const hit = allEntries(tokens).find((e) => e.id === id);
  if (!hit) throw new Error(`Design-token layer id "${id}" not found.`);
  return hit;
}

/**
 * Assert one locator's computed CSS matches a token's design values.
 *
 * `checks` maps a CSS property → the token field it must equal, e.g.
 *   await assertTokens(button, token, {
 *     'background-color': 'fill',
 *     'border-radius':    'borderRadius',
 *     'font-size':        'fontSize',
 *   });
 */
export async function assertTokens(
  locator: Locator,
  entry: TokenEntry,
  checks: Partial<Record<string, keyof TokenStyles>>,
): Promise<void> {
  for (const [cssProp, field] of Object.entries(checks) as [string, keyof TokenStyles][]) {
    const expected = entry.styles[field];
    if (expected == null) {
      throw new Error(
        `Token "${entry.name}" has no "${String(field)}" value (available: ${Object.keys(entry.styles).join(', ') || 'none'}).`,
      );
    }
    await expect(locator, `${entry.name}: CSS ${cssProp} should match Figma ${String(field)}`).toHaveCSS(
      cssProp,
      String(expected),
    );
  }
}
