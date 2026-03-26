'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import {
  Box, Typography, Stack, Button, IconButton, Chip, Divider, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, CircularProgress,
  ToggleButtonGroup, ToggleButton, useTheme, Alert, Checkbox,
  List, ListItemButton, ListItemText, ListItemIcon,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CropLandscapeIcon from '@mui/icons-material/CropLandscape';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { Table, Section, TableShape } from '@/types/pos';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { useNotification } from '@/app/[lang]/components/Notification';
import { PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import { vmin } from '@/styles/units';
import PageContainer from '@/app/[lang]/components/PageContainer';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_COLORS = [
  '#fb923c', '#60a5fa', '#4ade80', '#f472b6',
  '#a78bfa', '#fbbf24', '#34d399', '#f87171',
];

// Half-sizes in SVG units (viewBox 0 0 100 100)
const THALF: Record<TableShape, { hw: number; hh: number }> = {
  round:     { hw: 4.5, hh: 4.5 },
  square:    { hw: 4.5, hh: 4.5 },
  rectangle: { hw: 7,   hh: 4   },
};

const SHAPE_ICONS = {
  round:     <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />,
  square:    <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />,
  rectangle: <CropLandscapeIcon sx={{ fontSize: 18 }} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSvgCoords(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 50, y: 50 };
  const p = pt.matrixTransform(m.inverse());
  return {
    x: Math.round(Math.max(0, Math.min(100, p.x)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(100, p.y)) * 10) / 10,
  };
}

// ─── AddSectionDialog ─────────────────────────────────────────────────────────

function AddSectionDialog({
  open, onClose, onSave, t,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
  t: (key: string) => string;
}) {
  const [name, setName]   = useState('');
  const [color, setColor] = useState(SECTION_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setColor(SECTION_COLORS[0]); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim(), color); reset(); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('floorplan.new_section')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField
            label={t('floorplan.section_name')} value={name} fullWidth autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder={t('floorplan.section_name_placeholder')}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
              {t('floorplan.section_color')}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {SECTION_COLORS.map((c) => (
                <Box
                  key={c} onClick={() => setColor(c)}
	                  sx={{
	                    width: 30, height: 30, borderRadius: '50%', bgcolor: c,
	                    cursor: 'pointer', borderStyle: 'solid', borderWidth: vmin(2.5),
	                    borderColor: color === c ? 'text.primary' : 'transparent',
	                    transition: 'transform 0.1s, border-color 0.1s',
	                    '&:hover': { transform: 'scale(1.15)' },
	                  }}
	                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>{t('floorplan.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={16} /> : t('floorplan.add_section_btn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── AddTableDialog ───────────────────────────────────────────────────────────

interface NewTableData {
  number: number;
  name?: string;
  capacity: number;
  shape: TableShape;
  posX: number;
  posY: number;
  sectionId?: string;
}

interface FloorLayoutPreset {
  id: string;
  name: string;
  tables: Array<{ id: string; posX: number; posY: number; sectionId?: string; mergedGroupId?: string }>;
  createdAt?: unknown;
}

function AddTableDialog({
  open, pos, sections, defaultSectionId, existingTables, onClose, onSave, t,
}: {
  open: boolean;
  pos: { x: number; y: number };
  sections: Section[];
  defaultSectionId: string | null;
  existingTables: Table[];
  onClose: () => void;
  onSave: (data: NewTableData) => Promise<void>;
  t: (key: string) => string;
}) {
  const nextNum = Math.max(0, ...existingTables.map((t) => t.number)) + 1;
  const [number,    setNumber]    = useState(nextNum);
  const [name,      setName]      = useState('');
  const [capacity,  setCapacity]  = useState(4);
  const [shape,     setShape]     = useState<TableShape>('square');
  const [sectionId, setSectionId] = useState<string>(defaultSectionId ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNumber(Math.max(0, ...existingTables.map((t) => t.number)) + 1);
      setSectionId(defaultSectionId ?? '');
    }
  }, [open, existingTables, defaultSectionId]);

  const reset = () => { setName(''); setCapacity(4); setShape('square'); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        number, capacity, shape,
        name: name.trim() || undefined,
        posX: pos.x, posY: pos.y,
        sectionId: sectionId || undefined,
      });
      reset(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('floorplan.new_table')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>

          {/* Shape picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
              {t('floorplan.shape')}
            </Typography>
            <ToggleButtonGroup value={shape} exclusive fullWidth size="small"
              onChange={(_, v) => v && setShape(v)}>
              {(['round', 'square', 'rectangle'] as TableShape[]).map((s) => (
                <ToggleButton key={s} value={s}>
                  <Stack alignItems="center" spacing={0.25} sx={{ py: 0.5 }}>
                    {SHAPE_ICONS[s]}
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                      {s === 'round' ? t('floorplan.shape_round') : s === 'square' ? t('floorplan.shape_square') : t('floorplan.shape_rectangle')}
                    </Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('floorplan.table_number')} type="number" value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              sx={{ width: 110 }}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('floorplan.capacity')}</InputLabel>
              <Select value={capacity} label={t('floorplan.capacity')}
                onChange={(e) => setCapacity(Number(e.target.value))}>
                {[1,2,3,4,5,6,8,10,12,15,20].map((n) => (
                  <MenuItem key={n} value={n}>{n} {t('floorplan.seats_short')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label={t('floorplan.name_optional')} value={name} fullWidth
            onChange={(e) => setName(e.target.value)}
            placeholder={t('floorplan.name_placeholder')}
          />

          {sections.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>{t('floorplan.section')}</InputLabel>
              <Select value={sectionId} label={t('floorplan.section')}
                onChange={(e) => setSectionId(e.target.value)}>
                <MenuItem value="">{t('floorplan.no_section')}</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                      {s.name}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>{t('floorplan.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={16} /> : t('floorplan.add_table_btn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MergeTablesDialog({
  open,
  onClose,
  tables,
  onMerge,
  t,
}: {
  open: boolean;
  onClose: () => void;
  tables: Table[];
  onMerge: (tableIds: string[]) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedIds([]);
  }, [open]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) return;
    setSaving(true);
    try {
      await onMerge(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('floorplan.merge_title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('floorplan.merge_desc')}
        </Typography>
        <List dense sx={{ maxHeight: 280, overflow: 'auto' }}>
          {tables.map((tbl) => (
            <ListItemButton key={tbl.id} onClick={() => toggle(tbl.id)}>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Checkbox edge="start" checked={selectedIds.includes(tbl.id)} tabIndex={-1} disableRipple />
              </ListItemIcon>
              <ListItemText
                primary={`${t('floorplan.table_label', { number: tbl.number })}${tbl.name ? ` (${tbl.name})` : ''}`}
                secondary={`${t('floorplan.seats_capacity', { count: tbl.capacity })} ${tbl.mergedGroupId ? `· ${t('floorplan.already_in_group')}` : ''}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('floorplan.cancel')}</Button>
        <Button variant="contained" onClick={handleMerge} disabled={saving || selectedIds.length < 2}>
          {saving ? <CircularProgress size={16} /> : t('floorplan.merge_btn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SaveLayoutDialog({
  open,
  onClose,
  onSave,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  t: (key: string) => string;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('floorplan.save_layout_title')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t('floorplan.layout_name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('floorplan.layout_name_placeholder')}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('floorplan.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={16} /> : t('floorplan.save_preset_btn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Sections Panel ───────────────────────────────────────────────────────────

function SectionsPanel({
  sections, tables, selectedSectionId,
  onSelectSection, onAddSection, onDeleteSection,
  onReorderSections, onDropTableToSection,
  dragTableIdRef,
  lang,
}: {
  sections: Section[];
  tables: Table[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onAddSection: () => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (from: number, to: number) => void;
  onDropTableToSection: (sectionId: string, tableId: string) => void;
  dragTableIdRef: React.MutableRefObject<string | null>;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'floorplan');
  const router = useRouter();
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDragIdx = useRef<number | null>(null);

  const rowSx = (selected: boolean, isDragging: boolean) => ({
    px: 2, py: 0.875, mx: 1, borderRadius: 1.5,
    cursor: isDragging ? 'grabbing' : 'pointer',
    display: 'flex', alignItems: 'center', gap: 1,
    bgcolor: selected ? 'action.selected' : 'transparent',
    boxShadow: isDragging ? 2 : undefined,
    opacity: isDragging ? 0.7 : 1,
    transition: 'box-shadow 0.15s, opacity 0.15s',
  });

  // Drag&drop desktop
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (idx: number) => setDragOverIdx(idx);
  const handleDrop = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      onReorderSections(dragIdx, dragOverIdx);
    }
    setDragIdx(null); setDragOverIdx(null);
  };

  // Gesty mobilne (touch)
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    touchStartY.current = e.touches[0].clientY;
    touchDragIdx.current = idx;
  };
  const handleTouchMove = (e: React.TouchEvent, idx: number) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > 30) {
      setDragIdx(touchDragIdx.current);
      setDragOverIdx(idx);
    }
  };
  const handleTouchEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      onReorderSections(dragIdx, dragOverIdx);
    }
    setDragIdx(null); setDragOverIdx(null);
    touchStartY.current = null; touchDragIdx.current = null;
  };

  // Obsługa dropa stolika na sekcję (desktop)
  const handleSectionDrop = (sectionId: string) => {
    if (dragTableIdRef.current) {
      onDropTableToSection(sectionId, dragTableIdRef.current);
      dragTableIdRef.current = null;
    }
  };

  // Obsługa dropa stolika na sekcję (mobile)
  const handleSectionTouchEnd = (sectionId: string) => {
    if (dragTableIdRef.current) {
      onDropTableToSection(sectionId, dragTableIdRef.current);
      dragTableIdRef.current = null;
    }
  };

  return (
	    <Box sx={{
	      width: 240, flexShrink: 0,
	      borderRight: 1, borderColor: 'divider',
	      display: 'flex', flexDirection: 'column',
	      height: '100%', overflow: 'hidden',
	      bgcolor: 'background.paper',
	    }}>
	      <Stack direction="row" alignItems="center" justifyContent="space-between"
	        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle2" fontWeight={800} color="text.primary">{t('floorplan.sections')}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAddSection}
          sx={{ height: 28, fontSize: '0.72rem' }}>
          {t('floorplan.add_section')}
        </Button>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <Box onClick={() => onSelectSection(null)} sx={rowSx(selectedSectionId === null, false)}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={selectedSectionId === null ? 700 : 500}
              color={selectedSectionId === null ? 'text.primary' : 'text.secondary'}>
              {t('floorplan.all_tables')}
            </Typography>
          </Box>
          <Chip size="small" label={tables.length}
            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
        </Box>
        {sections.length > 0 && <Divider sx={{ my: 1 }} />}
        {sections.map((s, idx) => {
          const cnt = tables.filter((t) => t.sectionId === s.id).length;
          const sel = selectedSectionId === s.id;
          const isDragging = dragIdx === idx;
          return (
            <Box
              key={s.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => { e.preventDefault(); handleDragOver(idx); }}
              onDrop={e => { handleDrop(); handleSectionDrop(s.id); }}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); dragTableIdRef.current = null; }}
              onTouchEnd={e => { handleTouchEnd(); handleSectionTouchEnd(s.id); }}
              onClick={() => onSelectSection(s.id)}
              sx={rowSx(sel, isDragging)}
            >
              <DragIndicatorIcon sx={{ fontSize: 16, color: 'action.disabled', mr: 0.5, cursor: 'grab' }} />
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" fontWeight={sel ? 700 : 500}
                color={sel ? 'text.primary' : 'text.secondary'}
                sx={{ flex: 1, minWidth: 0 }} noWrap>
                {s.name}
              </Typography>
              <Chip size="small" label={cnt}
                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700,
                  bgcolor: s.color + '22', color: s.color, flexShrink: 0 }} />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${lang}/dashboard/sections/${encodeURIComponent(s.id)}`);
                }}
                sx={{ p: 0.25, color: 'text.disabled', opacity: 0.75, '&:hover': { opacity: 1, color: 'primary.main' } }}
                aria-label={t('floorplan.open_details', { defaultValue: 'Szczegóły' })}
              >
                <OpenInNewIcon sx={{ fontSize: 15 }} />
              </IconButton>
              <IconButton size="small"
                onClick={(e) => { e.stopPropagation(); onDeleteSection(s.id); }}
                sx={{ p: 0.25, color: 'text.disabled', opacity: 0.6,
                  '&:hover': { opacity: 1, color: 'error.main' } }}>
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          );
        })}
        {sections.length === 0 && (
          <Typography variant="caption" color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 2.5, px: 2, lineHeight: 1.5 }}>
            {t('floorplan.add_section')}
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, px: 2 }}>
          {t('floorplan.drag_table_to_section')}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Table Editor Panel ───────────────────────────────────────────────────────

function TableEditor({
  table, sections, onUpdate, onDelete, onClose,
}: {
  table: Table;
  sections: Section[];
  onUpdate: (id: string, data: Partial<Omit<Table, 'id'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'floorplan');
  const router = useRouter();
  const [form, setForm] = useState({
    number:   table.number,
    name:     table.name ?? '',
    capacity: table.capacity,
    shape:    table.shape as TableShape,
    sectionId: table.sectionId ?? '',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm({
      number:    table.number,
      name:      table.name ?? '',
      capacity:  table.capacity,
      shape:     table.shape,
      sectionId: table.sectionId ?? '',
    });
  }, [table.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(table.id, {
        number:    form.number,
        name:      form.name.trim() || undefined,
        capacity:  form.capacity,
        shape:     form.shape,
        sectionId: form.sectionId || undefined,
      });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(table.id); onClose(); }
    finally { setDeleting(false); }
  };

  const sectionColor = sections.find((s) => s.id === table.sectionId)?.color ?? '#c2410c';

  return (
	    <Box sx={{
	      width: 240, flexShrink: 0,
	      borderLeft: 1, borderColor: 'divider',
	      display: 'flex', flexDirection: 'column',
	      height: '100%', overflow: 'hidden',
	      bgcolor: 'background.paper',
	    }}>
      {/* Header */}
	      <Stack direction="row" alignItems="center" justifyContent="space-between"
	        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sectionColor }} />
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {t('floorplan.table_label', { number: table.number })}
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.5, color: 'text.disabled' }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {/* Form */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
              {t('floorplan.shape')}
            </Typography>
            <ToggleButtonGroup value={form.shape} exclusive fullWidth size="small"
              onChange={(_, v) => v && setForm((f) => ({ ...f, shape: v }))}>
              {(['round', 'square', 'rectangle'] as TableShape[]).map((s) => (
                <ToggleButton key={s} value={s}>{SHAPE_ICONS[s]}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Stack direction="row" spacing={1}>
            <TextField
              label={t('floorplan.number_short')} type="number" value={form.number} size="small"
              onChange={(e) => setForm((f) => ({ ...f, number: Number(e.target.value) }))}
              sx={{ width: 80 }}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>{t('floorplan.seats')}</InputLabel>
              <Select value={form.capacity} label={t('floorplan.seats')}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}>
                {[1,2,3,4,5,6,8,10,12,15,20].map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label={t('floorplan.name')} value={form.name} size="small" fullWidth
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          {sections.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>{t('floorplan.section')}</InputLabel>
              <Select value={form.sectionId} label={t('floorplan.section')}
                onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}>
                <MenuItem value="">{t('floorplan.no_section')}</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                      {s.name}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="caption" color="text.disabled">
            {t('floorplan.position')} {table.posX.toFixed(0)}, {table.posY.toFixed(0)}
          </Typography>
          {table.mergedGroupId && (
            <Alert severity="info" sx={{ py: 0 }}>
              {t('floorplan.in_merged_group', { id: table.mergedGroupId.slice(0, 8) })}
            </Alert>
          )}
        </Stack>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack spacing={1}>
          <Button variant="contained" size="small" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={14} /> : t('floorplan.save_changes')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => router.push(`/${lang}/dashboard/tables/${encodeURIComponent(table.id)}`)}
            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
          >
            {t('floorplan.open_details', { defaultValue: 'Szczegóły' })}
          </Button>
          <Button variant="outlined" size="small" fullWidth color="error"
            onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={14} /> : t('floorplan.delete_table')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ─── Floor Canvas ─────────────────────────────────────────────────────────────

function FloorCanvas({
  tables, sections, filterSectionId, selectedTableId,
  onSelectTable, onMoveTable, onAddTable,
  onTableDragStart
}: {
  tables: Table[];
  sections: Section[];
  filterSectionId: string | null;
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  onMoveTable: (id: string, x: number, y: number) => void;
  onAddTable: (pos: { x: number; y: number }) => void;
  onTableDragStart: (id: string | null) => void;
}) {
  const params = useParams();
  const lang = params?.lang as string;
  const { t: tr } = useTranslation(lang, 'floorplan');
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag state lives in a ref (avoids stale closure, avoids extra renders)
  const dragRef = useRef<{
    tableId: string;
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  } | null>(null);

  // Live position overrides during drag
  const [livePos, setLivePos] = useState<Record<string, { x: number; y: number }>>({});

  // Build section→color lookup
  const colorOf = useMemo(() => {
    const m: Record<string, string> = {};
    sections.forEach((s) => { m[s.id] = s.color; });
    return m;
  }, [sections]);

  const visibleTables = useMemo(
    () => filterSectionId ? tables.filter((t) => t.sectionId === filterSectionId) : tables,
    [tables, filterSectionId],
  );

  const defaultColor = isDark ? '#fb923c' : '#c2410c';

  // ── Drag handlers on table <g> ──────────────────────────────────────────────

  const onTablePointerDown = (e: React.PointerEvent<SVGGElement>, t: Table) => {
    e.stopPropagation();
    (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      tableId: t.id,
      startClientX: e.clientX, startClientY: e.clientY,
      startPosX: t.posX,       startPosY: t.posY,
      moved: false,
    };
    onSelectTable(t.id);
  };

  const onTablePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    const svg = svgRef.current;
    const pt0 = svg.createSVGPoint(); pt0.x = drag.startClientX; pt0.y = drag.startClientY;
    const pt1 = svg.createSVGPoint(); pt1.x = e.clientX;         pt1.y = e.clientY;
    const inv = svg.getScreenCTM()!.inverse();
    const p0  = pt0.matrixTransform(inv);
    const p1  = pt1.matrixTransform(inv);
    const nx  = Math.round(Math.max(0, Math.min(100, drag.startPosX + (p1.x - p0.x))) * 10) / 10;
    const ny  = Math.round(Math.max(0, Math.min(100, drag.startPosY + (p1.y - p0.y))) * 10) / 10;
    setLivePos((prev) => ({ ...prev, [drag.tableId]: { x: nx, y: ny } }));
  };

  const onTablePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const live = livePos[drag.tableId];
    if (drag.moved && live) {
      onMoveTable(drag.tableId, live.x, live.y);
      setLivePos((prev) => { const c = { ...prev }; delete c[drag.tableId]; return c; });
    }
  };

  // ── Canvas click: add table ─────────────────────────────────────────────────
  const onCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return; // clicked on a table
    if (dragRef.current?.moved) return;
    if (!svgRef.current) return;
    const pos = toSvgCoords(e.clientX, e.clientY, svgRef.current);
    onAddTable(pos);
  };

  const bgFill   = isDark ? '#1c1814' : '#ffffff';
  const dotFill  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  return (
    <Box sx={{
      flex: 1, overflow: 'hidden',
      bgcolor: isDark ? '#141210' : '#f5f5f5',
      display: 'flex', alignItems: 'stretch',
    }}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        onClick={onCanvasClick}
      >
        {/* Canvas background */}
        <rect x={0} y={0} width={100} height={100} fill={bgFill} />

        {/* Dot grid */}
        <defs>
          <pattern id="fpgrid" x={0} y={0} width={5} height={5} patternUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={0.3} fill={dotFill} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={100} height={100} fill="url(#fpgrid)" />

        {/* Tables */}
        {visibleTables.map((t) => {
          const pos   = livePos[t.id] ?? { x: t.posX, y: t.posY };
          const color = (t.sectionId && colorOf[t.sectionId]) ?? defaultColor;
          const sel   = selectedTableId === t.id;
          const { hw, hh } = THALF[t.shape] ?? THALF.square;

          return (
            <g
              key={t.id}
              style={{ cursor: 'grab', touchAction: 'none' }}
              onPointerDown={(e) => { onTablePointerDown(e, t); if (onTableDragStart) onTableDragStart(t.id); }}
              onPointerMove={onTablePointerMove}
              onPointerUp={(e) => { onTablePointerUp(e); if (onTableDragStart) onTableDragStart(null); }}
            >
              {/* Selection halo */}
              {sel && (
                t.shape === 'round' ? (
                  <circle cx={pos.x} cy={pos.y} r={hh + 1.5}
                    fill="none" stroke={color} strokeWidth={0.5}
                    strokeDasharray="2 1.2" opacity={0.7} />
                ) : (
                  <rect x={pos.x - hw - 1.5} y={pos.y - hh - 1.5}
                    width={(hw + 1.5) * 2} height={(hh + 1.5) * 2}
                    rx={1.5} fill="none" stroke={color} strokeWidth={0.5}
                    strokeDasharray="2 1.2" opacity={0.7} />
                )
              )}

              {/* Table shape */}
              {t.shape === 'round' ? (
                <circle cx={pos.x} cy={pos.y} r={hh}
                  fill={color + '30'} stroke={color} strokeWidth={sel ? 1.2 : 0.8} />
              ) : (
                <rect x={pos.x - hw} y={pos.y - hh} width={hw * 2} height={hh * 2}
                  rx={1} fill={color + '30'} stroke={color} strokeWidth={sel ? 1.2 : 0.8} />
              )}

              {/* Number */}
              <text x={pos.x} y={pos.y - 0.6} textAnchor="middle" dominantBaseline="middle"
                fontSize={3} fontWeight={sel ? 800 : 700} fill={color}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {t.number}
              </text>

              {/* Capacity */}
              <text x={pos.x} y={pos.y + 2.5} textAnchor="middle" dominantBaseline="middle"
                fontSize={2} fill={color + 'cc'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {tr('floorplan.seats_abbr', { count: t.capacity })}
              </text>

              {/* Name below shape */}
              {t.name && (
                <text x={pos.x} y={pos.y + hh + 2.2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={1.8} fill={color + 'aa'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {t.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Empty state */}
        {visibleTables.length === 0 && (
          <text x={50} y={50} textAnchor="middle" dominantBaseline="middle"
            fontSize={4.5} fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {tr('floorplan.click_to_add')}
          </text>
        )}
      </svg>
    </Box>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function FloorPlanContent() {
  const { organization, currentRestaurant } = useOrganization();
  const { showNotification } = useNotification();
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'floorplan');
  const orgId  = organization?.id || 'demo-org';
  const restId = currentRestaurant?.id;

  const [sections, setSections] = useState<Section[]>([]);
  const [tables,   setTables]   = useState<Table[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedTableId,   setSelectedTableId]   = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addTableOpen,   setAddTableOpen]   = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [saveLayoutOpen, setSaveLayoutOpen] = useState(false);
  const [newTablePos, setNewTablePos] = useState({ x: 50, y: 50 });
  const [presets, setPresets] = useState<FloorLayoutPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const dragTableIdRef = useRef<string | null>(null);

  const sectionsPath = restId ? `organizations/${orgId}/restaurants/${restId}/sections` : null;
  const tablesPath   = restId ? `organizations/${orgId}/restaurants/${restId}/tables`   : null;
  const presetsPath  = restId ? `organizations/${orgId}/restaurants/${restId}/floorplanPresets` : null;

  useEffect(() => {
    if (!sectionsPath || typeof window === 'undefined') return;
    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        unsub = safeOnSnapshot(
          query(collection(db, sectionsPath), orderBy('order')),
          (snap: any) => setSections(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Section)),
        );
      } catch { /* ignore */ }
    }, 200);
    return () => { clearTimeout(timeoutId); unsub?.(); };
  }, [sectionsPath]);

  useEffect(() => {
    if (!tablesPath || typeof window === 'undefined') return;
    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        unsub = safeOnSnapshot(
          query(collection(db, tablesPath), orderBy('number')),
          (snap: any) => setTables(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Table)),
        );
      } catch { /* ignore */ }
    }, 250);
    return () => { clearTimeout(timeoutId); unsub?.(); };
  }, [tablesPath]);

  useEffect(() => {
    if (!presetsPath || typeof window === 'undefined') return;
    return safeOnSnapshot(
      query(collection(db, presetsPath), orderBy('name')),
      (snap: any) => setPresets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as FloorLayoutPreset)),
    );
  }, [presetsPath]);

  const handleAddSection = async (name: string, color: string) => {
    if (!sectionsPath) return;
    try {
      await addDoc(collection(db, sectionsPath), {
        name, color, restaurantId: restId, order: sections.length,
      });
      showNotification(t('floorplan.section_added', { name }), 'success');
    } catch (error) {
      showNotification(t('floorplan.section_add_error'), 'error');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!sectionsPath || !tablesPath) return;
    try {
      await deleteDoc(doc(db, sectionsPath, id));
      await Promise.all(
        tables
          .filter((t) => t.sectionId === id)
          .map((t) => updateDoc(doc(db, tablesPath, t.id), { sectionId: null })),
      );
      if (selectedSectionId === id) setSelectedSectionId(null);
      showNotification(t('floorplan.section_deleted'), 'success');
    } catch (error) {
      showNotification(t('floorplan.section_delete_error'), 'error');
    }
  };

  const handleReorderSections = async (from: number, to: number) => {
    if (!sectionsPath) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setSections(next.map((s, idx) => ({ ...s, order: idx } as any)));
    try {
      await Promise.all(next.map((s, idx) => updateDoc(doc(db, sectionsPath, s.id), { order: idx })));
      showNotification(t('floorplan.section_reorder_success'), 'success');
    } catch (error) {
      showNotification(t('floorplan.section_reorder_error'), 'error');
    }
  };

  const handleDropTableToSection = async (sectionId: string, tableId: string) => {
    if (!tablesPath) return;
    try {
      await updateDoc(doc(db, tablesPath, tableId), { sectionId });
      showNotification(t('floorplan.table_moved'), 'success');
    } catch (error) {
      showNotification(t('floorplan.table_move_error'), 'error');
    }
  };

  const handleTableDragStart = (tableId: string | null) => {
    dragTableIdRef.current = tableId;
  };

  const handleAddTable = async (data: NewTableData) => {
    if (!tablesPath) return;
    try {
      await addDoc(collection(db, tablesPath), { ...data, status: 'free', restaurantId: restId });
      showNotification(t('floorplan.table_added', { number: data.number }), 'success');
    } catch (error) {
      showNotification(t('floorplan.table_add_error'), 'error');
    }
  };

  const handleMoveTable = async (id: string, x: number, y: number) => {
    if (!tablesPath) return;
    try {
      await updateDoc(doc(db, tablesPath, id), { posX: x, posY: y });
    } catch (error) {
      showNotification(t('floorplan.table_drag_error'), 'error');
    }
  };

  const handleUpdateTable = async (id: string, data: Partial<Omit<Table, 'id'>>) => {
    if (!tablesPath) return;
    try {
      await updateDoc(doc(db, tablesPath, id), data);
      showNotification(t('floorplan.table_updated'), 'success');
    } catch (error) {
      showNotification(t('floorplan.table_update_error'), 'error');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!tablesPath) return;
    try {
      await deleteDoc(doc(db, tablesPath, id));
      setSelectedTableId(null);
      showNotification(t('floorplan.table_deleted'), 'success');
    } catch (error) {
      showNotification(t('floorplan.table_delete_error'), 'error');
    }
  };

  const handleMergeTables = async (tableIds: string[]) => {
    if (!tablesPath || tableIds.length < 2) return;
    const groupId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `merge_${Date.now()}`;
    const batch = writeBatch(db);
    tableIds.forEach((tableId) => {
      batch.update(doc(db, tablesPath, tableId), {
        mergedGroupId: groupId,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    showNotification(t('floorplan.tables_merged'), 'success');
  };

  const handleUnmergeSelected = async () => {
    if (!tablesPath || !selectedTableId) return;
    const selected = tables.find((t) => t.id === selectedTableId);
    if (!selected?.mergedGroupId) return;
    const inGroup = tables.filter((t) => t.mergedGroupId === selected.mergedGroupId);
    if (inGroup.length === 0) return;

    const batch = writeBatch(db);
    inGroup.forEach((t) => {
      batch.update(doc(db, tablesPath, t.id), {
        mergedGroupId: null,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    showNotification(t('floorplan.tables_unmerged'), 'success');
  };

  const handleSavePreset = async (name: string) => {
    if (!presetsPath) return;
    const snapshot = tables.map((t) => ({
      id: t.id,
      posX: t.posX,
      posY: t.posY,
      sectionId: t.sectionId ?? null,
      mergedGroupId: t.mergedGroupId ?? null,
    }));
    await addDoc(collection(db, presetsPath), {
      name,
      tables: snapshot,
      createdAt: serverTimestamp(),
      createdBy: orgId,
    });
    showNotification(t('floorplan.layout_saved'), 'success');
  };

  const handleApplyPreset = async () => {
    if (!tablesPath || !selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;

    const batch = writeBatch(db);
    preset.tables.forEach((entry) => {
      batch.update(doc(db, tablesPath, entry.id), {
        posX: entry.posX,
        posY: entry.posY,
        sectionId: entry.sectionId ?? null,
        mergedGroupId: entry.mergedGroupId ?? null,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    showNotification(t('floorplan.preset_loaded', { name: preset.name }), 'success');
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  if (!restId) {
    return (
      <PageContainer sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">{t('floorplan.select_restaurant')}</Typography>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <Paper
        variant="outlined"
        sx={{
          m: 1,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Button size="small" variant="contained" onClick={() => setMergeOpen(true)}>
          {t('floorplan.merge_tables')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleUnmergeSelected}
          disabled={!selectedTable || !selectedTable.mergedGroupId}
        >
          {t('floorplan.unmerge_group')}
        </Button>
        <Divider flexItem orientation="vertical" />
        <Button size="small" variant="outlined" onClick={() => setSaveLayoutOpen(true)}>
          {t('floorplan.save_event_layout')}
        </Button>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t('floorplan.load_preset')}</InputLabel>
          <Select
            value={selectedPresetId}
            label={t('floorplan.load_preset')}
            onChange={(e) => setSelectedPresetId(e.target.value)}
          >
            {presets.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>{preset.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" onClick={handleApplyPreset} disabled={!selectedPresetId}>
          {t('floorplan.load')}
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      <SectionsPanel
        sections={sections} tables={tables}
        selectedSectionId={selectedSectionId}
        onSelectSection={setSelectedSectionId}
        onAddSection={() => setAddSectionOpen(true)}
        onDeleteSection={handleDeleteSection}
        onReorderSections={handleReorderSections}
        onDropTableToSection={handleDropTableToSection}
        dragTableIdRef={dragTableIdRef}
        lang={lang}
      />

      <FloorCanvas
        tables={tables} sections={sections}
        filterSectionId={selectedSectionId}
        selectedTableId={selectedTableId}
        onSelectTable={setSelectedTableId}
        onMoveTable={handleMoveTable}
        onAddTable={(pos) => { setNewTablePos(pos); setAddTableOpen(true); }}
        onTableDragStart={handleTableDragStart}
      />

      {selectedTable && (
        <TableEditor
          key={selectedTable.id}
          table={selectedTable} sections={sections}
          onUpdate={handleUpdateTable}
          onDelete={handleDeleteTable}
          onClose={() => setSelectedTableId(null)}
        />
      )}

      <AddSectionDialog
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
        onSave={handleAddSection}
        t={t}
      />

      <AddTableDialog
        open={addTableOpen}
        pos={newTablePos}
        sections={sections}
        defaultSectionId={selectedSectionId}
        existingTables={tables}
        onClose={() => setAddTableOpen(false)}
        onSave={handleAddTable}
        t={t}
      />

      <MergeTablesDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        tables={tables}
        onMerge={handleMergeTables}
        t={t}
      />

      <SaveLayoutDialog
        open={saveLayoutOpen}
        onClose={() => setSaveLayoutOpen(false)}
        onSave={handleSavePreset}
        t={t}
      />
      </Box>
    </Box>
  );
}

export default function FloorPlanPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'floorplan');
  return (
    <RequireOrganization>
      <PermissionGate
        permission={PERMISSIONS.TABLES_MANAGE}
        fallback={
          <PageContainer sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              {t('floorplan.no_access')}
            </Typography>
          </PageContainer>
        }
      >
        <FloorPlanContent />
      </PermissionGate>
    </RequireOrganization>
  );
}
