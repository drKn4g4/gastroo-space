'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, Stack,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, CircularProgress, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '../../providers/AuthProvider';
import { MEMBER_ROLES } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

interface CvEntryLocal {
  id: string;
  placeName: string;
  placeAddress?: string;
  googlePlaceId?: string;
  organizationId?: string;
  organizationName?: string;
  position: string;
  roleCategory?: string;
  startedAt: Date;
  endedAt?: Date;
  description?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

const EMPTY_FORM = {
  placeName: '',
  placeAddress: '',
  googlePlaceId: '',
  position: '',
  roleCategory: '',
  startedAtStr: '',
  endedAtStr: '',
  description: '',
};

export default function CvPage() {
  const { user, profile } = useAuth();
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const { t } = useTranslation(lang, 'dashboard');

  const [entries, setEntries] = useState<CvEntryLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isGastronaut = profile?.isGastronaut === true;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/cv`),
      orderBy('startedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            placeName: data.placeName ?? '',
            placeAddress: data.placeAddress,
            googlePlaceId: data.googlePlaceId,
            organizationId: data.organizationId,
            organizationName: data.organizationName,
            position: data.position ?? '',
            roleCategory: data.roleCategory,
            startedAt: data.startedAt?.toDate?.() ?? new Date(),
            endedAt: data.endedAt?.toDate?.(),
            description: data.description,
            verified: data.verified === true,
            verifiedBy: data.verifiedBy,
            verifiedAt: data.verifiedAt?.toDate?.(),
          };
        }),
      );
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (entry: CvEntryLocal) => {
    setEditingId(entry.id);
    setForm({
      placeName: entry.placeName,
      placeAddress: entry.placeAddress ?? '',
      googlePlaceId: entry.googlePlaceId ?? '',
      position: entry.position,
      roleCategory: entry.roleCategory ?? '',
      startedAtStr: entry.startedAt.toISOString().slice(0, 10),
      endedAtStr: entry.endedAt ? entry.endedAt.toISOString().slice(0, 10) : '',
      description: entry.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!user || !form.placeName || !form.position || !form.startedAtStr) return;
    setSaving(true);

    const payload = {
      placeName: form.placeName,
      placeAddress: form.placeAddress || null,
      googlePlaceId: form.googlePlaceId || null,
      position: form.position,
      roleCategory: form.roleCategory || null,
      startedAt: new Date(form.startedAtStr),
      endedAt: form.endedAtStr ? new Date(form.endedAtStr) : null,
      description: form.description || null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, `users/${user.uid}/cv`, editingId), payload);
      } else {
        await addDoc(collection(db, `users/${user.uid}/cv`), {
          ...payload,
          verified: false,
          createdAt: serverTimestamp(),
        });
      }
      setDialogOpen(false);
    } catch (err) {
      console.error('CV save error:', err);
    } finally {
      setSaving(false);
    }
  }, [user, form, editingId]);

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/cv`, entryId));
  };

  if (!isGastronaut) {
    return (
      <PageContainer sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">
          {t('dashboard.cv.gastronaut_only')}
        </Typography>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
          {t('dashboard.cv.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ fontWeight: 700 }}>
          {t('dashboard.cv.add')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <PlaceIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography>
            {t('dashboard.cv.empty')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {entries.map((entry) => (
            <Card key={entry.id} sx={{ position: 'relative' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {entry.placeName}
                      </Typography>
                      {entry.verified && (
                        <VerifiedIcon color="primary" sx={{ fontSize: 20 }} titleAccess={t('dashboard.cv.verified_title')} />
                      )}
                    </Box>
                    {entry.placeAddress && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <PlaceIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {entry.placeAddress}
                      </Typography>
                    )}
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {entry.position}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.startedAt.toLocaleDateString(lang)}
                      {' — '}
                      {entry.endedAt
                        ? entry.endedAt.toLocaleDateString(lang)
                        : t('dashboard.cv.present')}
                    </Typography>
                    {entry.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {entry.description}
                      </Typography>
                    )}
                    {entry.roleCategory && (
                      <Chip label={entry.roleCategory} size="small" sx={{ mt: 1, fontWeight: 600 }} />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                    <IconButton size="small" onClick={() => openEdit(entry)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {!entry.verified && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editingId ? t('dashboard.cv.edit_entry') : t('dashboard.cv.new_entry')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label={t('dashboard.cv.venue_name')}
              value={form.placeName}
              onChange={(e) => setForm((f) => ({ ...f, placeName: e.target.value }))}
              required
              fullWidth
              helperText={t('dashboard.cv.venue_name_hint')}
            />
            <TextField
              label={t('dashboard.cv.address')}
              value={form.placeAddress}
              onChange={(e) => setForm((f) => ({ ...f, placeAddress: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('dashboard.cv.position')}
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              required
              fullWidth
            />
            <Autocomplete
              options={[...MEMBER_ROLES]}
              value={form.roleCategory || null}
              onChange={(_, v) => setForm((f) => ({ ...f, roleCategory: v ?? '' }))}
              renderInput={(p) => (
                <TextField {...p} label={t('dashboard.cv.role_category')} />
              )}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('dashboard.cv.start_date')}
                type="date"
                value={form.startedAtStr}
                onChange={(e) => setForm((f) => ({ ...f, startedAtStr: e.target.value }))}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('dashboard.cv.end_date')}
                type="date"
                value={form.endedAtStr}
                onChange={(e) => setForm((f) => ({ ...f, endedAtStr: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={t('dashboard.cv.end_date_hint')}
              />
            </Box>
            <TextField
              label={t('dashboard.cv.description')}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            {t('dashboard.cv.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.placeName || !form.position || !form.startedAtStr}
            sx={{ fontWeight: 700 }}
          >
            {saving ? <CircularProgress size={20} /> : t('dashboard.cv.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
