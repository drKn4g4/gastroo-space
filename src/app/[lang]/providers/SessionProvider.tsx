'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from './AuthProvider';
import type {
  ActiveSession,
  SessionItem,
  SplitMode,
  RemoteOrder,
  SessionJoinPayload,
} from '@/types/organization';

// ─── Context Types ───────────────────────────────────────────────────────────

interface SessionContextType {
  /** Currently active dine-in session (if any) */
  activeSession: ActiveSession | null;
  /** Loading state for session listener */
  sessionLoading: boolean;
  /** Pending remote orders (delivery/takeaway) */
  remoteOrders: RemoteOrder[];

  // ─── Session Actions ─────────────────────────────────────────────────────

  /** Join an existing session (from QR scan) */
  joinSession: (payload: SessionJoinPayload) => Promise<void>;
  /** Leave the current session */
  leaveSession: () => Promise<void>;

  // ─── Ordering ────────────────────────────────────────────────────────────

  /**
   * Context-aware add: if browsing the same location as active session,
   * adds to table session. Otherwise initiates standard checkout.
   */
  addItem: (
    locationOrgId: string,
    locationRestId: string,
    item: Pick<SessionItem, 'menuItemId' | 'name' | 'price' | 'notes'>,
    quantity?: number,
  ) => Promise<'table_session' | 'standard_checkout'>;

  /** Add item directly to active table session */
  addToTableSession: (
    item: Pick<SessionItem, 'menuItemId' | 'name' | 'price' | 'notes'>,
    quantity?: number,
  ) => Promise<void>;

  // ─── Split Bill ──────────────────────────────────────────────────────────

  /** Change split mode */
  setSplitMode: (mode: SplitMode) => Promise<void>;
  /** Claim an item in itemized split */
  claimItem: (itemId: string) => Promise<void>;
  /** Unclaim an item */
  unclaimItem: (itemId: string) => Promise<void>;

  // ─── Tips ────────────────────────────────────────────────────────────────

  /** Set tip amount for current user */
  setTip: (amount: number) => Promise<void>;

  // ─── SOS ─────────────────────────────────────────────────────────────────

  /** Call waiter (sends notification to B2B dashboard) */
  callWaiter: () => Promise<void>;

  // ─── Drawer State ────────────────────────────────────────────────────────

  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const SessionContext = createContext<SessionContextType>({
  activeSession: null,
  sessionLoading: true,
  remoteOrders: [],
  joinSession: async () => {},
  leaveSession: async () => {},
  addItem: async () => 'standard_checkout',
  addToTableSession: async () => {},
  setSplitMode: async () => {},
  claimItem: async () => {},
  unclaimItem: async () => {},
  setTip: async () => {},
  callWaiter: async () => {},
  drawerOpen: false,
  setDrawerOpen: () => {},
});

// ─── Helper: generate item ID ────────────────────────────────────────────────

function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [remoteOrders, setRemoteOrders] = useState<RemoteOrder[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── Listen to active sessions where user is a participant ───────────────

  useEffect(() => {
    if (!uid) {
      setActiveSession(null);
      setSessionLoading(false);
      return;
    }

    // Query all active sessions where this user is in guestIds
    // Note: Firestore array-contains only supports one value, which is perfect here
    const q = query(
      collection(db, 'activeSessions'),
      where('guestIds', 'array-contains', uid),
      where('status', 'in', ['active', 'payment_pending']),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setActiveSession(null);
        } else {
          // Take the most recent active session
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          setActiveSession({
            ...data,
            sessionId: docSnap.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          } as ActiveSession);
        }
        setSessionLoading(false);
      },
      (err) => {
        console.error('[SessionProvider] Snapshot error:', err);
        setSessionLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  // ─── Session ref helper ──────────────────────────────────────────────────

  const getSessionRef = useCallback(() => {
    if (!activeSession) throw new Error('No active session');
    return doc(db, 'activeSessions', activeSession.sessionId);
  }, [activeSession]);

  // ─── Join Session ────────────────────────────────────────────────────────

  const joinSession = useCallback(
    async (payload: SessionJoinPayload) => {
      if (!uid) return;
      const sessionRef = doc(db, 'activeSessions', payload.sessionId);
      await updateDoc(sessionRef, {
        guestIds: arrayUnion(uid),
        [`guestNames.${uid}`]: user?.displayName || 'Guest',
        updatedAt: serverTimestamp(),
      });
    },
    [uid, user?.displayName],
  );

  // ─── Leave Session ───────────────────────────────────────────────────────

  const leaveSession = useCallback(async () => {
    if (!uid || !activeSession) return;
    const ref = getSessionRef();
    const newGuestIds = activeSession.guestIds.filter((id) => id !== uid);
    await updateDoc(ref, {
      guestIds: newGuestIds,
      updatedAt: serverTimestamp(),
    });
    setActiveSession(null);
  }, [uid, activeSession, getSessionRef]);

  // ─── Add to Table Session ────────────────────────────────────────────────

  const addToTableSession = useCallback(
    async (
      item: Pick<SessionItem, 'menuItemId' | 'name' | 'price' | 'notes'>,
      quantity = 1,
    ) => {
      if (!uid || !activeSession) return;
      const ref = getSessionRef();
      const newItem: SessionItem = {
        id: generateItemId(),
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity,
        orderedBy: uid,
        claimedBy: null,
        status: 'ordered',
        notes: item.notes,
        createdAt: new Date(),
      };
      const newBillTotal = activeSession.totals.billTotal + item.price * quantity;
      await updateDoc(ref, {
        items: [...activeSession.items, newItem],
        'totals.billTotal': newBillTotal,
        'totals.remainingTotal': newBillTotal - activeSession.totals.paidTotal,
        'totals.itemCount': activeSession.totals.itemCount + quantity,
        lastOrderAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [uid, activeSession, getSessionRef],
  );

  // ─── Context-Aware Add ───────────────────────────────────────────────────

  const addItem = useCallback(
    async (
      locationOrgId: string,
      locationRestId: string,
      item: Pick<SessionItem, 'menuItemId' | 'name' | 'price' | 'notes'>,
      quantity = 1,
    ): Promise<'table_session' | 'standard_checkout'> => {
      // If browsing the same location as the active table session → add to session
      if (
        activeSession &&
        activeSession.organizationId === locationOrgId &&
        activeSession.restaurantId === locationRestId
      ) {
        await addToTableSession(item, quantity);
        return 'table_session';
      }
      // Otherwise → standard checkout (delivery/takeaway)
      // The caller should handle the standard checkout flow
      return 'standard_checkout';
    },
    [activeSession, addToTableSession],
  );

  // ─── Split Bill ──────────────────────────────────────────────────────────

  const setSplitMode = useCallback(
    async (mode: SplitMode) => {
      if (!activeSession) return;
      const ref = getSessionRef();
      await updateDoc(ref, {
        splitMode: mode,
        updatedAt: serverTimestamp(),
      });
    },
    [activeSession, getSessionRef],
  );

  const claimItem = useCallback(
    async (itemId: string) => {
      if (!uid || !activeSession) return;
      const ref = getSessionRef();
      const updatedItems = activeSession.items.map((i) =>
        i.id === itemId ? { ...i, claimedBy: uid } : i,
      );
      await updateDoc(ref, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });
    },
    [uid, activeSession, getSessionRef],
  );

  const unclaimItem = useCallback(
    async (itemId: string) => {
      if (!activeSession) return;
      const ref = getSessionRef();
      const updatedItems = activeSession.items.map((i) =>
        i.id === itemId ? { ...i, claimedBy: null } : i,
      );
      await updateDoc(ref, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });
    },
    [activeSession, getSessionRef],
  );

  // ─── Tips ────────────────────────────────────────────────────────────────

  const setTip = useCallback(
    async (amount: number) => {
      if (!uid || !activeSession) return;
      const ref = getSessionRef();
      const existing = activeSession.payments.find((p) => p.userId === uid);
      const updatedPayments = existing
        ? activeSession.payments.map((p) =>
            p.userId === uid ? { ...p, tip: amount } : p,
          )
        : [...activeSession.payments, { userId: uid, amount: 0, tip: amount, status: 'pending' as const }];
      await updateDoc(ref, {
        payments: updatedPayments,
        updatedAt: serverTimestamp(),
      });
    },
    [uid, activeSession, getSessionRef],
  );

  // ─── SOS ─────────────────────────────────────────────────────────────────

  const callWaiter = useCallback(async () => {
    if (!activeSession) return;
    // Create a notification doc that B2B dashboard listens to
    await addDoc(collection(db, 'notifications'), {
      type: 'sos_waiter',
      sessionId: activeSession.sessionId,
      organizationId: activeSession.organizationId,
      restaurantId: activeSession.restaurantId,
      tableId: activeSession.tableId,
      tableNumber: activeSession.tableNumber,
      createdAt: serverTimestamp(),
      read: false,
    });
  }, [activeSession]);

  // ─── Value ───────────────────────────────────────────────────────────────

  const value = useMemo<SessionContextType>(
    () => ({
      activeSession,
      sessionLoading,
      remoteOrders,
      joinSession,
      leaveSession,
      addItem,
      addToTableSession,
      setSplitMode,
      claimItem,
      unclaimItem,
      setTip,
      callWaiter,
      drawerOpen,
      setDrawerOpen,
    }),
    [
      activeSession,
      sessionLoading,
      remoteOrders,
      joinSession,
      leaveSession,
      addItem,
      addToTableSession,
      setSplitMode,
      claimItem,
      unclaimItem,
      setTip,
      callWaiter,
      drawerOpen,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
