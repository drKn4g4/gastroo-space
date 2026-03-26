type BooleanFlagValue = string | undefined;

function toBoolean(value: BooleanFlagValue, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const featureFlags = {
  offlineQueue: toBoolean(process.env.NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE, true),
  googleChat: toBoolean(process.env.NEXT_PUBLIC_FEATURE_GOOGLE_CHAT, true),
  googleCalendar: toBoolean(process.env.NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR, true),
  advancedFloorplan: toBoolean(process.env.NEXT_PUBLIC_FEATURE_ADVANCED_FLOORPLAN, true),
  availabilityRequests: toBoolean(process.env.NEXT_PUBLIC_FEATURE_AVAILABILITY_REQUESTS, true),
  dataConnect: toBoolean(process.env.FEATURE_ENABLE_DATACONNECT, true),
  stripePayments: toBoolean(process.env.NEXT_PUBLIC_FEATURE_STRIPE_PAYMENTS, false),
  stripeBilling: toBoolean(process.env.NEXT_PUBLIC_FEATURE_STRIPE_BILLING, false),
} as const;

export type FeatureFlags = typeof featureFlags;
