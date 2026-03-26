// scripts/cleanup-demo-data.ts
// Skrypt do czyszczenia wszystkich sekcji, stolików i menu demo w aktywnej restauracji

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createNodeLogger, installConsoleDecorators } from './helpers/node-logger.mjs';

installConsoleDecorators('cleanup-demo-data');
const log = createNodeLogger('cleanup-demo-data');

// TODO: Uzupełnij ścieżkę do klucza serwisowego
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function deleteCollection(path: string) {
  const snap = await db.collection(path).get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function main() {
  log.banner('Cleanup demo data');
  log.stage('Usuwanie kolekcji demo');
  // TODO: Podstaw swoje orgId i restId
  const orgId = 'demo-org';
  const restId = 'demo-restaurant';

  await deleteCollection(`organizations/${orgId}/restaurants/${restId}/tables`);
  await deleteCollection(`organizations/${orgId}/restaurants/${restId}/sections`);
  await deleteCollection(`organizations/${orgId}/restaurants/${restId}/menu`);
  console.log('Wyczyszczono sekcje, stoliki i menu.');
}

main().catch(console.error);
