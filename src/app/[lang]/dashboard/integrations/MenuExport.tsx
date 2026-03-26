'use client';

/**
 * MenuExport — exports the restaurant menu to external platforms:
 *   - Google Maps Business (via GBP Food Menu API / manual paste)
 *   - pyszne.pl (JSON/CSV download)
 *   - Bolt Food (JSON download)
 *
 * All three platforms lack a public REST API accessible from a browser,
 * so this component generates a structured export file the user can
 * upload / paste into each platform's partner portal.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, CardActions,
  Button, Chip, CircularProgress, Divider, Alert,
  List, ListItem, ListItemText, Avatar,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useNotification } from '@/app/[lang]/components/Notification';
import { useGBPIntegration } from '@/lib/hooks/useGBPIntegration';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import {
  getMenuCategoryDescription,
  getMenuCategoryName,
  getMenuItemDescription,
  getMenuItemName,
} from '@/types/organization';
import type {
  GoogleBusinessProfileLocationSummary,
  MenuCategory,
  MenuItem as MenuItemType,
} from '@/types/organization';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildJsonExport(
  categories: (MenuCategory & { items: MenuItemType[] })[],
  restaurantName: string,
  language: string,
  fallbackLanguage = 'pl',
) {
  return {
    restaurant: restaurantName,
    language,
    exportedAt: new Date().toISOString(),
    menu: categories.map((cat) => ({
      category: getMenuCategoryName(cat, language, fallbackLanguage),
      description: getMenuCategoryDescription(cat, language, fallbackLanguage) ?? '',
      items: cat.items.map((item) => ({
        name: getMenuItemName(item, language, fallbackLanguage),
        description: getMenuItemDescription(item, language, fallbackLanguage) ?? '',
        price: item.price,
        lowestPriceLast30Days: item.lowestPriceLast30Days ?? null,
        currency: item.currency ?? 'PLN',
        allergens: item.allergens ?? [],
        itemType: item.itemType ?? null,
        tags: item.tags ?? [],
        weight: item.weight ?? null,
        preparationTimeMin: item.basePrepTime ?? item.targetPrepTime ?? null,
        visible: item.visible,
        image: item.image ?? null,
      })),
    })),
  };
}

function buildCsvExport(
  categories: (MenuCategory & { items: MenuItemType[] })[],
  language: string,
  fallbackLanguage = 'pl',
  header = 'Category;Name;Description;Price;Lowest price 30 days;Currency;Type;Tags;Allergens;Available',
  yesLabel = 'YES',
  noLabel = 'NO',
) {
  const rows = categories.flatMap((cat) =>
    cat.items.map((item) => [
      `"${getMenuCategoryName(cat, language, fallbackLanguage)}"`,
      `"${getMenuItemName(item, language, fallbackLanguage)}"`,
      `"${(getMenuItemDescription(item, language, fallbackLanguage) ?? '').replace(/"/g, '""')}"`,
      item.price.toFixed(2),
      item.lowestPriceLast30Days?.toFixed(2) ?? '',
      item.currency ?? 'PLN',
      item.itemType ?? '',
      `"${(item.tags ?? []).join(', ')}"`,
      `"${(item.allergens ?? []).join(', ')}"`,
      item.visible ? yesLabel : noLabel,
    ].join(';')),
  );
  return [header, ...rows].join('\n');
}

/** Google structured menu JSON (subset of GBP Food Menu schema) */
function buildGBPJson(
  categories: (MenuCategory & { items: MenuItemType[] })[],
  restaurantName: string,
  language: string,
  fallbackLanguage = 'pl',
  selectedLocationId?: string,
) {
  const publishedCategories = categories
    .filter((category) => category.visible !== false)
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => item.visible && item.gbp?.publish !== false,
      ),
    }))
    .filter((category) => category.items.length > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: restaurantName,
    inLanguage: language,
    identifier: selectedLocationId ?? undefined,
    hasMenu: {
      '@type': 'Menu',
      name: `${restaurantName} menu`,
      inLanguage: language,
      hasMenuSection: publishedCategories.map((cat) => ({
        '@type': 'MenuSection',
        name: (cat as any).gbp?.sectionOverride ?? getMenuCategoryName(cat, language, fallbackLanguage),
        description: getMenuCategoryDescription(cat, language, fallbackLanguage) ?? undefined,
        hasMenuItem: cat.items.map((item) => ({
          '@type': 'MenuItem',
          name: getMenuItemName(item, language, fallbackLanguage),
          description: getMenuItemDescription(item, language, fallbackLanguage) ?? '',
          category: item.itemType ?? undefined,
          offers: {
            '@type': 'Offer',
            price: item.price.toFixed(2),
            priceCurrency: item.currency ?? 'PLN',
            availability: item.visible
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
          suitableForDiet: [
            item.dietary?.vegetarian ? 'https://schema.org/VegetarianDiet' : null,
            item.dietary?.vegan ? 'https://schema.org/VeganDiet' : null,
            item.dietary?.glutenFree ? 'https://schema.org/GlutenFreeDiet' : null,
          ].filter(Boolean),
          additionalProperty: [
            item.lowestPriceLast30Days != null
              ? {
                  '@type': 'PropertyValue',
                  name: 'lowestPriceLast30Days',
                  value: item.lowestPriceLast30Days.toFixed(2),
                }
              : null,
            item.weight
              ? {
                  '@type': 'PropertyValue',
                  name: 'weight',
                  value: `${item.weight.value} ${item.weight.unit}`,
                }
              : null,
            item.basePrepTime != null || item.targetPrepTime != null
              ? {
                  '@type': 'PropertyValue',
                  name: 'preparationTimeMinutes',
                  value: item.basePrepTime ?? item.targetPrepTime,
                }
              : null,
            item.tags?.length
              ? {
                  '@type': 'PropertyValue',
                  name: 'tags',
                  value: item.tags.join(', '),
                }
              : null,
          ].filter(Boolean),
        })),
      })),
    },
  };
}

// ─── Platform configs ─────────────────────────────────────────────────────────

interface Platform {
  id: string;
  nameKey: string;
  avatar: string;
  color: string;
  descriptionKey: string;
  format: string;
  portalUrl: string;
  portalLabelKey: string;
  hintKey: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'google-maps',
    nameKey: 'export_gmaps_name',
    avatar: 'G',
    color: '#4285F4',
    descriptionKey: 'export_gmaps_desc',
    format: 'JSON',
    portalUrl: 'https://business.google.com',
    portalLabelKey: 'export_gmaps_portal',
    hintKey: 'export_gmaps_hint',
  },
  {
    id: 'pyszne',
    nameKey: 'pyszne',
    avatar: 'P',
    color: '#FF6900',
    descriptionKey: 'export_pyszne_desc',
    format: 'CSV / JSON',
    portalUrl: 'https://restaurant.pyszne.pl',
    portalLabelKey: 'export_pyszne_portal',
    hintKey: 'export_pyszne_hint',
  },
  {
    id: 'bolt-food',
    nameKey: 'bolt_food',
    avatar: 'BF',
    color: '#34D186',
    descriptionKey: 'export_bolt_desc',
    format: 'JSON',
    portalUrl: 'https://food.bolt.eu/pl/restaurants',
    portalLabelKey: 'export_bolt_portal',
    hintKey: 'export_bolt_hint',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenuExport() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const { currentRestaurant, organization } = useOrganization();
  const { showNotification } = useNotification();
  const { status, getLocations } = useGBPIntegration();
  const [loading, setLoading] = useState<string | null>(null);
  const [gbpLocations, setGbpLocations] = useState<GoogleBusinessProfileLocationSummary[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const restPath = organization && currentRestaurant
    ? `organizations/${organization.id}/restaurants/${currentRestaurant.id}`
    : null;
  const menuLanguage = currentRestaurant?.settings?.defaultLanguage ?? 'pl';

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      if (!status.connected) {
        if (active) {
          setGbpLocations([]);
          setSelectedLocationId('');
        }
        return;
      }

      try {
        const locations = await getLocations();
        if (!active) return;
        setGbpLocations(locations);
        setSelectedLocationId((current) => current || locations[0]?.name || '');
      } catch {
        if (!active) return;
        setGbpLocations([]);
      }
    };

    void loadLocations();

    return () => {
      active = false;
    };
  }, [getLocations, status.connected]);

  const loadMenu = useCallback(async () => {
    if (!restPath) return null;
    const [catSnap, itemSnap] = await Promise.all([
      getDocs(query(collection(db, `${restPath}/menuCategories`), orderBy('order'))),
      getDocs(query(collection(db, `${restPath}/menuItems`), orderBy('order'))),
    ]);
    const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory));
    const items = itemSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemType));
    return cats.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) }));
  }, [restPath]);

  const handleExport = async (platformId: string, format: 'json' | 'csv') => {
    if (!currentRestaurant) return;
    setLoading(platformId + format);
    try {
      const categories = await loadMenu();
      if (!categories) { showNotification(t('dashboard.integrations.export_no_connection'), 'error'); return; }

      const name = currentRestaurant.name;
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const ts = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const csvHeader = t('dashboard.integrations.export_csv_header');
        const csvYes = t('dashboard.integrations.export_csv_yes');
        const csvNo = t('dashboard.integrations.export_csv_no');
        downloadFile(`${slug}-menu-${ts}.csv`, buildCsvExport(categories, menuLanguage, 'pl', csvHeader, csvYes, csvNo), 'text/csv;charset=utf-8;');
      } else if (platformId === 'google-maps') {
        const json = JSON.stringify(buildGBPJson(categories, name, menuLanguage, 'pl', selectedLocationId || undefined), null, 2);
        downloadFile(`${slug}-gbp-menu-${ts}.json`, json, 'application/json');
      } else {
        const json = JSON.stringify(buildJsonExport(categories, name, menuLanguage), null, 2);
        downloadFile(`${slug}-menu-${ts}.json`, json, 'application/json');
      }

      showNotification(t('dashboard.integrations.export_file_downloaded'), 'success');
    } catch (err) {
      console.error(err);
      showNotification(t('dashboard.integrations.export_error'), 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCopyJson = async (platformId: string) => {
    if (!currentRestaurant) return;
    setLoading(platformId + 'copy');
    try {
      const categories = await loadMenu();
      if (!categories) return;
      const json = platformId === 'google-maps'
        ? JSON.stringify(buildGBPJson(categories, currentRestaurant.name, menuLanguage, 'pl', selectedLocationId || undefined), null, 2)
        : JSON.stringify(buildJsonExport(categories, currentRestaurant.name, menuLanguage), null, 2);
      await navigator.clipboard.writeText(json);
      showNotification(t('dashboard.integrations.export_json_copied'), 'success');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box>
      <Alert severity={status.connected ? 'success' : 'info'} sx={{ mb: 2 }}>
        {status.connected
          ? t('dashboard.integrations.export_gbp_connected')
          : t('dashboard.integrations.export_no_api')}
      </Alert>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Chip label={t('dashboard.integrations.export_menu_lang').replace('{{lang}}', menuLanguage.toUpperCase())} variant="outlined" />
        {currentRestaurant?.name && <Chip label={t('dashboard.integrations.export_venue').replace('{{name}}', currentRestaurant.name)} variant="outlined" />}
      </Stack>

      {status.connected && gbpLocations.length > 0 && (
        <Box sx={{ mb: 2, maxWidth: 420 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="gbp-location-select-label">{t('dashboard.integrations.export_gbp_location')}</InputLabel>
            <Select
              labelId="gbp-location-select-label"
              value={selectedLocationId}
              label={t('dashboard.integrations.export_gbp_location')}
              onChange={(event) => setSelectedLocationId(event.target.value)}
            >
              {gbpLocations.map((location) => (
                <MenuItem key={location.name} value={location.name}>
                  {location.title ?? location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {PLATFORMS.map((p) => (
          <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
                <Avatar sx={{ bgcolor: p.color, width: 40, height: 40, fontSize: 13, fontWeight: 800 }}>
                  {p.avatar}
                </Avatar>
                <Box>
                  <Typography fontWeight={700} variant="body2">{t(`dashboard.integrations.${p.nameKey}`)}</Typography>
                  <Chip label={p.format} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                </Box>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary" mb={1}>{t(`dashboard.integrations.${p.descriptionKey}`)}</Typography>
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemText
                    primaryTypographyProps={{ variant: 'caption', color: 'text.disabled' }}
                    primary={t(`dashboard.integrations.${p.hintKey}`)}
                  />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, pb: 1.5, px: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={loading === p.id + 'json' ? <CircularProgress size={14} /> : <DownloadIcon />}
                onClick={() => handleExport(p.id, 'json')}
                disabled={!!loading || !restPath}
              >
                JSON
              </Button>
              {p.id === 'pyszne' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={loading === p.id + 'csv' ? <CircularProgress size={14} /> : <DownloadIcon />}
                  onClick={() => handleExport(p.id, 'csv')}
                  disabled={!!loading || !restPath}
                >
                  CSV
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={loading === p.id + 'copy' ? <CircularProgress size={14} /> : <ContentCopyIcon />}
                onClick={() => handleCopyJson(p.id)}
                disabled={!!loading || !restPath}
              >
                {t('dashboard.integrations.export_copy')}
              </Button>
              <Button
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                href={p.portalUrl}
                target="_blank"
                rel="noopener"
              >
                {t(`dashboard.integrations.${p.portalLabelKey}`)}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
