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
  getCommunityById,
  getAllCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
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
  const communities = await getAllCommunity();
  successResponse(res, { communities });
});

/**
 * GET /api/community/:id
 * Get a single community by ID
 */
export const getCommunityByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const community = await getCommunityById(id);

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
