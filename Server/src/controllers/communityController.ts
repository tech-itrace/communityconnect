import { Request, Response } from "express";
import {
  getCommunityById,
  getAllCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
} from "../services/communityService";

export async function getAllCommunitiesHandler(req: Request, res: Response) {
  try {
    const communities = await getAllCommunity();
    res.status(200).json({ success: true, community: communities });
  } catch (error) {
    console.error("[Community Controller] Error fetching all:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getCommunityByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const community = await getCommunityById(id);
    if (!community)
      return res.status(404).json({ success: false, message: "Community not found" });
    res.status(200).json({ success: true, community: community });
  } catch (error) {
    console.error("[Community Controller] Error fetching by ID:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function createCommunityHandler(req: Request, res: Response) {
  try {
    const newCommunity = await createCommunity(req.body);
    res.status(201).json({ success: true, community: newCommunity });
  } catch (error) {
    console.error("[Community Controller] Error creating:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function updateCommunityHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await updateCommunity(id, req.body);
    if (!updated)
      return res.status(404).json({ success: false, message: "Community not found" });
    res.status(200).json({ success: true, community: updated });
  } catch (error) {
    console.error("[Community Controller] Error updating:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function deleteCommunityHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await deleteCommunity(id);
    res.status(200).json({ success: true, message: "Community deleted" });
  } catch (error) {
    console.error("[Community Controller] Error deleting:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}
