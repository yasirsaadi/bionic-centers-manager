import { useQuery } from "@tanstack/react-query";
import type { MedicalSpecialty } from "@shared/medical";

export interface DoctorGrant {
  canWriteMedicalExam: boolean;
  specialties: MedicalSpecialty[];
}

const EMPTY: DoctorGrant = { canWriteMedicalExam: false, specialties: [] };

/**
 * The signed-in user's authority to write clinical records, read from the
 * server rather than from the cached session.
 *
 * It matters that this is a live read: the admin can revoke a doctor's grant or
 * change their specialties at any moment, and the server enforces the current
 * value on every write. Deriving the buttons from a stale session copy would
 * show a doctor an action that then fails with a 403.
 *
 * Shared query key, so the registry, the worklist and the patient page all
 * reuse one cached answer instead of asking three times.
 */
export function useDoctorGrant(): DoctorGrant {
  const { data } = useQuery<DoctorGrant>({
    queryKey: ["/api/medical/me"],
    queryFn: async () => {
      const res = await fetch("/api/medical/me", { credentials: "include" });
      if (!res.ok) return EMPTY;
      return res.json();
    },
    staleTime: 60_000,
  });

  return data ?? EMPTY;
}
