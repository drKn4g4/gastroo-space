/**
 * POS Design Tokens — Fluid sizing przez CSS clamp()
 *
 * Schemat: clamp(minimum, preferowana-wartość-vw/vh, maksimum)
 * Referencyjny viewport: 768 × 1024 px (tablet portrait)
 *
 * Użycie w MUI sx:
 *   sx={{ width: T.pinButton, height: T.pinButton }}
 *
 * Dlaczego clamp zamiast prostego vw/vh?
 *   - clamp() gwarantuje minimalny rozmiar dotyku (44+)
 *   - i maksymalny rozmiar na dużych monitorach
 *   - środkowa wartość skaluje się płynnie między nimi
 */

import { vh, vw } from './units';

const T = {

  // ─── Logo / Branding ────────────────────────────────────────────────────────
  /** Koło z logo — portrait */
  logoBadge:            `clamp(${vw(72)}, 12.5vw, ${vw(128)})`,
  /** Koło z logo — landscape phone (constrained by height) */
  logoBadgeLandscape:   `clamp(${vh(52)}, 8vh, ${vh(80)})`,
  /** Ikona restauracji wewnątrz koła — portrait */
  logoIcon:             `clamp(${vw(36)}, 6.25vw, ${vw(64)})`,
  /** Ikona restauracji — landscape phone */
  logoIconLandscape:    `clamp(${vh(22)}, 4vh, ${vh(36)})`,

  // ─── PIN numpad ─────────────────────────────────────────────────────────────
  /** Przycisk numeryczny — portrait */
  pinButton:            `clamp(${vw(54)}, 9.6vw, ${vw(84)})`,
  /** Przycisk numeryczny — landscape phone */
  pinButtonLandscape:   `clamp(${vh(46)}, 7.5vh, ${vh(62)})`,
  /** Wypełniacz wysokości wiersza ze wskaźnikiem PIN */
  pinIndicatorH:        `clamp(${vh(32)}, 5.7vh, ${vh(52)})`,
  /** Pojedyncza kropka PIN */
  pinDot:               `clamp(${vw(12)}, 2.3vw, ${vw(20)})`,
  /** Ikona Backspace */
  backspaceIcon:        `clamp(${vw(20)}, 3.4vw, ${vw(28)})`,
  /** Napis "OK" na przycisku zatwierdzenia */
  pinOkFont:            `clamp(${vw(12)}, 1.8vw, ${vw(16)})`,
  /** Cyfra na klawiszy */
  pinDigitFont:         `clamp(${vw(22)}, 3.9vw, ${vw(34)})`,

  // ─── Login — stopka ─────────────────────────────────────────────────────────
  /** Zegar w stopce logowania */
  loginClockFont:       `clamp(${vw(16)}, 3.1vw, ${vw(28)})`,

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  /** Duży zegar na dashboardzie */
  dashClockFont:        `clamp(${vw(24)}, 4.2vw, ${vw(44)})`,
  /** Wartość w karcie statystyk */
  statValueFont:        `clamp(${vw(22)}, 3.5vw, ${vw(38)})`,
  /** Godzina rezerwacji w wierszu listy */
  bookingTimeFont:      `clamp(${vw(12)}, 2vw, ${vw(17)})`,
  /** Ikona pustego stanu */
  emptyIcon:            `clamp(${vw(28)}, 5.2vw, ${vw(48)})`,
  /** Kropka statusu rezerwacji */
  statusDot:            `clamp(${vw(6)}, 1vw, ${vw(10)})`,

  // ─── Layout ─────────────────────────────────────────────────────────────────
  /** Wysokość bottom navigation */
  bottomNavH:           `clamp(${vh(48)}, 8vh, ${vh(68)})`,

  // ─── Typografia pomocnicza ───────────────────────────────────────────────────
  /** Etykieta sekcji — uppercase caption */
  captionFont:          `clamp(${vw(9)}, 1.2vw, ${vw(11)})`,
  /** Etykieta zakładki bottom nav */
  navLabelFont:         'clamp(0.6rem, 1.1vw, 0.72rem)',

} as const;

export default T;
