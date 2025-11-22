/**
 * Community Controller
 *
 * Handles community-related API endpoints
 *
 * Refactored: 2025-01-17
 * - Removed try-catch blocks (using asyncHandler)
 * - Standardized error responses
 * - Added proper error classes
 * - Cleaner, more maintainable code
 */

import { Request, Response } from "express";
import {
  getCommunityWithMembersById,
  getCommunityById,
  getAllCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  addMemberToCommunity,
  getCommunityMembers,
  updateCommunityMemberProfile,
  removeMemberFromCommunity,
  updateMemberRole,
} from "../services/communityService";
import {
  asyncHandler,
  NotFoundError,
  successResponse,
  createdResponse
} from "../utils/errors";

/**
 * GET /api/community
 * Get all communities
 */
export const getAllCommunitiesHandler = asyncHandler(async (req: Request, res: Response) => {
  const communities = await getAllCommunities();
  successResponse(res, { communities });
});

/**
 * GET /api/community/:id
 * Get a single community by ID
 */
export const getCommunityByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const community = await getCommunityWithMembersById(id);

  if (!community) {
    throw new NotFoundError('Community', id);
  }

  successResponse(res, { community });
});

/**
 * POST /api/community
 * Create a new community
 * Requires: Admin or Super Admin role
 */
export const createCommunityHandler = asyncHandler(async (req: Request, res: Response) => {
  const newCommunity = await createCommunity(req.body);
  createdResponse(res, { community: newCommunity });
});

/**
 * PUT /api/community/:id
 * Update an existing community
 * Requires: Admin or Super Admin role
 */
export const updateCommunityHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updated = await updateCommunity(id, req.body);

  if (!updated) {
    throw new NotFoundError('Community', id);
  }

  successResponse(res, { community: updated });
});

/**
 * DELETE /api/community/:id
 * Delete a community (soft delete)
 * Requires: Super Admin role
 */
export const deleteCommunityHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await deleteCommunity(id);

  successResponse(res, { message: 'Community deleted successfully' });
});

/**
 * POST /api/community/:id/members
 * Add a member to a community
 * Requires: Admin or Super Admin role
 */
export const addMemberToCommunityHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { member_data, member_type, profile_data, role, invited_by } = req.body;

  // Validate required fields
  if (!member_data || !member_data.name || !member_data.phone) {
    throw new Error('Member data with name and phone is required');
  }

  const result = await addMemberToCommunity({
    community_id: id,
    member_data,
    member_type,
    profile_data,
    role,
    invited_by,
  });

  createdResponse(res, result);
});

/**
 * GET /api/community/:id/members
 * Get all members of a community
 */
export const getCommunityMembersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { member_type, role, is_active } = req.query;

  const members = await getCommunityMembers(id, {
    member_type: member_type as string,
    role: role as string,
    is_active: is_active !== undefined ? is_active === 'true' : undefined,
  });

  successResponse(res, { members, count: members.length });
});

/**
 * PUT /api/community/:id/members/:member_id/profile
 * Update a member's profile data in a community
 * Requires: Admin or Super Admin role, or the member themselves
 */
export const updateCommunityMemberProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id, member_id } = req.params;
  const { profile_data } = req.body;

  if (!profile_data) {
    throw new Error('profile_data is required');
  }

  const updated = await updateCommunityMemberProfile(id, member_id, profile_data);

  successResponse(res, { membership: updated });
});

/**
 * DELETE /api/community/:id/members/:member_id
 * Remove a member from a community (soft delete)
 * Requires: Admin or Super Admin role
 */
export const removeMemberFromCommunityHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id, member_id } = req.params;

  const removed = await removeMemberFromCommunity(id, member_id);

  if (!removed) {
    throw new NotFoundError('Membership', `${id}/${member_id}`);
  }

  successResponse(res, { message: 'Member removed from community successfully' });
});

/**
 * PUT /api/community/:id/members/:member_id/role
 * Update a member's role in a community
 * Requires: Super Admin role
 */
export const updateMemberRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id, member_id } = req.params;
  const { role } = req.body;

  if (!role || !['member', 'admin', 'super_admin'].includes(role)) {
    throw new Error('Valid role is required (member, admin, or super_admin)');
  }

  const updated = await updateMemberRole(id, member_id, role);

  successResponse(res, { membership: updated });
});
