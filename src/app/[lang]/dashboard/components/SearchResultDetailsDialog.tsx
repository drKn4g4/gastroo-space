'use client';

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Chip, Box } from '@mui/material';
import type { SearchResult } from './search.types';

function getString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return null;
}

function getFirstString(raw: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = getString(raw, key);
    if (v) return v;
  }
  return null;
}

function getDate(raw: Record<string, unknown>, key: string): Date | null {
  const value = raw[key];
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    // Firestore Timestamp-like objects rely on `this` binding inside `toDate()`.
    // Calling an extracted function (e.g. `const fn = value.toDate; fn()`) can throw.
    const maybeObj = value as { toDate?: unknown };
    if (typeof maybeObj.toDate === 'function') {
      const d = (maybeObj.toDate as () => unknown).call(value);
      if (d instanceof Date) return d;
    }
  }
  return null;
}

function formatDateTime(d: Date | null): string | null {
  if (!d) return null;
  try {
    return d.toLocaleString();
  } catch {
    return null;
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function SearchResultDetailsDialog({
  open,
  result,
  onClose,
  onOpen,
  t,
}: {
  open: boolean;
  result: SearchResult | null;
  onClose: () => void;
  onOpen?: (result: SearchResult) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!result) return null;

  const title = result.title || t('dashboard.search.details.untitled', { defaultValue: 'Bez tytułu' });
  const raw = result.raw;

  const renderMeta = () => {
    if (result.type === 'member') {
      return (
        <>
          <Field label={t('dashboard.search.details.email', { defaultValue: 'Email' })} value={getString(raw, 'email')} />
          <Field label={t('dashboard.search.details.role', { defaultValue: 'Rola' })} value={getString(raw, 'role')} />
        </>
      );
    }
    if (result.type === 'booking') {
      const tableName = getFirstString(raw, ['tableName']) ?? null;
      const tableNumber = getString(raw, 'tableNumber');
      const tableLabel =
        tableName && tableNumber ? `${tableName} (#${tableNumber})`
          : tableName ? tableName
            : tableNumber ? `#${tableNumber}`
              : getFirstString(raw, ['tableId']);
      return (
        <>
          <Field label={t('dashboard.search.details.guest', { defaultValue: 'Gość' })} value={getFirstString(raw, ['guestName', 'name', 'customerName'])} />
          <Field label={t('dashboard.search.details.phone', { defaultValue: 'Telefon' })} value={getFirstString(raw, ['guestPhone', 'phone'])} />
          <Field label={t('dashboard.search.details.email', { defaultValue: 'Email' })} value={getFirstString(raw, ['guestEmail', 'email'])} />
          <Field label={t('dashboard.search.details.guests_count', { defaultValue: 'Liczba osób' })} value={getString(raw, 'guestCount') ?? getString(raw, 'partySize') ?? getString(raw, 'guests')} />
          <Field label={t('dashboard.search.details.date', { defaultValue: 'Data' })} value={getFirstString(raw, ['bookingDate', 'date'])} />
          <Field label={t('dashboard.search.details.time', { defaultValue: 'Godzina' })} value={getFirstString(raw, ['bookingTime', 'time'])} />
          <Field label={t('dashboard.search.details.time_end', { defaultValue: 'Koniec' })} value={getFirstString(raw, ['bookingTimeEnd'])} />
          <Field label={t('dashboard.search.details.table', { defaultValue: 'Stolik' })} value={tableLabel} />
          <Field label={t('dashboard.search.details.source', { defaultValue: 'Źródło' })} value={getString(raw, 'source')} />
          <Field label={t('dashboard.search.details.created_by', { defaultValue: 'Utworzył(a)' })} value={getFirstString(raw, ['createdByName', 'createdBy'])} />
          <Field label={t('dashboard.search.details.created_at', { defaultValue: 'Utworzono' })} value={formatDateTime(getDate(raw, 'createdAt'))} />
          <Field label={t('dashboard.search.details.updated_at', { defaultValue: 'Zaktualizowano' })} value={formatDateTime(getDate(raw, 'updatedAt'))} />
          <Field label={t('dashboard.search.details.status', { defaultValue: 'Status' })} value={getString(raw, 'status')} />
          <Field label={t('dashboard.search.details.notes', { defaultValue: 'Uwagi' })} value={getString(raw, 'notes')} />
        </>
      );
    }
    if (result.type === 'guest') {
      return (
        <>
          <Field label={t('dashboard.search.details.phone', { defaultValue: 'Telefon' })} value={getString(raw, 'phone')} />
          <Field label={t('dashboard.search.details.email', { defaultValue: 'Email' })} value={getString(raw, 'email')} />
          <Field
            label={t('dashboard.search.details.bookings', { defaultValue: 'Rezerwacje' })}
            value={getString(raw, 'bookingCount') ?? undefined}
          />
        </>
      );
    }
    if (result.type === 'menuItem') {
      const currency = getFirstString(raw, ['currency', 'currencyCode']) ?? 'PLN';
      const priceNumberRaw = raw.price;
      const priceNumber = typeof priceNumberRaw === 'number' ? priceNumberRaw : null;
      const price = priceNumber !== null ? `${priceNumber.toFixed(2)} ${currency}` : null;
      return (
        <>
          <Field label={t('dashboard.search.details.price', { defaultValue: 'Cena' })} value={price} />
          <Field label={t('dashboard.search.details.category', { defaultValue: 'Kategoria' })} value={getString(raw, 'categoryId')} />
          <Field label={t('dashboard.search.details.description', { defaultValue: 'Opis' })} value={getString(raw, 'description')} />
          <Field label={t('dashboard.search.details.ingredients', { defaultValue: 'Składniki' })} value={getString(raw, 'ingredientsList')} />
        </>
      );
    }
    if (result.type === 'ingredient') {
      const unit = getString(raw, 'unit') ?? '';
      const stockRaw = raw.stockQuantity;
      const stock = typeof stockRaw === 'number' ? stockRaw : null;
      const stockLabel = stock !== null ? `${stock}${unit ? ` ${unit}` : ''}` : null;
      return (
        <>
          <Field label={t('dashboard.search.details.category', { defaultValue: 'Kategoria' })} value={getString(raw, 'category')} />
          <Field label={t('dashboard.search.details.stock', { defaultValue: 'Stan' })} value={stockLabel} />
          <Field label={t('dashboard.search.details.unit', { defaultValue: 'Jednostka' })} value={unit || undefined} />
        </>
      );
    }
    if (result.type === 'promotion') {
      return (
        <>
          <Field label={t('dashboard.search.details.status', { defaultValue: 'Status' })} value={getString(raw, 'status')} />
          <Field label={t('dashboard.search.details.type', { defaultValue: 'Typ' })} value={getString(raw, 'type')} />
          <Field label={t('dashboard.search.details.description', { defaultValue: 'Opis' })} value={getString(raw, 'description')} />
        </>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900 }} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t(`dashboard.search.type.${result.type}`, { defaultValue: result.type })}
          </Typography>
        </Box>
        {result.meta ? <Chip size="small" label={result.meta} variant="outlined" /> : null}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.25}>
          {renderMeta()}
        </Stack>
      </DialogContent>

      <DialogActions>
        {onOpen ? (
          <Button onClick={() => onOpen(result)} variant="contained">
            {t('dashboard.search.details.open', { defaultValue: 'Otwórz' })}
          </Button>
        ) : null}
        <Button onClick={onClose}>
          {t('dashboard.search.details.close', { defaultValue: 'Zamknij' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
