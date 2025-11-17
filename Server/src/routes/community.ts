import { Router } from "express";
import { requireAnyRole } from "../middlewares/authorize";
import {
  getAllCommunitiesHandler,
  createCommunityHandler,
  getCommunityByIdHandler,
  updateCommunityHandler,
  deleteCommunityHandler,
  addMemberToCommunityHandler,
  getCommunityMembersHandler,
  updateCommunityMemberProfileHandler,
  removeMemberFromCommunityHandler,
  updateMemberRoleHandler,
} from "../controllers/communityController";

const router = Router();

// Community CRUD
router.get("/", requireAnyRole(["admin", "super_admin"]), getAllCommunitiesHandler);
router.post("/", requireAnyRole(["admin", "super_admin"]), createCommunityHandler);
router.get("/:id", requireAnyRole(["admin", "super_admin"]), getCommunityByIdHandler);
router.put("/:id", requireAnyRole(["admin", "super_admin"]), updateCommunityHandler);
router.delete("/:id", requireAnyRole(["super_admin"]), deleteCommunityHandler);

// Community Members Management
router.post("/:id/members", requireAnyRole(["admin", "super_admin"]), addMemberToCommunityHandler);
router.get("/:id/members", requireAnyRole(["admin", "super_admin", "member"]), getCommunityMembersHandler);
router.put("/:id/members/:member_id/profile", requireAnyRole(["admin", "super_admin"]), updateCommunityMemberProfileHandler);
router.put("/:id/members/:member_id/role", requireAnyRole(["super_admin"]), updateMemberRoleHandler);
router.delete("/:id/members/:member_id", requireAnyRole(["admin", "super_admin"]), removeMemberFromCommunityHandler);

export default router;
