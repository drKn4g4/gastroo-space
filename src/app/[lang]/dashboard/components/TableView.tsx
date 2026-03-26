'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useTranslation } from '@/lib/i18n/client';
import {
  Box, Typography, Chip, Stack, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import type { Table, TableStatus } from '@/types/pos';
import T from '@/styles/pos.tokens';
import { vmin } from '@/styles/units';

// ─── Status config ────────────────────────────────────────────────────────────

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function getStatusConfig(t: TFn): Record<TableStatus, { label: string; color: string; bg: string; border: string }> {
  return {
    free:     { label: t('dashboard.table_view.status_free'), color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)' },
    occupied: { label: t('dashboard.table_view.status_occupied'), color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
    reserved: { label: t('dashboard.table_view.status_reserved'), color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
    blocked:  { label: t('dashboard.table_view.status_blocked'), color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  };
}

// ─── Single table card (list view) ───────────────────────────────────────────

function TableCard({ table, onClick, t, statusConfig }: { table: Table; onClick: () => void; t: TFn; statusConfig: ReturnType<typeof getStatusConfig> }) {
  const cfg = statusConfig[table.status];
  return (
    <Box
      data-table-card={table.id}
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        px: 2, py: 1.75, borderRadius: '14px',
        bgcolor: cfg.bg,
        border: 1, borderColor: cfg.border,
        cursor: 'pointer',
        transition: 'transform 0.08s',
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Box sx={{ textAlign: 'center', minWidth: vmin(36) }}>
        <Typography color="text.primary" sx={{ fontWeight: 800, fontSize: T.bookingTimeFont, lineHeight: 1 }}>
          {table.number}
        </Typography>
        {table.name && (
          <Typography sx={{ fontSize: T.captionFont, color: 'text.disabled', lineHeight: 1 }}>
            {table.name}
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
          {table.name ?? t('dashboard.table_view.table_number', { number: table.number })}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <PeopleIcon sx={{ fontSize: vmin(12), color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">{t('dashboard.table_view.seat_count', { count: table.capacity })}</Typography>
        </Box>
      </Box>

      <Chip
        label={cfg.label}
        size="small"
        sx={{ bgcolor: cfg.bg, color: cfg.color, border: 1, borderColor: cfg.border, fontWeight: 600, fontSize: T.captionFont }}
      />
    </Box>
  );
}

// ─── Floor plan table bubble ──────────────────────────────────────────────────

function TableBubble({ table, onClick, statusConfig }: { table: Table; onClick: () => void; statusConfig: ReturnType<typeof getStatusConfig> }) {
  const cfg = statusConfig[table.status];
  const size = table.capacity <= 2 ? vmin(52) : table.capacity <= 4 ? vmin(60) : vmin(72);

  return (
    <Box
      data-table-bubble={table.id}
      onClick={onClick}
      sx={{
        position: 'absolute',
        left: `${table.posX}%`,
        top:  `${table.posY}%`,
        transform: 'translate(-50%, -50%)',
        width:  size,
        height: table.shape === 'rectangle' ? `calc(${size} * 0.7)` : size,
        borderRadius: table.shape === 'round' ? '50%' : table.shape === 'rectangle' ? 1.5 : 2,
        bgcolor: cfg.bg,
        border: 2,
        borderColor: cfg.border,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        '&:hover': { transform: 'translate(-50%, -50%) scale(1.08)', boxShadow: `0 0 ${vmin(12)} ${cfg.color}55` },
        '&:active': { transform: 'translate(-50%, -50%) scale(0.95)' },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: T.bookingTimeFont, color: cfg.color, lineHeight: 1 }}>
        {table.number}
      </Typography>
      <Typography sx={{ fontSize: T.captionFont, color: cfg.color, opacity: 0.7, lineHeight: 1 }}>
        {table.capacity}
      </Typography>
    </Box>
  );
}

// ─── Table detail dialog ──────────────────────────────────────────────────────

function TableDialog({ table, open, onClose, t, statusConfig }: { table: Table | null; open: boolean; onClose: () => void; t: TFn; statusConfig: ReturnType<typeof getStatusConfig> }) {
  if (!table) return null;
  const cfg = statusConfig[table.status];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="table-view-dialog-title">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: vmin(32), height: vmin(32), borderRadius: table.shape === 'round' ? '50%' : 1.5,
            bgcolor: cfg.bg, border: 2, borderColor: cfg.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: T.captionFont, color: cfg.color }}>{table.number}</Typography>
        </Box>
        <Box component="span" id="table-view-dialog-title">
          {table.name
            ? t('dashboard.table_view.table_title_named', { number: table.number, name: table.name })
            : t('dashboard.table_view.table_title', { number: table.number })}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('dashboard.table_view.status_label')}</Typography>
            <Chip label={cfg.label} size="small"
              sx={{ bgcolor: cfg.bg, color: cfg.color, border: 1, borderColor: cfg.border, fontWeight: 600 }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('dashboard.table_view.capacity_label')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('dashboard.table_view.capacity_value', { count: table.capacity })}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('dashboard.table_view.shape_label')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {table.shape === 'round'
                ? t('dashboard.table_view.shape_round')
                : table.shape === 'rectangle'
                ? t('dashboard.table_view.shape_rectangle')
                : t('dashboard.table_view.shape_square')}
            </Typography>
          </Box>
          {table.status === 'occupied' && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.disabled">{t('dashboard.table_view.bill_label')}</Typography>
              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                {t('dashboard.table_view.bill_open_mockup')}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dashboard.table_view.btn_close')}</Button>
        {table.status === 'free' && (
          <Button variant="contained" color="success">{t('dashboard.table_view.btn_open_bill')}</Button>
        )}
        {table.status === 'occupied' && (
          <Button variant="contained" color="primary">{t('dashboard.table_view.btn_show_bill')}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ statusConfig }: { statusConfig: ReturnType<typeof getStatusConfig> }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      {(Object.entries(statusConfig) as [TableStatus, ReturnType<typeof getStatusConfig>[TableStatus]][]).map(([status, cfg]) => (
        <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: vmin(10), height: vmin(10), borderRadius: '50%', bgcolor: cfg.color }} />
          <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TableViewProps {
  restaurantId: string;
}

export default function TableView({ restaurantId }: TableViewProps) {
  const { organization } = useOrganization();
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang ?? 'pl', 'dashboard');
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const statusConfig = getStatusConfig(t);

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Table | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        const orgId = organization?.id || 'demo-org';
        unsub = safeOnSnapshot(
          collection(db, `organizations/${orgId}/restaurants/${restaurantId}/tables`),
          (snap: any) => {
            const items = snap.docs
              .map((d: any) => ({ id: d.id, ...d.data() }) as Table)
              .sort((a: Table, b: Table) => a.number - b.number);
            setTables(items);
            setLoading(false);
          },
          (err) => {
            console.error('❌ [TableView] Snapshot error:', err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('❌ [TableView] Subscription failed:', err);
        setLoading(false);
      }
    }, 700);

    return () => {
      clearTimeout(timeoutId);
      if (unsub) unsub();
    };
  }, [restaurantId]);

  const free     = tables.filter((t) => t.status === 'free').length;
  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const reserved = tables.filter((t) => t.status === 'reserved').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.disabled">{t('dashboard.table_view.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box data-panel="table-view" sx={{ p: 2, pb: 6, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box data-section="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('dashboard.table_view.floor_title')}</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={t('dashboard.table_view.free_count', { count: free })} size="small" sx={{ bgcolor: statusConfig.free.bg, color: statusConfig.free.color, border: 1, borderColor: statusConfig.free.border }} />
          <Chip label={t('dashboard.table_view.occupied_count', { count: occupied })} size="small" sx={{ bgcolor: statusConfig.occupied.bg, color: statusConfig.occupied.color, border: 1, borderColor: statusConfig.occupied.border }} />
          <Chip label={t('dashboard.table_view.reserved_count', { count: reserved })} size="small" sx={{ bgcolor: statusConfig.reserved.bg, color: statusConfig.reserved.color, border: 1, borderColor: statusConfig.reserved.border }} />
        </Stack>
      </Box>

      {isDesktop ? (
        /* ── Plan sali (desktop) ── */
        <Box data-section="floor-plan" sx={{ flex: 1, position: 'relative', borderRadius: 3, bgcolor: 'action.hover', border: 1, borderColor: 'divider', overflow: 'hidden', minHeight: vmin(320) }}>
          {/* Etykieta strefy */}
          {[
            { label: t('dashboard.table_view.zone_a'), top: '2%' },
            { label: t('dashboard.table_view.zone_b'), top: '36%' },
            { label: t('dashboard.table_view.zone_c'), top: '66%' },
          ].map((z) => (
            <Typography key={z.label} variant="caption" color="text.disabled"
              sx={{ position: 'absolute', left: vmin(8), top: z.top, fontSize: T.captionFont, letterSpacing: 1, textTransform: 'uppercase' }}>
              {z.label}
            </Typography>
          ))}

          {tables.map((table) => (
            <TableBubble key={table.id} table={table} onClick={() => setSelected(table)} statusConfig={statusConfig} />
          ))}
        </Box>
      ) : (
        /* ── Lista (mobile/tablet portrait) ── */
        <Stack data-section="table-list" spacing={1} sx={{ flex: 1, overflowY: 'auto' }}>
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={() => setSelected(table)} t={t} statusConfig={statusConfig} />
          ))}
        </Stack>
      )}

      <Legend statusConfig={statusConfig} />

      <TableDialog table={selected} open={!!selected} onClose={() => setSelected(null)} t={t} statusConfig={statusConfig} />
    </Box>
  );
}
