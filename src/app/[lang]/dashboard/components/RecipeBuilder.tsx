'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Box, Typography, TextField, IconButton,
  Divider, Chip, Tooltip, CircularProgress, InputAdornment,
  Select, MenuItem as MuiMenuItem, FormControl, InputLabel,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import TimerIcon from '@mui/icons-material/Timer';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import {
  collection, query, orderBy, getDocs,
  doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ALLERGEN_LABELS } from '@/types/organization';
import type { AllergenCode } from '@/types/organization';
import type { Ingredient, IngredientUnit, RecipeIngredient, Recipe } from '@/types/pos';
import { useTranslation } from '@/lib/i18n/client';
import IngredientAutocomplete from './IngredientAutocomplete';

interface RecipeLine {
  ingredient: Ingredient | null;
  quantity: string;
  unit: IngredientUnit;
  preparationNote: string;
}

interface Props {
  lang: string;
  open: boolean;
  onClose: () => void;
  restPath: string;
  menuItemId: string;
  menuItemName: string;
  existingRecipe?: Recipe | null;
  /** Called after save so parent can refresh allergens / prepTime on the menu item */
  onSaved?: (recipeId: string, allergens: AllergenCode[], basePrepTimeMin: number) => void;
}

const EMPTY_LINE = (): RecipeLine => ({
  ingredient: null, quantity: '', unit: 'g', preparationNote: '',
});

const UNIT_OPTIONS: IngredientUnit[] = ['g', 'kg', 'ml', 'l', 'szt', 'op', 'por'];

export default function RecipeBuilder({
  lang, open, onClose, restPath, menuItemId, menuItemName, existingRecipe, onSaved,
}: Props) {
  const { t } = useTranslation(lang, 'dashboard');
  const [lines, setLines] = useState<RecipeLine[]>([EMPTY_LINE()]);
  const [prepTimeMin, setPrepTimeMin] = useState('15');
  const [servings, setServings] = useState('1');
  const [steps, setSteps] = useState('');
  const [saving, setSaving] = useState(false);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

  // Load all ingredients for the autocomplete
  useEffect(() => {
    if (!open || !restPath) return;
    getDocs(query(collection(db, `${restPath}/ingredients`), orderBy('name')))
      .then((snap) => setAllIngredients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient))));
  }, [open, restPath]);

  // Populate form from existing recipe
  useEffect(() => {
    if (!open) return;
    if (existingRecipe) {
      setLines(
        existingRecipe.ingredients.map((ri) => {
          const ing = allIngredients.find((i) => i.id === ri.ingredientId) ?? null;
          return { ingredient: ing, quantity: ri.quantity.toString(), unit: ri.unit, preparationNote: ri.preparationNote ?? '' };
        }).concat([EMPTY_LINE()]),
      );
      setPrepTimeMin(existingRecipe.basePrepTimeMin.toString());
      setServings(existingRecipe.servings.toString());
      setSteps(existingRecipe.preparationSteps ?? '');
    } else {
      setLines([EMPTY_LINE()]);
      setPrepTimeMin('15');
      setServings('1');
      setSteps('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingRecipe?.id]);

  // Auto-aggregate allergens from selected ingredients
  const aggregatedAllergens = useMemo((): AllergenCode[] => {
    const set = new Set<AllergenCode>();
    lines.forEach((l) => l.ingredient?.allergens.forEach((a) => set.add(a)));
    return [...set];
  }, [lines]);

  // Calculate cost
  const totalCost = useMemo(() => {
    return lines.reduce((sum, l) => {
      if (!l.ingredient?.unitCost || !l.quantity) return sum;
      return sum + l.ingredient.unitCost * parseFloat(l.quantity);
    }, 0);
  }, [lines]);

  // ── EstimatedPrepTime: simulated dynamic wydawka ──
  // In a real system this would pull live occupancy; here we show the concept
  // as a formula: estimatedTime = basePrepTime * (1 + occupancyFactor)
  const estimatedTimeNote = useMemo(() => {
    const base = parseInt(prepTimeMin) || 0;
    if (base === 0) return null;
    return {
      quiet:  Math.ceil(base * 1.0),
      normal: Math.ceil(base * 1.3),
      busy:   Math.ceil(base * 1.7),
      peak:   Math.ceil(base * 2.2),
    };
  }, [prepTimeMin]);

  const setLine = (idx: number, patch: Partial<RecipeLine>) => {
    setLines((prev) => {
      const next = prev.map((l, i) => i === idx ? { ...l, ...patch } : l);
      // Auto-append empty line when last line gets an ingredient
      if (patch.ingredient && idx === prev.length - 1) next.push(EMPTY_LINE());
      return next;
    });
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx).concat(prev.length === 1 ? [EMPTY_LINE()] : []));
  };

  const handleSave = async () => {
    if (!menuItemId || !restPath) return;
    const filledLines = lines.filter((l) => l.ingredient && l.quantity);
    if (filledLines.length === 0) return;

    setSaving(true);
    try {
      const ingredients: RecipeIngredient[] = filledLines.map((l) => {
        const ing = l.ingredient as Ingredient;
        return {
          ingredientId: ing.id,
          ingredientName: ing.name,
          quantity: parseFloat(l.quantity),
          unit: l.unit,
          preparationNote: l.preparationNote || undefined,
        };
      });

      const basePrepTimeMin = parseInt(prepTimeMin) || 15;
      const recipeData = {
        menuItemId,
        menuItemName,
        ingredients,
        aggregatedAllergens,
        totalCost: totalCost > 0 ? Math.round(totalCost * 100) / 100 : null,
        basePrepTimeMin,
        preparationSteps: steps.trim() || null,
        servings: parseInt(servings) || 1,
        restaurantId: restPath.split('/').at(-1) ?? '',
        updatedAt: serverTimestamp(),
      };

      let recipeId: string;
      if (existingRecipe?.id) {
        await updateDoc(doc(db, `${restPath}/recipes`, existingRecipe.id), recipeData);
        recipeId = existingRecipe.id;
      } else {
        const ref = doc(collection(db, `${restPath}/recipes`));
        await setDoc(ref, { ...recipeData, createdAt: serverTimestamp() });
        recipeId = ref.id;
      }

      // Back-sync allergens and prepTime to the menu item
      await updateDoc(doc(db, `${restPath}/menuItems`, menuItemId), {
        recipeId,
        allergens: aggregatedAllergens,
        basePrepTime: basePrepTimeMin,
      });

      onSaved?.(recipeId, aggregatedAllergens, basePrepTimeMin);
      onClose();
    } catch (err) {
      console.error('RecipeBuilder save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const filledCount = lines.filter((l) => l.ingredient && l.quantity).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ScienceIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>{t('recipe.title')}</Typography>
            <Typography variant="caption" color="text.secondary">{menuItemName}</Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>

          {/* ── Ingredient lines ── */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('recipe.ingredients_label')}
            </Typography>
            <Stack spacing={1} mt={1}>
              {lines.map((line, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 2, minWidth: 0 }}>
                    <IngredientAutocomplete
                      restPath={restPath}
                      value={line.ingredient}
                      onChange={(ing) => {
                        if (ing) setLine(idx, { ingredient: ing, unit: ing.unit });
                        else setLine(idx, { ingredient: null });
                      }}
                      allowCreate
                      size="small"
                    />
                  </Box>

                  <TextField
                    label={t('recipe.quantity_label')}
                    type="number"
                    size="small"
                    value={line.quantity}
                    onChange={(e) => setLine(idx, { quantity: e.target.value })}
                    sx={{ width: 90 }}
                    inputProps={{ min: 0, step: 0.1 }}
                    disabled={!line.ingredient}
                  />

                  <FormControl size="small" sx={{ width: 72 }} disabled={!line.ingredient}>
                    <InputLabel>{t('recipe.unit_label')}</InputLabel>
                    <Select
                      value={line.unit}
                      label={t('recipe.unit_label')}
                      onChange={(e) => setLine(idx, { unit: e.target.value as IngredientUnit })}
                    >
                      {UNIT_OPTIONS.map((u) => <MuiMenuItem key={u} value={u}>{u}</MuiMenuItem>)}
                    </Select>
                  </FormControl>

                  <TextField
                    label={t('recipe.tips_label')}
                    size="small"
                    value={line.preparationNote}
                    onChange={(e) => setLine(idx, { preparationNote: e.target.value })}
                    placeholder={t('recipe.tips_placeholder')}
                    sx={{ flex: 1.5 }}
                    disabled={!line.ingredient}
                  />

                  <Tooltip title={t('recipe.remove_line')}>
                    <span>
                      <IconButton size="small" onClick={() => removeLine(idx)} disabled={lines.length === 1 && !line.ingredient}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ))}

              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setLines((prev) => [...prev, EMPTY_LINE()])}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('recipe.add_line')}
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* ── Auto-aggregated allergens ── */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('recipe.allergens_label')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} mt={0.75}>
              {aggregatedAllergens.length === 0 ? (
                <Typography variant="caption" color="text.disabled">{t('recipe.no_allergens')}</Typography>
              ) : (
                aggregatedAllergens.map((a) => {
                  const l = ALLERGEN_LABELS[a];
                  return (
                    <Chip key={a} label={`${l.icon} ${l.pl}`} size="small" color="warning" variant="outlined" />
                  );
                })
              )}
            </Stack>
          </Box>

          <Divider />

          {/* ── Prep time + wydawka estimator ── */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <TimerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('recipe.prep_time_label')}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                label={t('recipe.base_time_label')}
                type="number"
                size="small"
                value={prepTimeMin}
                onChange={(e) => setPrepTimeMin(e.target.value)}
                sx={{ width: 160 }}
                inputProps={{ min: 1, max: 180 }}
                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                helperText={t('recipe.no_occupancy')}
              />
              <TextField
                label={t('recipe.servings_label')}
                type="number"
                size="small"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                sx={{ width: 100 }}
                inputProps={{ min: 1 }}
              />
            </Stack>

            {estimatedTimeNote && (
              <Alert
                severity="info"
                icon={<TimerIcon />}
                sx={{ mt: 1.5, '& .MuiAlert-message': { width: '100%' } }}
              >
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                  {t('recipe.occupancy_title')}
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {([
                    [t('recipe.occupancy_quiet'), estimatedTimeNote.quiet],
                    [t('recipe.occupancy_normal'), estimatedTimeNote.normal],
                    [t('recipe.occupancy_busy'),   estimatedTimeNote.busy],
                    [t('recipe.occupancy_peak'),   estimatedTimeNote.peak],
                  ] as [string, number][]).map(([label, mins]) => (
                    <Typography key={label} variant="caption">
                      <b>{label}:</b> {mins} min
                    </Typography>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {t('recipe.multipliers_note')}
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider />

          {/* ── Cost summary ── */}
          {totalCost > 0 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <AttachMoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2">
                {t('recipe.cost_label')}: <b>{totalCost.toFixed(2)} PLN</b>
                {parseInt(servings) > 1 && (
                  <Typography component="span" variant="caption" color="text.secondary">
                    {' '}({(totalCost / parseInt(servings)).toFixed(2)} PLN / {t('recipe.per_portion')})
                  </Typography>
                )}
              </Typography>
            </Stack>
          )}

          {/* ── Preparation steps ── */}
          <TextField
            label={t('recipe.steps_label')}
            multiline
            rows={4}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            fullWidth
            placeholder={t('recipe.steps_placeholder')}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('recipe.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={filledCount === 0 || saving}
          startIcon={saving ? <CircularProgress size={16} /> : <ScienceIcon />}
        >
          {existingRecipe ? t('recipe.save') : t('recipe.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
