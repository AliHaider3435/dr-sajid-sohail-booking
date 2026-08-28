import { Router, type Request, type Response } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
  });
});

export default healthRouter;