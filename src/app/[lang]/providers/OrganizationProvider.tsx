'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { doc, getDoc, collection, query, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase/config';
import { resolveEffectivePermissions, type OrgPermissionsMatrix } from '@/lib/access/permissions';
import {
  Organization,
  Restaurant,
  Member,
  Permission,
} from '@/types/organization';

interface OrganizationContextType {
  organization: Organization | null;
  member: Member | null;
  restaurants: Restaurant[];
  organizationOptions: OrgCacheEntry[];
  currentRestaurant: Restaurant | null;
  setCurrentRestaurant: (id: string) => void;
  /** Switch to a different org+restaurant combination (triggers full reload). */
  switchContext: (orgId: string, restaurantId: string) => Promise<void>;
  hasPermission: (permission: Permission | string) => boolean;
  hasRole: (roles: string[]) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface OrgCacheEntry {
  orgId: string;
  orgName: string;
  restaurantId: string;
  restaurantName: string;
}

interface RecentOrganizationRef {
  orgId?: string;
  restaurantId?: string;
}

interface MembershipLoadResult {
  org: Organization;
  member: Member;
  restaurants: Restaurant[];
}

const ORGS_CACHE_KEY = 'gastroo_orgs_cache';
const SELECTED_ORG_CACHE_KEY = 'gastroo_selected_org';
const ORG_ACCESS_LOCAL_KEY = 'gastroo_org_access_logged';

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<OrgCacheEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(ORGS_CACHE_KEY);
      return cached ? JSON.parse(cached) as OrgCacheEntry[] : [];
    } catch {
      return [];
    }
  });
  const [currentRestaurant, setCurrentRestaurantState] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
        // DIAGNOSTYKA: loguj usera i memberships
        if (user) {
          // eslint-disable-next-line no-console
          console.log('[ORG-PROVIDER-DEBUG] user.uid', user.uid);
        }
    if (!user) {
      setOrganization(null);
      setMember(null);
      setRestaurants([]);
      setOrganizationOptions([]);
      setCurrentRestaurantState(null);
      // Keep loading=true here — RootRouter doesn't depend on orgLoading for
      // unauthenticated users (public-root path skips org checks).
      // Setting loading=false here creates a race: after auth resolves the
      // router sees orgLoading=false + organizationOptions=[] before the
      // org fetch for the real user starts, causing a wrong space-root decision.
      return;
    }


    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch user doc and memberships in parallel.
      const [userDoc, membershipsSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, `users/${user.uid}/memberships`))),
      ]);
      const userData = userDoc.data();
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] userData', userData);

      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] membershipsSnap', membershipsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (membershipsSnap.empty) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ORGS_CACHE_KEY);
        }
        setOrganizationOptions([]);
        setLoading(false);
        return;
      }

      const recentOrganization = (userData?.recentOrganization ?? null) as RecentOrganizationRef | null;
      const fallbackOrgId = userData?.currentOrganizationId as string | undefined;
      const activeOrgId =
        recentOrganization?.orgId ??
        fallbackOrgId ??
        membershipsSnap.docs[0]?.id;
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] recentOrganization', recentOrganization);
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] currentOrganizationId', fallbackOrgId);
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] activeOrgId', activeOrgId);

      // --- PATCH: jeśli recentOrganization lub currentOrganizationId różni się od cache, wyczyść cache ---
      if (typeof window !== 'undefined') {
        const cachedSelected = localStorage.getItem(SELECTED_ORG_CACHE_KEY);
        const expectedSelected = `${activeOrgId}:${recentOrganization?.restaurantId ?? ''}`;
        if (cachedSelected && cachedSelected !== expectedSelected) {
          localStorage.removeItem(SELECTED_ORG_CACHE_KEY);
          localStorage.removeItem(ORGS_CACHE_KEY);
        }
      }

      const membershipLoads = await Promise.all(
        membershipsSnap.docs.map(async (membershipSnapshot): Promise<MembershipLoadResult | null> => {
          const orgId = membershipSnapshot.id;

          try {
            const membershipData = membershipSnapshot.data();
            const [orgDoc, memberDoc, restaurantsSnap, permsMatrixSnap] = await Promise.all([
              getDoc(doc(db, 'organizations', orgId)),
              getDoc(doc(db, `organizations/${orgId}/members`, user.uid)),
              getDocs(query(collection(db, `organizations/${orgId}/restaurants`))),
              getDoc(doc(db, `organizations/${orgId}/settings`, 'permissionsMatrix')).catch(() => null),
            ]);

            if (!orgDoc.exists()) return null;
            if (!memberDoc.exists() && !membershipSnapshot.exists()) return null;

            // Use org-level permissions matrix (may not exist — use empty overrides)
            let orgPermsMatrix: OrgPermissionsMatrix = {};
            if (permsMatrixSnap?.exists()) {
              orgPermsMatrix = (permsMatrixSnap.data()?.overrides ?? {}) as OrgPermissionsMatrix;
            }

            const orgData = orgDoc.data();
            const loadedOrg = {
              id: orgDoc.id,
              name: orgData.name,
              slug: orgData.slug,
              type: orgData.type,
              ownerId: orgData.ownerId ?? orgData.owner ?? '',
              ownerEmail: orgData.ownerEmail ?? '',
              plan: orgData.plan || 'free',
              subscriptionStatus: orgData.subscriptionStatus ?? 'active',
              features: orgData.features || {},
              timezone: orgData.timezone ?? 'Europe/Warsaw',
              createdAt: orgData.createdAt?.toDate() ?? new Date(),
              updatedAt: orgData.updatedAt?.toDate() ?? new Date(),
            } as Organization;

            const memberData = memberDoc.data() ?? {};
            const sourceData = membershipSnapshot.exists() ? membershipData : memberData;
            const memberRole = (sourceData.role ?? memberData.role) as Member['role'];
            const storedPerms: string[] = sourceData.permissions ?? [];
            const mergedPerms = resolveEffectivePermissions({
              role: memberRole,
              roleTemplateKey: sourceData.roleTemplateKey ?? memberData.roleTemplateKey,
              explicitPermissions: storedPerms,
              permissionOverrides: sourceData.permissionOverrides ?? memberData.permissionOverrides,
              orgRoleOverrides: orgPermsMatrix[memberRole],
            });

            const assignedRestaurantIds: string[] =
              sourceData.restaurantIds ??
              sourceData.venueIds ??
              memberData.restaurantIds ??
              [];

            const allRestaurants = restaurantsSnap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name,
                slug: data.slug ?? d.id,
                address: data.address ?? { street: '', city: '', postalCode: '', country: '' },
                phone: data.phone ?? '',
                timezone: data.timezone ?? 'Europe/Warsaw',
                hours: data.hours ?? {},
                tableCount: data.tableCount ?? 0,
                settings: data.settings ?? { currencyCode: 'PLN', defaultLanguage: 'pl', allowOnlineBookings: false, bookingAdvanceHours: 24, minPartySize: 1, maxPartySize: 20 },
                location: data.location,
                createdAt: data.createdAt?.toDate() ?? new Date(),
                updatedAt: data.updatedAt?.toDate() ?? new Date(),
              } as Restaurant;
            });

            const resolvedRestaurantIds = assignedRestaurantIds.length > 0
              ? assignedRestaurantIds
              : allRestaurants.map((restaurant) => restaurant.id);

            const loadedMember: Member = {
              userId: user.uid,
              email: user.email ?? sourceData.email ?? memberData.email ?? '',
              role: memberRole,
              roleTemplateKey: sourceData.roleTemplateKey ?? memberData.roleTemplateKey,
              restaurantIds: resolvedRestaurantIds,
              permissions: mergedPerms,
              permissionOverrides: sourceData.permissionOverrides ?? memberData.permissionOverrides,
              status: sourceData.status,
              invitedBy: memberData.invitedBy,
              joinedAt: memberData.joinedAt?.toDate?.() ?? sourceData.createdAt?.toDate?.() ?? new Date(),
            };

            const accessibleRestaurants = ['owner', 'admin'].includes(loadedMember.role)
              ? allRestaurants
              : allRestaurants.filter((restaurant) => loadedMember.restaurantIds.includes(restaurant.id));
            return {
              org: loadedOrg,
              member: loadedMember,
              restaurants: accessibleRestaurants,
            };
          } catch (membershipErr) {
            const code = (membershipErr as { code?: string } | null)?.code ?? '';
            if (code === 'permission-denied') {
              console.warn(`[OrganizationProvider] Skipping inaccessible organization context: ${orgId}`);
              return null;
            }
            throw membershipErr;
          }
        }),
      );

      const availableContexts = membershipLoads.filter((entry): entry is MembershipLoadResult => Boolean(entry));

      if (!availableContexts.length) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ORGS_CACHE_KEY);
        }
        setOrganizationOptions([]);
        setLoading(false);
        return;
      }

      const activeContext =
        availableContexts.find((entry) => entry.org.id === activeOrgId) ??
        availableContexts[0];

      setOrganization(activeContext.org);
      setMember(activeContext.member);
      setRestaurants(activeContext.restaurants);
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] activeContext', activeContext);


      if (typeof window !== 'undefined') {
        // PATCH: zawsze nadpisz cache organizacji danymi z Firestore po zalogowaniu
        const nextEntries: OrgCacheEntry[] = availableContexts.flatMap((entry) =>
          entry.restaurants.map((restaurant) => ({
            orgId: entry.org.id,
            orgName: entry.org.name,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
          })),
        );
        setOrganizationOptions(nextEntries);
        localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(nextEntries));
      }

      // Restore recent or locally selected restaurant in the active org.
      let current: Restaurant | null = null;
      if (recentOrganization?.orgId === activeContext.org.id && recentOrganization.restaurantId) {
        current = activeContext.restaurants.find((restaurant) => restaurant.id === recentOrganization.restaurantId) ?? activeContext.restaurants[0];
      } else {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(`currentRestaurant_${activeContext.org.id}`) : null;
        current = savedId
          ? (activeContext.restaurants.find((restaurant) => restaurant.id === savedId) ?? activeContext.restaurants[0])
          : activeContext.restaurants[0];
      }
      setCurrentRestaurantState(current ?? null);
      // eslint-disable-next-line no-console
      console.log('[ORG-PROVIDER-DEBUG] currentRestaurantState', current);
      if (typeof window !== 'undefined' && current) {
        localStorage.setItem(SELECTED_ORG_CACHE_KEY, `${activeContext.org.id}:${current.id}`);
      }

      if (
        userData?.recentOrganization?.orgId !== activeContext.org.id ||
        userData?.recentOrganization?.restaurantId !== (current?.id ?? null) ||
        userData?.currentOrganizationId !== activeContext.org.id
      ) {
        // Fire-and-forget: don't block loading on this write
        void updateDoc(doc(db, 'users', user.uid), {
          currentOrganizationId: activeContext.org.id,
          recentOrganization: {
            orgId: activeContext.org.id,
            restaurantId: current?.id ?? null,
          },
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // Non-critical write — silently ignore failures
        });
      }
    } catch (err) {
      // Firestore SDK assertion error during HMR (dev only) — auto-recover via page reload
      if (
        process.env.NODE_ENV === 'development' &&
        err instanceof Error &&
        err.message.includes('INTERNAL ASSERTION FAILED')
      ) {
        console.warn('[OrganizationProvider] Firestore HMR state corruption — reloading…');
        window.location.reload();
        return;
      }
      console.error('Error loading organization:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  useEffect(() => {
    if (!user || !organization || !member || typeof window === 'undefined') return;

    const marker = `${user.uid}:${organization.id}`;
    if (sessionStorage.getItem(`${ORG_ACCESS_LOCAL_KEY}:${marker}`) === '1') {
      return;
    }

    sessionStorage.setItem(`${ORG_ACCESS_LOCAL_KEY}:${marker}`, '1');

    const functions = getFunctions(app, 'europe-west1');
    const logOrganizationAccess = httpsCallable<{
      orgId: string;
      restaurantId?: string;
    }, { success: boolean; throttled?: boolean }>(functions, 'logOrganizationAccess');

    void logOrganizationAccess({
      orgId: organization.id,
      restaurantId: currentRestaurant?.id,
    }).catch(() => {
      // Silent fail: org access logging should not block dashboard flow.
    });
  }, [user, organization, member, currentRestaurant]);

  // Defensive recovery for Firestore HMR assertion errors (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

    const handleHmrError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const reason = (e as PromiseRejectionEvent).reason;
      const msg = (e as ErrorEvent).message || reason?.message || '';
      
      if (msg.includes('INTERNAL ASSERTION FAILED') || msg.includes('ID: ca9')) {
        console.error('🔥 Firestore Assertion Failure detected:', msg);
        if (reason?.stack) console.error('Stack:', reason.stack);

        // Prevent infinite reload loops (max 1 reload per 60 seconds)
        const lastReload = parseInt(sessionStorage.getItem('firestore_reload_ts') || '0');
        const now = Date.now();
        
        if (now - lastReload > 60000) {
          sessionStorage.setItem('firestore_reload_ts', now.toString());
          console.warn('🔄 Auto-reloading to reset Firestore state...');
          setTimeout(() => window.location.reload(), 2000); // Give user time to see the error
        } else {
          console.error('🛑 Firestore Assertion Failure loop detected. Please restart the emulator and clear browser cache.');
        }
      }
    };

    window.addEventListener('error', handleHmrError);
    window.addEventListener('unhandledrejection', handleHmrError);
    return () => {
      window.removeEventListener('error', handleHmrError);
      window.removeEventListener('unhandledrejection', handleHmrError);
    };
  }, []);

  const setCurrentRestaurant = useCallback(
    (id: string) => {
      const restaurant = restaurants.find((r) => r.id === id);
      if (restaurant) {
        setCurrentRestaurantState(restaurant);
        if (organization && typeof window !== 'undefined') {
          localStorage.setItem(`currentRestaurant_${organization.id}`, id);
          localStorage.setItem(SELECTED_ORG_CACHE_KEY, `${organization.id}:${id}`);
          if (user) {
            void updateDoc(doc(db, 'users', user.uid), {
              currentOrganizationId: organization.id,
              recentOrganization: {
                orgId: organization.id,
                restaurantId: id,
              },
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    },
    [restaurants, organization, user],
  );

  const hasPermission = useCallback(
    (permission: Permission | string): boolean => {
      if (!member) return false;
      if (member.role === 'owner' || member.role === 'admin') return true;
      return member.permissions.includes(permission as Permission);
    },
    [member],
  );

  const hasRole = useCallback(
    (roles: string[]): boolean => {
      if (!member) return false;
      return roles.includes(member.role);
    },
    [member],
  );

  const switchContext = useCallback(async (orgId: string, restaurantId: string) => {
    if (!user) return;
    void updateDoc(doc(db, 'users', user.uid), {
      currentOrganizationId: orgId,
      recentOrganization: { orgId, restaurantId },
      updatedAt: serverTimestamp(),
    }).catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELECTED_ORG_CACHE_KEY, `${orgId}:${restaurantId}`);
      localStorage.setItem(`currentRestaurant_${orgId}`, restaurantId);
    }
    await loadOrganization();
  }, [user, loadOrganization]);

  const refetch = useCallback(async () => {
    await loadOrganization();
  }, [loadOrganization]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        member,
        restaurants,
        organizationOptions,
        currentRestaurant,
        setCurrentRestaurant,
        switchContext,
        hasPermission,
        hasRole,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
