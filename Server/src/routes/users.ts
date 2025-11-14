import { Router } from "express";
import {
  createUserController,
//   getUserByIdController,
//   updateUserController,
  deleteUserController,
  loginController,
} from "../controllers/usersController";

const router = Router();

// 🔐 Authentication Route
router.post("/auth/login", loginController);

// 👤 User Routes
router.post("/", createUserController); // can protect later
// router.get("/users/:id", getUserByIdController);
// router.put("/users/:id", updateUserController);
router.delete("/users/:id", deleteUserController);

export default router;
