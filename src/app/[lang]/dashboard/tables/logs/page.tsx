'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Stack, Chip, Divider, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import type { TableLogEntry, Table as PosTable } from '@/types/pos';
import { useTranslation } from '@/lib/i18n/client';
import { useParams, useRouter } from 'next/navigation';

export default function TableLogsPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'common');
  const router = useRouter();
  const { organization, currentRestaurant } = useOrganization();
  const [logs, setLogs] = useState<TableLogEntry[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization || !currentRestaurant) return;
    setLoading(true);
    const fetchLogs = async () => {
      const tablesQuery = query(collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/tables`));
      const tableDocs = await getDocs(tablesQuery);
      const tableList = tableDocs.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PosTable, 'id'>) }) as PosTable);
      setTables(tableList);
      const allLogs: TableLogEntry[] = [];
      for (const t of tableList) {
        const logsQuery = query(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/tables/${t.id}/logs`),
          orderBy('createdAt', 'desc'),
        );
        const logDocs = await getDocs(logsQuery);
        allLogs.push(...logDocs.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TableLogEntry, 'id'>) }) as TableLogEntry));
      }
      setLogs(allLogs);
      setLoading(false);
    };
    fetchLogs();
  }, [organization, currentRestaurant]);

  const asDate = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const fmtDateTime = (v: any) => {
    const d = asDate(v);
    return d ? d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
  };

  const fmtTime = (v: any) => {
    const d = asDate(v);
    return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
  };

  return (
    <RequireOrganization>
      <PermissionGate permission={PERMISSIONS.TABLES_MANAGE}>
        <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" fontWeight={700} color="text.primary">{t('table_logs.title')}</Typography>
            <Chip label={t('table_logs.history')} size="small" variant="outlined" color="info" sx={{ height: 20, fontSize: 11 }} />
          </Stack>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
              {t('table_logs.empty')}
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('table_logs.col_table')}</TableCell>
                    <TableCell>{t('table_logs.col_booking')}</TableCell>
                    <TableCell>{t('table_logs.col_guest')}</TableCell>
                    <TableCell>{t('table_logs.col_checkin')}</TableCell>
                    <TableCell>{t('table_logs.col_bill')}</TableCell>
                    <TableCell>{t('table_logs.col_payments')}</TableCell>
                    <TableCell>{t('table_logs.col_closed')}</TableCell>
                    <TableCell>{t('table_logs.col_staff')}</TableCell>
                    <TableCell>{t('table_logs.col_notes')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map(log => {
                    const table = tables.find(t => t.id === log.tableId);
                    return (
                      <TableRow key={log.id}>
                        <TableCell
                          onClick={() => router.push(`/${lang}/dashboard/tables/${encodeURIComponent(log.tableId)}`)}
                          sx={{ cursor: 'pointer', fontWeight: 700, '&:hover': { color: 'primary.main' } }}
                        >
                          {table?.number || log.tableId}
                        </TableCell>
                        <TableCell>{log.reservationTime || fmtDateTime((log as any).createdAt)}</TableCell>
                        <TableCell>{log.guestName || '-'}</TableCell>
                        <TableCell>{fmtTime(log.actualCheckInTime)}</TableCell>
                        <TableCell>{log.billTotal ? t('common.currency', { amount: log.billTotal }) : '-'}</TableCell>
                        <TableCell>
                          {log.payments && log.payments.length > 0 ? (
                            <Stack spacing={0.5}>
                              {log.payments.map((p, i) => (
                                <Tooltip key={i} title={t('table_logs.processed_by', { name: p.processedBy || '-', method: p.method })}>
                                  <Chip label={t('common.currency', { amount: p.amount })} size="small" color="success" />
                                </Tooltip>
                              ))}
                            </Stack>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{fmtTime(log.closedAt)}</TableCell>
                        <TableCell>{log.reservedBy || log.closedBy || '-'}</TableCell>
                        <TableCell>{log.internalNotes || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </PermissionGate>
    </RequireOrganization>
  );
}
