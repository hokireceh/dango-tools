import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, accessTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import healthRouter from "./health";
import gridBotsRouter from "./gridBots";
import botLogsRouter from "./botLogs";
import marketRouter from "./market";
import authRouter from "./auth";

const router: IRouter = Router();

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized — token diperlukan" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(accessTokensTable)
      .where(eq(accessTokensTable.token, token));

    if (!record || record.expiresAt < new Date()) {
      res.status(401).json({ error: "Token tidak valid atau sudah kadaluarsa" });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: "Auth check gagal" });
  }
}

router.use(authRouter);
router.use(healthRouter);

router.use(requireAuth);

router.use(gridBotsRouter);
router.use(botLogsRouter);
router.use(marketRouter);

export default router;
