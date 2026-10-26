import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

type OrderManager = { role: "admin" } | { role: "farmer"; farmerId: number };

declare global {
  namespace Express {
    interface Request {
      orderManager?: OrderManager;
    }
  }
}

// Read server-managed metadata directly, so revoked grants take effect without
// waiting for a session refresh. Never trust a body, query, or unsafeMetadata role.
export async function requireOrderManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { publicMetadata } = await clerkClient.users.getUser(userId);
  if (publicMetadata.role === "admin") {
    req.orderManager = { role: "admin" };
  } else if (
    publicMetadata.role === "farmer" &&
    typeof publicMetadata.farmerId === "number" &&
    Number.isSafeInteger(publicMetadata.farmerId) &&
    publicMetadata.farmerId > 0
  ) {
    req.orderManager = { role: "farmer", farmerId: publicMetadata.farmerId };
  } else {
    res.status(403).json({ error: "Order management access required" });
    return;
  }
  next();
}
