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
  canManageSettings: boolean;
  canManageUsers: boolean;
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
  canManageSettings: true,
  canManageUsers: true,
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
  canManageSettings: false,
  canManageUsers: false,
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
      canManageSettings: false,
      canManageUsers: false,
    };
  }
  
  if (session.permissions) {
    return session.permissions;
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
