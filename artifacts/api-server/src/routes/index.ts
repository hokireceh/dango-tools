import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gridBotsRouter from "./gridBots";
import botLogsRouter from "./botLogs";
import marketRouter from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gridBotsRouter);
router.use(botLogsRouter);
router.use(marketRouter);

export default router;
