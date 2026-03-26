/**
 * Restaurant & Service Domain
 */

/**
 * /organizations/{orgId}/restaurants/{restaurantId}
 * Individual restaurant/location data
 */
export interface Restaurant {
  id: string;
  name: string; // "Main Location"
  slug: string; // "main-location"
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email?: string;
  website?: string;
  timezone: string;
  location?: {
    lat: number;
    lng: number;
  };
  
  // Opening hours
  hours: Record<string, { open: string; close: string; closed?: boolean }>;
  
  // Physical layout
  floorPlans?: {
    default: string; // URL or plan ID
    [key: string]: string;
  };
  tableCount: number;
  
  // Settings
  settings: {
    currencyCode: string; // "PLN"
    currency?: string; // alias for currencyCode (legacy)
    defaultLanguage: string; // "pl"
    allowOnlineBookings: boolean;
    bookingAdvanceHours: number; // Min hours before booking
    bookingDuration?: number; // Default booking duration in minutes
    minPartySize: number;
    maxPartySize: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/bookings/{bookingId}
 * Table reservation
 */
export interface Booking {
  id: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestCount: number;
  
  // Timing
  date: Date; // Reservation date
  time: string; // "19:00"
  duration: number; // minutes, default 120
  
  // Table assignment
  tableId?: string;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  
  notes?: string;
  specialRequests?: string;
  
  // Who created
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
  
  restaurantId: string;
  organizationId: string;
}

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/tables/{tableId}
 * Table metadata
 */
export interface Table {
  id: string;
  name: string; // "Table 1"
  number: number;
  capacity: number;
  location?: string; // "patio", "main", "garden"
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/orders/{orderId}
 * POS order / bill
 */
export interface Order {
  id: string;
  orderNumber: number;
  tableId: string;
  
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  
  subtotal: number; // in cents
  tax: number;
  discount: number;
  total: number;
  
  status: 'open' | 'ready' | 'served' | 'closed' | 'void';
  paymentMethod?: 'cash' | 'card' | 'other';
  
  openedBy: string; // User ID
  closedBy?: string;
  
  createdAt: Date;
  closedAt?: Date;
  
  restaurantId: string;
}

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/incidents/{incidentId}
 * Customer incidents / issues reported
 */
export interface Incident {
  id: string;
  type: 'complaint' | 'request' | 'incident' | 'praise';
  title: string;
  description: string;
  
  bookingId?: string;
  reportedBy: string; // User ID (waiter)
  
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'archived';
  
  resolution?: string;
  resolvedBy?: string;
  
  createdAt: Date;
  resolvedAt?: Date;
  
  restaurantId: string;
}

/**
 * /organizations/{orgId}/stripePayments/{paymentId}
 * Dine-in payment records (card + cash)
 */
export interface SlotZeroPaymentDoc {
  paymentIntentId: string;
  sessionId: string;
  userId: string;
  amountCents: number;
  tipCents: number;
  applicationFeeCents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: 'card' | 'cash';
  markedBy?: string;
  createdAt: Date;
  completedAt?: Date;
}
