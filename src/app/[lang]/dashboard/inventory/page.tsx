'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Stack, Chip, Card, CardContent, LinearProgress,
  Tabs, Tab, Button, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, FormGroup, FormControlLabel, Checkbox,
  CircularProgress, InputAdornment,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useNotification } from '@/app/[lang]/components/Notification';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { PERMISSIONS, ALLERGEN_LABELS } from '@/types/organization';
import type { AllergenCode } from '@/types/organization';
import type { Ingredient, IngredientUnit, IngredientCategory } from '@/types/pos';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

const getUnitOptions = (t: (key: string) => string): { value: IngredientUnit; label: string }[] => [
  { value: 'g',   label: t('dashboard.inventory.unit_g') },
  { value: 'kg',  label: t('dashboard.inventory.unit_kg') },
  { value: 'ml',  label: t('dashboard.inventory.unit_ml') },
  { value: 'l',   label: t('dashboard.inventory.unit_l') },
  { value: 'szt', label: t('dashboard.inventory.unit_pcs') },
  { value: 'op',  label: t('dashboard.inventory.unit_pack') },
  { value: 'por', label: t('dashboard.inventory.unit_portion') },
];

const getCategoryOptions = (t: (key: string) => string): { value: IngredientCategory; label: string; icon: string }[] => [
  { value: 'meat',       label: t('dashboard.inventory.cat_meat'),       icon: '🥩' },
  { value: 'fish',       label: t('dashboard.inventory.cat_fish'),       icon: '🐟' },
  { value: 'dairy',      label: t('dashboard.inventory.cat_dairy'),      icon: '🥛' },
  { value: 'vegetables', label: t('dashboard.inventory.cat_vegetables'), icon: '🥦' },
  { value: 'fruits',     label: t('dashboard.inventory.cat_fruits'),     icon: '🍎' },
  { value: 'grains',     label: t('dashboard.inventory.cat_grains'),     icon: '🌾' },
  { value: 'spices',     label: t('dashboard.inventory.cat_spices'),     icon: '🌿' },
  { value: 'oils',       label: t('dashboard.inventory.cat_oils'),       icon: '🫙' },
  { value: 'sauces',     label: t('dashboard.inventory.cat_sauces'),     icon: '🥫' },
  { value: 'alcohol',    label: t('dashboard.inventory.cat_alcohol'),    icon: '🍷' },
  { value: 'beverages',  label: t('dashboard.inventory.cat_beverages'),  icon: '🧃' },
  { value: 'other',      label: t('dashboard.inventory.cat_other'),      icon: '📦' },
];

const ALL_ALLERGENS = Object.keys(ALLERGEN_LABELS) as AllergenCode[];

const EMPTY_FORM = {
  name: '',
  unit: 'g' as IngredientUnit,
  category: 'other' as IngredientCategory,
  allergens: [] as AllergenCode[],
  stockQuantity: '',
  minStockQuantity: '',
  unitCost: '',
};

function IngredientDialog({
  open,
  onClose,
  onSave,
  initial,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  initial?: typeof EMPTY_FORM;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const unitOptions = getUnitOptions(t);
  const categoryOptions = getCategoryOptions(t);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_FORM);
  }, [open, initial]);

  const toggleAllergen = (code: AllergenCode) => {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(code)
        ? f.allergens.filter((a) => a !== code)
        : [...f.allergens, code],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? t('dashboard.inventory.edit_ingredient') : t('dashboard.inventory.new_ingredient')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label={t('dashboard.inventory.ingredient_name')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            fullWidth autoFocus required
          />

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{t('dashboard.inventory.unit')}</InputLabel>
              <Select
                value={form.unit}
                label={t('dashboard.inventory.unit')}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as IngredientUnit }))}
              >
                {unitOptions.map((u) => (
                  <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t('dashboard.inventory.category')}</InputLabel>
              <Select
                value={form.category}
                label={t('dashboard.inventory.category')}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as IngredientCategory }))}
              >
                {categoryOptions.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.icon} {c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label={t('dashboard.inventory.stock_quantity')}
              type="number"
              value={form.stockQuantity}
              onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
              fullWidth
              inputProps={{ min: 0 }}
              InputProps={{ endAdornment: <InputAdornment position="end">{form.unit}</InputAdornment> }}
            />
            <TextField
              label={t('dashboard.inventory.min_stock')}
              type="number"
              value={form.minStockQuantity}
              onChange={(e) => setForm((f) => ({ ...f, minStockQuantity: e.target.value }))}
              fullWidth
              inputProps={{ min: 0 }}
              InputProps={{ endAdornment: <InputAdornment position="end">{form.unit}</InputAdornment> }}
            />
            <TextField
              label={t('dashboard.inventory.unit_cost')}
              type="number"
              value={form.unitCost}
              onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{ endAdornment: <InputAdornment position="end">PLN</InputAdornment> }}
            />
          </Stack>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.inventory.allergens_label')}
            </Typography>
            <FormGroup row sx={{ mt: 0.5, gap: 0 }}>
              {ALL_ALLERGENS.map((code) => {
                const l = ALLERGEN_LABELS[code];
                return (
                  <FormControlLabel
                    key={code}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.allergens.includes(code)}
                        onChange={() => toggleAllergen(code)}
                      />
                    }
                    label={
                      <Typography variant="caption">{l.icon} {l.pl}</Typography>
                    }
                    sx={{ minWidth: '45%', mr: 0 }}
                  />
                );
              })}
            </FormGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('dashboard.inventory.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
          {saving ? <CircularProgress size={18} /> : t('dashboard.inventory.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function IngredientsTab() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const sp = useSearchParams();
  const focusIngredientId = sp?.get('ingredientId');
  const { currentRestaurant, organization } = useOrganization();
  const { showNotification } = useNotification();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; item?: Ingredient }>({ open: false });
  const categoryOptions = getCategoryOptions(t);

  const restPath = organization && currentRestaurant
    ? `organizations/${organization.id}/restaurants/${currentRestaurant.id}`
    : null;

  useEffect(() => {
    if (!restPath) { setLoading(false); return; }
    const q = query(collection(db, `${restPath}/ingredients`), orderBy('name'));
    type SnapDocs = { docs: { id: string; data(): Record<string, unknown> }[] };
    const unsub = safeOnSnapshot(q, (snap) => {
      setIngredients((snap as unknown as SnapDocs).docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient)));
      setLoading(false);
    });
    return () => unsub?.();
  }, [restPath]);

  useEffect(() => {
    if (!focusIngredientId) return;
    if (loading) return;
    const found = ingredients.find((i) => i.id === focusIngredientId);
    if (!found) return;
    setDialog({ open: true, item: found });
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-ingredient-id="${focusIngredientId}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [focusIngredientId, loading, ingredients]);

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toFormData = (ing: Ingredient): typeof EMPTY_FORM => ({
    name: ing.name,
    unit: ing.unit,
    category: ing.category,
    allergens: ing.allergens,
    stockQuantity: ing.stockQuantity.toString(),
    minStockQuantity: ing.minStockQuantity?.toString() ?? '',
    unitCost: ing.unitCost?.toString() ?? '',
  });

  const handleSave = useCallback(async (form: typeof EMPTY_FORM) => {
    if (!restPath) return;
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      category: form.category,
      allergens: form.allergens,
      stockQuantity: parseFloat(form.stockQuantity) || 0,
      minStockQuantity: form.minStockQuantity ? parseFloat(form.minStockQuantity) : null,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : null,
      restaurantId: currentRestaurant?.id ?? '',
    };
    try {
      if (dialog.item) {
        await updateDoc(doc(db, `${restPath}/ingredients`, dialog.item.id), data);
        showNotification(t('dashboard.inventory.ingredient_updated'), 'success');
      } else {
        await addDoc(collection(db, `${restPath}/ingredients`), {
          ...data, createdAt: serverTimestamp(),
        });
        showNotification(t('dashboard.inventory.ingredient_added'), 'success');
      }
    } catch {
      showNotification(t('dashboard.inventory.save_error'), 'error');
      throw new Error('save failed');
    }
  }, [restPath, dialog.item, currentRestaurant, showNotification]);

  const handleDelete = async (id: string, name: string) => {
    if (!restPath || !window.confirm(t('dashboard.inventory.delete_confirm', { name }))) return;
    try {
      await deleteDoc(doc(db, `${restPath}/ingredients`, id));
      showNotification(t('dashboard.inventory.ingredient_deleted'), 'success');
    } catch {
      showNotification(t('dashboard.inventory.delete_error'), 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
        <TextField
          placeholder={t('dashboard.inventory.search_placeholder')}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <PermissionGate permission={PERMISSIONS.INVENTORY_MANAGE}>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialog({ open: true })}>
            {t('dashboard.inventory.add')}
          </Button>
        </PermissionGate>
      </Stack>

      {filtered.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" mt={4}>
          {search ? t('dashboard.inventory.no_results') : t('dashboard.inventory.empty')}
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {filtered.map((ing) => {
            const low = ing.minStockQuantity != null && ing.stockQuantity < ing.minStockQuantity;
            const catObj = categoryOptions.find((c) => c.value === ing.category);
            return (
              <Card key={ing.id} variant="outlined" sx={{ borderColor: low ? 'warning.main' : 'divider' }} data-ingredient-id={ing.id}>
                <CardContent sx={{ py: 1.25, px: 2, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {low && <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />}
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                      {catObj?.icon} {ing.name}
                    </Typography>

                    <Typography variant="body2" fontWeight={700} color={low ? 'warning.main' : 'text.primary'}>
                      {ing.stockQuantity} {ing.unit}
                    </Typography>

                    {ing.allergens.length > 0 && (
                      <Stack direction="row" spacing={0.25} flexWrap="wrap" sx={{ maxWidth: '35%', justifyContent: 'flex-end' }}>
                        {ing.allergens.map((a) => (
                          <Chip
                            key={a}
                            label={ALLERGEN_LABELS[a].icon}
                            size="small"
                            sx={{ height: 20, fontSize: 11, px: 0.25, '.MuiChip-label': { px: 0.5 } }}
                          />
                        ))}
                      </Stack>
                    )}

                    <PermissionGate permission={PERMISSIONS.INVENTORY_MANAGE}>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title={t('dashboard.inventory.edit')}>
                          <IconButton size="small" onClick={() => setDialog({ open: true, item: ing })}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('dashboard.inventory.delete')}>
                          <IconButton size="small" color="error" onClick={() => handleDelete(ing.id, ing.name)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </PermissionGate>
                  </Stack>

                  {ing.minStockQuantity != null && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.round((ing.stockQuantity / (ing.minStockQuantity * 3)) * 100))}
                      color={low ? 'warning' : 'success'}
                      sx={{ mt: 0.75, height: 3, borderRadius: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <IngredientDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        onSave={handleSave}
        initial={dialog.item ? toFormData(dialog.item) : undefined}
        t={t}
      />
    </Box>
  );
}

function InventoryPageContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const [tab, setTab] = useState(0);

  const suppliers = [
    { name: 'Frisco Pro',       category: t('dashboard.inventory.cat_vegetables'), contact: 'frisco@example.pl', lastOrder: '2026-03-10' },
    { name: 'Metro Cash&Carry', category: t('dashboard.inventory.cat_grains'),     contact: '22 555 00 00',       lastOrder: '2026-03-08' },
    { name: 'Polmlek',          category: t('dashboard.inventory.cat_dairy'),       contact: 'hurt@polmlek.pl',    lastOrder: '2026-03-05' },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <InventoryIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('dashboard.inventory.title')}</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: 1, borderColor: 'divider', minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' },
        }}
      >
        <Tab label={`🧺 ${t('dashboard.inventory.tab_ingredients')}`} />
        <Tab label={`🚚 ${t('dashboard.inventory.tab_suppliers')}`} />
      </Tabs>

      {tab === 0 && <IngredientsTab />}

      {tab === 1 && (
        <Stack spacing={1}>
          {suppliers.map((s) => (
            <Card key={s.name} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.category}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">{s.contact}</Typography>
                    <br />
                    <Typography variant="caption" color="text.disabled">{t('dashboard.inventory.last_order')} {s.lastOrder}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          <Typography variant="caption" color="text.disabled" textAlign="center">
            {t('dashboard.inventory.coming_soon')}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function InventoryPageFallback() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  return (
    <PageContainer sx={{ textAlign: 'center' }}>
      <Typography color="text.secondary">{t('dashboard.inventory.no_access')}</Typography>
    </PageContainer>
  );
}

export default function InventoryPage() {
  return (
    <RequireOrganization>
      <PermissionGate permission={PERMISSIONS.INVENTORY_VIEW} fallback={<InventoryPageFallback />}>
        <InventoryPageContent />
      </PermissionGate>
    </RequireOrganization>
  );
}
