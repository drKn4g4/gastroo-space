'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Badge,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

import { collectionGroup, getDocs } from 'firebase/firestore';
import type { Restaurant } from '@/types/organization';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import RestaurantDetailView from './RestaurantDetailView';
import { useGeolocation, type Coordinates } from '../../providers/GeolocationProvider';


type RestaurantRecord = Restaurant & {
  organizationId?: string | null;
  gbpAttributes?: Record<string, boolean>;
};

type MenuMeta = {
  hasVegan: boolean;
  safeAllergens: Record<string, boolean>;
};

interface MapInstance {
  fitBounds: (bounds: LatLngBoundsInstance, padding?: number) => void;
  setCenter: (coords: Coordinates) => void;
  setZoom: (zoom: number) => void;
}

const NEARBY_THRESHOLD = 10;

interface MarkerInstance {
  setMap: (map: MapInstance | null) => void;
  addListener: (eventName: string, callback: () => void) => void;
}

interface InfoWindowInstance {
  open: (args: { map: MapInstance; anchor: MarkerInstance }) => void;
}

interface LatLngBoundsInstance {
  extend: (coords: Coordinates) => void;
}

interface MapsApi {
  Map: new (container: HTMLDivElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: {
    map: MapInstance;
    position: Coordinates;
    title: string;
    label?: { text: string; color?: string; fontWeight?: string };
    icon?: string | {
      url: string;
      scaledSize?: unknown;
      anchor?: unknown;
    };
    zIndex?: number;
  }) => MarkerInstance;
  InfoWindow: new (options: { content: string }) => InfoWindowInstance;
  LatLngBounds: new () => LatLngBoundsInstance;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
}

declare global {
  interface Window {
    google?: { maps?: MapsApi };
  }
}

const GOOGLE_MAP_SCRIPT_ID = 'gastroo-google-maps-script';
const ALLERGEN_OPTIONS = ['gluten', 'milk', 'nuts', 'eggs', 'fish'] as const;
const GBP_FILTERS = [
  { key: 'dogFriendly', label: 'Psy' },
  { key: 'lgbtFriendly', label: 'LGBT+' },
  { key: 'veganOptions', label: 'Vegan' },
  { key: 'familyFriendly', label: 'Rodziny' },
] as const;

interface RestaurantWithCoords {
  restaurant: RestaurantRecord;
  coords: Coordinates;
}

function getMapsApi(): MapsApi | null {
  return window.google?.maps ?? null;
}

function buildAddressLabel(restaurant: Restaurant): string {
  const { street, postalCode, city, country } = restaurant.address;
  return [street, postalCode, city, country].filter(Boolean).join(', ');
}

function buildMarkerLabel(restaurant: Restaurant): string {
  const addressLabel = buildAddressLabel(restaurant);
  return addressLabel ? `${restaurant.name} - ${addressLabel}` : restaurant.name;
}



function readTrait(restaurant: RestaurantRecord, key: string): boolean {
  const attrs = restaurant.gbpAttributes ?? {};
  return attrs[key] === true;
}

export default function LocationsMapView({ restaurants, lang, loading = false, uid }: { restaurants: Restaurant[]; lang: string; loading?: boolean; uid?: string }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const infoWindowsRef = useRef<InfoWindowInstance[]>([]);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [veganOnly, setVeganOnly] = useState(false);
  const [allergenFilter, setAllergenFilter] = useState<string>('all');
  const [traitFilters, setTraitFilters] = useState<string[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantRecord | null>(null);
  const [menuMetaMap, setMenuMetaMap] = useState<Record<string, MenuMeta>>({});
  const [metaLoading, setMetaLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [menuItemNames, setMenuItemNames] = useState<Record<string, string[]>>({});
  const { coords: userLocation } = useGeolocation();

  const { t } = useTranslation(lang, 'dashboard');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const records = restaurants as RestaurantRecord[];

  useEffect(() => {
    let cancelled = false;

    const loadMenuMeta = async () => {
      try {
        setMetaLoading(true);
        const snap = await getDocs(collectionGroup(db, 'menuItems'));
        if (cancelled) return;

        const next: Record<string, MenuMeta> = {};
        const namesByRestaurant: Record<string, string[]> = {};
        snap.docs.forEach((entry) => {
          const restaurantId = entry.ref.parent.parent?.id;
          if (!restaurantId) return;

          const data = entry.data() as {
            name?: string;
            allergens?: string[];
            dietary?: { vegan?: boolean };
          };

          if (!next[restaurantId]) {
            next[restaurantId] = { hasVegan: false, safeAllergens: {} };
          }
          if (!namesByRestaurant[restaurantId]) {
            namesByRestaurant[restaurantId] = [];
          }
          if (data.name) {
            namesByRestaurant[restaurantId].push(data.name);
          }

          if (data.dietary?.vegan) {
            next[restaurantId].hasVegan = true;
          }

          ALLERGEN_OPTIONS.forEach((allergen) => {
            if (!(data.allergens ?? []).includes(allergen)) {
              next[restaurantId].safeAllergens[allergen] = true;
            }
          });
        });

        setMenuMetaMap(next);
        setMenuItemNames(namesByRestaurant);
      } catch {
        if (!cancelled) {
          setMenuMetaMap({});
          setMenuItemNames({});
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };

    void loadMenuMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  const autocompleteOptions = useMemo(() => {
    const opts: Array<{ label: string; type: 'restaurant' | 'dish'; restaurantId?: string }> = [];
    records.forEach((r) => opts.push({ label: r.name, type: 'restaurant' }));
    Object.entries(menuItemNames).forEach(([rId, names]) => {
      const r = records.find((rec) => rec.id === rId);
      const rName = r?.name ?? '';
      names.forEach((name) => opts.push({ label: `${name} — ${rName}`, type: 'dish', restaurantId: rId }));
    });
    return opts;
  }, [records, menuItemNames]);

  const filteredRestaurants = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return records.filter((restaurant) => {
      const meta = menuMetaMap[restaurant.id];
      const dishes = menuItemNames[restaurant.id] ?? [];
      const matchesSearch =
        normalized.length === 0 ||
        restaurant.name.toLowerCase().includes(normalized) ||
        buildAddressLabel(restaurant).toLowerCase().includes(normalized) ||
        dishes.some((d) => d.toLowerCase().includes(normalized));
      const matchesVegan = !veganOnly || meta?.hasVegan === true;
      const matchesAllergen = allergenFilter === 'all' || meta?.safeAllergens?.[allergenFilter] === true;
      const matchesTraits = traitFilters.every((trait) => readTrait(restaurant, trait));

      return matchesSearch && matchesVegan && matchesAllergen && matchesTraits;
    });
  }, [records, search, veganOnly, allergenFilter, traitFilters, menuMetaMap, menuItemNames]);

  const mappedRestaurants = useMemo<RestaurantWithCoords[]>(() => {
    // Pokazuj zawsze wszystkie lokale z poprawnymi współrzędnymi
    return filteredRestaurants
      .filter((restaurant) => typeof restaurant.location?.lat === 'number' && typeof restaurant.location?.lng === 'number')
      .map((restaurant) => ({
        restaurant,
        coords: {
          lat: restaurant.location?.lat as number,
          lng: restaurant.location?.lng as number,
        },
      }));
  }, [filteredRestaurants]);

  const sortedMapEntries = useMemo<RestaurantWithCoords[]>(() => {
    return [...mappedRestaurants].sort((left, right) =>
      left.restaurant.name.localeCompare(right.restaurant.name, lang),
    );
  }, [lang, mappedRestaurants]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (veganOnly) count++;
    if (allergenFilter !== 'all') count++;
    count += traitFilters.length;
    return count;
  }, [veganOnly, allergenFilter, traitFilters]);

  useEffect(() => {
    if (!apiKey) {
      setMapError(t('dashboard.map.maps_api_error'));
      return;
    }

    if (getMapsApi()) {
      setMapsReady(true);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      const handleLoad = () => setMapsReady(true);
      const handleError = () => setMapError(t('dashboard.map.maps_api_error'));
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAP_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.onload = () => setMapsReady(true);
    script.onerror = () => setMapError(t('dashboard.map.maps_api_error'));
    document.head.appendChild(script);
  }, [apiKey, t]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapRef.current) return;

    const mapsApi = getMapsApi();
    if (!mapsApi) {
      setMapError('Google Maps API nie jest gotowe.');
      return;
    }

    mapRef.current = new mapsApi.Map(mapContainerRef.current, {
      center: userLocation ?? { lat: 52.2297, lng: 21.0122 },
      zoom: userLocation ? 15 : 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, [mapsReady, loading, metaLoading, userLocation]);

  useEffect(() => {
    if (!mapRef.current || !mapsReady) return;

    const map = mapRef.current;
    const mapsApi = getMapsApi();
    if (!mapsApi) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    infoWindowsRef.current = [];
    markersRef.current = [];

    if (!sortedMapEntries.length && !userLocation) return;

    const bounds = new mapsApi.LatLngBounds();

    // Dodaj marker użytkownika jeśli jest lokalizacja
    if (userLocation) {
      const userMarker = new mapsApi.Marker({
        map,
        position: userLocation,
        title: 'Twoja lokalizacja',
        icon: {
          url: '/icons/user-location.svg',
          scaledSize: new mapsApi.Size(32, 32),
          anchor: new mapsApi.Point(16, 16),
        },
        zIndex: 9999,
      });
      markersRef.current.push(userMarker);
      bounds.extend(userLocation);
    }






    sortedMapEntries.forEach(({ restaurant, coords }, _index) => {
      const marker = new mapsApi.Marker({
        map,
        position: coords,
        title: buildMarkerLabel(restaurant),
        icon: {
          url: '/icons/restaurant-marker.svg', // własny plik SVG (32x32)
          scaledSize: new mapsApi.Size(32, 32),
          anchor: new mapsApi.Point(16, 32), // środek dolnej krawędzi
        },
      });

      const tags = [
        veganOnly || menuMetaMap[restaurant.id]?.hasVegan ? 'vegan' : null,
        ...GBP_FILTERS.filter((filter) => readTrait(restaurant, filter.key)).map((filter) => filter.label),
      ].filter(Boolean).join(' · ');

      const infoWindow = new mapsApi.InfoWindow({
        content: `<div><strong>${restaurant.name}</strong><br/>${buildAddressLabel(restaurant)}${tags ? `<br/>${tags}` : ''}</div>`,
      });

      marker.addListener('click', () => {
        setActiveRestaurantId(restaurant.id);
        infoWindow.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
      bounds.extend(coords);
    });

    // Fit bounds do wszystkich markerów (user + restauracje)
    map.fitBounds(bounds, 64);
  }, [mapsReady, sortedMapEntries, menuMetaMap, veganOnly, userLocation]);

  useEffect(() => {
    if (!activeRestaurantId || !mapRef.current) return;

    const idx = sortedMapEntries.findIndex((entry) => entry.restaurant.id === activeRestaurantId);
    if (idx < 0) return;

    const marker = markersRef.current[idx];
    const infoWindow = infoWindowsRef.current[idx];
    if (marker && infoWindow) {
      infoWindow.open({ map: mapRef.current, anchor: marker });
    }
  }, [activeRestaurantId, sortedMapEntries]);

  const toggleTrait = (trait: string) => {
    setTraitFilters((current) => current.includes(trait) ? current.filter((entry) => entry !== trait) : [...current, trait]);
  };

  return (
    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ── Floating toolbar ── */}
      <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10 }}>
        <IconButton
          onClick={() => setSearchOpen(true)}
          sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}
          aria-label={t('dashboard.map.search_label', { defaultValue: 'Szukaj lokalu' })}
        >
          <SearchIcon />
        </IconButton>
        <IconButton
          onClick={(e) => setFilterAnchor(e.currentTarget)}
          sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}
          aria-label="Filtry"
        >
          <Badge badgeContent={activeFilterCount} color="primary">
            <FilterListIcon />
          </Badge>
        </IconButton>
      </Stack>

      {/* ── Search dialog ── */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
          {t('dashboard.map.search_label', { defaultValue: 'Szukaj lokalu lub dania' })}
          <IconButton size="small" onClick={() => setSearchOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Autocomplete
            freeSolo
            openOnFocus
            options={autocompleteOptions}
            groupBy={(opt) => (typeof opt === 'string' ? '' : opt.type === 'restaurant' ? 'Lokale' : 'Dania')}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
            inputValue={search}
            onInputChange={(_, v) => setSearch(v)}
            onChange={(_, v) => {
              if (v && typeof v !== 'string') {
                setSearch(v.label.split(' — ')[0]);
              }
              setSearchOpen(false);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                size="small"
                placeholder={t('dashboard.map.search_placeholder', { defaultValue: 'Nazwa lokalu lub dania...' })}
                sx={{ mt: 1 }}
              />
            )}
            sx={{ mb: 1 }}
          />
          {search && (
            <Chip
              size="small"
              label={`"${search}" ✕`}
              onClick={() => setSearch('')}
              sx={{ mt: 0.5 }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Filter popover ── */}
      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1} sx={{ p: 2, minWidth: '15rem' }}>
          <Typography variant="subtitle2">{t('map.filters_title')}</Typography>
          <Chip clickable color={veganOnly ? 'success' : 'default'} label={t('dashboard.map.vegan_filter')} onClick={() => setVeganOnly((value) => !value)} />
          <Typography variant="caption" color="text.secondary">{t('map.allergens_label')}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" clickable color={allergenFilter === 'all' ? 'default' : 'warning'} label={allergenFilter === 'all' ? t('dashboard.map.allergens_any') : `Bez ${allergenFilter}`} onClick={() => setAllergenFilter('all')} />
            {ALLERGEN_OPTIONS.map((allergen) => (
              <Chip key={allergen} size="small" clickable color={allergenFilter === allergen ? 'warning' : 'default'} label={`Bez ${allergen}`} onClick={() => setAllergenFilter(allergen)} />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">{t('map.traits_label')}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {GBP_FILTERS.map((filter) => (
              <Chip key={filter.key} size="small" clickable color={traitFilters.includes(filter.key) ? 'secondary' : 'default'} label={filter.label} onClick={() => toggleTrait(filter.key)} />
            ))}
          </Stack>
        </Stack>
      </Popover>

      {/* ── Active search indicator ── */}
      {search && (
        <Box sx={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10 }}>
          <Chip
            size="small"
            label={`"${search}" ✕`}
            onClick={() => setSearch('')}
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, position: 'relative' }}>
          {/* Always render map container so Google Maps can initialize */}
          <Box
            ref={mapContainerRef}
            sx={{ position: 'absolute', inset: 0 }}
          />
          {/* Overlay: loading / error states */}
          {(loading || metaLoading || !mapsReady || mapError) && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'background.default', zIndex: 1 }}>
              {mapError ? (
                <Typography color="error.main" sx={{ maxWidth: '40rem', textAlign: 'center' }}>{mapError}</Typography>
              ) : (
                <CircularProgress />
              )}
            </Box>
          )}
      </Box>
      
      {selectedRestaurant && uid && (
        <RestaurantDetailView
          uid={uid}
          restaurant={selectedRestaurant}
          lang={lang}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
    </Box>
  );
}
