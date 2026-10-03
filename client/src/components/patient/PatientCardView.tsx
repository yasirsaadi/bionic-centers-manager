import logoImage from "@/assets/logo.png";
import { CENTER_CLOSING, CENTER_CONTACTS, type PatientCard } from "@shared/patient_card";
import { Phone, MapPin, Building2, CalendarDays, Wallet, Wrench, HeartPulse, Activity, Check } from "lucide-react";

//  بطاقةُ المريض (§4.bv) — العرضُ وحدَه، يُستعمَل في صفحة تلغرام وفي «معاينة ما يراه المريض» عند الموظّف.
//  زجاجٌ فوق تدرّجٍ بلون المركز: `backdrop-blur` وحدودٌ بيضاء شفّافة. والقراءةُ من اليمين، والهاتفُ أوّلاً.

const money = (n: number) => `${Math.abs(n).toLocaleString("en-US")} د.ع`;
const AR_MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const arDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return y && m && d ? `${d} ${AR_MONTHS[m - 1]} ${y}` : ymd;
};
const DEPT_ICON = { prosthetic: Wrench, medical_support: HeartPulse, physiotherapy: Activity } as const;
const glass = "rounded-3xl border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export function PatientCardView({ card }: { card: PatientCard }) {
  return (
    <div dir="rtl" className="space-y-4 text-white" data-testid="patient-card-view">
      {/* ── الرأس ── */}
      <section className={`${glass} p-5 relative overflow-hidden`}>
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
        <div className="flex items-center gap-3 relative">
          <div className="w-14 h-14 rounded-2xl bg-white/90 grid place-items-center shadow-lg shrink-0">
            <img src={logoImage} alt="شعار المركز" className="w-11 h-11 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">مجموعة مراكز د. ياسر الساعدي</div>
            <h1 className="text-xl font-bold leading-tight break-words text-white">{card.name}</h1>
            <div className="text-xs text-white/80 font-mono mt-0.5" dir="ltr">{card.code}</div>
          </div>
        </div>
        {/*  الفرعُ أو الفروعُ المُتاحُ فيها الملفّ — أعلى البطاقة (قرارُ المالك). */}
        {card.branches.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap relative" data-testid="card-branches">
            <Building2 className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white/75">{card.branches.length > 1 ? "فروعك:" : "فرعك:"}</span>
            {card.branches.map((b) => (
              <span key={b} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{b}</span>))}
          </div>
        )}
        <div className="mt-4 grid gap-2 text-sm relative">
          {card.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-white/70" /><span dir="ltr">{card.phone}</span></div>}
          {card.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-white/70" /><span>{card.address}</span></div>}
        </div>
      </section>

      {/* ── المتبقّي ── */}
      <section className={`${glass} p-5 flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-white/85"><Wallet className="w-5 h-5" /> المتبقّي عليك</div>
        <div className="text-2xl font-extrabold tracking-tight" data-testid="card-remaining">
          {card.remaining > 0 ? money(card.remaining) : "لا شيء"}
        </div>
      </section>

      {/* ── الأقسام ── */}
      {card.departments.length > 0 && (
        <section className={`${glass} p-5 space-y-3`}>
          <h2 className="font-bold text-white">خدماتك</h2>
          {card.departments.map((d) => {
            const Icon = DEPT_ICON[d.key];
            return (
              <div key={d.key} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3">
                <Icon className="w-5 h-5 mt-0.5 text-cyan-200" />
                <div><div className="font-semibold text-white">{d.label}</div>
                  {d.detail && <div className="text-sm text-white/80">{d.detail}</div>}</div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── مراحل التصنيع على خطٍّ أفقيّ ── */}
      {card.orders.map((o) => (
        <section key={o.id} className={`${glass} p-5`} data-testid={`card-order-${o.id}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-white">{o.kindLabel} — {o.serviceLabel}</h2>
            {o.delivered && <span className="rounded-full bg-emerald-400/25 text-emerald-100 text-xs px-2.5 py-0.5">مكتمل</span>}
          </div>
          <div className="mt-1 text-xs text-white/75" data-testid={`card-order-opened-${o.id}`}>تاريخ فتح الأمر: {arDate(o.openedAt)}</div>
          {/*  المراحلُ كلُّها في عرض الشاشة بلا تمرير — أعمدةٌ متساوية وخطٌّ يصل كلَّ دائرةٍ بسابقتها. */}
          <ol className="mt-4 grid" style={{ gridTemplateColumns: `repeat(${o.stages.length}, minmax(0, 1fr))` }}>
            {o.stages.map((s, i) => (
              <li key={s.key} className="relative flex flex-col items-center text-center px-0.5">
                {i > 0 && (
                  <span className={`absolute top-[14px] left-1/2 w-full h-0.5 ${s.state === "todo" ? "bg-white/25" : "bg-cyan-300"}`} aria-hidden />
                )}
                <span className={`relative z-10 w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold border ${
                  s.state === "done" ? "bg-cyan-300 text-slate-900 border-cyan-200"
                  : s.state === "current" ? "bg-white text-slate-900 border-white ring-4 ring-cyan-300/50 animate-pulse"
                  : "bg-slate-800/60 text-white/60 border-white/30"}`}>
                  {s.state === "done" ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={`mt-1.5 text-[10px] leading-tight ${s.state === "todo" ? "text-white/55" : "text-white"} ${s.state === "current" ? "font-bold" : ""}`}>{s.label}</span>
              </li>
            ))}
          </ol>
          {o.expectedDeliveryDate && (
            <div className="mt-3 text-sm text-white/85 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> موعد التسليم المتوقّع: <b>{arDate(o.expectedDeliveryDate)}</b>
            </div>
          )}
        </section>
      ))}

      {/* ── سجلّ الزيارات بالتاريخ ── */}
      <section className={`${glass} p-5`}>
        <h2 className="font-bold mb-3 text-white">سجلّ زياراتك</h2>
        {card.days.length === 0 ? <p className="text-sm text-white/70">لا زيارات مسجّلة بعد.</p> : (
          <ol className="relative border-r border-white/25 pr-4 space-y-4">
            {card.days.map((d) => (
              <li key={d.date} className="relative">
                <span className="absolute -right-[22px] top-1 w-3 h-3 rounded-full bg-cyan-300 ring-4 ring-cyan-300/20" aria-hidden />
                <div className="text-xs text-white/70 mb-1.5">{arDate(d.date)}</div>
                <div className="space-y-1.5">
                  {d.entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                      <div className="min-w-0"><span className="font-medium">{e.label}</span>
                        {e.branch && <span className="text-white/60 text-xs"> · {e.branch}</span>}</div>
                      {e.amount !== null && (
                        <span className={`font-bold shrink-0 ${e.amount < 0 ? "text-rose-200" : "text-emerald-200"}`}>{money(e.amount)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── الخاتمة: الدعاءُ ثمّ فروعُ المراكز وأرقامُها ── */}
      <section className={`${glass} p-5 text-center`} data-testid="card-closing">
        <p className="font-bold text-white">{CENTER_CLOSING}</p>
        <div className="mt-4 grid gap-2 text-sm text-start">
          {CENTER_CONTACTS.map((c) => (
            <div key={c.branch} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2">
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-white/70" />{c.branch}</span>
              {c.phone && <a href={`tel:${c.phone}`} className="font-semibold text-cyan-100" dir="ltr">{c.phone}</a>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** الخلفيةُ المتدرّجة التي يجلس عليها الزجاج — في الصفحة وفي معاينة الموظّف. */
export function PatientCardBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gradient-to-br from-teal-700 via-cyan-800 to-slate-900 relative overflow-hidden">
      <div className="absolute top-10 right-[-60px] w-64 h-64 rounded-full bg-teal-300/25 blur-3xl" aria-hidden />
      <div className="absolute bottom-0 left-[-40px] w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden />
      <div className="relative max-w-md mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
