/**
 * Active Session ("Slot Zero") — dine-in table session with real-time split-bill.
 *
 * Firestore path:
 *   organizations/{orgId}/restaurants/{restId}/activeSessions/{sessionId}
 */

// ─── Session Item ────────────────────────────────────────────────────────────

export type SessionItemStatus = 'ordered' | 'preparing' | 'served';

export interface SessionItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  orderedBy: string;            // UID of user who ordered
  claimedBy: string | null;     // UID of user paying for this item (itemized split)
  status: SessionItemStatus;
  notes?: string;
  createdAt: Date;
}

// ─── Split Mode ──────────────────────────────────────────────────────────────

export type SplitMode = 'full_pay' | 'equal_split' | 'itemized_split';

export interface SplitPayment {
  userId: string;
  amount: number;
  tip: number;
  status: 'pending' | 'paid' | 'failed';
  method: 'card' | 'cash';
  paidAt?: Date;
  stripePaymentIntentId?: string;
  /** Staff UID who marked this as paid cash */
  markedBy?: string;
}

// ─── Tip ─────────────────────────────────────────────────────────────────────

export interface TipConfig {
  staffId: string;              // waiter/bartender serving the table
  staffName?: string;
  suggestedPercentages: number[]; // e.g. [10, 15, 20]
}

// ─── Active Session ──────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'payment_pending' | 'closed';

export interface ActiveSession {
  sessionId: string;

  // Location context
  organizationId: string;
  organizationName?: string;
  restaurantId: string;
  restaurantName?: string;
  tableId: string;
  tableNumber: number;
  tableName?: string;

  // Participants
  hostId: string;               // UID of user who opened (or was checked in by staff)
  hostName?: string;
  guestIds: string[];           // All participant UIDs (including host)
  guestNames?: Record<string, string>; // UID → display name

  // Status
  status: SessionStatus;
  currency: string;

  // Items
  items: SessionItem[];

  // Totals (denormalized for quick reads)
  totals: {
    billTotal: number;
    paidTotal: number;
    remainingTotal: number;
    itemCount: number;
  };

  // Split
  splitMode: SplitMode;
  payments: SplitPayment[];

  // Tips
  tip?: TipConfig;

  // Staff context
  openedBy: string;             // staff UID who opened/confirmed the session
  assignedStaffId?: string;     // waiter serving this table

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  lastOrderAt?: Date;
}

// ─── Session Join Payload (from QR scan) ─────────────────────────────────────

export interface SessionJoinPayload {
  sessionId: string;
  organizationId: string;
  restaurantId: string;
}

// ─── Remote Order (Delivery/Takeaway) ────────────────────────────────────────

export type RemoteOrderType = 'delivery' | 'takeaway';
export type RemoteOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface RemoteOrder {
  id: string;
  userId: string;
  organizationId: string;
  restaurantId: string;
  type: RemoteOrderType;
  items: SessionItem[];
  status: RemoteOrderStatus;
  totalAmount: number;
  currency: string;
  deliveryAddress?: string;
  estimatedReadyAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
