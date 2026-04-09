import crypto from "crypto";
import { Router, Request, Response } from "express";
import { RegisterSchema, LoginSchema } from "@shared/schemas";
import User from "../models/User";
import AthleteProfile from "../models/AthleteProfile";
import MobileLoginToken, { hashMobileToken } from "../models/MobileLoginToken";
import { signToken } from "../lib/jwt";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

type SafeAuthUser = {
  _id: string;
  name: string;
  email: string;
  role: "athlete" | "coach";
  onboardingCompleted: boolean;
};

async function buildAuthUser(user: any): Promise<SafeAuthUser> {
  const baseUser: SafeAuthUser = {
    _id: String(user._id),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: user.role === "coach" ? "coach" : "athlete",
    onboardingCompleted: user.role === "coach",
  };

  if (baseUser.role !== "athlete") {
    return baseUser;
  }

  try {
    const profile = await AthleteProfile.findOne({
      athleteId: user._id,
    })
      .select("onboardingCompleted")
      .lean();

    return {
      ...baseUser,
      onboardingCompleted: Boolean(profile?.onboardingCompleted),
    };
  } catch (error) {
    console.error("buildAuthUser AthleteProfile lookup failed:", error);

    // Auth darf daran NICHT scheitern
    return {
      ...baseUser,
      onboardingCompleted: false,
    };
  }
}

function getErrorMessage(error: unknown, fallback = "Server error") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.flatten(),
    });
    return;
  }

  const { name, email, password, role } = parsed.data;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      res.status(409).json({
        success: false,
        error: "Email already in use",
      });
      return;
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    });

    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const authUser = await buildAuthUser(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: authUser,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error, "Registration failed"),
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.flatten(),
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const authUser = await buildAuthUser(user);

    res.json({
      success: true,
      data: {
        token,
        user: authUser,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error, "Login failed"),
    });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    const authUser = await buildAuthUser(user);

    res.json({
      success: true,
      data: authUser,
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error, "Failed to load current user"),
    });
  }
});

// POST /api/auth/mobile-link-token
router.post(
  "/mobile-link-token",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashMobileToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 2);

      await MobileLoginToken.create({
        userId,
        tokenHash,
        expiresAt,
      });

      res.json({
        success: true,
        data: {
          qrPayload: {
            type: "athletiq_mobile_login",
            token: rawToken,
          },
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("POST /api/auth/mobile-link-token error:", error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error, "Could not create mobile link token"),
      });
    }
  }
);

// POST /api/auth/mobile-link-exchange
router.post("/mobile-link-exchange", async (req: Request, res: Response) => {
  try {
    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";

    if (!token) {
      res.status(400).json({
        success: false,
        error: "Token missing",
      });
      return;
    }

    const tokenHash = hashMobileToken(token);
    const linkToken = await MobileLoginToken.findOne({ tokenHash });

    if (!linkToken) {
      res.status(404).json({
        success: false,
        error: "Invalid token",
      });
      return;
    }

    if (linkToken.usedAt) {
      res.status(400).json({
        success: false,
        error: "Token already used",
      });
      return;
    }

    if (linkToken.expiresAt.getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: "Token expired",
      });
      return;
    }

    const user = await User.findById(linkToken.userId).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    linkToken.usedAt = new Date();
    await linkToken.save();

    const jwt = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const authUser = await buildAuthUser(user);

    res.json({
      success: true,
      data: {
        token: jwt,
        user: authUser,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/mobile-link-exchange error:", error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error, "Mobile link exchange failed"),
    });
  }
});

export default router;
