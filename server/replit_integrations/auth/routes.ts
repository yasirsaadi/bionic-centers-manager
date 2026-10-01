import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    const branchSession = req.session?.branchSession;

    if (!branchSession) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({
      id: branchSession.userId ?? String(branchSession.branchId ?? "session"),
      email: null,
      firstName: branchSession.displayName || null,
      lastName: null,
      profileImageUrl: null,
      role: branchSession.role || (branchSession.isAdmin ? "admin" : "branch_staff"),
      branchId: branchSession.branchId,
      isAdmin: !!branchSession.isAdmin,
      permissions: branchSession.permissions || null,
      language: branchSession.language || "ar",
      shift: branchSession.shift || "auto",
      displayName: branchSession.displayName || null,
      //  **الفروعُ واسمُ الفرع النشط** (§4.ar البند ٧) — تتحدّث حيّاً في الخادم، فتصل الواجهةَ معها.
      accessibleBranches: Array.isArray(branchSession.accessibleBranches) ? branchSession.accessibleBranches : null,
      //  فروعُ الحساب كلُّها — للمبدِّل وحده (§4.ay)؛ و`accessibleBranches` أعلاه الفرعُ النشط.
      assignedBranches: Array.isArray(branchSession.assignedBranches) ? branchSession.assignedBranches
        : Array.isArray(branchSession.accessibleBranches) ? branchSession.accessibleBranches : null,
      branchName: branchSession.branchName ?? null,
    });
  });

  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
}
