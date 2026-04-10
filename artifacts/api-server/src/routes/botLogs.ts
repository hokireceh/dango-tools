import { Router } from "express";
import { db, botLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListBotLogsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/bot-logs", async (req, res) => {
  const parsed = ListBotLogsQueryParams.safeParse({
    botId: req.query.botId ? Number(req.query.botId) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : 50,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  let query = db.select().from(botLogsTable).orderBy(desc(botLogsTable.createdAt)).limit(parsed.data.limit ?? 50);

  const logs = parsed.data.botId
    ? await db.select().from(botLogsTable).where(eq(botLogsTable.botId, parsed.data.botId)).orderBy(desc(botLogsTable.createdAt)).limit(parsed.data.limit ?? 50)
    : await query;

  res.json(
    logs.map((log) => ({
      ...log,
      priceAtEvent: log.priceAtEvent ? Number(log.priceAtEvent) : null,
      createdAt: log.createdAt.toISOString(),
    }))
  );
});

export default router;
