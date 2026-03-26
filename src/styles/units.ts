// src/styles/units.ts
//
// Responsywne jednostki bazujące na referencyjnym viewporcie (tablet portrait):
//  - szerokość: 768
//  - wysokość: 1024
//
// Cel: nie używać wartości w `px` w UI — zamiast tego przeliczać na `vw`/`vh`.

export const VW_BASE = 768;
export const VH_BASE = 1024;

export function vw(px: number): string {
  return `calc(${px} / ${VW_BASE} * 100vw)`;
}

export function vh(px: number): string {
  return `calc(${px} / ${VH_BASE} * 100vh)`;
}

export function vmin(px: number): string {
  return `min(${vw(px)}, ${vh(px)})`;
}

