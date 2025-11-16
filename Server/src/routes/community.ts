import { Router } from "express";
import { requireAnyRole } from "../middlewares/authorize";
import {
  getAllCommunitiesHandler,
  createCommunityHandler,
  getCommunityByIdHandler,
  updateCommunityHandler,
  deleteCommunityHandler,
} from "../controllers/communityController";

const router = Router();

// Get all communities
router.get("/", requireAnyRole(["admin", "super_admin"]), getAllCommunitiesHandler);

// Create community
router.post("/", requireAnyRole(["admin", "super_admin"]), createCommunityHandler);

// Get a single community by ID
router.get("/:id", requireAnyRole(["admin", "super_admin"]), getCommunityByIdHandler);

// Update a single community by ID
router.put("/:id", requireAnyRole(["admin", "super_admin"]), updateCommunityHandler);

// Delete community (soft delete)
router.delete("/:id", requireAnyRole(["super_admin"]), deleteCommunityHandler);

export default router;
