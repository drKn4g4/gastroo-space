/**
 * Social & Discovery Engagement Domain
 */

/**
 * /users/{uid}/hearts/{heartId}
 * Social signal used in popularity analytics
 */
export interface HeartEvent {
  id: string;
  uid: string;
  orgId: string;
  restaurantId: string;
  targetType: 'menuItem' | 'restaurant';
  targetId: string;
  createdAt: Date;
}

/**
 * /users/{uid}/kudos/{kudosId}
 */
export interface KudosEntry {
  id: string;
  targetUserId: string;
  fromUserId?: string;
  organizationId?: string;
  restaurantId?: string;
  role: 'waiter' | 'bartender' | 'chef' | 'manager' | 'staff';
  tags?: string[];
  comment?: string;
  createdAt: Date;
}
