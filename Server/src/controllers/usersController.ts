import { Request, Response } from "express";
import {
  createUser,
//   getUserById,
//   updateUser,
  deleteUser,
  authenticateUser,
} from "../services/usersService";

// 🔹 Create User
export async function createUserController(req: Request, res: Response) {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// 🔹 Get User By ID
// export async function getUserByIdController(req: Request, res: Response) {
//   try {
//     const user = await getUserById(Number(req.params.id));
//     if (!user) return res.status(404).json({ success: false, error: "User not found" });
//     res.json({ success: true, data: user });
//   } catch (error: any) {
//     res.status(400).json({ success: false, error: error.message });
//   }
// }

// 🔹 Update User
// export async function updateUserController(req: Request, res: Response) {
//   try {
//     const user = await updateUser(Number(req.params.id), req.body);
//     res.json({ success: true, data: user });
//   } catch (error: any) {
//     res.status(400).json({ success: false, error: error.message });
//   }
// }

// 🔹 Delete User
export async function deleteUserController(req: Request, res: Response) {
  try {
    await deleteUser(Number(req.params.id));
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// 🔹 Authenticate (Login)
export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
