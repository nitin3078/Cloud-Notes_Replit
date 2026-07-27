import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foldersRouter from "./folders";
import notesRouter from "./notes";
import statsRouter from "./stats";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foldersRouter);
router.use(notesRouter);
router.use(statsRouter);
router.use(aiRouter);

export default router;
