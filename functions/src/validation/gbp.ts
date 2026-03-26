import { z } from 'zod';

export const GbpConnectSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  orgId: z.string().optional(),
});

export const GbpGetLocationsSchema = z.object({
  orgId: z.string().optional(),
});

export const GbpEnsureLocationForOrganizationSchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
});
