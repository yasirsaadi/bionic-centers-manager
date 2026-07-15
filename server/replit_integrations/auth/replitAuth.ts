import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

export function getSession() {
  // Sliding (rolling) session: expires 1 day after the LAST activity, and the
  // expiry is refreshed on every request while the user is active. So an
  // active user is never logged out mid-work, and an idle session dies after
  // a day instead of lingering as a stale, half-working session.
  const sessionTtl = 24 * 60 * 60 * 1000; // 1 day
  const pgStore = connectPg(session);

  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // refresh cookie + store expiry on every response
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const branchSession = (req.session as any)?.branchSession;
  if (!branchSession) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
