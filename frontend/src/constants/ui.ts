/**
 * UI関連の定数
 */

// バッチサイズ
export const BATCH_SIZES = {
  TOKENS: 10,
  CREATORS: 20,
  SEARCH_RESULTS: 15,
} as const;

// タイムアウト値（ミリ秒）
export const TIMEOUTS = {
  AUTO_LOAD_DELAY: 100,
  DEBOUNCE_SEARCH: 300,
  TOAST_DURATION: 3000,
  LOADING_SPINNER_MIN: 500,
  API_REQUEST: 30000,
} as const;

// アイコンサイズ
export const ICON_SIZES = {
  SMALL: 16,
  MEDIUM: 20,
  LARGE: 24,
  XLARGE: 32,
} as const;

// アバターサイズ
export const AVATAR_SIZES = {
  SMALL: 32,
  MEDIUM: 48,
  LARGE: 64,
  XLARGE: 96,
} as const;

// ページネーション
export const PAGINATION = {
  ITEMS_PER_PAGE: 20,
  MAX_VISIBLE_PAGES: 5,
} as const;

// レスポンシブブレークポイント
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

// アニメーション期間（ミリ秒）
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// z-index レイヤー
export const Z_INDEX = {
  TOOLTIP: 1000,
  MODAL: 1100,
  NOTIFICATION: 1200,
  DROPDOWN: 100,
} as const;

// グリッドサイズ
export const GRID_SIZES = {
  COLUMNS_MOBILE: 1,
  COLUMNS_TABLET: 2,
  COLUMNS_DESKTOP: 3,
  COLUMNS_WIDE: 4,
} as const;

// カード設定
export const CARD_SETTINGS = {
  MAX_DESCRIPTION_LENGTH: 150,
  MAX_TITLE_LENGTH: 50,
  IMAGE_ASPECT_RATIO: "1:1",
} as const;