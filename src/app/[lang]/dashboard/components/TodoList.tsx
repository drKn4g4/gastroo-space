'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import {
  collection, query, where, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useAuth } from '../../providers/AuthProvider';
import { useOrganization } from '../../providers/OrganizationProvider';
import {
  Box, Typography, Checkbox, Chip, Stack, CircularProgress, Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { format } from 'date-fns';
import type { TodoTask, TodoPriority } from '@/types/pos';
import T from '@/styles/pos.tokens';
import { vmin } from '@/styles/units';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<TodoPriority, 'error' | 'warning' | 'default'> = {
  high:   'error',
  medium: 'warning',
  low:    'default',
};

const CATEGORY_ICON: Record<string, string> = {
  cleaning: '🧹',
  setup:    '🪑',
  general:  '📋',
  safety:   '⚠️',
  finance:  '💰',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface TodoListProps {
  restaurantId: string;
  role: string;
}

export default function TodoList({ restaurantId, role }: TodoListProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang ?? 'pl', 'dashboard');
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // today obliczane raz w useEffect → brak hydration mismatch
  const [today] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  // Real-time todo tasks dla tej roli i daty
  useEffect(() => {
    const orgId = organization?.id || 'demo-org';
    const q = query(
      collection(db, `organizations/${orgId}/restaurants/${restaurantId}/todoTasks`),
      where('shiftDate', '==', today),
      where('assignedToRoles', 'array-contains', role),
    );

    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        unsub = safeOnSnapshot(
          q,
          (snap: any) => {
            const items = snap.docs.map((d: any) => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                completedAt: data.completedAt?.toDate?.() ?? undefined,
              } as TodoTask;
            });
            // Sortuj: nieukończone najpierw, potem wg priorytetu
            items.sort((a: TodoTask, b: TodoTask) => {
              if (!!a.completedBy !== !!b.completedBy) return a.completedBy ? 1 : -1;
              const order = { high: 0, medium: 1, low: 2 };
              return order[a.priority] - order[b.priority];
            });
            setTasks(items);
            setLoading(false);
          },
          (err) => {
            console.error('❌ [TodoList] Snapshot error:', err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('❌ [TodoList] Subscription failed:', err);
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      if (unsub) unsub();
    };
  }, [restaurantId, role, today]);

  const handleToggle = async (task: TodoTask) => {
    if (!user || toggling) return;
    setToggling(task.id);

    try {
      const orgId = organization?.id || 'demo-org';
      const ref = doc(db, `organizations/${orgId}/restaurants/${restaurantId}/todoTasks`, task.id);
      if (task.completedBy) {
        // Odznacz
        await updateDoc(ref, { completedBy: null, completedAt: null });
      } else {
        // Oznacz jako wykonane
        await updateDoc(ref, {
          completedBy: user.uid,
          completedAt: Timestamp.now(),
        });
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    } finally {
      setToggling(null);
    }
  };

  const done  = tasks.filter((t) => !!t.completedBy).length;
  const total = tasks.length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size="1.25rem" />
      </Box>
    );
  }

  if (tasks.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
        {t('dashboard.todo.empty')}
      </Typography>
    );
  }

  return (
    <Box>
      {/* Nagłówek z postępem */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {t('dashboard.todo.title')}
        </Typography>
        <Typography variant="caption" color={done === total ? 'success.main' : 'text.secondary'}>
          {done}/{total}
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box sx={{ height: 3, bgcolor: 'action.hover', borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: `${total > 0 ? (done / total) * 100 : 0}%`,
            bgcolor: done === total ? 'success.main' : 'primary.main',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>

      {/* Lista zadań */}
      <Stack spacing={0.75}>
        {tasks.map((task) => {
          const isDone      = !!task.completedBy;
          const isToggling  = toggling === task.id;

          return (
            <Box
              key={task.id}
              onClick={() => handleToggle(task)}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: isDone ? 'action.disabledBackground' : 'action.hover',
                border: 1,
                borderColor: isDone ? 'divider' : (task.priority === 'high' ? 'error.main' : 'divider'),
                cursor: 'pointer',
                opacity: isDone ? 0.6 : 1,
                transition: 'opacity 0.2s',
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {/* Checkbox */}
              <Box sx={{ pt: 0.25, flexShrink: 0 }}>
                {isToggling ? (
                  <CircularProgress size="1.125rem" />
                ) : isDone ? (
                  <CheckCircleIcon sx={{ fontSize: vmin(20), color: 'success.main' }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: vmin(20), color: 'text.disabled' }} />
                )}
              </Box>

              {/* Treść */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.3,
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'text.disabled' : 'text.primary',
                  }}
                >
                  {CATEGORY_ICON[task.category] ?? '📋'} {task.title}
                </Typography>
                {task.description && !isDone && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {task.description}
                  </Typography>
                )}
              </Box>

              {/* Badges */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                <Tooltip title={task.isGroupTask ? t('dashboard.todo.group_task') : t('dashboard.todo.personal_task')}>
                  <Box sx={{ color: 'text.disabled', display: 'flex' }}>
                    {task.isGroupTask
                      ? <GroupIcon sx={{ fontSize: vmin(14) }} />
                      : <PersonIcon sx={{ fontSize: vmin(14) }} />
                    }
                  </Box>
                </Tooltip>
                {task.priority !== 'low' && (
                  <Chip
                    label={task.priority === 'high' ? '!' : '·'}
                    size="small"
                    color={PRIORITY_COLOR[task.priority]}
                    sx={{ height: vmin(16), fontSize: T.captionFont, fontWeight: 700 }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
