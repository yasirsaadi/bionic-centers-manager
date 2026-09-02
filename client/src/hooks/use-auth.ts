import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // ══ عودةُ التركيز تُحدِّث الصلاحيات (إصلاحٌ 2026-09-02) ═══════════════
    // الإعدادُ العامّ لعميل الاستعلامات يطفئ `refetchOnWindowFocus` عمداً
    // (لا رفرفةَ عند تبديل التبويب لبقيّة الاستعلامات)، لكنّ هذا الاستعلامَ
    // بعينه هو نقطةُ تحديث الصلاحيات الحيّة — فـ"always" هنا تتجاوز
    // `staleTime` الخاصّ به عند التركيز فقط (لا تمسّ أيَّ استعلامٍ آخر ولا
    // مشغّلات إعادة الجلب الأخرى)، فتعود جلسةٌ نشطة إلى النافذة وتقرأ
    // فوراً ما غيّره المسؤولُ في شاشة المستخدمين. `App.tsx` يُزامن `user`
    // الناتج مع مخزن `useBranchSession` المشترك (`BranchGate.tsx`).
    refetchOnWindowFocus: "always",
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
