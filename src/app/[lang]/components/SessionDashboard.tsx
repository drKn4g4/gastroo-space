'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Drawer,
  IconButton,
  Stack,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  TextField,
  InputAdornment,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckIcon from '@mui/icons-material/Check';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams } from 'next/navigation';
import { useSession } from '../providers/SessionProvider';
import { useAuth } from '../providers/AuthProvider';
import { useTranslation } from '@/lib/i18n/client';
import type { SplitMode, SessionItem } from '@/types/organization';
import { TEST_IDS } from '@/lib/testing/selectors';

// ─── Tip Presets ─────────────────────────────────────────────────────────────

const TIP_PRESETS = [10, 15, 20];

// ─── Sub-views ───────────────────────────────────────────────────────────────

type DashboardTab = 'orders' | 'split' | 'invite';

// ─── Item Status Badge ───────────────────────────────────────────────────────

function ItemStatusBadge({ status, t }: { status: SessionItem['status']; t: (key: string) => string }) {
  const config = {
    ordered:   { labelKey: 'session.status_ordered',   color: 'info' as const,    icon: <ReceiptIcon sx={{ fontSize: '0.75rem' }} /> },
    preparing: { labelKey: 'session.status_preparing', color: 'warning' as const, icon: <LocalFireDepartmentIcon sx={{ fontSize: '0.75rem' }} /> },
    served:    { labelKey: 'session.status_served',    color: 'success' as const, icon: <CheckIcon sx={{ fontSize: '0.75rem' }} /> },
  }[status];

  return (
    <Chip
      icon={config.icon}
      label={t(config.labelKey)}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: '0.625rem', height: 22 }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SessionDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const params = useParams<{ lang: string }>();
  const lang = params?.lang ?? 'pl';
  const { t } = useTranslation(lang, 'common');
  const {
    activeSession,
    drawerOpen,
    setDrawerOpen,
    setSplitMode,
    claimItem,
    unclaimItem,
    setTip,
    callWaiter,
    leaveSession,
  } = useSession();

  const [tab, setTab] = useState<DashboardTab>('orders');
  const [customTip, setCustomTip] = useState('');
  const [sosSent, setSosSent] = useState(false);

  const uid = user?.uid;

  if (!activeSession) return null;

  const {
    restaurantName,
    tableNumber,
    tableName,
    items,
    totals,
    splitMode,
    guestIds,
    guestNames,
    currency,
    sessionId,
    organizationId,
    restaurantId,
  } = activeSession;

  // ─── Derived data ──────────────────────────────────────────────────────

  const myItems = items.filter((i) => i.orderedBy === uid);
  const myClaimedItems = items.filter((i) => i.claimedBy === uid);
  const myTotal =
    splitMode === 'equal_split'
      ? totals.billTotal / Math.max(guestIds.length, 1)
      : splitMode === 'itemized_split'
        ? myClaimedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        : totals.billTotal; // full_pay

  const currentPayment = activeSession.payments.find((p) => p.userId === uid);
  const currentTip = currentPayment?.tip ?? 0;

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSOS = async () => {
    await callWaiter();
    setSosSent(true);
    setTimeout(() => setSosSent(false), 5000);
  };

  const handleTipPreset = (pct: number) => {
    const tipAmount = Math.round(myTotal * pct) / 100;
    setTip(tipAmount);
    setCustomTip('');
  };

  const handleCustomTip = () => {
    const amount = parseFloat(customTip);
    if (!isNaN(amount) && amount >= 0) {
      setTip(amount);
    }
  };

  // ─── QR payload for session invite ─────────────────────────────────────

  const qrPayload = JSON.stringify({
    type: 'gastroo:session:join',
    sessionId,
    organizationId,
    restaurantId,
  });

  const tableLabel = tableName
    ? t('session.header_table', { name: tableName })
    : t('session.header_table_number', { number: tableNumber });

  const guestsLabel = guestIds.length === 1
    ? t('session.header_guests_one', { count: guestIds.length })
    : t('session.header_guests_other', { count: guestIds.length });

  return (
    <Drawer
      data-testid={TEST_IDS.session.drawer}
      anchor="bottom"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          height: '92dvh',
          borderRadius: '1.5rem 1.5rem 0 0',
          bgcolor: 'background.default',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1.2 }} noWrap>
            {restaurantName || t('session.header_session')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {tableLabel} &middot; {guestsLabel}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={sosSent ? 'contained' : 'outlined'}
            color={sosSent ? 'success' : 'warning'}
            startIcon={
              sosSent ? (
                <CheckCircleIcon />
              ) : (
                <NotificationsActiveIcon />
              )
            }
            data-testid={TEST_IDS.session.sosButton}
            onClick={handleSOS}
            disabled={sosSent}
            sx={{ fontWeight: 700, borderRadius: '0.75rem', fontSize: '0.75rem' }}
          >
            {sosSent ? t('session.sos_sent') : 'SOS'}
          </Button>
          <IconButton data-testid={TEST_IDS.session.closeDrawer} onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Tab Switcher ── */}
      <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          fullWidth
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'none',
              borderRadius: '0.75rem !important',
              border: 'none',
              py: 0.75,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            },
          }}
        >
          <ToggleButton data-testid={TEST_IDS.session.tabOrders} value="orders">
            <RestaurantMenuIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> {t('session.tab_orders')}
          </ToggleButton>
          <ToggleButton data-testid={TEST_IDS.session.tabSplit} value="split">
            <ReceiptIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> {t('session.tab_bill')}
          </ToggleButton>
          <ToggleButton data-testid={TEST_IDS.session.tabInvite} value="invite">
            <PersonAddIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> {t('session.tab_invite')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
        {/* ─── Orders Tab ─── */}
        {tab === 'orders' && (
          <Box>
            {items.length === 0 ? (
              <Box data-testid={TEST_IDS.session.ordersEmpty} sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
                <RestaurantMenuIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                <Typography variant="body2">{t('session.orders_empty')}</Typography>
                <Typography variant="caption">{t('session.orders_empty_hint')}</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {items.map((item) => {
                  const isMyOrder = item.orderedBy === uid;
                  const ordererName =
                    guestNames?.[item.orderedBy] || (isMyOrder ? t('session.orderer_me') : t('session.orderer_guest'));
                  return (
                    <ListItem
                      key={item.id}
                      data-testid={TEST_IDS.session.orderItem(item.id)}
                      sx={{
                        px: 0,
                        py: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        opacity: item.status === 'served' ? 0.7 : 1,
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: isMyOrder ? 'primary.main' : 'action.selected',
                            color: isMyOrder ? 'primary.contrastText' : 'text.primary',
                          }}
                        >
                          {ordererName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {item.quantity > 1 ? `${item.quantity}x ` : ''}
                              {item.name}
                            </Typography>
                            <ItemStatusBadge status={item.status} t={t} />
                          </Stack>
                        }
                        secondary={ordererName}
                        secondaryTypographyProps={{ fontSize: '0.7rem', fontWeight: 600 }}
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                          {(item.price * item.quantity).toFixed(2)} {currency}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* ─── Split / Bill Tab ─── */}
        {tab === 'split' && (
          <Box>
            {/* Bill summary */}
            <Box
              sx={{
                p: 2,
                borderRadius: '1rem',
                bgcolor: 'background.paper',
                mb: 3,
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('session.bill_label')}
                  </Typography>
                  <Typography data-testid={TEST_IDS.session.billTotal} variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {totals.billTotal.toFixed(2)} {currency}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('session.bill_paid')}
                  </Typography>
                  <Typography
                    data-testid={TEST_IDS.session.billPaid}
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {totals.paidTotal.toFixed(2)} {currency}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 900 }}>
                    {t('session.bill_remaining')}
                  </Typography>
                  <Typography
                    data-testid={TEST_IDS.session.billRemaining}
                    variant="body1"
                    color="primary.main"
                    sx={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {totals.remainingTotal.toFixed(2)} {currency}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Split mode selector */}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1,
                display: 'block',
              }}
            >
              {t('session.split_mode_label')}
            </Typography>
            <ToggleButtonGroup
              value={splitMode}
              exclusive
              onChange={(_, v) => v && setSplitMode(v as SplitMode)}
              fullWidth
              size="small"
              sx={{
                mb: 3,
                '& .MuiToggleButton-root': {
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              <ToggleButton data-testid={TEST_IDS.session.splitModeFullPay} value="full_pay">{t('session.split_full_pay')}</ToggleButton>
              <ToggleButton data-testid={TEST_IDS.session.splitModeEqual} value="equal_split">{t('session.split_equal')}</ToggleButton>
              <ToggleButton data-testid={TEST_IDS.session.splitModeItemized} value="itemized_split">{t('session.split_itemized')}</ToggleButton>
            </ToggleButtonGroup>

            {/* My amount */}
            <Box
              sx={{
                p: 2,
                borderRadius: '1rem',
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.2),
                mb: 3,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t('session.my_amount')}
              </Typography>
              <Typography
                data-testid={TEST_IDS.session.splitMyTotal}
                variant="h4"
                color="primary.main"
                sx={{ fontWeight: 950, fontVariantNumeric: 'tabular-nums' }}
              >
                {myTotal.toFixed(2)} {currency}
              </Typography>
              {splitMode === 'equal_split' && (
                <Typography variant="caption" color="text.secondary">
                  {t('session.equal_split_hint', { total: totals.billTotal.toFixed(2), count: guestIds.length })}
                </Typography>
              )}
            </Box>

            {/* Itemized claim list */}
            {splitMode === 'itemized_split' && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'text.secondary',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  {t('session.itemized_label')}
                </Typography>
                <List disablePadding>
                  {items.map((item) => {
                    const claimed = item.claimedBy === uid;
                    const claimedByOther = item.claimedBy && item.claimedBy !== uid;
                    const claimedByName = guestNames?.[item.claimedBy!];
                    return (
                      <ListItem
                        key={item.id}
                        data-testid={TEST_IDS.session.claimItem(item.id)}
                        onClick={() => {
                          if (claimedByOther) return;
                          claimed ? unclaimItem(item.id) : claimItem(item.id);
                        }}
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: '0.75rem',
                          cursor: claimedByOther ? 'default' : 'pointer',
                          mb: 0.5,
                          bgcolor: claimed
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                          opacity: claimedByOther ? 0.5 : 1,
                          border: 1,
                          borderColor: claimed ? 'primary.main' : 'divider',
                          transition: 'all 0.15s',
                        }}
                      >
                        <ListItemText
                          primary={item.name}
                          primaryTypographyProps={{ fontWeight: 700, fontSize: '0.875rem' }}
                          secondary={
                            claimedByOther
                              ? claimedByName
                                ? t('session.claimed_by', { name: claimedByName })
                                : t('session.claimed_by_guest')
                              : undefined
                          }
                          secondaryTypographyProps={{ fontSize: '0.7rem' }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mr: 1 }}
                        >
                          {(item.price * item.quantity).toFixed(2)}
                        </Typography>
                        {claimed && <CheckCircleIcon color="primary" sx={{ fontSize: '1.25rem' }} />}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}

            {/* Tip section */}
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1.5,
                display: 'block',
              }}
            >
              {t('session.tip_label')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              {TIP_PRESETS.map((pct) => {
                const tipAmount = Math.round(myTotal * pct) / 100;
                const isSelected = Math.abs(currentTip - tipAmount) < 0.01;
                return (
                  <Button
                    key={pct}
                    data-testid={TEST_IDS.session.tipPreset(pct)}
                    variant={isSelected ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleTipPreset(pct)}
                    sx={{
                      flex: 1,
                      fontWeight: 800,
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    {pct}%
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.6rem', ml: 0.5, opacity: 0.7 }}
                    >
                      ({tipAmount.toFixed(2)})
                    </Typography>
                  </Button>
                );
              })}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                data-testid={TEST_IDS.session.tipCustomInput}
                size="small"
                placeholder={t('session.tip_custom_placeholder')}
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': { borderRadius: '0.75rem' },
                }}
              />
              <Button
                data-testid={TEST_IDS.session.tipCustomSubmit}
                variant="outlined"
                size="small"
                onClick={handleCustomTip}
                sx={{ borderRadius: '0.75rem', fontWeight: 700 }}
              >
                {t('session.tip_set')}
              </Button>
            </Stack>
            {currentTip > 0 && (
              <Typography
                data-testid={TEST_IDS.session.tipCurrent}
                variant="caption"
                color="primary.main"
                sx={{ fontWeight: 700, mt: 1, display: 'block' }}
              >
                {t('session.tip_current', { amount: currentTip.toFixed(2), currency })}
              </Typography>
            )}
          </Box>
        )}

        {/* ─── Invite Tab ─── */}
        {tab === 'invite' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
              {t('session.invite_title')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, textAlign: 'center', maxWidth: 280 }}
            >
              {t('session.invite_hint')}
            </Typography>

            {/* QR Code */}
            <Box
              sx={{
                bgcolor: '#fff',
                p: 3,
                borderRadius: '1.5rem',
                boxShadow: `0 8px 32px ${alpha(theme.palette.text.primary, 0.08)}`,
                mb: 4,
              }}
            >
              <QRCodeCanvas
                data-testid={TEST_IDS.session.inviteQr}
                value={qrPayload}
                size={220}
                level="H"
                imageSettings={{
                  src: '/icons/icon-512x512.png',
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </Box>

            {/* Participants list */}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1,
                alignSelf: 'flex-start',
              }}
            >
              {t('session.at_table', { count: guestIds.length })}
            </Typography>
            <Stack spacing={1} sx={{ width: '100%' }}>
              {guestIds.map((gid) => {
                const name = guestNames?.[gid] || t('session.orderer_guest');
                const isHost = gid === activeSession.hostId;
                const isMe = gid === uid;
                return (
                  <Stack
                    key={gid}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: '0.75rem',
                      bgcolor: isMe
                        ? alpha(theme.palette.primary.main, 0.06)
                        : 'background.paper',
                      border: 1,
                      borderColor: isMe ? 'primary.main' : 'divider',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: isMe ? 'primary.main' : 'action.selected',
                        color: isMe ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      {name[0]}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                      {name}
                      {isMe && t('session.guest_me_suffix')}
                    </Typography>
                    {isHost && (
                      <Chip
                        label="Host"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.625rem', height: 20 }}
                      />
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}
      </Box>

      {/* ── Footer: Pay Button ── */}
      {tab === 'split' && totals.remainingTotal > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          }}
        >
          <Button
            data-testid={TEST_IDS.session.payButton}
            variant="contained"
            size="large"
            fullWidth
            sx={{
              borderRadius: '1rem',
              fontWeight: 900,
              fontSize: '1rem',
              py: 1.5,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            {t('session.pay_btn', { amount: (myTotal + currentTip).toFixed(2), currency })}
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
