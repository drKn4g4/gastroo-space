'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '../providers/AuthProvider';
import type { Restaurant } from '@/types/organization';

import SpaceBottomNav, { type SpaceTab } from './components/SpaceBottomNav';
import DiscoverStartView from '../dashboard/components/DiscoverStartView';
import LocationsMapView from '../dashboard/components/LocationsMapView';
import CalendarPage from './calendar/CalendarView';

const SpaceProfileView = dynamic(() => import('./components/SpaceProfileView'), { loading: () => <Loader /> });

function Loader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

const VALID_TABS: SpaceTab[] = ['start', 'map', 'calendar', 'profile'];

export default function SpacePage() {
  const { user, profile } = useAuth();
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params.lang;

  const viewMode = profile?.viewMode ?? 'foodie';

  const initialTab = (() => {
    const p = searchParams.get('page') as SpaceTab | null;
    if (p && VALID_TABS.includes(p)) return p;
    return 'start';
  })();

  const [activeTab, setActiveTab] = useState<SpaceTab>(initialTab);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Gastronaut mode + orgs → redirect to pinpad
  useEffect(() => {
    if (!profile || !user) return;
    if (viewMode === 'gastronaut' && (profile.organization?.length ?? 0) > 0) {
      router.replace(`/${lang}/pinpad`);
    }
  }, [viewMode, profile, user, router, lang]);

  // Load public restaurants
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(query(collectionGroup(db, 'restaurants')));
        if (cancelled) return;
        const list = snap.docs.map((d) => ({
          ...(d.data() as Record<string, unknown>),
          id: d.id,
          organizationId: d.ref.parent.parent?.id ?? null,
        })) as unknown as Restaurant[];
        // Deduplicate by id (collectionGroup may return same restaurant from multiple paths)
        const seen = new Set<string>();
        const unique = list.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        unique.sort((a, b) => a.name.localeCompare(b.name, lang));
        setRestaurants(unique);
      } catch (err) {
        console.error('Failed to load restaurants:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [lang]);

  /* ── Swipe gestures (hooks must be before any conditional return) ── */
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const swipeToTab = useCallback(
    (dir: -1 | 1) => {
      const idx = VALID_TABS.indexOf(activeTab);
      const next = idx + dir;
      if (next >= 0 && next < VALID_TABS.length) {
        setActiveTab(VALID_TABS[next]);
      }
    },
    [activeTab],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, []);

  const SWIPE_THRESHOLD = 50;
  const SWIPE_MAX_TIME = 400;

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      const dt = Date.now() - touchRef.current.t;
      touchRef.current = null;

      if (dt > SWIPE_MAX_TIME) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      swipeToTab(dx < 0 ? 1 : -1);
    },
    [swipeToTab],
  );

  if (!user) return null;

  const handleTabChange = (tab: SpaceTab) => {
    setActiveTab(tab);
  };

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        sx={{
          flex: 1,
          overflowY: activeTab === 'map' ? 'hidden' : 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <Suspense fallback={<Loader />}>
          {activeTab === 'start' && (
            <DiscoverStartView
              uid={user.uid}
              restaurants={restaurants}
              lang={lang}
              loading={loading}
              profile={{
                name: user.displayName ?? (user.email ? user.email.split('@')[0] : undefined),
              }}
            />
          )}
          {activeTab === 'map' && (
            <LocationsMapView restaurants={restaurants} lang={lang} loading={loading} uid={user.uid} />
          )}
          {activeTab === 'calendar' && (
            <CalendarPage restaurants={restaurants} />
          )}
          {activeTab === 'profile' && (
            <SpaceProfileView />
          )}
        </Suspense>
      </Box>

      <SpaceBottomNav value={activeTab} onTabChange={handleTabChange} lang={lang} />
    </Box>
  );
}
