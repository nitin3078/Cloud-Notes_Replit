import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// 404 for unmatched /api routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — ensures the client always gets JSON (never an HTML
// error page), so failures surface properly in the UI instead of failing silently.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log?.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  // Deliberately generic: some errors (e.g. Drizzle query failures) put the
  // raw SQL and parameter values in err.message, which must never reach the
  // client. Full detail is captured above via the server-side log instead.
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

export default app;
