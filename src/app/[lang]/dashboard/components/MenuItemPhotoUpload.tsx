'use client';

import { useState, useRef } from 'react';
import {
  Box, Button, Typography, IconButton, TextField,
  CircularProgress, Tooltip, Stack, Chip,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Image from 'next/image';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@/lib/i18n/client';
import { useDriveIntegration } from '@/lib/hooks/useDriveIntegration';

interface Props {
  lang: string;
  organizationId: string;
  restId: string;
  menuItemId: string;
  currentUrl?: string;
  onUrlChange: (url: string | null) => void;
}

/** Converts a Google Drive share URL to a direct image URL */
function normalizeGDriveUrl(url: string): string {
  const match = url.match(/\/d\/([\w-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  const match2 = url.match(/[?&]id=([\w-]+)/);
  if (match2) return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
  return url;
}

export default function MenuItemPhotoUpload({ lang, organizationId, restId, menuItemId, currentUrl, onUrlChange }: Props) {
  const { t } = useTranslation(lang, 'dashboard');
  const [uploading, setUploading] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, uploadMenuImage, deleteFile } = useDriveIntegration();

  const driveFileIdFromUrl = (url?: string) => {
    if (!url) return null;
    const directMatch = url.match(/[?&]id=([\w-]+)/);
    if (directMatch) return directMatch[1];
    const fileMatch = url.match(/\/d\/([\w-]+)/);
    if (fileMatch) return fileMatch[1];
    return null;
  };

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5_000_000) return;

    setUploading(true);
    try {
      const base64Data = await fileToBase64(file);
      const result = await uploadMenuImage({
        orgId: organizationId,
        restaurantId: restId,
        menuItemId,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });
      onUrlChange(result.imageUrl);
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkSave = () => {
    const normalized = normalizeGDriveUrl(linkInput.trim());
    if (normalized) onUrlChange(normalized);
    setLinkMode(false);
    setLinkInput('');
  };

  const handleRemove = async () => {
    const fileId = driveFileIdFromUrl(currentUrl);
    if (fileId && status.connected) {
      try {
        await deleteFile({ orgId: organizationId, fileId });
      } catch (err) {
        console.error('Drive delete error:', err);
      }
    }
    onUrlChange(null);
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {t('photo_upload.section_label')}
      </Typography>

      {currentUrl ? (
        <Box sx={{ mt: 1, position: 'relative', width: '100%', height: 180, overflow: 'hidden', borderRadius: 2 }}>
          <Image
            src={currentUrl}
            alt={t('photo_upload.preview_alt')}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 600px) 100vw, 400px"
          />
          <Tooltip title={t('photo_upload.remove_tooltip')}>
            <IconButton
              size="small"
              color="error"
              onClick={handleRemove}
              sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', boxShadow: 1, zIndex: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={14} /> : <PhotoCameraIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !status.connected || !organizationId}
          >
            {uploading ? t('photo_upload.uploading') : t('photo_upload.upload_btn')}
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => setLinkMode((v) => !v)}
          >
            Google Drive / URL
          </Button>

          <Chip label="PNG/JPG, max 5 MB" size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        </Stack>
      )}

      {!status.connected && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          {t('photo_upload.drive_not_connected')}
        </Typography>
      )}

      {linkMode && (
        <Stack direction="row" spacing={1} mt={1} alignItems="flex-start">
          <TextField
            size="small"
            fullWidth
            label={t('photo_upload.url_label')}
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://drive.google.com/file/d/…"
            helperText={t('photo_upload.url_placeholder')}
          />
          <Button size="small" variant="contained" onClick={handleLinkSave} disabled={!linkInput.trim()} sx={{ mt: 0.25 }}>
            OK
          </Button>
        </Stack>
      )}
    </Box>
  );
}
