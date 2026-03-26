import { useEffect, useState } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  status: string;
}

export interface BillSummary {
  id: string;
  tableName: string;
  tableNumber: number;
  guestCount: number;
  total: number;
  currency: string;
  status: 'active' | 'payment_pending' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  staffName?: string;
  items: OrderItem[];
}

export function useBillsFromActiveSessions(organizationId?: string, restaurantId?: string) {
  const [openBills, setOpenBills] = useState<BillSummary[]>([]);
  const [closedBills, setClosedBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !restaurantId) {
      setOpenBills([]);
      setClosedBills([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'activeSessions'),
      where('organizationId', '==', organizationId),
      where('restaurantId', '==', restaurantId),
    );
    const unsub = safeOnSnapshot(q, (snap: any) => {
      const bills: BillSummary[] = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          tableName: data.tableName ?? '',
          tableNumber: data.tableNumber ?? 0,
          guestCount: data.guestIds?.length ?? 0,
          total: data.totals?.billTotal ?? 0,
          currency: data.currency ?? 'PLN',
          status: data.status ?? 'active',
          openedAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          closedAt: data.closedAt instanceof Timestamp ? data.closedAt.toDate() : undefined,
          staffName: data.hostName,
          items: (data.items ?? []).map((it: any) => ({
            name: it.name ?? '—',
            quantity: it.quantity ?? 1,
            price: it.price ?? 0,
            status: it.status ?? 'ordered',
          })),
        };
      });
      setOpenBills(bills.filter((b) => b.status === 'active' || b.status === 'payment_pending'));
      setClosedBills(bills.filter((b) => b.status === 'closed'));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [organizationId, restaurantId]);

  return { openBills, closedBills, loading };
}
