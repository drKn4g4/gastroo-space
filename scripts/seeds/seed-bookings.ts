// Seed przykładowych rezerwacji do Firestore dla środowiska deweloperskiego
// Uruchom: npx ts-node scripts/seeds/seed-bookings.ts

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Uzupełnij poniższe ID zgodnie z Twoim środowiskiem/testową organizacją/restauracją
const ORG_ID = 'demo-org';
const RESTAURANT_ID = 'demo-restaurant';

const BOOKINGS = [
  {
    guestName: 'Jan Kowalski',
    guestPhone: '+48123456789',
    guestCount: 2,
    date: new Date(),
    time: '18:00',
    duration: 120,
    status: 'confirmed',
    notes: 'Stolik przy oknie',
    createdBy: 'seed-script',
    createdAt: new Date(),
    updatedAt: new Date(),
    restaurantId: RESTAURANT_ID,
    organizationId: ORG_ID,
  },
  {
    guestName: 'Anna Nowak',
    guestPhone: '+48987654321',
    guestCount: 4,
    date: new Date(),
    time: '20:00',
    duration: 90,
    status: 'pending',
    notes: '',
    createdBy: 'seed-script',
    createdAt: new Date(),
    updatedAt: new Date(),
    restaurantId: RESTAURANT_ID,
    organizationId: ORG_ID,
  },
];

async function seedBookings() {
  for (const booking of BOOKINGS) {
    const ref = db.collection(`organizations/${ORG_ID}/restaurants/${RESTAURANT_ID}/bookings`).doc();
    await ref.set({ ...booking, id: ref.id });
    console.log(`Dodano rezerwację: ${booking.guestName} (${booking.time})`);
  }
  console.log('Seed rezerwacji zakończony.');
}

seedBookings().catch(console.error);
