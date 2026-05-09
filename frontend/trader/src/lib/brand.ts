/** In-app product name. */
export const BRAND_NAME = 'StockPip';

/** Zustand persist key for UI preferences (theme, terminal layout).
 *  Kept as 'piphigh-ui' to preserve existing user settings across rebrand. */
export const STORAGE_KEY_UI = 'piphigh-ui';

/** Legacy key — migrated once on load; logout clears legacy auth key. */
export const STORAGE_KEY_UI_LEGACY = 'piphigh-ui';
