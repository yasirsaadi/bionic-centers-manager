import type { Request, Response } from "express";

export type BranchSession = {
  branchId?: number | null;
  accessibleBranches?: number[];
  isAdmin?: boolean;
  userId?: number | null;
  role?: string;
  displayName?: string | null;
  permissions?: Record<string, boolean | undefined>;
};

export function getSession(req: Request): BranchSession | null {
  const s = (req.session as any)?.branchSession;
  return s ?? null;
}

export function getUserContext(req: Request) {
  const s = getSession(req);
  return {
    userId: s?.userId ?? null,
    userName: s?.displayName ?? null,
    branchId: s?.branchId ?? null,
    isAdmin: Boolean(s?.isAdmin),
    role: s?.role ?? "",
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

// Returns the list of branch IDs the requester may act on. Admin returns
// null = all. Non-admin returns accessibleBranches when set, else falls
// back to the single branchId.
export function accessibleBranchesFor(req: Request): number[] | null {
  const s = getSession(req);
  if (!s) return [];
  if (s.isAdmin) return null;
  const list = Array.isArray(s.accessibleBranches) ? s.accessibleBranches : [];
  if (list.length > 0) return list;
  return s.branchId ? [s.branchId] : [];
}

// True if the user can read data for the given branch.
export function canAccessBranch(req: Request, branchId: number): boolean {
  const list = accessibleBranchesFor(req);
  if (list === null) return true; // admin
  return list.includes(branchId);
}

function hasPerm(s: BranchSession | null, key: string): boolean {
  if (!s) return false;
  if (s.isAdmin) return true;
  return Boolean(s.permissions?.[key]);
}

// Permission checks specific to the sessions module.
export function canEnterSessions(req: Request): boolean {
  return hasPerm(getSession(req), "canEnterSessions");
}

export function canManageSessionTargets(req: Request): boolean {
  return hasPerm(getSession(req), "canManageSessionTargets");
}

export function canViewSessionsReport(req: Request): boolean {
  return hasPerm(getSession(req), "canViewSessionsReport");
}

// Sends 403 + returns false when the user lacks the permission. Caller
// should `return` immediately on false.
export function requirePerm(
  req: Request,
  res: Response,
  check: (req: Request) => boolean,
  message = "ليس لديك صلاحية الوصول إلى هذا القسم",
): boolean {
  if (!check(req)) {
    res.status(403).json({ message });
    return false;
  }
  return true;
}

// Resolve which branch the request targets, enforcing isolation for
// non-admins. Returns:
//   - admin: the requested branchId (number) or null when omitted (= all).
//   - non-admin with multi-branch: the requested branchId if it's in
//     their accessibleBranches, else falls back to their primary branchId.
//   - non-admin single-branch: their pinned branchId, regardless of input.
// Returns undefined when the resolved branchId is invalid, allowing the
// caller to 400.
export function resolveBranchId(
  req: Request,
  raw: unknown,
): number | null | undefined {
  const s = getSession(req);
  if (!s) return undefined;
  if (s.isAdmin) {
    if (raw === undefined || raw === null || raw === "" || raw === "all") {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  // Non-admin: honor the supplied value when it's one of the user's
  // accessible branches; otherwise fall back to their primary branchId.
  const list = accessibleBranchesFor(req);
  if (raw !== undefined && raw !== null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && list && list.includes(n)) {
      return n;
    }
  }
  return s.branchId ?? undefined;
}

// For mutations that target a specific branch, ensure the caller is
// allowed. Sends 403 and returns false if not.
export function requireBranchWriteAccess(
  req: Request,
  res: Response,
  branchId: number,
): boolean {
  const s = getSession(req);
  if (!s) {
    res.status(401).json({ message: "غير مصرح" });
    return false;
  }
  if (s.isAdmin) return true;
  const list = accessibleBranchesFor(req);
  if (list && list.includes(branchId)) return true;
  res.status(403).json({ message: "لا يمكنك التعديل على فرع غير مركزك" });
  return false;
}
