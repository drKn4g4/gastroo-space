export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';

export interface RestaurantEvent {
  id: string;
  organizationId: string;
  restaurantId: string;
  name: string;
  description?: string;
  startAt: Date;
  endAt?: Date;
  city?: string;
  address?: string;
  tags?: string[];
  image?: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}
