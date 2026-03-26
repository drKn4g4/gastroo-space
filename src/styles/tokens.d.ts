/**
 * TypeScript definitions for design token systems
 *
 * This file provides type safety and IDE intellisense for:
 *   - UI system (src/styles/theme.ts) — general responsive layout
 *   - T system (src/styles/pos.tokens.ts) — POS/dashboard specialized tokens
 *
 * Import and use:
 *   import { UI } from '@/styles/theme';
 *   import T from '@/styles/pos.tokens';
 */

/**
 * UI Token System
 *
 * General-purpose responsive tokens for layout, spacing, typography.
 * Uses vmin() for scalable, viewport-aware responsive design.
 *
 * Reference viewport: 768×1024px
 * All values scale proportionally with min(vw, vh)
 */
export interface UITokens {
  /**
   * Footer layout — responsive padding, spacing, font sizes
   * Automatically scales from mobile to desktop
   */
  footer: {
    /** Vertical padding — xs/sm/md breakpoints */
    py: Record<'xs' | 'sm' | 'md', string>;
    /** Horizontal container padding */
    containerPx: Record<'xs' | 'sm', string>;
    /** Stack vertical spacing */
    stackSpacing: Record<'xs' | 'md', string>;
    /** Footer logo font size */
    logoFontSize: Record<'xs' | 'sm' | 'md', string>;
    /** Logo bottom margin */
    logoMb: Record<'xs' | 'md', string>;
    /** Subtitle font size */
    subtitleFontSize: Record<'xs' | 'sm', string>;
    /** Subtitle line height (unitless) */
    subtitleLineHeight: number;
    /** Nav item spacing */
    navSpacing: Record<'xs' | 'sm' | 'md', string>;
    /** Section title font size */
    sectionTitleFontSize: Record<'xs' | 'sm', string>;
    /** Section title margin-bottom */
    sectionTitleMb: Record<'xs' | 'md', string>;
    /** Link font size */
    linkFontSize: Record<'xs' | 'sm', string>;
    /** Link group spacing */
    linkSpacing: Record<'xs' | 'sm', string>;
    /** Copyright margin-top */
    copyrightMt: Record<'xs' | 'md', string>;
    /** Copyright padding-top */
    copyrightPt: Record<'xs' | 'md', string>;
    /** Copyright font size */
    copyrightFontSize: Record<'xs' | 'sm', string>;
  };

  /**
   * Border radius scale: small to extra-large
   * Used for buttons, cards, containers
   */
  radius: Record<'sm' | 'md' | 'lg' | 'xl', string>;

  /**
   * Border widths: hair-thin to thick
   * Used for dividers, outlines, emphasis
   */
  borderWidth: Record<'hair' | 'thin' | 'thick', string>;

  /**
   * Indicator height (e.g., scroll indicator, progress bar)
   */
  indicatorHeight: string;

  /**
   * Blur intensity for backdrop, effects
   */
  blur: Record<'sm' | 'md' | 'hero', string>;

  /**
   * Spacing scale from xxs (2px) to xl (24px at reference)
   * Use for gap, margin, padding in general components
   */
  space: Record<'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', string>;

  /**
   * Maximum widths for content sections and containers
   */
  size: {
    /** Footer columns max width */
    footerColMaxW: string;
    /** Hero section subtitle max width */
    heroSubtitleMaxW: string;
    /** Demo section subtitle max width */
    demoSubtitleMaxW: string;
    /** Offer card max width */
    offerMaxCardW: string;
    /** Language menu max height */
    langMenuMaxH: string;
  };

  /**
   * Shadow effects — helper functions for depth, elevation
   * @param opacity — alpha value for shadow color (0–1)
   */
  shadow: {
    popover: (opacity: number) => string;
    soft: (opacity: number) => string;
  };
}

/**
 * T Token System (POS Tokens)
 *
 * Specialized responsive tokens for Point-of-Sale, dashboard, and touch-first interfaces.
 * All values use clamp(min, preferred, max) to guarantee:
 *   - Minimum touch target size ≥44px on phones
 *   - Natural scaling on desktop monitors
 *   - No layout jumps across device sizes
 *
 * Reference viewport: 768×1024px
 * Formula: clamp(min_in_px_units, preferred_vw_or_vh, max_in_px_units)
 */
export interface POSTokens {
  // ─── Logo / Branding ────────────────────────────────────────────────────────

  /** Logo badge circle — portrait viewport (clamp) */
  logoBadge: string;
  /** Logo badge circle — landscape viewport (clamp) */
  logoBadgeLandscape: string;
  /** Restaurant icon inside logo — portrait (clamp) */
  logoIcon: string;
  /** Restaurant icon inside logo — landscape (clamp) */
  logoIconLandscape: string;

  // ─── PIN Numpad ─────────────────────────────────────────────────────────────

  /** PIN button size — portrait (clamp, ≥44px minimum) */
  pinButton: string;
  /** PIN button size — landscape (clamp, ≥44px minimum) */
  pinButtonLandscape: string;
  /** PIN indicator row height (clamp, ≥32px minimum) */
  pinIndicatorH: string;
  /** Single PIN dot radius (clamp) */
  pinDot: string;
  /** Backspace/delete icon size (clamp) */
  backspaceIcon: string;
  /** "OK" button font size (clamp) */
  pinOkFont: string;
  /** Digit text size in PIN button (clamp) */
  pinDigitFont: string;

  // ─── Login — Footer Clock ───────────────────────────────────────────────────

  /** Clock display font size on login page (clamp) */
  loginClockFont: string;

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  /** Large clock display on dashboard (clamp) */
  dashClockFont: string;
  /** Statistic card value font size (clamp) */
  statValueFont: string;
  /** Booking time text (HH:MM) in list (clamp) */
  bookingTimeFont: string;
  /** Empty state icon size (clamp) */
  emptyIcon: string;
  /** Status indicator dot size (clamp) */
  statusDot: string;

  // ─── Layout ─────────────────────────────────────────────────────────────────

  /** Bottom navigation bar height (clamp, ≥48px minimum) */
  bottomNavH: string;

  // ─── Typography — Helpers ───────────────────────────────────────────────────

  /** Caption font size for labels, small text (clamp, ≈9–11px at reference) */
  captionFont: string;
  /** Bottom nav label font size (clamp, rem-based fallback) */
  navLabelFont: string;
}

/**
 * Unit helpers — base responsive functions
 * Always use these instead of hardcoding px/rem/vw/vh
 */
export interface UnitFunctions {
  /** Calculate vmin (min of vwidth, vheight) at 768×1024 reference */
  vmin: (value: number) => string;
  /** Calculate vw (viewport width) at 768×1024 reference */
  vw: (value: number) => string;
  /** Calculate vh (viewport height) at 768×1024 reference */
  vh: (value: number) => string;
}

/**
 * Export declarations for external consumption
 * (These are re-exported from src/styles/theme.ts and src/styles/pos.tokens.ts)
 *
 * Usage:
 *   import { UI } from '@/styles/theme';
 *   import T from '@/styles/pos.tokens';
 *   import { vmin, vw, vh } from '@/styles/units';
 */
declare const UI: UITokens;
declare const T: POSTokens;
declare const units: UnitFunctions;

export { UI, T, units };
