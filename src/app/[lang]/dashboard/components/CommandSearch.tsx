'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  ClickAwayListener,
  IconButton,
  InputBase,
  Paper,
  Popper,
  Slide,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { collection, collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import { usePermissions } from '@/lib/hooks/usePermissions';

import { useOrganization } from '../../providers/OrganizationProvider';
import { useSession } from '../../providers/SessionProvider';
import { useParams, useRouter } from 'next/navigation';

import SearchResultDetailsDialog from './SearchResultDetailsDialog';
import type { SearchResult } from './search.types';

function matchesQuery(result: SearchResult, q: string): boolean {
  const extra =
    result.type === 'booking'
      ? `${String(result.raw.notes ?? '')} ${String(result.raw.specialRequests ?? '')}`
      : result.type === 'menuItem'
        ? `${String(result.raw.description ?? '')} ${String(result.raw.ingredientsList ?? '')}`
        : '';
  return `${result.title} ${result.subtitle} ${result.meta ?? ''} ${extra}`.toLowerCase().includes(q);
}

export default function CommandSearch() {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang = params?.lang ?? 'pl';
  const { t } = useTranslation(lang, 'dashboard');
  const { organization, currentRestaurant } = useOrganization();
  const perms = usePermissions();
  const { activeSession, addToTableSession } = useSession();

  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<number>(-1);
  const [results, setResults] = useState<SearchResult[]>([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Cached data (loaded once, filtered client-side) ────────────────────
  const [membersCache, setMembersCache] = useState<SearchResult[]>([]);
  const [bookingsCache, setBookingsCache] = useState<SearchResult[]>([]);
  const [menuCache, setMenuCache] = useState<SearchResult[]>([]);
  const [ingredientsCache, setIngredientsCache] = useState<SearchResult[]>([]);
  const [promotionsCache, setPromotionsCache] = useState<SearchResult[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    if (!organization?.id || !currentRestaurant?.id) return;
    let cancelled = false;

    const loadData = async () => {
      setCacheLoaded(false);

      const membersPromise = getDocs(
        query(collection(db, `organizations/${organization.id}/members`), limit(250)),
      );

      const bookingsTopLevelPromise = getDocs(
        query(
          collection(db, 'bookings'),
          where('organizationId', '==', organization.id),
          where('restaurantId', '==', currentRestaurant.id),
          limit(250),
        ),
      );

      const bookingsNestedPromise = getDocs(
        query(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/bookings`),
          limit(250),
        ),
      );

      const menuPromise = getDocs(
        query(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/menuItems`),
          limit(250),
        ),
      );

      const ingredientsPromise = getDocs(
        query(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/ingredients`),
          limit(250),
        ),
      );

      const promotionsPromise = getDocs(
        query(
          collectionGroup(db, 'promotions'),
          where('organizationId', '==', organization.id),
          limit(250),
        ),
      );

      const [
        membersRes,
        bookingsTopLevelRes,
        bookingsNestedRes,
        menuRes,
        ingredientsRes,
        promotionsRes,
      ] = await Promise.allSettled([
        membersPromise,
        bookingsTopLevelPromise,
        bookingsNestedPromise,
        menuPromise,
        ingredientsPromise,
        promotionsPromise,
      ]);

      if (cancelled) return;

      if (membersRes.status === 'fulfilled') {
        setMembersCache(
          membersRes.value.docs.map((d) => {
            const data = d.data();
            const displayName = (data.displayName || data.name || data.fullName || '') as string;
            const email = (data.email || '') as string;
            const role = (data.role || '') as string;
            return {
              id: d.id,
              type: 'member',
              title: displayName || email || '—',
              subtitle: email || role,
              meta: role || undefined,
              raw: data as Record<string, unknown>,
            } satisfies SearchResult;
          }),
        );
      } else {
        setMembersCache([]);
      }

      const bookingResults: SearchResult[] = [];
      const pushBooking = (id: string, data: Record<string, any>) => {
        const title = data.title || data.name || data.guestName || data.customerName || '—';
        const bookingDate = data.bookingDate || data.date || '';
        const bookingTime = data.bookingTime || data.time || '';
        const guestCount = data.guestCount ?? data.partySize ?? data.guests ?? '';
        const phone = data.phone || data.guestPhone || '';
        const subtitleParts = [
          bookingDate,
          bookingTime,
          guestCount !== '' ? `${guestCount} ${t('dashboard.search.guests')}` : '',
          phone,
        ].filter(Boolean);
        bookingResults.push({
          id,
          type: 'booking',
          title: String(title),
          subtitle: subtitleParts.join(' · '),
          meta: data.status ? String(data.status) : undefined,
          raw: data as Record<string, unknown>,
        });
      };

      if (bookingsTopLevelRes.status === 'fulfilled') {
        bookingsTopLevelRes.value.docs.forEach((d) => pushBooking(d.id, d.data() as any));
      }
      if (bookingsNestedRes.status === 'fulfilled') {
        bookingsNestedRes.value.docs.forEach((d) => pushBooking(d.id, d.data() as any));
      }
      setBookingsCache(bookingResults);

      if (menuRes.status === 'fulfilled') {
        setMenuCache(
          menuRes.value.docs.map((d) => {
            const data = d.data();
            const currency = (data.currency ?? data.currencyCode ?? 'PLN') as string;
            const subtitleParts = [
              typeof data.price === 'number' ? `${data.price.toFixed(2)} ${currency}` : '',
              data.categoryId ? String(data.categoryId) : '',
            ].filter(Boolean);
            return {
              id: d.id,
              type: 'menuItem',
              title: String(data.name || data.title || '—'),
              subtitle: subtitleParts.join(' · '),
              meta: data.categoryId ? String(data.categoryId) : undefined,
              raw: data as Record<string, unknown>,
            } satisfies SearchResult;
          }),
        );
      } else {
        setMenuCache([]);
      }

      if (ingredientsRes.status === 'fulfilled') {
        setIngredientsCache(
          ingredientsRes.value.docs.map((d) => {
            const data = d.data();
            const unit = data.unit ? String(data.unit) : '';
            const category = data.category ? String(data.category) : '';
            const stock = typeof data.stockQuantity === 'number' ? data.stockQuantity : null;
            const subtitleParts = [
              category,
              stock !== null && unit ? `${stock} ${unit}` : stock !== null ? String(stock) : '',
            ].filter(Boolean);
            return {
              id: d.id,
              type: 'ingredient',
              title: String(data.name || data.title || '—'),
              subtitle: subtitleParts.join(' · '),
              meta: unit || category || undefined,
              raw: data as Record<string, unknown>,
            } satisfies SearchResult;
          }),
        );
      } else {
        setIngredientsCache([]);
      }

      if (promotionsRes.status === 'fulfilled') {
        setPromotionsCache(
          promotionsRes.value.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'promotion',
              title: String(data.name || data.title || '—'),
              subtitle: String(data.description || ''),
              meta: data.status ? String(data.status) : undefined,
              raw: data as Record<string, unknown>,
            } satisfies SearchResult;
          }),
        );
      } else {
        setPromotionsCache([]);
      }

      setCacheLoaded(true);
    };

    void loadData();
    return () => { cancelled = true; };
  }, [organization?.id, currentRestaurant?.id, t]);

  // ─── Filter results on input ────────────────────────────────────────────
  useEffect(() => {
    if (!inputValue.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const q = inputValue.toLowerCase().trim();

    const guestCandidates: SearchResult[] = [];
    const guestMap = new Map<string, { name?: string; phone?: string; email?: string; bookingCount: number }>();
    bookingsCache.forEach((b) => {
      const phone = (b.raw.guestPhone || b.raw.phone) ? String(b.raw.guestPhone || b.raw.phone) : '';
      const email = b.raw.guestEmail ? String(b.raw.guestEmail) : '';
      const name = (b.raw.guestName || b.raw.name) ? String(b.raw.guestName || b.raw.name) : '';
      const key = phone || email || name;
      if (!key) return;
      const prev = guestMap.get(key) ?? { bookingCount: 0 };
      guestMap.set(key, {
        name: name || prev.name,
        phone: phone || prev.phone,
        email: email || prev.email,
        bookingCount: prev.bookingCount + 1,
      });
    });
    guestMap.forEach((g, key) => {
      guestCandidates.push({
        id: key,
        type: 'guest',
        title: g.name || g.phone || g.email || '—',
        subtitle: [g.phone, g.email].filter(Boolean).join(' · '),
        meta: String(g.bookingCount),
        raw: g as unknown as Record<string, unknown>,
      });
    });

    const matchedMembers = membersCache.filter((r) => matchesQuery(r, q)).slice(0, 5);
    const matchedBookings = bookingsCache.filter((r) => matchesQuery(r, q)).slice(0, 5);
    const matchedGuests = guestCandidates.filter((r) => matchesQuery(r, q)).slice(0, 5);
    const matchedMenu = menuCache.filter((r) => matchesQuery(r, q)).slice(0, 5);
    const matchedIngredients = ingredientsCache.filter((r) => matchesQuery(r, q)).slice(0, 5);
    const matchedPromotions = promotionsCache.filter((r) => matchesQuery(r, q)).slice(0, 5);

    setResults([
      ...matchedMembers,
      ...matchedBookings,
      ...matchedGuests,
      ...matchedMenu,
      ...matchedIngredients,
      ...matchedPromotions,
    ]);
    setLoading(false);
    setFocused(-1);
  }, [inputValue, membersCache, bookingsCache, menuCache, ingredientsCache, promotionsCache]);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setMobileExpanded(false);
    setInputValue('');
    setResults([]);
    inputRef.current?.blur();
  }, []);

  const openDetails = useCallback((result: SearchResult) => {
    setSelected(result);
    setDetailsOpen(true);
    setOpen(false);
    setMobileExpanded(false);
  }, []);

  const handleOpenFromDetails = useCallback((result: SearchResult) => {
    if (result.type === 'member') router.push(`/${lang}/dashboard/team/${encodeURIComponent(result.id)}`);
    if (result.type === 'booking') router.push(`/${lang}/dashboard/bookings/${encodeURIComponent(result.id)}`);
    if (result.type === 'guest') router.push(`/${lang}/dashboard/guests/${encodeURIComponent(result.id)}`);
    if (result.type === 'menuItem') router.push(`/${lang}/dashboard/menuItem/${encodeURIComponent(result.id)}`);
    if (result.type === 'ingredient') router.push(`/${lang}/dashboard/inventory?ingredientId=${encodeURIComponent(result.id)}`);
    if (result.type === 'promotion') router.push(`/${lang}/dashboard/promotions/${encodeURIComponent(result.id)}`);
    closeSearch();
  }, [router, lang, closeSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focused >= 0 && results[focused]) {
      openDetails(results[focused]);
    }
  }, [results, focused, closeSearch, openDetails]);

  const handleEditMenuItem = (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${lang}/dashboard/menu?menuItemId=${encodeURIComponent(result.id)}`);
    closeSearch();
  };

  const handleAddToBill = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeSession) return;
    await addToTableSession({
      menuItemId: result.id,
      name: result.title,
      price: (result.raw as any).price ?? 0,
      notes: '',
    });
    closeSearch();
  };

  // ─── Render sections ──────────────────────────────────────────────────
  const memberResults = useMemo(() => results.filter((r) => r.type === 'member'), [results]);
  const bookingResults = useMemo(() => results.filter((r) => r.type === 'booking'), [results]);
  const guestResults = useMemo(() => results.filter((r) => r.type === 'guest'), [results]);
  const menuResults = useMemo(() => results.filter((r) => r.type === 'menuItem'), [results]);
  const ingredientResults = useMemo(() => results.filter((r) => r.type === 'ingredient'), [results]);
  const promotionResults = useMemo(() => results.filter((r) => r.type === 'promotion'), [results]);

  const hasResults = results.length > 0;
  const showDropdown = open && inputValue.trim().length > 0;

  let globalIdx = 0;
  const section = (
    header: { icon: React.ReactNode; label: string },
    list: SearchResult[],
    renderItem: (r: SearchResult) => React.ReactNode,
    showTopBorder: boolean,
  ) => {
    if (list.length === 0) return null;
    const startIdx = globalIdx;
    globalIdx += list.length;
    return (
      <Box>
        {showTopBorder && <Box sx={{ borderTop: 1, borderColor: 'divider' }} />}
        <Typography
          variant="overline"
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.secondary',
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
          }}
        >
          {header.icon}
          {header.label}
        </Typography>
        {list.map((r, idx) => (
          <Box
            key={`${r.type}:${r.id}`}
            onClick={() => openDetails(r)}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              bgcolor: focused === startIdx + idx ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              transition: 'background 0.1s',
            }}
          >
            {renderItem(r)}
          </Box>
        ))}
      </Box>
    );
  };

  const resultsDropdown = (
    <Paper
      elevation={8}
      sx={{
        borderRadius: '12px',
        maxHeight: 400,
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {loading && !cacheLoaded ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={20} />
        </Box>
      ) : !hasResults && inputValue.trim() ? (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.disabled' }}>
          <Typography variant="body2">{t('dashboard.search.no_results')}</Typography>
        </Box>
      ) : (
        <>
          {section(
            { icon: <GroupIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.members') },
            memberResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'info.main', color: 'info.contrastText' }}>
                  <PersonIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {r.meta ? (
                  <Chip size="small" label={r.meta} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }} />
                ) : null}
              </Stack>
            ),
            false,
          )}

          {section(
            { icon: <CalendarMonthIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.bookings') },
            bookingResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'action.selected' }}>
                  <CalendarMonthIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {r.meta ? (
                  <Chip size="small" label={r.meta} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }} />
                ) : null}
              </Stack>
            ),
            memberResults.length > 0,
          )}

          {section(
            { icon: <PersonIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.guests_title') },
            guestResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                  <PersonIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {r.meta ? (
                  <Chip size="small" label={r.meta} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }} />
                ) : null}
              </Stack>
            ),
            memberResults.length > 0 || bookingResults.length > 0,
          )}

          {section(
            { icon: <RestaurantMenuIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.menu_items') },
            menuResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  <RestaurantMenuIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                  {perms.canManageMenu ? (
                    <IconButton
                      size="small"
                      onClick={(e) => handleEditMenuItem(r, e)}
                      sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                  ) : null}
                  {activeSession ? (
                    <IconButton
                      size="small"
                      onClick={(e) => void handleAddToBill(r, e)}
                      sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'success.main' } }}
                    >
                      <AddIcon sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                  ) : null}
                </Stack>
              </Stack>
            ),
            memberResults.length > 0 || bookingResults.length > 0 || guestResults.length > 0,
          )}

          {section(
            { icon: <InventoryIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.ingredients') },
            ingredientResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                  <InventoryIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {r.meta ? (
                  <Chip size="small" label={r.meta} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }} />
                ) : null}
              </Stack>
            ),
            memberResults.length > 0 || bookingResults.length > 0 || guestResults.length > 0 || menuResults.length > 0,
          )}

          {section(
            { icon: <LocalOfferOutlinedIcon sx={{ fontSize: '0.85rem' }} />, label: t('dashboard.search.promotions') },
            promotionResults,
            (r) => (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'success.main', color: 'success.contrastText' }}>
                  <LocalOfferOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {r.title}
                  </Typography>
                  {r.subtitle ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {r.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {r.meta ? (
                  <Chip size="small" label={r.meta} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }} />
                ) : null}
              </Stack>
            ),
            memberResults.length > 0 || bookingResults.length > 0 || guestResults.length > 0 || menuResults.length > 0 || ingredientResults.length > 0,
          )}
        </>
      )}

      {hasResults ? (
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
            ↑↓ {t('dashboard.search.navigate')} · Enter {t('dashboard.search.select')} · Esc {t('dashboard.search.close')}
          </Typography>
        </Box>
      ) : null}
    </Paper>
  );

  const searchInput = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: '10px',
        bgcolor: alpha(theme.palette.text.primary, 0.05),
        px: 1.25,
        py: 0.25,
        transition: 'all 0.2s',
        border: '1px solid',
        borderColor: open ? 'primary.main' : 'transparent',
        ...(open && {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
        }),
      }}
    >
      <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary', mr: 0.75 }} />
      <InputBase
        inputRef={inputRef}
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('dashboard.search.placeholder')}
        sx={{
          flex: 1,
          fontSize: '0.8rem',
          fontWeight: 500,
          '& input': { py: 0.25 },
          '& input::placeholder': { opacity: 0.6 },
        }}
      />
      {inputValue ? (
        <IconButton
          size="small"
          onClick={() => { setInputValue(''); setResults([]); }}
          sx={{ p: 0.25 }}
        >
          <CloseIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      ) : null}
    </Box>
  );

  if (!isDesktop) {
    return (
      <>
        <Tooltip title={t('dashboard.search.placeholder')}>
          <IconButton
            size="small"
            onClick={() => {
              setMobileExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            sx={{ color: 'text.secondary' }}
          >
            <SearchIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>

        <Slide direction="down" in={mobileExpanded} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 1500,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              pt: 'env(safe-area-inset-top)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.75, gap: 0.5 }}>
              <Box sx={{ flex: 1 }}>{searchInput}</Box>
              <IconButton size="small" onClick={closeSearch} sx={{ color: 'text.secondary' }}>
                <CloseIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {showDropdown && resultsDropdown}
            </Box>
          </Box>
        </Slide>

        <SearchResultDetailsDialog
          open={detailsOpen}
          result={selected}
          onClose={() => setDetailsOpen(false)}
          onOpen={handleOpenFromDetails}
          t={t}
        />
      </>
    );
  }

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box ref={anchorRef} sx={{ position: 'relative', flex: 1, mx: 1 }}>
          {searchInput}
          <Popper
            open={showDropdown}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            sx={{ zIndex: 1400, width: anchorRef.current?.offsetWidth ?? 320, mt: 0.5 }}
            modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
          >
            {resultsDropdown}
          </Popper>
        </Box>
      </ClickAwayListener>

      <SearchResultDetailsDialog
        open={detailsOpen}
        result={selected}
        onClose={() => setDetailsOpen(false)}
        onOpen={handleOpenFromDetails}
        t={t}
      />
    </>
  );
}
