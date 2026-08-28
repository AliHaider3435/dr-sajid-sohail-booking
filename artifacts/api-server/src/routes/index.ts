import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import appointmentsRouter from "./appointments.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appointmentsRouter);

export default router;
