// functions/src/gbp.ts
// Google Business Profile integration: OAuth + Data Sync
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from './firebaseAdmin';
import { google, mybusinessbusinessinformation_v1 } from 'googleapis';
import {
  GbpConnectSchema,
  GbpGetLocationsSchema,
  GbpEnsureLocationForOrganizationSchema,
} from './validation/gbp';

type GbpAccount = { name?: string | null };
type GbpLocation = mybusinessbusinessinformation_v1.Schema$Location & { accountName?: string };

type AccountsListResponse = { data: { accounts?: GbpAccount[] } };
type LocationsListResponse = { data: { locations?: GbpLocation[] } };
type LocationCreateResponse = { data: mybusinessbusinessinformation_v1.Schema$Location };

type GbpApiClient = {
  accounts: {
    list: () => Promise<AccountsListResponse>;
    locations: {
      list: (params: { parent: string; readMask: string }) => Promise<LocationsListResponse>;
      create: (params: {
        parent: string;
        requestBody: Record<string, unknown>;
        validateOnly: boolean;
        requestId: string;
      }) => Promise<LocationCreateResponse>;
    };
  };
};

const MOCK_INTEGRATIONS_ON_EMULATOR = (process.env.MOCK_INTEGRATIONS_ON_EMULATOR ?? 'true') !== 'false';

function isIntegrationMockMode() {
  const forceOn = process.env.MOCK_INTEGRATIONS === 'true';
  const forceOff = process.env.MOCK_INTEGRATIONS === 'false';
  if (forceOn) return true;
  if (forceOff) return false;

  const isEmulator =
    process.env.FUNCTIONS_EMULATOR === 'true'
    || Boolean(process.env.FIRESTORE_EMULATOR_HOST)
    || Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

  return MOCK_INTEGRATIONS_ON_EMULATOR && isEmulator;
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI,
  );
}

async function getStoredTokens(uid: string) {
  const ref = admin.firestore().doc(`users/${uid}/integrations/gbp`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as { access_token: string; refresh_token: string; expiry_date: number };
}

async function getAuthenticatedClient(uid: string) {
  const tokens = await getStoredTokens(uid);
  if (!tokens) throw new HttpsError('failed-precondition', 'GBP not connected');

  const auth = getOAuth2Client();
  auth.setCredentials(tokens);

  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60_000) {
    const { credentials } = await auth.refreshAccessToken();
    await admin.firestore().doc(`users/${uid}/integrations/gbp`).update({
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    });
    auth.setCredentials(credentials);
  }
  return auth;
}

async function assertOrganizationAccess(uid: string, orgId: string) {
  const orgRef = admin.firestore().doc(`organizations/${orgId}`);
  const memberRef = admin.firestore().doc(`organizations/${orgId}/members/${uid}`);
  const membershipRef = admin.firestore().doc(`users/${uid}/memberships/${orgId}`);
  const [orgSnap, memberSnap, membershipSnap] = await Promise.all([
    orgRef.get(),
    memberRef.get(),
    membershipRef.get(),
  ]);

  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found');
  }

  const orgData = (orgSnap.data() ?? {}) as { owner?: string; ownerUid?: string };
  const isOwner = orgData.owner === uid || orgData.ownerUid === uid;
  const hasLegacyMembership = memberSnap.exists;
  const hasActiveMembership = membershipSnap.exists
    && membershipSnap.data()?.status === 'active';

  if (isOwner || hasLegacyMembership || hasActiveMembership) {
    return orgSnap;
  }

  throw new HttpsError('permission-denied', 'No access to this organization');
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveRegionCode(country: string | null | undefined) {
  const normalized = normalizeText(country);
  if (!normalized) return 'PL';
  if (normalized === 'poland' || normalized === 'polska') return 'PL';
  if (normalized.length === 2) return normalized.toUpperCase();
  return normalized.slice(0, 2).toUpperCase();
}

async function getOrganizationVenue(orgId: string) {
  const orgSnap = await admin.firestore().doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found');
  }

  const restaurantsSnap = await admin.firestore()
    .collection(`organizations/${orgId}/restaurants`)
    .limit(1)
    .get();

  if (restaurantsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Organization has no restaurant data to publish to GBP');
  }

  return {
    orgId,
    organization: orgSnap.data() as { name?: string; slug?: string },
    restaurantId: restaurantsSnap.docs[0].id,
    restaurant: restaurantsSnap.docs[0].data() as {
      name?: string;
      address?: {
        street?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
      phone?: string;
    },
  };
}

function buildMockLocationFromVenue(params: {
  orgId: string;
  organizationName: string;
  restaurantName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}) {
  return {
    name: `locations/mock-${params.orgId}`,
    title: params.restaurantName || params.organizationName || `Lokal ${params.orgId}`,
    storeCode: params.orgId,
    labels: ['mock', 'emulator'],
    storefrontAddress: {
      addressLines: params.street ? [params.street] : [],
      locality: params.city,
      postalCode: params.postalCode,
      regionCode: resolveRegionCode(params.country),
    },
  };
}

async function listAccountsWithLocations(auth: Awaited<ReturnType<typeof getAuthenticatedClient>>) {
  const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth }) as unknown as GbpApiClient;
  const accountsResult = await mybusiness.accounts.list();
  const accounts = accountsResult.data.accounts ?? [];
  const locations: GbpLocation[] = [];

  for (const account of accounts) {
    if (!account?.name) continue;
    const result = await mybusiness.accounts.locations.list({
      parent: account.name,
      readMask: 'name,title,storeCode,regularHours,storefrontAddress,labels,phoneNumbers,websiteUri',
    });
    if (result.data.locations) {
      locations.push(...result.data.locations.map((location): GbpLocation => ({
        ...location,
        accountName: account.name ?? undefined,
      })));
    }
  }

  return { mybusiness, accounts, locations };
}

function matchExistingLocation(params: {
  organizationName: string;
  restaurantName: string;
  street: string;
  city: string;
  postalCode: string;
  locations: GbpLocation[];
}) {
  const restaurantName = normalizeText(params.restaurantName);
  const organizationName = normalizeText(params.organizationName);
  const street = normalizeText(params.street);
  const city = normalizeText(params.city);
  const postalCode = normalizeText(params.postalCode);

  return params.locations.find((location) => {
    const locationTitle = normalizeText(location?.title);
    const locationStreet = normalizeText(location?.storefrontAddress?.addressLines?.[0]);
    const locationCity = normalizeText(location?.storefrontAddress?.locality);
    const locationPostalCode = normalizeText(location?.storefrontAddress?.postalCode);

    const sameName = Boolean(locationTitle) && (locationTitle === restaurantName || locationTitle === organizationName);
    const sameAddress = Boolean(locationStreet || locationCity || locationPostalCode)
      && locationStreet === street
      && locationCity === city
      && locationPostalCode === postalCode;

    return sameName || sameAddress;
  }) ?? null;
}

async function persistOrganizationLocation(params: {
  uid: string;
  orgId: string;
  restaurantId: string;
  accountId: string | null;
  allLocations: GbpLocation[];
  location: GbpLocation;
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const locationIds = params.allLocations
    .map((entry) => (typeof entry?.name === 'string' ? String(entry.name) : ''))
    .filter(Boolean);

  if (typeof params.location?.name === 'string' && !locationIds.includes(params.location.name)) {
    locationIds.push(params.location.name);
  }

  await admin.firestore().doc(`organizations/${params.orgId}/integrations/googleBusinessProfile`).set({
    connected: true,
    status: 'connected',
    accountId: params.accountId,
    locationIds,
    primaryLocationId: typeof params.location?.name === 'string' ? params.location.name : null,
    lastSyncAt: now,
    updatedAt: now,
    updatedBy: params.uid,
  }, { merge: true });

  await admin.firestore().doc(`organizations/${params.orgId}/restaurants/${params.restaurantId}`).set({
    gbpConnected: true,
    gbpLocationId: typeof params.location?.name === 'string' ? params.location.name : null,
    updatedAt: now,
  }, { merge: true });
}

export const gbpConnect = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { code, orgId } = GbpConnectSchema.parse(request.data);

  const now = admin.firestore.FieldValue.serverTimestamp();

  if (isIntegrationMockMode()) {
    await admin.firestore().doc(`users/${request.auth.uid}/integrations/gbp`).set({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 1000 * 60 * 60 * 24 * 365,
      connected_at: now,
      scope: 'mock-business-manage-scope',
      mockMode: true,
    }, { merge: true });

    const orgIdValue = typeof orgId === 'string' ? orgId.trim() : '';
    if (orgIdValue) {
      await assertOrganizationAccess(request.auth.uid, orgIdValue);
      await admin.firestore().doc(`organizations/${orgIdValue}/integrations/googleBusinessProfile`).set({
        connected: true,
        status: 'connected',
        accountId: 'accounts/mock-account',
        lastSyncAt: now,
        updatedAt: now,
        createdAt: now,
        updatedBy: request.auth.uid,
        mockMode: true,
      }, { merge: true });
    }

    return { success: true, orgId: orgIdValue || null };
  }

  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);

  await admin.firestore().doc(`users/${request.auth.uid}/integrations/gbp`).set({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    connected_at: now,
    scope: tokens.scope,
  });

  const orgIdValue = typeof orgId === 'string' ? orgId.trim() : '';
  if (orgIdValue) {
    await admin.firestore().doc(`organizations/${orgIdValue}/integrations/googleBusinessProfile`).set({
      connected: true,
      status: 'connected',
      lastSyncAt: now,
      updatedAt: now,
      createdAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
  }

  return { success: true, orgId: orgIdValue || null };
});

export const gbpGetLocations = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { orgId } = GbpGetLocationsSchema.parse(request.data);
  const orgIdValue = typeof orgId === 'string' ? orgId.trim() : '';

  if (isIntegrationMockMode()) {
    if (!orgIdValue) {
      return { locations: [] };
    }

    await assertOrganizationAccess(request.auth.uid, orgIdValue);
    const venue = await getOrganizationVenue(orgIdValue);
    const restaurantName = String(venue.restaurant.name ?? venue.organization.name ?? 'Lokal').trim();
    const organizationName = String(venue.organization.name ?? restaurantName).trim();
    const street = String(venue.restaurant.address?.street ?? '').trim();
    const city = String(venue.restaurant.address?.city ?? '').trim();
    const postalCode = String(venue.restaurant.address?.postalCode ?? '').trim();
    const country = String(venue.restaurant.address?.country ?? 'Poland').trim();

    const mockLocation = buildMockLocationFromVenue({
      orgId: orgIdValue,
      organizationName,
      restaurantName,
      street,
      city,
      postalCode,
      country,
    });

    await persistOrganizationLocation({
      uid: request.auth.uid,
      orgId: orgIdValue,
      restaurantId: venue.restaurantId,
      accountId: 'accounts/mock-account',
      allLocations: [mockLocation],
      location: mockLocation,
    });

    return { locations: [mockLocation] };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);

  const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth }) as unknown as GbpApiClient;
  const accounts = await mybusiness.accounts.list();

  const locations: GbpLocation[] = [];
  if (accounts.data.accounts) {
    for (const account of accounts.data.accounts) {
      if (account.name) {
        const result = await mybusiness.accounts.locations.list({
          parent: account.name,
          readMask: 'name,title,storeCode,regularHours,storefrontAddress,labels'
        });
        if (result.data.locations) {
          locations.push(...result.data.locations);
        }
      }
    }
  }

  if (orgIdValue) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await admin.firestore().doc(`organizations/${orgIdValue}/integrations/googleBusinessProfile`).set({
      connected: true,
      status: 'connected',
      locationIds: locations
        .map((loc) => (typeof loc?.name === 'string' ? String(loc.name) : ''))
        .filter((name: string) => Boolean(name)),
      lastSyncAt: now,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
  }

  return { locations };
});

export const gbpGetStatus = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const tokens = await getStoredTokens(request.auth.uid);
  return { connected: !!tokens };
});

export const gbpEnsureLocationForOrganization = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { orgId } = GbpEnsureLocationForOrganizationSchema.parse(request.data);
  const orgIdValue = orgId.trim();

  await assertOrganizationAccess(request.auth.uid, orgIdValue);
  const venue = await getOrganizationVenue(orgIdValue);

  if (isIntegrationMockMode()) {
    const restaurantName = String(venue.restaurant.name ?? venue.organization.name ?? 'Lokal').trim();
    const organizationName = String(venue.organization.name ?? restaurantName).trim();
    const street = String(venue.restaurant.address?.street ?? '').trim();
    const city = String(venue.restaurant.address?.city ?? '').trim();
    const postalCode = String(venue.restaurant.address?.postalCode ?? '').trim();
    const country = String(venue.restaurant.address?.country ?? 'Poland').trim();

    const integrationSnap = await admin.firestore().doc(`organizations/${orgIdValue}/integrations/googleBusinessProfile`).get();
    const existingPrimaryLocationId = String((integrationSnap.data() as { primaryLocationId?: string } | undefined)?.primaryLocationId ?? '').trim();

    const mockLocation = buildMockLocationFromVenue({
      orgId: orgIdValue,
      organizationName,
      restaurantName,
      street,
      city,
      postalCode,
      country,
    });

    const created = existingPrimaryLocationId !== mockLocation.name;

    await persistOrganizationLocation({
      uid: request.auth.uid,
      orgId: orgIdValue,
      restaurantId: venue.restaurantId,
      accountId: 'accounts/mock-account',
      allLocations: [mockLocation],
      location: mockLocation,
    });

    return {
      created,
      location: {
        name: mockLocation.name,
        title: mockLocation.title,
        storeCode: mockLocation.storeCode,
        labels: mockLocation.labels,
        regularHours: undefined,
        storefrontAddress: mockLocation.storefrontAddress,
      },
    };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const { mybusiness, accounts, locations } = await listAccountsWithLocations(auth);

  if (!accounts.length) {
    throw new HttpsError('failed-precondition', 'No Google Business Profile account found');
  }

  const restaurantName = String(venue.restaurant.name ?? venue.organization.name ?? 'Lokal').trim();
  const organizationName = String(venue.organization.name ?? restaurantName).trim();
  const street = String(venue.restaurant.address?.street ?? '').trim();
  const city = String(venue.restaurant.address?.city ?? '').trim();
  const postalCode = String(venue.restaurant.address?.postalCode ?? '').trim();
  const country = String(venue.restaurant.address?.country ?? 'Poland').trim();
  const phone = String(venue.restaurant.phone ?? '').trim();

  let matchedLocation = matchExistingLocation({
    organizationName,
    restaurantName,
    street,
    city,
    postalCode,
    locations,
  });
  let created = false;

  if (!matchedLocation) {
    const accountName = String(accounts[0]?.name ?? '').trim();
    if (!accountName) {
      throw new HttpsError('failed-precondition', 'No Google Business Profile account available for location creation');
    }

    const createdLocation = await mybusiness.accounts.locations.create({
      parent: accountName,
      requestBody: {
        title: restaurantName,
        storefrontAddress: {
          addressLines: street ? [street] : undefined,
          locality: city || undefined,
          postalCode: postalCode || undefined,
          regionCode: resolveRegionCode(country),
        },
        phoneNumbers: phone ? { primaryPhone: phone } : undefined,
      },
      validateOnly: false,
      requestId: `${orgIdValue}-${Date.now()}`,
    });

    matchedLocation = {
      ...createdLocation.data,
      accountName,
    };
    created = true;
  }

  await persistOrganizationLocation({
    uid: request.auth.uid,
    orgId: orgIdValue,
    restaurantId: venue.restaurantId,
    accountId: typeof matchedLocation?.accountName === 'string' ? matchedLocation.accountName : null,
    allLocations: created ? [...locations, matchedLocation] : locations,
    location: matchedLocation,
  });

  return {
    created,
    location: matchedLocation
      ? {
          name: matchedLocation.name,
          title: matchedLocation.title,
          storeCode: matchedLocation.storeCode,
          labels: matchedLocation.labels,
          regularHours: matchedLocation.regularHours,
          storefrontAddress: matchedLocation.storefrontAddress,
        }
      : null,
  };
});
