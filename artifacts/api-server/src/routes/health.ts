import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.end(
    JSON.stringify({
      status: "ok",
    }),
  );
});

export default healthRouter;