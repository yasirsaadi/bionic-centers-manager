// **«أصبح المريض في «معايناتي»»** (§4.em — طلبُ المالك ٢٠٢٦-١٠-١٧): كلُّ حفظٍ أدخل مريضاً «معايناتي» — تسجيلٌ أو طلبُ جهاز أو صيانةٌ
// تحتاج معاينة أو «عاد للشراء» أو «طلب معاينة جديدة» — يفتح لمَن ضغطه نافذةً تقول ذلك وتطلب أن يبلّغ الطبيبَ أو الخبيرَ المختصّ،
// **ولا تُغلق إلّا بـ«حسناً»** (لا خارجَها ولا «Esc» ولا «X») كتحيّة اليوم (§4.dp). والخادمُ وحده يقرّر متى (ترويسةُ `X-Exam-Queued`
// يقرؤها غلافُ `fetch` في `main.tsx`)، فلا تحتاج كلُّ شاشةٍ كوداً خاصّاً. **والقائمةُ تبقى بعد تحديث الصفحة في التبويب نفسِه**
// (`sessionStorage`) حتى «حسناً»، ولصاحب الحساب الذي أدخلها وحده.
import { useSyncExternalStore } from "react";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useBranchSession } from "@/components/BranchGate";
import { decodeExamQueued, encodeExamQueued, mergeExamQueued, type ExamQueuedNotice } from "@shared/exam_queued_notice";

const KEY = "exam_queued_notices";
const SHOWN = 5;

type Saved = { userId: number | null; list: ExamQueuedNotice[] };

function currentUserId(): number | null {
  try {
    const s = JSON.parse(localStorage.getItem("branch_session") || "null");
    return Number.isInteger(s?.userId) ? s.userId : null;
  } catch {
    return null;
  }
}

function load(): Saved {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (v && Array.isArray(v.list)) {
      return { userId: Number.isInteger(v.userId) ? v.userId : null, list: decodeExamQueued(encodeExamQueued(v.list)) };
    }
  } catch { /* تخزينٌ محجوب أو تالف — تبدأ فارغة */ }
  return { userId: null, list: [] };
}

let state: Saved = load();
const listeners = new Set<() => void>();

function set(next: Saved) {
  state = next;
  try {
    if (next.list.length > 0) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch { /* النافذةُ تعمل من الذاكرة ولو حُجب التخزين */ }
  listeners.forEach((l) => l());
}

/** من غلاف `fetch`: مرضى دخلوا «معايناتي» بهذا الطلب — يُضمّون إلى ما لم يُضغط عليه «حسناً» بعد. */
export function pushExamQueued(list: ExamQueuedNotice[]): void {
  if (list.length === 0) return;
  const userId = currentUserId();
  const base = state.userId === userId ? state.list : [];
  set({ userId, list: mergeExamQueued(base, list) });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => state;

export function ExamQueuedNotice() {
  const saved = useSyncExternalStore(subscribe, snapshot);
  const userId = useBranchSession()?.userId ?? null;
  //  قائمةُ حسابٍ آخر على الجهاز نفسِه لا تُعرض لهذا.
  const list = saved.userId === userId ? saved.list : [];
  if (list.length === 0) return null;
  const block = (e: Event) => e.preventDefault();
  const many = new Set(list.map((n) => n.patientId)).size > 1;
  const rest = list.length - SHOWN;
  return (
    <Dialog open onOpenChange={() => { /* لا تُغلق إلّا بالزرّ */ }}>
      <DialogContent dir="rtl" hideClose onPointerDownOutside={block} onInteractOutside={block} onEscapeKeyDown={block}
        className="max-w-md text-center bg-gradient-to-b from-sky-50 to-white" data-testid="exam-queued-notice">
        <div className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-sky-100 text-sky-700">
          <Stethoscope className="w-7 h-7" />
        </div>
        <DialogTitle className="text-lg">{many ? "أصبح المرضى في «معايناتي»" : "أصبح المريض في «معايناتي»"}</DialogTitle>
        <ul className="space-y-1.5 text-start" data-testid="exam-queued-list">
          {list.slice(0, SHOWN).map((n) => (
            <li key={`${n.patientId}-${n.department}`} className="rounded-md border bg-white px-3 py-2 text-sm leading-6"
              data-testid={`exam-queued-row-${n.patientId}`}>
              <span className="font-medium text-slate-900 break-words">{n.patient}</span>
              {n.department && <span className="text-slate-600"> — {n.department}</span>}
            </li>
          ))}
          {rest > 0 && <li className="text-xs text-muted-foreground px-1">و{rest} غيرُها</li>}
        </ul>
        <DialogDescription asChild>
          <p className="text-base leading-8 text-slate-800 font-medium" data-testid="exam-queued-text">
            {many ? "بلّغ الطبيبَ أو الخبيرَ المختصّ بذلك ليعاينهم." : "بلّغ الطبيبَ أو الخبيرَ المختصّ بذلك ليعاينه."}
          </p>
        </DialogDescription>
        <Button className="mx-auto min-w-32" onClick={() => set({ userId: state.userId, list: [] })} data-testid="exam-queued-ok">
          حسناً
        </Button>
      </DialogContent>
    </Dialog>
  );
}
