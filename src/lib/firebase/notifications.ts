import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './config';

export interface NotificationDoc {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any; // Firestore Timestamp
  data?: Record<string, any>;
}

export function subscribeToUserNotifications(userId: string, onUpdate: (notifications: NotificationDoc[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const notifs: NotificationDoc[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc));
    onUpdate(notifs);
  });
}
