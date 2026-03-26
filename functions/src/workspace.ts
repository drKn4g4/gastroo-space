// functions/src/workspace.ts
// Google Workspace integration: Sheets, Docs, Tasks (shared files and todos)
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from './firebaseAdmin';
import { google } from 'googleapis';
import {
  WorkspaceConnectSchema,
  WorkspaceCreateSheetSchema,
  WorkspaceSyncToSheetSchema,
  WorkspaceReadSheetSchema,
  WorkspaceGetTodosSchema,
  WorkspaceSyncTodosSchema,
  WorkspaceCreateDocSchema,
} from './validation/workspace';

// ── Mock mode ─────────────────────────────────────────────────────────────────
const MOCK_INTEGRATIONS_ON_EMULATOR =
  (process.env.MOCK_INTEGRATIONS_ON_EMULATOR ?? 'true') !== 'false';

function isIntegrationMockMode() {
  const forceOn = process.env.MOCK_INTEGRATIONS === 'true';
  const forceOff = process.env.MOCK_INTEGRATIONS === 'false';
  if (forceOn) return true;
  if (forceOff) return false;
  const isEmulator =
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  return MOCK_INTEGRATIONS_ON_EMULATOR && isEmulator;
}

// ── OAuth client ─────────────────────────────────────────────────────────────
// Workspace uses scopes: spreadsheets, documents, tasks.
// Falls back to DRIVE_* credentials if WORKSPACE_* not configured.
function getOAuth2Client() {
  const clientId =
    process.env.GOOGLE_WORKSPACE_CLIENT_ID ?? process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET ?? process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI ?? process.env.GOOGLE_DRIVE_REDIRECT_URI;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ── Firestore token store ─────────────────────────────────────────────────────
interface WorkspaceTokens {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  tasksListId?: string | null;
  connected?: boolean;
}

async function getStoredTokens(uid: string): Promise<WorkspaceTokens | null> {
  const snap = await admin.firestore().doc(`users/${uid}/integrations/workspace`).get();
  if (!snap.exists) return null;
  return snap.data() as WorkspaceTokens;
}

async function getAuthClient(uid: string) {
  const tokens = await getStoredTokens(uid);
  if (!tokens?.access_token) {
    throw new HttpsError('failed-precondition', 'Google Workspace not connected');
  }
  const auth = getOAuth2Client();
  auth.setCredentials(tokens);
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60_000) {
    const { credentials } = await auth.refreshAccessToken();
    await admin.firestore().doc(`users/${uid}/integrations/workspace`).update({
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    });
    auth.setCredentials(credentials);
  }
  return auth;
}

function nowIso() {
  return new Date().toISOString();
}

// ── workspaceGetStatus ────────────────────────────────────────────────────────
export const workspaceGetStatus = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;

  if (isIntegrationMockMode()) {
    const snap = await admin.firestore().doc(`users/${uid}/integrations/workspace`).get();
    return {
      connected: snap.exists && Boolean(snap.data()?.connected),
      tasksListId: snap.data()?.tasksListId ?? null,
    };
  }

  const tokens = await getStoredTokens(uid);
  return {
    connected: Boolean(tokens?.access_token),
    tasksListId: tokens?.tasksListId ?? null,
  };
});

// ── workspaceConnect ──────────────────────────────────────────────────────────
export const workspaceConnect = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { code, orgId } = WorkspaceConnectSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    await admin.firestore().doc(`users/${uid}/integrations/workspace`).set({
      connected: true,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600_000,
      tasksListId: 'mock-tasks-list',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (orgId) {
      await admin.firestore()
        .doc(`organizations/${orgId}/integrations/googleWorkspace`)
        .set(
          { connected: true, status: 'connected', updatedAt: nowIso() },
          { merge: true },
        );
    }
    return { connected: true, tasksListId: 'mock-tasks-list' };
  }

  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  if (!tokens.access_token) {
    throw new HttpsError('internal', 'Failed to obtain access token from Google');
  }

  // Try to provision a Tasks list for the organisation
  let tasksListId: string | null = null;
  try {
    auth.setCredentials(tokens);
    const tasks = google.tasks({ version: 'v1', auth });
    const listName = orgId ? `Gastroo – ${orgId}` : 'Gastroo Tasks';
    const list = await tasks.tasklists.insert({ requestBody: { title: listName } });
    tasksListId = list.data.id ?? null;
  } catch (err) {
    console.warn('Could not create Google Tasks list:', err);
  }

  const tokenDoc: WorkspaceTokens & { createdAt: string; updatedAt: string } = {
    connected: true,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    tasksListId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await admin.firestore().doc(`users/${uid}/integrations/workspace`).set(tokenDoc);

  if (orgId) {
    await admin.firestore()
      .doc(`organizations/${orgId}/integrations/googleWorkspace`)
      .set(
        { connected: true, tasksListId, status: 'connected', updatedAt: nowIso() },
        { merge: true },
      );
  }

  return { connected: true, tasksListId };
});

// ── workspaceDisconnect ───────────────────────────────────────────────────────
export const workspaceDisconnect = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  await admin.firestore().doc(`users/${uid}/integrations/workspace`).set(
    { connected: false, access_token: null, refresh_token: null, updatedAt: nowIso() },
    { merge: true },
  );
  return { disconnected: true };
});

export const workspaceCreateSheet = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { title, orgId, sheetNames = ['Arkusz1'] } = WorkspaceCreateSheetSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const spreadsheetId = `mock-sheet-${Date.now()}`;
    if (orgId) {
      await admin.firestore().collection(`organizations/${orgId}/workspaceFiles`).add({
        type: 'spreadsheet',
        spreadsheetId,
        title,
        createdAt: nowIso(),
        createdBy: uid,
      });
    }
    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  const auth = await getAuthClient(uid);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheetNames.map((name) => ({ properties: { title: name } })),
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;
  const url =
    res.data.spreadsheetUrl ??
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  if (orgId) {
    await admin.firestore().collection(`organizations/${orgId}/workspaceFiles`).add({
      type: 'spreadsheet',
      spreadsheetId,
      title,
      url,
      createdAt: nowIso(),
      createdBy: uid,
    });
  }

  return { spreadsheetId, url };
});

export const workspaceSyncToSheet = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { spreadsheetId, range, values } = WorkspaceSyncToSheetSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    return { updatedCells: values.length * (values[0]?.length ?? 0) };
  }

  const auth = await getAuthClient(uid);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return { updatedCells: res.data.updatedCells ?? 0 };
});

export const workspaceReadSheet = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { spreadsheetId, range } = WorkspaceReadSheetSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    return {
      values: [
        ['Kolumna A', 'Kolumna B', 'Kolumna C'],
        ['Przykład 1', 'Wartość 1', '100'],
      ],
    };
  }

  const auth = await getAuthClient(uid);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return { values: res.data.values ?? [] };
});

export const workspaceGetTodos = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { tasksListId } = WorkspaceGetTodosSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    return {
      todos: [
        { id: 'mock-todo-1', title: 'Uzupełnić menu na weekend', completed: false },
        { id: 'mock-todo-2', title: 'Zamówić dostawę naczyń', completed: false },
        { id: 'mock-todo-3', title: 'Sprawdzić harmonogram', completed: true },
      ],
    };
  }

  const tokens = await getStoredTokens(uid);
  if (!tokens?.access_token) {
    throw new HttpsError('failed-precondition', 'Google Workspace not connected');
  }

  const auth = await getAuthClient(uid);
  const tasks = google.tasks({ version: 'v1', auth });

  const listId = tasksListId ?? tokens.tasksListId ?? '@default';
  const res = await tasks.tasks.list({
    tasklist: listId,
    showCompleted: true,
    maxResults: 100,
  });

  return {
    todos: (res.data.items ?? []).map((t) => ({
      id: t.id ?? '',
      title: t.title ?? '',
      completed: t.status === 'completed',
      notes: t.notes ?? '',
      dueDate: t.due ?? null,
    })),
  };
});

export const workspaceSyncTodos = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { todos, tasksListId } = WorkspaceSyncTodosSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const batch = admin.firestore().batch();
    for (const todo of todos) {
      batch.set(admin.firestore().doc(`users/${uid}/workspaceTasks/${todo.id}`), {
        ...todo,
        googleTaskId: `mock-task-${todo.id}`,
        syncedAt: nowIso(),
      });
    }
    await batch.commit();
    return { synced: todos.length };
  }

  const tokens = await getStoredTokens(uid);
  const auth = await getAuthClient(uid);
  const tasks = google.tasks({ version: 'v1', auth });

  const listId = tasksListId ?? tokens?.tasksListId ?? '@default';
  let synced = 0;

  for (const todo of todos) {
    try {
      const taskBody = {
        title: todo.title,
        notes: todo.notes ?? '',
        status: todo.completed ? ('completed' as const) : ('needsAction' as const),
        due: todo.dueDate ?? undefined,
      };

      const existingRef = admin.firestore().doc(`users/${uid}/workspaceTasks/${todo.id}`);
      const existingSnap = await existingRef.get();

      if (existingSnap.exists && existingSnap.data()?.googleTaskId) {
        await tasks.tasks.update({
          tasklist: listId,
          task: existingSnap.data()!.googleTaskId as string,
          requestBody: taskBody,
        });
      } else {
        const created = await tasks.tasks.insert({
          tasklist: listId,
          requestBody: taskBody,
        });
        await existingRef.set({
          ...todo,
          googleTaskId: created.data.id,
          syncedAt: nowIso(),
        });
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync todo ${todo.id}:`, err);
    }
  }

  return { synced };
});

export const workspaceCreateDoc = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { title, content, orgId } = WorkspaceCreateDocSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const documentId = `mock-doc-${Date.now()}`;
    if (orgId) {
      await admin.firestore().collection(`organizations/${orgId}/workspaceFiles`).add({
        type: 'document',
        documentId,
        title,
        createdAt: nowIso(),
        createdBy: uid,
      });
    }
    return {
      documentId,
      url: `https://docs.google.com/document/d/${documentId}`,
    };
  }

  const auth = await getAuthClient(uid);
  const docs = google.docs({ version: 'v1', auth });

  const docRes = await docs.documents.create({ requestBody: { title } });
  const documentId = docRes.data.documentId!;

  if (content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  const url = `https://docs.google.com/document/d/${documentId}`;

  if (orgId) {
    await admin.firestore().collection(`organizations/${orgId}/workspaceFiles`).add({
      type: 'document',
      documentId,
      title,
      url,
      createdAt: nowIso(),
      createdBy: uid,
    });
  }

  return { documentId, url };
});
