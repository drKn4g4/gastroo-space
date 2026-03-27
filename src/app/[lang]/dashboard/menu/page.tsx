'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Chip, Stack, Divider, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel,
  Menu as MuiMenu, MenuItem as MuiMenuItem, Select, FormControl, InputLabel,
  Paper, Collapse, ListItemIcon,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ScienceIcon from '@mui/icons-material/Science';
import TimerIcon from '@mui/icons-material/Timer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArchiveIcon from '@mui/icons-material/Archive';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  orderBy, query, serverTimestamp, getDocs, where,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import { useNotification } from '@/app/[lang]/components/Notification';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import {
  PERMISSIONS,
  ALLERGEN_LABELS,
  MENU_ITEM_TYPES,
  getMenuCategoryDescription,
  getMenuCategoryName,
  getMenuItemDescription,
  getMenuItemName,
} from '@/types/organization';
import type { AllergenCode } from '@/types/organization';
import { MenuItem as MenuItemType, MenuCategory } from '@/types/organization';
import MenuItemPhotoUpload from '@/app/[lang]/dashboard/components/MenuItemPhotoUpload';
import { useTranslation } from '@/lib/i18n/client';
import { vmin, vw } from '@/styles/units';
import { TEST_IDS } from '@/lib/testing/selectors';

// ── Constants ──────────────────────────────────────────────────────────────────
type CategoryWithItems = MenuCategory & { items: MenuItemType[] };
const ITEM_TYPE_KEYS = MENU_ITEM_TYPES;
type ItemTypeKey = typeof ITEM_TYPE_KEYS[number];
type MacroField = 'calories' | 'protein' | 'fat' | 'carbs' | 'fiber';
type MacroForm = Record<MacroField, string>;
type SortKey = 'default' | 'name' | 'price_asc' | 'price_desc' | 'calories' | 'popular' | 'prep_time';

const ALLERGEN_CODES = Object.keys(ALLERGEN_LABELS) as AllergenCode[];

interface Filters {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  priceMin: string;
  priceMax: string;
  allergens: AllergenCode[];
  categories: string[];
  search: string;
}

const EMPTY_FILTERS: Filters = {
  vegetarian: false, vegan: false, glutenFree: false,
  priceMin: '', priceMax: '', allergens: [], categories: [], search: '',
};

// ── ItemPreviewPanel ───────────────────────────────────────────────────────────
function ItemPreviewPanel({
  item, t, lang,
}: {
  item: MenuItemType | null;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
}) {
  if (!item) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.disabled" variant="body2">{t('menu.preview_empty')}</Typography>
      </Box>
    );
  }
  const macros = item.macros;
  const hasMacros = macros && Object.values(macros).some((v) => v != null);
  const itemName = getMenuItemName(item, lang);
  const itemDescription = getMenuItemDescription(item, lang);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {item.image && (
        <Box sx={{ width: '100%', height: 160, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
          <Image
            src={item.image}
            alt={item.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 1200px) 100vw, 400px"
          />
        </Box>
      )}
      <Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" mb={0.5}>
          {item.itemType && <Chip label={t(`menu.types.${item.itemType}`)} size="small" variant="outlined" />}
          {item.dietary?.vegetarian && <Chip label="🌿" size="small" title={t('menu.item_vegetarian')} />}
          {item.dietary?.vegan && <Chip label="🌱" size="small" title={t('menu.item_vegan')} />}
          {item.dietary?.glutenFree && <Chip label="GF" size="small" title={t('menu.item_gluten_free')} />}
          {!item.visible && <Chip label={t('menu.unavailable_chip')} size="small" color="warning" />}
          {item.recipeId && <Chip icon={<ScienceIcon sx={{ fontSize: `${vmin(14)} !important` }} />} label={t('menu.recipe_chip')} size="small" color="success" variant="outlined" />}
          {item.basePrepTime && <Chip icon={<TimerIcon sx={{ fontSize: `${vmin(14)} !important` }} />} label={`${item.basePrepTime} min`} size="small" variant="outlined" />}
        </Stack>
        <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{itemName}</Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h6" color="primary.main" fontWeight={700} mt={0.25}>{item.price.toFixed(2)} PLN</Typography>
          {item.weight && <Typography variant="body2" color="text.secondary">{item.weight.value} {item.weight.unit}</Typography>}
        </Stack>
      </Box>
      {itemDescription && <Typography variant="body2" color="text.secondary">{itemDescription}</Typography>}
      {item.ingredientsList && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('menu.preview_ingredients')}
          </Typography>
          <Typography variant="body2" mt={0.5}>{item.ingredientsList}</Typography>
        </Box>
      )}
      {hasMacros && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('menu.preview_macros')}
          </Typography>
          <Stack direction="row" spacing={0.75} mt={0.75} flexWrap="wrap">
            {macros?.calories != null && <Chip label={`${macros.calories} kcal`} size="small" />}
            {macros?.protein != null && <Chip label={`${t('menu.protein')} ${macros.protein}`} size="small" />}
            {macros?.fat != null && <Chip label={`${t('menu.fat')} ${macros.fat}`} size="small" />}
            {macros?.carbs != null && <Chip label={`${t('menu.carbs')} ${macros.carbs}`} size="small" />}
            {macros?.fiber != null && <Chip label={`${t('menu.fiber')} ${macros.fiber}`} size="small" />}
          </Stack>
        </Box>
      )}
      {item.allergens && item.allergens.length > 0 && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('menu.preview_allergens')}
          </Typography>
          <Stack direction="row" spacing={0.5} mt={0.75} flexWrap="wrap">
            {(item.allergens as AllergenCode[]).map((a) => {
              const l = ALLERGEN_LABELS[a];
              if (!l) return null;
              const label = (l as Record<string, string>)[lang] ?? l.pl;
              return <Chip key={a} label={`${l.icon} ${label}`} size="small" color="warning" variant="outlined" />;
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

// ── FilterSortBar ──────────────────────────────────────────────────────────────
function FilterSortBar({
  filters, setFilters, sortBy, setSortBy, categories, t,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  categories: CategoryWithItems[];
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.vegetarian, filters.vegan, filters.glutenFree,
    !!filters.priceMin, !!filters.priceMax,
    filters.allergens.length > 0,
    filters.categories.length > 0,
    !!filters.search,
  ].filter(Boolean).length;

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'default', label: t('menu.sort_default') },
    { key: 'name', label: t('menu.sort_name') },
    { key: 'price_asc', label: t('menu.sort_price_asc') },
    { key: 'price_desc', label: t('menu.sort_price_desc') },
    { key: 'calories', label: t('menu.sort_calories') },
    { key: 'popular', label: t('menu.sort_popular') },
    { key: 'prep_time', label: t('menu.sort_prep_time') },
  ];

  const toggle = (field: 'vegetarian' | 'vegan' | 'glutenFree') =>
    setFilters((f) => ({ ...f, [field]: !f[field] }));

  const toggleAllergen = (a: AllergenCode) =>
    setFilters((f) => ({
      ...f,
      allergens: f.allergens.includes(a) ? f.allergens.filter((x) => x !== a) : [...f.allergens, a],
    }));

  const toggleCategory = (id: string) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((x) => x !== id) : [...f.categories, id],
    }));

  return (
    <Box mb={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button
          size="small"
          startIcon={<FilterListIcon />}
          variant={activeCount > 0 ? 'contained' : 'outlined'}
          onClick={() => setOpen((o) => !o)}
        >
          {activeCount > 0 ? t('menu.filters_active', { count: activeCount }) : t('menu.filters')}
        </Button>

        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel shrink>{t('menu.sort_label')}</InputLabel>
          <Select
            value={sortBy}
            label={t('menu.sort_label')}
            startAdornment={<SortIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            notched
          >
            {SORT_OPTIONS.map((o) => <MuiMenuItem key={o.key} value={o.key}>{o.label}</MuiMenuItem>)}
          </Select>
        </FormControl>

        {activeCount > 0 && (
          <Button size="small" color="inherit" onClick={() => setFilters(EMPTY_FILTERS)}>
            {t('menu.clear_filters')}
          </Button>
        )}
      </Stack>

      <Collapse in={open}>
        <Paper variant="outlined" sx={{ p: 2, mt: 1.5, borderRadius: 2 }}>
          <Stack spacing={2}>
            {/* Dietary toggles */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('menu.dietary_flags')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {([
                  ['vegetarian', '🌿 ' + t('menu.filter_vegetarian')],
                  ['vegan', '🌱 ' + t('menu.filter_vegan')],
                  ['glutenFree', t('menu.filter_gluten_free')],
                ] as [keyof Pick<Filters, 'vegetarian' | 'vegan' | 'glutenFree'>, string][]).map(([field, label]) => (
                  <Chip
                    key={field}
                    label={label}
                    size="small"
                    onClick={() => toggle(field)}
                    color={filters[field] ? 'primary' : 'default'}
                    variant={filters[field] ? 'filled' : 'outlined'}
                    clickable
                  />
                ))}
              </Stack>
            </Box>

            {/* Price range */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('menu.filter_price')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small" label={t('menu.filter_price_min')} type="number"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                  sx={{ width: 120 }} slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                />
                <TextField
                  size="small" label={t('menu.filter_price_max')} type="number"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                  sx={{ width: 120 }} slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                />
              </Stack>
            </Box>

            {/* Categories */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('menu.filter_categories')}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {categories.map((c) => (
                  <Chip
                    key={c.id} label={c.name} size="small" clickable
                    onClick={() => toggleCategory(c.id)}
                    color={filters.categories.includes(c.id) ? 'primary' : 'default'}
                    variant={filters.categories.includes(c.id) ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            {/* Allergen exclusion */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('menu.filter_allergens')}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {ALLERGEN_CODES.map((a) => {
                  const l = ALLERGEN_LABELS[a];
                  return (
                    <Chip
                      key={a} label={`${l.icon} ${l.pl}`} size="small" clickable
                      onClick={() => toggleAllergen(a)}
                      color={filters.allergens.includes(a) ? 'warning' : 'default'}
                      variant={filters.allergens.includes(a) ? 'filled' : 'outlined'}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Ingredient search */}
            <TextField
              size="small" label={t('menu.filter_ingredients')}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              fullWidth
            />
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
}

// ── MenuPageContent ────────────────────────────────────────────────────────────
function MenuPageContent() {
  const { currentRestaurant, organization, member, hasPermission } = useOrganization();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang = params.lang ?? 'pl';
  const sp = useSearchParams();
  const focusMenuItemId = sp?.get('menuItemId');
  const { t } = useTranslation(lang, 'menu');
  const menuLanguage = currentRestaurant?.settings?.defaultLanguage ?? 'pl';

  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>('default');

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');

  // Item dialog
  const [itemDialog, setItemDialog] = useState<{ open: boolean; categoryId: string; item?: MenuItemType }>({ open: false, categoryId: '' });
  type WeightUnit = 'g' | 'kg' | 'ml' | 'l' | 'szt' | 'op' | 'por';
  const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
    { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' }, { value: 'l', label: 'L' },
    { value: 'szt', label: 'szt.' }, { value: 'op', label: 'op.' }, { value: 'por', label: 'por.' },
  ];

  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', visible: true, image: '',
    itemType: '' as ItemTypeKey | '', categoryId: '',
    ingredientsList: '',
    weightValue: '', weightUnit: 'g' as WeightUnit,
    macros: { calories: '', protein: '', fat: '', carbs: '', fiber: '' } as MacroForm,
    dietary: { vegetarian: false, vegan: false, glutenFree: false },
    allergens: [] as AllergenCode[],
  });

  // Header "Dodaj" dropdown
  const [addAnchorEl, setAddAnchorEl] = useState<HTMLElement | null>(null);

  // Item action ("...") menu
  const [actionMenu, setActionMenu] = useState<{ el: HTMLElement; item: MenuItemType } | null>(null);

  const normalizedEmail = (user?.email ?? '').toLowerCase();
  const isDemoManagerAccount = [
    'admin@gastroo.dev',
    'manager@gastroo.dev',
    'kucharz@gastroo.dev',
    'supervisor@gastroo.dev',
    'barman@gastroo.dev',
  ].includes(normalizedEmail);

  const effectiveOrganizationId = organization?.id ?? (isDemoManagerAccount ? 'demo-org' : null);
  const effectiveRestaurantId = currentRestaurant?.id ?? member?.restaurantIds?.[0] ?? (isDemoManagerAccount ? 'demo-bistro' : null);
  const restPath = effectiveOrganizationId && effectiveRestaurantId
    ? `organizations/${effectiveOrganizationId}/restaurants/${effectiveRestaurantId}`
    : null;

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    if (!restPath) { setLoading(false); return; }
    setLoading(true);
    const catQ = query(collection(db, `${restPath}/menuCategories`), orderBy('order'));
    const itemQ = query(collection(db, `${restPath}/menuItems`), orderBy('order'));
    let cats: MenuCategory[] = [];
    let items: MenuItemType[] = [];
    const merge = () => {
      setCategories(cats.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) })));
      setLoading(false);
    };
    type SD = { docs: { id: string; data(): Record<string, unknown> }[] };
    const u1 = safeOnSnapshot(catQ, (s) => { cats = (s as unknown as SD).docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory)); merge(); });
    const u2 = safeOnSnapshot(itemQ, (s) => { items = (s as unknown as SD).docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemType)); merge(); });
    return () => { if (u1) u1(); if (u2) u2(); };
  }, [restPath]);

  useEffect(() => { const unsub = loadData(); return unsub; }, [loadData]);

  useEffect(() => {
    if (!selectedItem) return;
    const updated = categories.flatMap((c) => c.items).find((i) => i.id === selectedItem.id);
    if (updated) setSelectedItem(updated);
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter + Sort ────────────────────────────────────────────────────────────
  const applyFiltersAndSort = useCallback((items: MenuItemType[]): MenuItemType[] => {
    let out = items.filter((i) => {
      if (i.archived) return false;
      if (filters.vegetarian && !i.dietary?.vegetarian) return false;
      if (filters.vegan && !i.dietary?.vegan) return false;
      if (filters.glutenFree && !i.dietary?.glutenFree) return false;
      if (filters.priceMin && i.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && i.price > parseFloat(filters.priceMax)) return false;
      if (filters.allergens.length > 0 && filters.allergens.some((a) => (i.allergens ?? []).includes(a))) return false;
      if (filters.search && !i.ingredientsList?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
    if (sortBy === 'name') out = [...out].sort((a, b) => getMenuItemName(a, lang, menuLanguage).localeCompare(getMenuItemName(b, lang, menuLanguage)));
    else if (sortBy === 'price_asc') out = [...out].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') out = [...out].sort((a, b) => b.price - a.price);
    else if (sortBy === 'calories') out = [...out].sort((a, b) => (b.macros?.calories ?? 0) - (a.macros?.calories ?? 0));
    else if (sortBy === 'popular') out = [...out].sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0));
    else if (sortBy === 'prep_time') out = [...out].sort((a, b) => (a.basePrepTime ?? 999) - (b.basePrepTime ?? 999));
    return out;
  }, [filters, sortBy, lang, menuLanguage]);

  const processedCategories = useMemo(() => {
    let cats = categories;
    if (filters.categories.length > 0) cats = cats.filter((c) => filters.categories.includes(c.id));
    return cats.map((c) => ({ ...c, items: applyFiltersAndSort(c.items) })).filter((c) => c.items.length > 0);
  }, [categories, filters.categories, applyFiltersAndSort]);

  useEffect(() => {
    if (!focusMenuItemId) return;
    const found = processedCategories.flatMap((c) => c.items).find((i) => i.id === focusMenuItemId);
    if (!found) return;
    setSelectedItem(found);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-menu-item-id="${focusMenuItemId}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [focusMenuItemId, processedCategories]);

  // ── Category handlers ────────────────────────────────────────────────────────
  const openAddCategory = () => { setEditingCat(null); setCatName(''); setCatDescription(''); setCatDialog(true); };
  const openEditCategory = (cat: MenuCategory) => {
    setEditingCat(cat);
    setCatName(getMenuCategoryName(cat, lang, menuLanguage));
    setCatDescription(getMenuCategoryDescription(cat, lang, menuLanguage) ?? '');
    setCatDialog(true);
  };

  const saveCategory = async () => {
    if (!restPath || !catName.trim()) return;
    const trimmedName = catName.trim();
    const trimmedDescription = catDescription.trim();
    const translations = {
      name: {
        ...(editingCat?.translations?.name ?? {}),
        [lang]: trimmedName,
      },
      description: trimmedDescription
        ? {
            ...(editingCat?.translations?.description ?? {}),
            [lang]: trimmedDescription,
          }
        : (editingCat?.translations?.description ?? undefined),
    };
    try {
      if (editingCat) {
        await updateDoc(doc(db, `${restPath}/menuCategories`, editingCat.id), {
          name: lang === menuLanguage ? trimmedName : editingCat.name,
          description: lang === menuLanguage ? (trimmedDescription || null) : (editingCat.description ?? null),
          translations,
        });
        showNotification(t('menu.cat_updated'), 'success');
      } else {
        await addDoc(collection(db, `${restPath}/menuCategories`), {
          name: trimmedName,
          description: trimmedDescription || null,
          translations,
          order: categories.length, visible: true, restaurantId: effectiveRestaurantId, createdAt: serverTimestamp(),
        });
        showNotification(t('menu.cat_added'), 'success');
      }
      setCatDialog(false);
    } catch { showNotification(t('menu.cat_save_error'), 'error'); }
  };

  const toggleCategoryVisibility = async (cat: MenuCategory) => {
    if (!restPath) return;
    try {
      await updateDoc(doc(db, `${restPath}/menuCategories`, cat.id), { visible: cat.visible === false ? true : false });
    } catch { showNotification(t('menu.category_toggle_error'), 'error'); }
  };

  const deleteCategory = async (catId: string) => {
    if (!restPath || !window.confirm(t('menu.delete_cat_confirm'))) return;
    try {
      const defaultCategoryName = t('menu.default_category');
      const snap = await getDocs(query(collection(db, `${restPath}/menuCategories`), where('name', '==', defaultCategoryName)));
      let ogolneId: string;
      if (!snap.empty) {
        ogolneId = snap.docs[0].id;
      } else {
        const ref = await addDoc(collection(db, `${restPath}/menuCategories`), {
          name: defaultCategoryName, description: null, order: categories.length, visible: true,
          restaurantId: effectiveRestaurantId, createdAt: serverTimestamp(),
        });
        ogolneId = ref.id;
      }
      const cat = categories.find((c) => c.id === catId);
      if (cat) await Promise.all(cat.items.map((i) => updateDoc(doc(db, `${restPath}/menuItems`, i.id), { categoryId: ogolneId })));
      await deleteDoc(doc(db, `${restPath}/menuCategories`, catId));
      showNotification(t('menu.cat_deleted'), 'success');
    } catch { showNotification(t('menu.cat_delete_error'), 'error'); }
  };

  // ── Item handlers ────────────────────────────────────────────────────────────
  const resetItemForm = (itemType: ItemTypeKey | '' = '', categoryId = '') =>
    setItemForm({ name: '', description: '', price: '', visible: true, image: '', itemType: itemType as ItemTypeKey | '', categoryId, ingredientsList: '', weightValue: '', weightUnit: 'g' as WeightUnit, macros: { calories: '', protein: '', fat: '', carbs: '', fiber: '' } as MacroForm, dietary: { vegetarian: false, vegan: false, glutenFree: false }, allergens: [] });

  const openAddItem = (itemType: ItemTypeKey | '' = '', categoryId = '') => { setItemDialog({ open: true, categoryId }); resetItemForm(itemType, categoryId); };

  const openEditItem = (item: MenuItemType) => {
    setItemDialog({ open: true, categoryId: item.categoryId, item });
    setItemForm({
      name: getMenuItemName(item, lang, menuLanguage), description: getMenuItemDescription(item, lang, menuLanguage) ?? '', price: item.price.toString(),
      visible: item.visible, image: item.image ?? '',
      itemType: (item.itemType as ItemTypeKey | '') ?? '', categoryId: item.categoryId,
      ingredientsList: item.ingredientsList ?? '',
      weightValue: item.weight?.value?.toString() ?? '', weightUnit: (item.weight?.unit ?? 'g') as WeightUnit,
      macros: {
        calories: item.macros?.calories?.toString() ?? '', protein: item.macros?.protein?.toString() ?? '',
        fat: item.macros?.fat?.toString() ?? '', carbs: item.macros?.carbs?.toString() ?? '', fiber: item.macros?.fiber?.toString() ?? '',
      },
      dietary: { vegetarian: item.dietary?.vegetarian ?? false, vegan: item.dietary?.vegan ?? false, glutenFree: item.dietary?.glutenFree ?? false },
      allergens: (item.allergens ?? []) as AllergenCode[],
    });
  };

  const parseMacro = (val: string) => { const n = parseFloat(val); return isNaN(n) ? undefined : n; };

  const saveItem = async () => {
    if (!restPath || !itemForm.name.trim()) return;
    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price < 0) { showNotification(t('menu.price_error'), 'warning'); return; }
    const resolvedCatId = itemForm.categoryId || itemDialog.categoryId;
    if (!itemDialog.item && !resolvedCatId) { showNotification(t('menu.select_category_warning'), 'warning'); return; }
    const trimmedName = itemForm.name.trim();
    const trimmedDescription = itemForm.description.trim();
    const macros = { calories: parseMacro(itemForm.macros.calories), protein: parseMacro(itemForm.macros.protein), fat: parseMacro(itemForm.macros.fat), carbs: parseMacro(itemForm.macros.carbs), fiber: parseMacro(itemForm.macros.fiber) };
    const hasMacros = Object.values(macros).some((v) => v != null);
    try {
      const payload = {
        name: lang === menuLanguage && itemDialog.item ? trimmedName : (itemDialog.item?.name ?? trimmedName),
        description: lang === menuLanguage && itemDialog.item ? (trimmedDescription || null) : (itemDialog.item?.description ?? (trimmedDescription || null)),
        translations: {
          name: {
            ...(itemDialog.item?.translations?.name ?? {}),
            [lang]: trimmedName,
          },
          description: trimmedDescription
            ? {
                ...(itemDialog.item?.translations?.description ?? {}),
                [lang]: trimmedDescription,
              }
            : (itemDialog.item?.translations?.description ?? undefined),
        },
        price,
        visible: itemForm.visible, available: itemForm.visible,
        image: itemForm.image || null,
        itemType: itemForm.itemType || null, ingredientsList: itemForm.ingredientsList.trim() || null,
        weight: itemForm.weightValue ? { value: parseFloat(itemForm.weightValue), unit: itemForm.weightUnit } : null,
        macros: hasMacros ? macros : null, categoryId: resolvedCatId,
        dietary: { vegetarian: itemForm.dietary.vegetarian || null, vegan: itemForm.dietary.vegan || null, glutenFree: itemForm.dietary.glutenFree || null },
        allergens: itemForm.allergens,
      };
      if (itemDialog.item) {
        await updateDoc(doc(db, `${restPath}/menuItems`, itemDialog.item.id), payload);
        showNotification(t('menu.item_updated'), 'success');
      } else {
        const cat = categories.find((c) => c.id === resolvedCatId);
        await addDoc(collection(db, `${restPath}/menuItems`), { ...payload, currency: 'PLN', order: cat?.items.length ?? 0, restaurantId: effectiveRestaurantId, createdAt: serverTimestamp() });
        showNotification(t('menu.item_added'), 'success');
      }
      setItemDialog({ open: false, categoryId: '' });
    } catch { showNotification(t('menu.item_save_error'), 'error'); }
  };

  const archiveItem = async (itemId: string) => {
    if (!restPath || !window.confirm(t('menu.archive_confirm'))) return;
    try {
      await updateDoc(doc(db, `${restPath}/menuItems`, itemId), { archived: true, visible: false });
      if (selectedItem?.id === itemId) setSelectedItem(null);
      showNotification(t('menu.archived_success'), 'info');
    } catch { showNotification(t('menu.archive_error'), 'error'); }
  };

  const deleteItem = async (itemId: string) => {
    if (!restPath || !window.confirm(t('menu.delete_confirm'))) return;
    try {
      await deleteDoc(doc(db, `${restPath}/menuItems`, itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
      showNotification(t('menu.deleted_success'), 'info');
    } catch { showNotification(t('menu.delete_error'), 'error'); }
  };

  const duplicateItem = async (item: MenuItemType) => {
    if (!restPath) return;
    try {
      const cat = categories.find((c) => c.id === item.categoryId);
      await addDoc(collection(db, `${restPath}/menuItems`), {
        name: `${item.name} ${t('menu.duplicate_suffix')}`, description: item.description ?? null,
        translations: item.translations ?? null,
        price: item.price, visible: false, available: false, image: item.image ?? null,
        itemType: item.itemType ?? null, ingredientsList: item.ingredientsList ?? null,
        macros: item.macros ?? null, categoryId: item.categoryId,
        dietary: { vegetarian: item.dietary?.vegetarian ?? null, vegan: item.dietary?.vegan ?? null, glutenFree: item.dietary?.glutenFree ?? null },
        allergens: item.allergens ?? [], currency: 'PLN',
        order: (cat?.items.length ?? 0) + 1, restaurantId: effectiveRestaurantId, createdAt: serverTimestamp(),
      });
      showNotification(t('menu.item_added'), 'success');
    } catch { showNotification(t('menu.item_save_error'), 'error'); }
  };

  const toggleAvailable = async (item: MenuItemType) => {
    if (!restPath) return;
    try { await updateDoc(doc(db, `${restPath}/menuItems`, item.id), { visible: !item.visible, available: !item.visible }); }
    catch { showNotification(t('menu.toggle_error'), 'error'); }
  };

  const showMissingRestaurantNotice = !currentRestaurant;
  const demoManageEmails = new Set([
    'admin@gastroo.dev',
    'manager@gastroo.dev',
    'kucharz@gastroo.dev',
    'supervisor@gastroo.dev',
    'barman@gastroo.dev',
  ]);
  const cachedStaffRole = typeof window !== 'undefined'
    ? localStorage.getItem('gastroo_staff_role')
    : null;
  const cachedRoleCanManageMenu = cachedStaffRole != null && !['waiter', 'staff', 'cashier'].includes(cachedStaffRole);
  const hasMenuManageAccess =
    hasPermission(PERMISSIONS.MENU_MANAGE) ||
    cachedRoleCanManageMenu ||
    (!!user?.email && demoManageEmails.has(user.email.toLowerCase()));

  const MACRO_FIELDS: { key: MacroField; label: string }[] = [
    { key: 'calories', label: t('menu.calories') }, { key: 'protein', label: t('menu.protein') },
    { key: 'fat', label: t('menu.fat') }, { key: 'carbs', label: t('menu.carbs') }, { key: 'fiber', label: t('menu.fiber') },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MenuBookIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>{t('menu.title')}</Typography>
        </Stack>
        {hasMenuManageAccess && (!!currentRestaurant || categories.length > 0) && (
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setAddAnchorEl(e.currentTarget)}
              data-testid={TEST_IDS.menu.addMenuButton}
            >
              {t('menu.add')}
            </Button>
            <MuiMenu anchorEl={addAnchorEl} open={Boolean(addAnchorEl)} onClose={() => setAddAnchorEl(null)}>
              <MuiMenuItem
                data-testid={TEST_IDS.menu.addCategoryMenuItem}
                onClick={() => { setAddAnchorEl(null); openAddCategory(); }}
              >
                {t('menu.category')}
              </MuiMenuItem>
              <Divider />
              {ITEM_TYPE_KEYS.map((k) => (
                <MuiMenuItem
                  key={k}
                  data-testid={TEST_IDS.menu.addItemMenuItem(k)}
                  onClick={() => { setAddAnchorEl(null); openAddItem(k); }}
                >
                  {t(`menu.types.${k}`)}
                </MuiMenuItem>
              ))}
            </MuiMenu>
          </>
        )}
      </Stack>

      {showMissingRestaurantNotice && (
        <Box sx={{ mb: 2 }}>
          <Typography color="warning.main" variant="body2">{t('menu.no_restaurant')}</Typography>
          {hasMenuManageAccess && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={openAddCategory}
              data-testid={TEST_IDS.menu.firstCategoryButton}
              sx={{ mt: 1 }}
            >
              {t('menu.first_category_btn')}
            </Button>
          )}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: `1fr ${vw(340)}` }, gap: 2, alignItems: 'flex-start' }}>

          {/* ── Left: filters + accordion list ── */}
          <Box>
            <FilterSortBar filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} categories={categories} t={t} />

            {categories.length === 0 ? (
              <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>{t('menu.empty')}</Typography>
                {hasMenuManageAccess && !currentRestaurant && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAddCategory}
                    data-testid={TEST_IDS.menu.firstCategoryButton}
                    sx={{ mt: 2 }}
                  >
                    {t('menu.first_category_btn')}
                  </Button>
                )}
              </Card>
            ) : processedCategories.length === 0 ? (
              <Typography color="text.disabled" sx={{ py: 6, textAlign: 'center' }}>{t('menu.no_results')}</Typography>
            ) : (
              <Stack spacing={2}>
                {processedCategories.map((cat) => (
                  <Accordion key={cat.id} defaultExpanded sx={{ opacity: cat.visible === false ? 0.7 : 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, mr: 1 }}>
                        <Typography fontWeight={600}>{getMenuCategoryName(cat, lang, menuLanguage)}</Typography>
                        <Chip label={t('menu.item_count', { count: cat.items.length })} size="small" />
                        {cat.visible === false && (
                          <Chip label={t('menu.category_hidden_chip')} size="small" color="default" icon={<VisibilityOffIcon sx={{ fontSize: `${vmin(14)} !important` }} />} />
                        )}
                      </Stack>
                      <Stack direction="row" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={t('menu.open_details', { defaultValue: 'Szczegóły' })}>
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/${lang}/dashboard/menuCategories/${encodeURIComponent(cat.id)}`)}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <PermissionGate permission={PERMISSIONS.MENU_MANAGE}>
                          <Tooltip title={cat.visible === false ? t('menu.category_visibility_on') : t('menu.category_visibility_off')}>
                            <IconButton size="small" onClick={() => toggleCategoryVisibility(cat)}>
                              {cat.visible === false ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('menu.edit_category')}>
                            <IconButton size="small" onClick={() => openEditCategory(cat)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={t('menu.delete_category')}>
                            <IconButton size="small" color="error" onClick={() => deleteCategory(cat.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </PermissionGate>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <Divider />
                      {cat.items.map((item) => (
                        <Card
                          key={item.id} variant="outlined"
                          onClick={() => setSelectedItem(item)}
                          sx={{
                            m: 1.5, borderRadius: 2, cursor: 'pointer',
                            opacity: item.visible ? 1 : 0.6,
                            borderColor: selectedItem?.id === item.id ? 'primary.main' : undefined,
                            transition: 'border-color 0.15s',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                          data-menu-item-id={item.id}
                        >
                          {item.image && (
                            <Box sx={{ width: '100%', height: 100, position: 'relative', overflow: 'hidden', borderRadius: `${vmin(8)} ${vmin(8)} 0 0` }}>
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                sizes="(max-width: 1200px) 100vw, 400px"
                              />
                            </Box>
                          )}
                          <CardContent sx={{ pb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                                  <Typography fontWeight={600}>{getMenuItemName(item, lang, menuLanguage)}</Typography>
                                  {item.itemType && <Chip label={t(`menu.types.${item.itemType}`)} size="small" variant="outlined" />}
                                  {item.dietary?.vegetarian && <Chip label="🌿" size="small" title={t('menu.item_vegetarian')} />}
                                  {item.dietary?.vegan && <Chip label="🌱" size="small" title={t('menu.item_vegan')} />}
                                  {item.dietary?.glutenFree && <Chip label="GF" size="small" title={t('menu.item_gluten_free')} />}
                                  {!item.visible && <Chip label={t('menu.unavailable_chip')} size="small" color="warning" />}
                                  {item.recipeId && <Chip icon={<ScienceIcon sx={{ fontSize: `${vmin(14)} !important` }} />} label={t('menu.recipe_chip')} size="small" color="success" variant="outlined" />}
                                  {item.basePrepTime && <Chip icon={<TimerIcon sx={{ fontSize: `${vmin(14)} !important` }} />} label={`${item.basePrepTime} min`} size="small" variant="outlined" />}
                                </Stack>
                                {getMenuItemDescription(item, lang, menuLanguage) && (
                                  <Typography variant="body2" color="text.secondary" mt={0.25} noWrap>{getMenuItemDescription(item, lang, menuLanguage)}</Typography>
                                )}
                              </Box>
                              <Typography fontWeight={700} color="primary.main" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                                {item.price.toFixed(2)} PLN
                              </Typography>
                            </Stack>
                          </CardContent>
                          <PermissionGate permission={PERMISSIONS.MENU_MANAGE}>
                            <CardActions sx={{ pt: 0 }} onClick={(e) => e.stopPropagation()}>
                              <Tooltip title={item.visible ? t('menu.disable') : t('menu.enable')}>
                                <IconButton size="small" onClick={() => toggleAvailable(item)} color={item.visible ? 'success' : 'default'}>
                                  {item.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('menu.more_actions')}>
                                <IconButton size="small" onClick={(e) => setActionMenu({ el: e.currentTarget, item })}>
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </CardActions>
                          </PermissionGate>
                        </Card>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            )}
          </Box>

          {/* ── Right: sticky preview ── */}
          <Paper variant="outlined" sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 72, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('menu.preview_title')}
              </Typography>
            </Box>
            <ItemPreviewPanel item={selectedItem} t={t} lang={lang} />
          </Paper>
        </Box>
      )}

      {/* Item action ("...") menu */}
      <MuiMenu anchorEl={actionMenu?.el} open={Boolean(actionMenu)} onClose={() => setActionMenu(null)}>
        <MuiMenuItem onClick={() => { const it = actionMenu!.item; setActionMenu(null); openEditItem(it); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          {t('menu.edit')}
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { const it = actionMenu!.item; setActionMenu(null); duplicateItem(it); }}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          {t('menu.duplicate')}
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem onClick={() => { const id = actionMenu!.item.id; setActionMenu(null); archiveItem(id); }} sx={{ color: 'warning.main' }}>
          <ListItemIcon><ArchiveIcon fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
          {t('menu.archive_btn')}
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { const id = actionMenu!.item.id; setActionMenu(null); deleteItem(id); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          {t('menu.delete_btn')}
        </MuiMenuItem>
      </MuiMenu>

      {/* Category Dialog */}
      <Dialog open={catDialog} onClose={() => setCatDialog(false)} maxWidth="xs" fullWidth data-testid={TEST_IDS.menu.categoryDialog}>
        <DialogTitle>{editingCat ? t('menu.edit_category') : t('menu.new_category')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={t('menu.cat_name')}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              fullWidth
              autoFocus
              required
              inputProps={{ 'data-testid': TEST_IDS.menu.categoryNameInput }}
            />
            <TextField
              label={t('menu.cat_desc')}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              inputProps={{ 'data-testid': TEST_IDS.menu.categoryDescriptionInput }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button data-testid={TEST_IDS.menu.dialogCancelButton} onClick={() => setCatDialog(false)}>{t('menu.cancel')}</Button>
          <Button data-testid={TEST_IDS.menu.dialogSaveButton} variant="contained" onClick={saveCategory} disabled={!catName.trim()}>{t('menu.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Item Dialog */}
      <Dialog
        open={itemDialog.open}
        onClose={() => setItemDialog({ open: false, categoryId: '' })}
        maxWidth="sm"
        fullWidth
        data-testid={TEST_IDS.menu.itemDialog}
      >
        <DialogTitle>
          {itemDialog.item ? t('menu.edit_item') : itemForm.itemType ? t('menu.new_item_type', { type: t(`menu.types.${itemForm.itemType}`) }) : t('menu.new_item')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {/* Category + Type */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <FormControl size="small" required={!itemDialog.item}>
                <InputLabel>{t('menu.item_category')}</InputLabel>
                <Select
                  value={itemForm.categoryId}
                  label={t('menu.item_category')}
                  inputProps={{ 'data-testid': TEST_IDS.menu.itemCategoryInput }}
                  onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  {categories.map((c) => <MuiMenuItem key={c.id} value={c.id}>{getMenuCategoryName(c, lang, menuLanguage)}</MuiMenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>{t('menu.item_type_label')}</InputLabel>
                <Select
                  value={itemForm.itemType}
                  label={t('menu.item_type_label')}
                  inputProps={{ 'data-testid': TEST_IDS.menu.itemTypeInput }}
                  onChange={(e) => setItemForm((f) => ({ ...f, itemType: e.target.value as ItemTypeKey | '' }))}
                >
                  <MuiMenuItem value=""><em>{t('menu.item_type_none')}</em></MuiMenuItem>
                  {ITEM_TYPE_KEYS.map((k) => <MuiMenuItem key={k} value={k}>{t(`menu.types.${k}`)}</MuiMenuItem>)}
                </Select>
              </FormControl>
            </Box>
            {/* Name + Price */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5 }}>
              <TextField
                label={t('menu.item_name')}
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                autoFocus
                required
                inputProps={{ 'data-testid': TEST_IDS.menu.itemNameInput }}
              />
              <TextField
                label={t('menu.item_price')}
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                sx={{ width: 120 }}
                required
                slotProps={{ htmlInput: { min: 0, step: 0.01, 'data-testid': TEST_IDS.menu.itemPriceInput } }}
              />
            </Box>
            {/* Weight */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5 }}>
              <TextField
                label={t('menu.item_weight', { defaultValue: 'Gramatura / objętość' })}
                type="number"
                size="small"
                value={itemForm.weightValue}
                onChange={(e) => setItemForm((f) => ({ ...f, weightValue: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel>{t('menu.item_weight_unit', { defaultValue: 'Jedn.' })}</InputLabel>
                <Select
                  value={itemForm.weightUnit}
                  label={t('menu.item_weight_unit', { defaultValue: 'Jedn.' })}
                  onChange={(e) => setItemForm((f) => ({ ...f, weightUnit: e.target.value as WeightUnit }))}
                >
                  {WEIGHT_UNITS.map((u) => <MuiMenuItem key={u.value} value={u.value}>{u.label}</MuiMenuItem>)}
                </Select>
              </FormControl>
            </Box>
            {/* Description */}
            <TextField
              label={t('menu.item_desc')}
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              inputProps={{ 'data-testid': TEST_IDS.menu.itemDescriptionInput }}
            />
            {/* Ingredients */}
            <TextField
              label={t('menu.item_ingredients')}
              value={itemForm.ingredientsList}
              onChange={(e) => setItemForm((f) => ({ ...f, ingredientsList: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              placeholder={t('menu.item_ingredients_hint')}
              inputProps={{ 'data-testid': TEST_IDS.menu.itemIngredientsInput }}
            />
            {/* Macros */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>{t('menu.macros_section')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                {MACRO_FIELDS.map(({ key, label }) => (
                  <TextField key={key} label={label} type="number" size="small" value={itemForm.macros[key]}
                    onChange={(e) => setItemForm((f) => ({ ...f, macros: { ...f.macros, [key]: e.target.value } }))}
                    slotProps={{ htmlInput: { min: 0, step: 0.1 } }} />
                ))}
              </Box>
            </Box>
            {/* Allergens */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>{t('menu.allergens_label')}</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {ALLERGEN_CODES.map((code) => {
                  const label = ALLERGEN_LABELS[code];
                  const selected = itemForm.allergens.includes(code);
                  return (
                    <Chip
                      key={code}
                      label={`${label.icon} ${label[lang as 'pl' | 'en'] ?? label.pl}`}
                      size="small"
                      variant={selected ? 'filled' : 'outlined'}
                      color={selected ? 'warning' : 'default'}
                      onClick={() => setItemForm((f) => ({
                        ...f,
                        allergens: selected
                          ? f.allergens.filter((a) => a !== code)
                          : [...f.allergens, code],
                      }))}
                    />
                  );
                })}
              </Stack>
            </Box>
            {/* Dietary + Available */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>{t('menu.dietary_flags')}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControlLabel control={<Switch checked={itemForm.dietary.vegetarian} onChange={(e) => setItemForm((f) => ({ ...f, dietary: { ...f.dietary, vegetarian: e.target.checked } }))} size="small" />} label={`🌿 ${t('menu.item_vegetarian')}`} />
                <FormControlLabel control={<Switch checked={itemForm.dietary.vegan} onChange={(e) => setItemForm((f) => ({ ...f, dietary: { ...f.dietary, vegan: e.target.checked } }))} size="small" />} label={`🌱 ${t('menu.item_vegan')}`} />
                <FormControlLabel control={<Switch checked={itemForm.dietary.glutenFree} onChange={(e) => setItemForm((f) => ({ ...f, dietary: { ...f.dietary, glutenFree: e.target.checked } }))} size="small" />} label={t('menu.item_gluten_free')} />
                <FormControlLabel control={<Switch checked={itemForm.visible} onChange={(e) => setItemForm((f) => ({ ...f, visible: e.target.checked }))} size="small" />} label={itemForm.visible ? t('menu.item_available') : t('menu.item_unavailable')} />
              </Stack>
            </Box>
            {/* Photo (edit mode only) */}
            {itemDialog.item && currentRestaurant && (
              <MenuItemPhotoUpload lang={lang} organizationId={effectiveOrganizationId ?? ''} restId={currentRestaurant.id} menuItemId={itemDialog.item.id} currentUrl={itemForm.image || undefined} onUrlChange={(url) => setItemForm((f) => ({ ...f, image: url ?? '' }))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button data-testid={TEST_IDS.menu.dialogCancelButton} onClick={() => setItemDialog({ open: false, categoryId: '' })}>{t('menu.cancel')}</Button>
          <Button data-testid={TEST_IDS.menu.dialogSaveButton} variant="contained" onClick={saveItem} disabled={!itemForm.name.trim()}>{t('menu.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function MenuPage() {
  return <RequireOrganization><MenuPageContent /></RequireOrganization>;
}
