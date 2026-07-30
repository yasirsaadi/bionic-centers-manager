import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Self-service password change.
 *
 * The current password is required (owner's choice): a workstation left
 * unlocked must not let a passer-by lock the real owner out of their account.
 * The new password stays visible to the admin on the users screen — the server
 * writes it to the same admin-only plaintext column it always used.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = async () => {
    if (next !== confirm) {
      toast({ title: "كلمتا السر الجديدتان غير متطابقتين", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: data?.message || "تعذّر تغيير كلمة السر", variant: "destructive" });
        return;
      }
      toast({ title: "تم تغيير كلمة السر" });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تغيير كلمة السر</DialogTitle>
          <DialogDescription className="text-xs">
            أدخل كلمة سرّك الحالية ثم الجديدة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">كلمة السر الحالية</Label>
            <Input
              id="cp-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">كلمة السر الجديدة</Label>
            <Input
              id="cp-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">تأكيد كلمة السر الجديدة</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !current || !next || !confirm}
            data-testid="button-save-password"
          >
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
