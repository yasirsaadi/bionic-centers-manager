// Admin-only one-week-after reminder banner.
//
// Shows on the dashboard from 2026-05-06 onwards (one week after the
// last big push) reminding the admin to review system performance,
// the Anthropic bill, and decide whether more development is needed.
// Dismissible — once closed, it stays closed for the session and is
// remembered in localStorage so it doesn't keep nagging.
//
// Why a banner not an email: this app has no SMTP. The admin opens
// the dashboard daily, so an in-app nudge is the cheapest reliable
// channel.

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

const REMINDER_DATE = "2026-05-06";
const STORAGE_KEY = "weekly-review-reminder-dismissed";

export function WeeklyReviewBanner({ isAdmin }: { isAdmin: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const today = new Date().toISOString().split("T")[0];
    if (today < REMINDER_DATE) return;
    // localStorage keyed by date so we can re-trigger if we ever want
    // a follow-up reminder later. Today only one date is used.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === REMINDER_DATE) return;
    setDismissed(false);
  }, [isAdmin]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, REMINDER_DATE);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="rounded-lg border-r-4 border-r-primary bg-primary/5 p-4 flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="font-semibold text-sm">تذكير: مرّ أسبوع منذ آخر تطوير كبير</h3>
        <p className="text-sm text-muted-foreground">
          راجع الآن:
        </p>
        <ul className="text-xs text-muted-foreground list-disc pr-5 space-y-0.5">
          <li>أداء التطبيق ومدى رضا الموظّفين عن السرعة.</li>
          <li>سجلّات الأخطاء على Render (هل ظهرت أيّ مشاكل؟).</li>
          <li>فاتورة Anthropic لهذا الأسبوع — هل مطابقة للتقدير؟</li>
          <li>الميزات الأقلّ استخداماً (مرشّحة للتبسيط أو الحذف).</li>
        </ul>
        <p className="text-xs text-muted-foreground pt-1">
          لو وجدت ما يستحقّ التطوير، تواصل لتنفيذه. لو الكلّ يعمل بسلاسة، النظام جاهز.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md hover:bg-primary/10 transition-colors"
        aria-label="إغلاق التذكير"
        data-testid="button-dismiss-weekly-reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
