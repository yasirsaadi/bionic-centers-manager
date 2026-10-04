// **تنبيهاتُ الموظّفين عبر تلغرام** (§4.by) — للمسؤول وحده: مَن يستلم وعن ماذا (قرارُ المالك).
// بطاقةٌ لكلّ موظّف: حالةُ الربط، ورمزُ الربط (QR) يمسحه الموظّفُ بهاتفه، وتجربةٌ وفكُّ ربط، ومربّعاتُ الأنواع
// مجموعةً — كلُّ ضغطةٍ تُحفَظ فوراً وتُكتب في سجلّ التدقيق.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StaffEventDef } from "@shared/staff_notifications";

interface StaffRow { id: number; displayName: string; role: string; linkedAt: string | null; events: string[] }
interface Payload { botReady: boolean; events: StaffEventDef[]; users: StaffRow[] }

const KEY = ["/api/admin/staff-notifications"];
const ROLE_LABELS: Record<string, string> = {
  admin: "المسؤول", branch_manager: "مدير فرع", reception: "استعلامات", accountant: "محاسب",
  doctor: "طبيب", prosthetics_expert: "خبير أطراف", therapist: "معالج", surveyor: "استبيانات",
};

async function errText(e: unknown): Promise<string> {
  const m = e instanceof Error ? e.message : String(e);
  const json = m.replace(/^\d+:\s*/, "");
  try { return JSON.parse(json).message ?? json; } catch { return json; }
}

export default function StaffNotificationsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const { data, isLoading, isError } = useQuery<Payload>({
    queryKey: KEY,
    queryFn: async () => (await apiRequest("GET", "/api/admin/staff-notifications")).json(),
  });

  const groups = useMemo(() => {
    const m = new Map<string, StaffEventDef[]>();
    for (const e of data?.events ?? []) m.set(e.group, [...(m.get(e.group) ?? []), e]);
    return Array.from(m.entries());
  }, [data?.events]);

  const save = useMutation({
    mutationFn: async (p: { userId: number; events: string[] }) =>
      (await apiRequest("PUT", `/api/admin/staff-notifications/${p.userId}`, { events: p.events })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: async (e) => toast({ title: "تعذّر الحفظ", description: await errText(e), variant: "destructive" }),
  });
  const makeLink = useMutation({
    mutationFn: async (u: StaffRow) => ({ u, out: await (await apiRequest("POST", `/api/admin/staff-notifications/${u.id}/link`)).json() }),
    onSuccess: ({ u, out }) => out?.deepLink && setLink({ name: u.displayName, url: out.deepLink }),
    onError: async (e) => toast({ title: "تعذّر إصدار رمز الربط", description: await errText(e), variant: "destructive" }),
  });
  const test = useMutation({
    mutationFn: async (u: StaffRow) => (await apiRequest("POST", `/api/admin/staff-notifications/${u.id}/test`)).json(),
    onSuccess: () => toast({ title: "أُرسلت رسالة تجريبية" }),
    onError: async (e) => toast({ title: "تعذّر الإرسال", description: await errText(e), variant: "destructive" }),
  });
  const unlink = useMutation({
    mutationFn: async (u: StaffRow) => (await apiRequest("DELETE", `/api/admin/staff-notifications/${u.id}/link`)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: "فُكّ الربط" }); },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">يُحمَّل…</p>;
  if (isError || !data) return <p className="text-sm text-destructive">تعذّر تحميل الإعدادات</p>;

  const users = data.users.filter((u) => !filter.trim() || u.displayName.includes(filter.trim()));
  const toggle = (u: StaffRow, key: string, on: boolean) =>
    save.mutate({ userId: u.id, events: on ? [...u.events, key] : u.events.filter((k) => k !== key) });

  return (
    <div className="space-y-4" dir="rtl" data-testid="staff-notifications-tab">
      <Card>
        <CardHeader><CardTitle>تنبيهات الموظفين عبر تلغرام</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!data.botReady && (
            <p className="text-destructive" data-testid="staff-bot-not-ready">
              بوت الموظفين غير مُعدّ على الخادم بعد — تُحفظ الاختيارات، ولا يُرسل شيء حتى يُضبط.
            </p>
          )}
          <p className="text-muted-foreground">
            لكل موظف: اضغط «رمز الربط» واجعله يمسحه بهاتفه ثم يضغط «ابدأ» في تلغرام، ثم اختر ما يستلمه.
            تنبيهات الفرع تصل لمن يعمل في فرع الحدث فقط، وتنبيهات الخبير لصاحب الأمر وحده.
          </p>
          <Input placeholder="بحث باسم الموظف" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardContent>
      </Card>

      {users.map((u) => (
        <Card key={u.id} data-testid={`staff-row-${u.id}`}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {u.displayName} <span className="text-xs font-normal text-muted-foreground">— {ROLE_LABELS[u.role] ?? u.role}</span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {u.linkedAt
                  ? <Badge className="bg-emerald-600">مربوط</Badge>
                  : <Badge variant="outline">غير مربوط</Badge>}
                <Button size="sm" variant="outline" disabled={!data.botReady || makeLink.isPending} onClick={() => makeLink.mutate(u)}>
                  رمز الربط
                </Button>
                {u.linkedAt && (
                  <>
                    <Button size="sm" variant="outline" disabled={test.isPending} onClick={() => test.mutate(u)}>تجربة</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`فكّ ربط ${u.displayName}؟ لن تصله التنبيهات حتى يُربط من جديد.`)) unlink.mutate(u); }}>
                      فكّ الربط
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {groups.map(([group, evs]) => (
              <div key={group} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">{group}</p>
                {evs.map((e) => (
                  <label key={e.key} className="flex items-start gap-2 text-sm min-h-[32px]">
                    <Checkbox
                      checked={u.events.includes(e.key)}
                      disabled={save.isPending}
                      onCheckedChange={(v) => toggle(u, e.key, v === true)}
                      data-testid={`staff-pref-${u.id}-${e.key}`}
                    />
                    <span>{e.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={link !== null} onOpenChange={(o) => { if (!o) setLink(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>رمز ربط {link?.name}</DialogTitle>
            <DialogDescription>يمسحه الموظف بكاميرا هاتفه ثم يضغط «ابدأ». صالح ٢٤ ساعة ولمرة واحدة.</DialogDescription>
          </DialogHeader>
          {link && (
            <div className="flex flex-col items-center gap-3">
              <QRCodeSVG value={link.url} size={208} />
              <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(link.url); toast({ title: "نُسخ الرابط" }); }}>
                نسخ الرابط
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
