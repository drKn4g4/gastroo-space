/**
 * Jobs & Recruitment Domain
 */

/**
 * /organizations/{orgId}/jobOffers/{offerId}
 * Job listing for gastronauts to browse.
 */
export interface JobOffer {
  id: string;
  organizationId: string;
  organizationName?: string;
  restaurantId: string;
  restaurantName?: string;
  title: string;
  role: string;
  description: string;
  requirements?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hour' | 'month';
  };
  tags?: string[];
  status: 'draft' | 'active' | 'closed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/verificationRequests/{requestId}
 * Employment verification request from gastronaut to org owner.
 */
export interface VerificationRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  cvEntryId: string;
  claimedPosition: string;
  claimedStartedAt: Date;
  claimedEndedAt?: Date;
  status: 'pending' | 'confirmed' | 'rejected';
  respondedBy?: string;
  respondedAt?: Date;
  note?: string;
  createdAt: Date;
}
