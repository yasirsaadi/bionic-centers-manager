import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Refresh everything that shows a patient's money, in one call.
 *
 * The bug this exists to end (reception العين, 2026-08-06): a cost was saved
 * and did NOT appear on the patient's file until the employee pressed refresh —
 * so she assumed the save had failed and entered it again, and the service was
 * booked twice. «تخصيص وإسناد خبير» — the very dialog where the device price is
 * entered — invalidated only ["/api/patients"], while the patient page reads
 * ["/api/patients/:id", id]. Different key families: the screen never updated.
 *
 * Every dialog that writes money calls THIS, so no screen can be left behind
 * again. Prefix matching means one entry covers its children (cases,
 * treatment-plans, every registry page).
 */
export function invalidatePatientData(
  client: QueryClient,
  patientId?: number | null,
): void {
  // The patient record itself + its cases (["/api/patients/:id", id, "cases"]).
  if (patientId != null) {
    client.invalidateQueries({ queryKey: ["/api/patients/:id", patientId] });
    client.invalidateQueries({ queryKey: ["/api/patients", patientId] });
    client.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/summary`] });
    client.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/orders`] });
  }
  // Lists: the old aggregate list AND the paginated registry the patients page
  // actually renders — a different key family that used to be missed entirely.
  client.invalidateQueries({ queryKey: ["/api/patients"] });
  client.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  // Badges and money reports that move with a cost.
  client.invalidateQueries({ queryKey: ["/api/medical/pending"] });
  client.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
  client.invalidateQueries({ queryKey: ["/api/reports/daily-summary"] });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Was Infinity which made every query a one-shot for the session.
      // 60s gives a good balance: same query within a minute uses cache
      // (no flicker, no re-fetch on tab switch) but stale data doesn't
      // linger across true workflow changes.
      staleTime: 60_000,
      // gcTime defaults to 5 minutes which is fine for our memory budget.
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
