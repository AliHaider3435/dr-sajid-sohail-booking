import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req: any, res: any) => {
  res.end(
    JSON.stringify({
      status: "ok",
    }),
  );
});

export default healthRouter;