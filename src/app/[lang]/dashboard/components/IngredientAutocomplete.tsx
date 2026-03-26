'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Autocomplete, TextField, Box, Typography,
  CircularProgress,
} from '@mui/material';
import {
  collection, query, orderBy, getDocs,
} from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { ALLERGEN_LABELS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import type { Ingredient } from '@/types/pos';

type CreateOption = { inputValue: string; name: string };
type Option = Ingredient | CreateOption;

function isCreate(opt: Option): opt is CreateOption {
  return 'inputValue' in opt;
}

interface Props {
  restPath: string;
  value: Ingredient | null;
  onChange: (ingredient: Ingredient | null) => void;
  label?: string;
  allowCreate?: boolean;
  onCreateRequest?: (name: string) => void;
  size?: 'small' | 'medium';
}

export default function IngredientAutocomplete({
  restPath,
  value,
  onChange,
  label,
  allowCreate = true,
  onCreateRequest,
  size = 'small',
}: Props) {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params?.lang ?? 'pl', 'dashboard');
  const resolvedLabel = label ?? t('dashboard.ingredient.default_label');
  const [options, setOptions] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || !restPath) return;
    loadedRef.current = true;
    setLoading(true);
    getDocs(query(collection(db, `${restPath}/ingredients`), orderBy('name')))
      .then((snap) => {
        setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient)));
      })
      .finally(() => setLoading(false));
  }, [restPath]);

  // Build options list including optional "create" entry
  const getOptions = (inputValue: string): Option[] => {
    const filtered: Option[] = inputValue
      ? options.filter((o) => o.name.toLowerCase().includes(inputValue.toLowerCase()))
      : [...options];

    if (
      allowCreate &&
      inputValue &&
      !options.some((o) => o.name.toLowerCase() === inputValue.toLowerCase())
    ) {
      filtered.push({ inputValue, name: `Dodaj "${inputValue}"` });
    }
    return filtered;
  };

  return (
    <Autocomplete<Option, false, false, true>
      value={value ?? null}
      size={size}
      options={options}
      loading={loading}
      freeSolo
      filterOptions={(opts, params) => getOptions(params.inputValue)}
      getOptionLabel={(opt) => {
        if (typeof opt === 'string') return opt;
        return opt.name;
      }}
      isOptionEqualToValue={(opt, val) => {
        if (isCreate(opt) || isCreate(val as Option)) return false;
        return (opt as Ingredient).id === (val as Ingredient).id;
      }}
      onChange={(_, newVal) => {
        if (!newVal) { onChange(null); return; }
        if (typeof newVal === 'string') return; // freeSolo raw string — ignore
        if (isCreate(newVal)) {
          onCreateRequest?.(newVal.inputValue);
          return;
        }
        onChange(newVal as Ingredient);
      }}
      renderOption={(props, opt) => {
        const { key, ...restProps } = props as { key?: React.Key } & React.HTMLAttributes<HTMLLIElement>;
        if (isCreate(opt)) {
          return (
            <Box component="li" key={key ?? 'create'} {...restProps}>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                + {opt.name}
              </Typography>
            </Box>
          );
        }
        const ing = opt as Ingredient;
        return (
          <Box component="li" key={key ?? ing.id} {...restProps}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={500}>{ing.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {ing.unit} · {ing.category}
                {ing.unitCost ? ` · ${ing.unitCost.toFixed(2)} PLN/${ing.unit}` : ''}
              </Typography>
            </Box>
            {ing.allergens.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
                {ing.allergens.slice(0, 4).map((a) => (
                  <span key={a} title={ALLERGEN_LABELS[a].pl} style={{ fontSize: '0.85rem' }}>
                    {ALLERGEN_LABELS[a].icon}
                  </span>
                ))}
              </Box>
            )}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={resolvedLabel}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={14} sx={{ mr: 1 }} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
