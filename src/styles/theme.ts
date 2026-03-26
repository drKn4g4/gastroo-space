import { vw } from './units';

export const APP_THEME_STORAGE_KEY = 'gastroo_theme_mode';
export const HIGH_CONTRAST_STORAGE_KEY = 'gastroo_high_contrast';

export const UI = {
  appShell: {
    drawerW: 'min(260px, 75vw)',
    topBarH: '52px',
    footerH: '36px',
    iconButtonRadius: '10px',
    iconButtonPad: '6px',
    iconMinW: '28px',
    navItemRadius: '10px',
    captionFont: '0.6875rem',
    bodyFont: '0.8125rem',
    bodySmallFont: '0.75rem',
    footerInsetBottom: '4px',
  },
  pinpad: {
    headerActionFont: `clamp(${vw(10)}, 1.4vw, ${vw(12)})`,
    inputFont: `clamp(${vw(22)}, 5vw, ${vw(38)})`,
    keyFont: `clamp(${vw(16)}, 2.6vw, ${vw(21)})`,
    helperFont: `clamp(${vw(11)}, 1.5vw, ${vw(14)})`,
    overlayBlur: '4px',
  },
  footer: {
    py: { xs: '12px', sm: '16px', md: '24px' },
    containerPx: { xs: '8px', sm: '16px' },
    stackSpacing: { xs: '10px', md: '32px' },
    logoFontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' },
    logoMb: { xs: '6px', md: '12px' },
    subtitleFontSize: { xs: '0.8125rem', sm: '0.875rem' },
    subtitleLineHeight: 1.5,
    navSpacing: { xs: '10px', sm: '24px', md: '32px' },
    sectionTitleFontSize: { xs: '0.875rem', sm: '0.9375rem' },
    sectionTitleMb: { xs: '5px', md: '8px' },
    linkFontSize: { xs: '0.75rem', sm: '0.8125rem' },
    linkSpacing: { xs: '4px', sm: '8px' },
    copyrightMt: { xs: '12px', md: '32px' },
    copyrightPt: { xs: '8px', md: '16px' },
    copyrightFontSize: { xs: '0.6875rem', sm: '0.75rem' },
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  borderWidth: {
    hair: '1px',
    thin: '1.5px',
    thick: '2px',
  },
  indicatorHeight: '3px',
  blur: {
    sm: '8px',
    md: '16px',
    hero: '80px',
  },
  space: {
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  size: {
    footerColMaxW: '300px',
    heroSubtitleMaxW: '800px',
    demoSubtitleMaxW: '700px',
    offerMaxCardW: '500px',
    langMenuMaxH: '240px',
  },
  shadow: {
    // Only for floating elements (modals, FABs)
    ambient: (opacity: number) => `0 8px 24px -4px rgba(0,0,0,${opacity})`,
    soft: (opacity: number) => `0 2px 8px rgba(0,0,0,${opacity})`,
    // Keep legacy names for compat
    popover: (opacity: number) => `0 8px 24px -4px rgba(0,0,0,${opacity})`,
  },
};
