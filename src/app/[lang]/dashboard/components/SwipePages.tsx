'use client';

import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Typography } from '@mui/material';

interface SwipePage {
  key:   string;
  label: string;
  node:  ReactNode;
}

interface SwipePagesProps {
  pages:         SwipePage[];
  initialPage?:  number;
  onPageChange?: (index: number) => void;
}

/**
 * CSS scroll-snap horizontal swipe container z klikalnymi etykietami stron.
 * Obsługuje ?page=<key> w URL — drawer może nawigować do /dashboard?page=bookings
 * i hub automatycznie przewinie do właściwej karty.
 */
export default function SwipePages({ pages, initialPage = 0, onPageChange }: SwipePagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState(initialPage);
  const initialScrollDone = useRef(false);

  // Oblicz startowy indeks z ?page= lub initialPage
  const startIndex = (() => {
    const pageKey = searchParams.get('page');
    if (pageKey) {
      const idx = pages.findIndex((p) => p.key === pageKey);
      if (idx >= 0) return idx;
    }
    return initialPage;
  })();

  // Obserwuj widoczność stron i aktualizuj current
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observers: IntersectionObserver[] = [];
    (Array.from(container.children) as HTMLElement[]).forEach((el, idx) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setCurrent(idx);
            onPageChange?.(idx);
          }
        },
        { root: container, threshold: 0.5 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [pages.length, onPageChange]);

  // Scroll to page matching ?page= param (or initialPage on mount)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const target = startIndex;
    const el = container.children[target] as HTMLElement | undefined;
    if (!el) return;
    // On first mount use instant scroll; subsequent changes use smooth
    const behavior = initialScrollDone.current ? 'smooth' : ('instant' as ScrollBehavior);
    el.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
    initialScrollDone.current = true;
  }, [startIndex]);

  const goTo = useCallback((idx: number) => {
    const el = containerRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Pasek etykiet ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1.25,
          pt: 1,
          pb: 0.75,
          gap: 0.5,
          flexShrink: 0,
          overflowX: 'auto',
          bgcolor: 'background.paper',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {pages.map((p, idx) => {
          const active = idx === current;
          return (
            <Box
              key={p.key}
              onClick={() => goTo(idx)}
              sx={{
                px: 1.75, py: 0.625,
                borderRadius: '10px',
                flexShrink: 0,
                cursor: 'pointer',
                bgcolor: active ? 'primary.main' : 'action.hover',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: active ? 'primary.main' : 'action.selected' },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <Typography
                variant="caption"
                fontWeight={active ? 700 : 600}
                sx={{
                  fontSize: '0.775rem',
                  letterSpacing: active ? '0.02em' : '0.01em',
                  color: active ? 'primary.contrastText' : 'text.secondary',
                  userSelect: 'none',
                }}
              >
                {p.label}
              </Typography>
            </Box>
          );
        })}

        <Box sx={{ flex: 1 }} />

        {pages.length > 1 && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', pr: 0.5, flexShrink: 0 }}>
            {pages.map((_, idx) => (
              <Box
                key={idx}
                onClick={() => goTo(idx)}
                sx={{
                  width: idx === current ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: idx === current ? 'primary.main' : 'text.disabled',
                  opacity: idx === current ? 1 : 0.3,
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* ── Scroll container ── */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {pages.map(({ key, node }) => (
          <Box
            key={key}
            sx={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              scrollSnapAlign: 'start',
            }}
          >
            {node}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
