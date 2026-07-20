import { useBranchSession } from "@/components/BranchGate";

interface UserPermissions {
  canViewPatients: boolean;
  canAddPatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canViewPayments: boolean;
  canAddPayments: boolean;
  canEditPayments: boolean;
  canDeletePayments: boolean;
  canViewReports: boolean;
  canManageAccounting: boolean;
  canAddExpenses: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageTreatmentPlans: boolean;
  canManageSurveys: boolean;
  canEditVisits: boolean;
  canDeleteVisits: boolean;
  canEnterSessions: boolean;
  canManageSessionTargets: boolean;
  canViewSessionsReport: boolean;
  canWorkAsExpert: boolean;
}

const defaultAdminPermissions: UserPermissions = {
  canViewPatients: true,
  canAddPatients: true,
  canEditPatients: true,
  canDeletePatients: true,
  canViewPayments: true,
  canAddPayments: true,
  canEditPayments: true,
  canDeletePayments: true,
  canViewReports: true,
  canManageAccounting: true,
  canAddExpenses: true,
  canManageSettings: true,
  canManageUsers: true,
  canManageTreatmentPlans: true,
  canManageSurveys: true,
  canEditVisits: true,
  canDeleteVisits: true,
  canEnterSessions: true,
  canManageSessionTargets: true,
  canViewSessionsReport: true,
  canWorkAsExpert: false,
};

const defaultBranchPermissions: UserPermissions = {
  canViewPatients: true,
  canAddPatients: true,
  canEditPatients: true,
  canDeletePatients: false,
  canViewPayments: true,
  canAddPayments: true,
  canEditPayments: true,
  canDeletePayments: false,
  canViewReports: true,
  canManageAccounting: false,
  canAddExpenses: false,
  canManageSettings: false,
  canManageUsers: false,
  canManageTreatmentPlans: false,
  canManageSurveys: false,
  canEditVisits: false,
  canDeleteVisits: false,
  canEnterSessions: false,
  canManageSessionTargets: false,
  canViewSessionsReport: false,
  canWorkAsExpert: false,
};

export function usePermissions(): UserPermissions {
  const session = useBranchSession();
  
  if (!session) {
    return {
      canViewPatients: false,
      canAddPatients: false,
      canEditPatients: false,
      canDeletePatients: false,
      canViewPayments: false,
      canAddPayments: false,
      canEditPayments: false,
      canDeletePayments: false,
      canViewReports: false,
      canManageAccounting: false,
  canAddExpenses: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTreatmentPlans: false,
      canManageSurveys: false,
      canEditVisits: false,
      canDeleteVisits: false,
      canEnterSessions: false,
      canManageSessionTargets: false,
      canViewSessionsReport: false,
      canWorkAsExpert: false,
    };
  }

  if (session.permissions) {
    const perms = session.permissions as unknown as Record<string, boolean>;
    return {
      canViewPatients: perms.canViewPatients ?? false,
      canAddPatients: perms.canAddPatients ?? false,
      canEditPatients: perms.canEditPatients ?? false,
      canDeletePatients: perms.canDeletePatients ?? false,
      canViewPayments: perms.canViewPayments ?? false,
      canAddPayments: perms.canAddPayments ?? false,
      canEditPayments: perms.canEditPayments ?? false,
      canDeletePayments: perms.canDeletePayments ?? false,
      canViewReports: perms.canViewReports ?? false,
      canManageAccounting: perms.canManageAccounting ?? false,
      canAddExpenses: perms.canAddExpenses ?? false,
      canManageSettings: perms.canManageSettings ?? false,
      canManageUsers: perms.canManageUsers ?? false,
      canManageTreatmentPlans: perms.canManageTreatmentPlans ?? false,
      canManageSurveys: perms.canManageSurveys ?? false,
      canEditVisits: perms.canEditVisits ?? false,
      canDeleteVisits: perms.canDeleteVisits ?? false,
      canEnterSessions: perms.canEnterSessions ?? false,
      canManageSessionTargets: perms.canManageSessionTargets ?? false,
      canViewSessionsReport: perms.canViewSessionsReport ?? false,
      canWorkAsExpert: perms.canWorkAsExpert ?? false,
    };
  }
  
  if (session.isAdmin) {
    return defaultAdminPermissions;
  }
  
  return defaultBranchPermissions;
}

export function useCanViewPatients(): boolean {
  return usePermissions().canViewPatients;
}

export function useCanAddPatients(): boolean {
  return usePermissions().canAddPatients;
}

export function useCanEditPatients(): boolean {
  return usePermissions().canEditPatients;
}

export function useCanDeletePatients(): boolean {
  return usePermissions().canDeletePatients;
}

export function useCanViewPayments(): boolean {
  return usePermissions().canViewPayments;
}

export function useCanAddPayments(): boolean {
  return usePermissions().canAddPayments;
}

export function useCanEditPayments(): boolean {
  return usePermissions().canEditPayments;
}

export function useCanDeletePayments(): boolean {
  return usePermissions().canDeletePayments;
}

export function useCanViewReports(): boolean {
  return usePermissions().canViewReports;
}

export function useCanManageAccounting(): boolean {
  return usePermissions().canManageAccounting;
}

export function useCanManageSettings(): boolean {
  return usePermissions().canManageSettings;
}

export function useCanManageUsers(): boolean {
  return usePermissions().canManageUsers;
}

export function useCanManageTreatmentPlans(): boolean {
  return usePermissions().canManageTreatmentPlans;
}

export function useCanManageSurveys(): boolean {
  return usePermissions().canManageSurveys;
}
