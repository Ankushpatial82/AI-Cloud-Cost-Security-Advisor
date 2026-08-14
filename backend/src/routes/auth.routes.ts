import { Router } from "express";
import {
  register,
  login,
  verifyMFA,
  setupMFA,
  confirmMFASetup,
  refreshToken,
  logout
} from "../controllers/auth.controller";
import { authenticateUser } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/mfa/verify", verifyMFA);
router.post("/mfa/setup", authenticateUser, setupMFA);
router.post("/mfa/confirm", authenticateUser, confirmMFASetup);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
