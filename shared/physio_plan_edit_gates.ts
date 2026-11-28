// **البوّاباتُ الحتمية على نسخةٍ كاملة** (§4.hb ٤.٣ — `applyEditGates`): كلُّ نسخةٍ تمرّ بالبوّابات على حال يوم حفظها — الاعتمادُ (النسخةُ ١)،
// والتعديلُ المباشر، وتعديلُ Opus في جولاته، وحفظُ اقتراحه. دالّةٌ صرفة بلا قاعدة بيانات، بقواعد `applyPlanGates` نفسِها وأسبابها:
//   • `direct_edit` — **لا يتغيّر شيءٌ بصمت**: كلُّ حذفٍ أو قصٍّ مانعٌ بسببه وتصحيحٌ مقترح (`suggestedEdit`) يطبّقه المعتمِدُ إن شاء؛ فالنسخةُ المحفوظة
//     ما كتبه هو. والاستثناءُ الوحيد: سطرٌ لم يمسّه صار غيرَ متوفّرٍ في الفرع ⟵ تنبيهٌ ويبقى (كما يفعل «تعديل» اليوم).
//   • `opus_amend` — ما يقترحه Opus يُحذف أو يُقصّ بسطرٍ في السجلّ (`by: "gate"`)، كما في كتابته الأولى.
//   • `approval` / `accept` — الاقتراحُ يُعاد فحصُه عند الحفظ: أيُّ تغيير ⟵ `changed` (يحفظ الخادمُ الاقتراحَ المصحَّح ويقول «تغيّر منذ فتحتَه»).
// وما يمنع في كلّ حال: البوّابةُ مغلقة أو لا معاينةَ حيّة، والعددُ دون ما نُفّذ، والجرعةُ غيرُ صالحة، والخطّةُ الفارغة، والمراحلُ خارجَ بنية البروتوكول.
import { btlModelById, btlModelsFor, unitAr } from "./btl_devices";
import { BTL_TO_PROTOCOL_KEY, examConfirmIssues, GATE_REASONS, rescalePhaseRanges, type ExamConfirmInput, type GateExercise, type GateLogEntry, type GateProtocol } from "./physio_agent_gates";
import { arDigits, normalizeSourceUrl, protocolSessionCeiling } from "./physio_agent";
import { TOTAL_SESSIONS_MAX, doseError, normalizeDose } from "./physio_protocols";
import { btlLineText } from "./physio_agent_gates";
import { canonicalJson, clone, editFromSnapshot, type PlanEdit, type PlanSnapshot, type SnapForbidden } from "./physio_plan_versions";

export type EditGatePolicy = "approval" | "direct_edit" | "opus_amend" | "accept";

export interface EditGateContext {
  /** بوّابةُ الوكيل على أحدث معاينةٍ حيّة — `null` إن لم تكن للمريض معاينةٌ حيّة على الاستمارة الإلزامية. */
  agentGate: { allowed: boolean; code: string; reason: string } | null;
  forbidden: readonly SnapForbidden[];
  knownDeviceCodes: ReadonlySet<string>;
  branchAvailable: ReadonlySet<string>;
  /** بروتوكولُ المكتبة الآن (وضعُ المكتبة) — `null` خارجَها أو إن حُذف. */
  protocol: GateProtocol | null;
  exercises: ReadonlyMap<number, GateExercise>;
  /** روابطُ فُتحت في هذه الوظيفة (تعديلُ Opus وحفظُه) — وفارغةٌ للتعديل المباشر. */
  fetchedUrls: ReadonlySet<string>;
  sessionsDone: number;
  /** بطاقاتٌ مسوّدة مسموحٌ بها (بطاقاتُ «خارج المكتبة» المقترحة التي أُنشئت عند الاعتماد). */
  allowDraftIds?: ReadonlySet<number>;
  /** رقمُ النسخة الأساس — لنصّ «تغيّر حدٌّ منذ النسخة ن». */
  baseVersion?: number | null;
  /** §4.hd (المراجعة) — **معاينةُ الإصدار الثالث** (أحدثُ معاينةٍ حيّة): ما يلزم الخطّةَ منها يمنع التعديلَ كما يمنع الكتابةَ الأولى (`examConfirmIssues`). وغائبٌ للثانية. */
  examConfirm?: ExamConfirmInput | null;
}

export interface EditGateResult {
  snapshot: PlanSnapshot;
  log: (GateLogEntry & { by: "gate"; sinceBase?: boolean })[];
  blocking: GateLogEntry[];
  warnings: GateLogEntry[];
  /** للتعديل المباشر: الجسمُ بعد تطبيق التصحيحات المقترحة («طبّق تصحيحات البوّابات»). */
  suggestedEdit: PlanEdit | null;
  /** للاعتماد والحفظ: غيّرت البوّاباتُ شيئاً في الاقتراح. */
  changed: boolean;
}

export const EDIT_GATE_REASONS: Record<string, string> = {
  no_live_exam: "لا معاينةَ علاجٍ طبيعيّ حيّة على الاستمارة الإلزامية للمريض",
  gate_closed_edit: "قرّر العلامةَ الحمراء أوّلاً من «اعتمادات العلاج الطبيعي»",
  total_below_done: "عددُ الجلسات أقلُّ ممّا نُفّذ",
  phases_off_protocol: "المراحلُ لا تطابق مراحلَ البروتوكول (عددَها وأسماءَها)",
  exercise_off_protocol: "تمرينٌ ليس في مرحلة البروتوكول — اكتب سببَ إضافته",
  exercise_off_protocol_reasoned: "تمرينٌ خارجَ مرحلة البروتوكول بسببٍ مكتوب",
  exercise_not_approved: "بطاقةٌ غيرُ معتمَدة",
  measures_required_ool: "خطّةٌ خارج المكتبة بلا مقاييس",
  protocol_archived: "البروتوكولُ مؤرشف",
  bound_changed_since: "تغيّر حدٌّ منذ النسخة",
  unavailable_kept: "غيرُ متوفّرٍ في الفرع الآن — بقي كما في النسخة السابقة",
  source_new_unfetched: "مصدرٌ جديد لم يفتحه Bionic AI في هذه الوظيفة",
  param_source_invalid: "مصدرُ القيمة: «protocol» بقيمة البروتوكول نفسِها، أو «approver»، أو رابطٌ موروث بالقيمة نفسِها",
};
export const reasonOf = (code: string): string => EDIT_GATE_REASONS[code] ?? GATE_REASONS[code] ?? code;

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const numOf = (s: string | undefined): number | null => {
  if (typeof s !== "string") return null;
  const m = s.replace(/٫/g, ".").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** **البوّاباتُ على نسخة** — `base` النسخةُ النافذة (أو `null` عند الاعتماد). */
export function applyEditGates(candidate: PlanSnapshot, ctx: EditGateContext, policy: EditGatePolicy, base: PlanSnapshot | null): EditGateResult {
  const fixed = clone(candidate);
  type Entry = GateLogEntry & { by: "gate"; fix?: boolean; sinceBase?: boolean };
  const log: Entry[] = [];
  const library = candidate.mode === "library";
  const pr = library ? ctx.protocol : null;
  const always = (code: string, target: string | null, reasonAr = reasonOf(code)) => log.push({ code, kind: "blocking", target, reasonAr, by: "gate" });
  const warn = (code: string, target: string | null, reasonAr = reasonOf(code)) => log.push({ code, kind: "warning", target, reasonAr, by: "gate" });
  const info = (code: string, target: string | null, reasonAr = reasonOf(code)) => log.push({ code, kind: "info", target, reasonAr, by: "gate" });
  //  تصحيحٌ: يُطبَّق على `fixed` دائماً، ويصير مانعاً في التعديل المباشر.
  const fix = (code: string, kind: "removed" | "clamped", target: string, reasonAr: string, before?: unknown, after?: unknown, untouched = false) =>
    log.push({ code, kind, target, reasonAr, before, after, by: "gate", fix: true, ...(untouched ? { sinceBase: true } : {}) });

  // ── EG0 — البوّابة ──
  if (!ctx.agentGate) always("no_live_exam", null);
  else if (!ctx.agentGate.allowed) always("gate_closed", null, `${reasonOf("gate_closed_edit")}: ${ctx.agentGate.reason}`);
  // ── EG0b — §4.hd (المراجعة): معاينةُ التشخيص الحرّ — جهازٌ يُضاف (الإبرُ ⟵ كبتُ المناعة) أو بروتوكولٌ شديد لا يُحفظ قبل أن تُسجَّل مدخلاتُه ──
  if (ctx.examConfirm) {
    for (const i of examConfirmIssues(ctx.examConfirm, { deviceCodes: candidate.devices.map((d) => d.deviceCode), library, protocolCode: library ? candidate.protocolCode ?? pr?.code ?? null : null })) {
      always(i.code, i.target, i.reasonAr);
    }
  }
  // ── EG15 — البروتوكول ──
  if (library && candidate.protocolId && !pr) always("protocol_missing", `protocol:${candidate.protocolId}`);
  else if (library && pr?.isArchived) (policy === "direct_edit" ? warn : always)("protocol_archived", `protocol:${pr.id}`);

  const baseDev = (code: string) => base?.devices.find((d) => d.deviceCode === code) ?? null;
  const untouchedDev = (code: string) => { const b = baseDev(code); const c = candidate.devices.find((d) => d.deviceCode === code); return Boolean(b && c && canonicalJson(b) === canonicalJson(c)); };
  const untouchedField = (k: "totalSessions" | "sessionsPerWeek" | "sessionMinutes" | "startingPhase") => Boolean(base && base[k] === candidate[k]);

  // ── EG10 — الجرعة ──
  const ceiling = pr ? protocolSessionCeiling(pr) : TOTAL_SESSIONS_MAX;
  if (fixed.totalSessions === null) always("dose_missing", "dose.total_sessions");
  else if (fixed.totalSessions < 1 || fixed.totalSessions > ceiling) {
    const t = clampInt(fixed.totalSessions, 1, ceiling);
    fix("sessions_clamped", "clamped", "dose.total_sessions", `${GATE_REASONS.sessions_clamped} (١–${arDigits(ceiling)})`, fixed.totalSessions, t, untouchedField("totalSessions"));
    fixed.totalSessions = t;
  }
  if (fixed.totalSessions !== null && fixed.totalSessions < ctx.sessionsDone) always("total_below_done", "dose.total_sessions", `${reasonOf("total_below_done")} (${arDigits(ctx.sessionsDone)})`);
  const spwMax = pr?.sessionsPerWeek ? Math.min(7, pr.sessionsPerWeek) : 7;
  if (fixed.sessionsPerWeek !== null && (fixed.sessionsPerWeek < 1 || fixed.sessionsPerWeek > spwMax)) {
    const v = clampInt(fixed.sessionsPerWeek, 1, spwMax);
    fix("spw_clamped", "clamped", "dose.sessions_per_week", `${GATE_REASONS.spw_clamped} (١–${arDigits(spwMax)})`, fixed.sessionsPerWeek, v, untouchedField("sessionsPerWeek"));
    fixed.sessionsPerWeek = v;
  }
  const minMax = pr?.sessionMinutes ? Math.min(90, pr.sessionMinutes) : 90;
  if (fixed.sessionMinutes !== null && (fixed.sessionMinutes < 10 || fixed.sessionMinutes > minMax)) {
    const v = clampInt(fixed.sessionMinutes, Math.min(10, minMax), minMax);
    fix("session_minutes_clamped", "clamped", "dose.session_minutes", `${GATE_REASONS.session_minutes_clamped} (١٠–${arDigits(minMax)})`, fixed.sessionMinutes, v, untouchedField("sessionMinutes"));
    fixed.sessionMinutes = v;
  }
  const de = doseError(normalizeDose({ sessionsPerWeek: fixed.sessionsPerWeek, durationWeeks: null, totalSessions: fixed.totalSessions }));
  if (de) always("dose_invalid", "dose", de);

  // ── EG16 — بنيةُ المراحل في المكتبة ──
  if (library && pr) {
    const want = pr.phases.slice().sort((a, b) => a.position - b.position).map((p, i) => [i + 1, p.nameAr]);
    const got = fixed.phases.map((p) => [p.position, p.nameAr]);
    if (canonicalJson(want) !== canonicalJson(got)) always("phases_off_protocol", "phases");
  }
  // ── EG11 — نطاقاتُ المراحل متّصلة ١..العدد ──
  if (fixed.totalSessions !== null && fixed.phases.length) {
    const ph = fixed.phases;
    let ok = ph[0].sessionFrom === 1 && ph[ph.length - 1].sessionTo === fixed.totalSessions;
    for (let i = 0; ok && i < ph.length; i++) {
      const p = ph[i];
      if (p.sessionFrom === null || p.sessionTo === null || p.sessionTo < p.sessionFrom) ok = false;
      else if (i > 0 && p.sessionFrom !== (ph[i - 1].sessionTo ?? 0) + 1) ok = false;
    }
    if (!ok) {
      const before = ph.map((p) => [p.sessionFrom, p.sessionTo]);
      fixed.phases = rescalePhaseRanges(ph, base?.totalSessions ?? null, fixed.totalSessions);
      fix("phase_ranges_fixed", "clamped", "phases", GATE_REASONS.phase_ranges_fixed, before, fixed.phases.map((p) => [p.sessionFrom, p.sessionTo]),
        Boolean(base && canonicalJson(base.phases.map((p) => [p.sessionFrom, p.sessionTo])) === canonicalJson(before)));
    }
  }
  // ── EG11b — مرحلةُ البدء ──
  const nPh = Math.max(1, fixed.phases.length);
  if (fixed.startingPhase < 1 || fixed.startingPhase > nPh) {
    const v = clampInt(fixed.startingPhase, 1, nPh);
    fix("starting_phase_clamped", "clamped", "starting_phase", GATE_REASONS.starting_phase_clamped, fixed.startingPhase, v, untouchedField("startingPhase"));
    fixed.startingPhase = v;
  }
  // ── EG12 · EG12c · EG16 — التمارين ──
  for (const ph of fixed.phases) {
    const protoPh = pr?.phases.slice().sort((a, b) => a.position - b.position)[ph.position - 1] ?? null;
    const basePh = base?.phases.find((p) => p.position === ph.position) ?? null;
    ph.exercises = ph.exercises.filter((x) => {
      const target = `exercise:${ph.position}:${x.exerciseId}`;
      const inBase = Boolean(basePh?.exercises.some((y) => y.exerciseId === x.exerciseId));
      const inProto = Boolean(protoPh?.exercises.some((y) => y.exerciseId === x.exerciseId));
      const ex = ctx.exercises.get(x.exerciseId);
      if (!ex) { fix("exercise_missing", "removed", target, GATE_REASONS.exercise_missing); return false; }
      if (ex.archived && !inBase) { fix("exercise_archived", "removed", target, GATE_REASONS.exercise_archived); return false; }
      if (ex.status !== "approved" && !inBase && !inProto && !ctx.allowDraftIds?.has(x.exerciseId)) { fix("exercise_not_approved", "removed", target, reasonOf("exercise_not_approved")); return false; }
      if (library && pr && !inProto && !inBase) {
        //  تبديلُ Opus في كتابته الأولى فحصته بوّاباتُها (G12e) — يُقبل عند الاعتماد بسببه كما كتبه.
        const reasoned = fixed.exerciseChanges.some((c) => c.phase === ph.position && c.toId === x.exerciseId
          && (c.reasonAr.trim().length >= 3 || (c.by === "opus" && policy === "approval")));
        if (reasoned) warn("exercise_off_protocol_reasoned", target);
        else { fix("exercise_off_protocol", "removed", target, reasonOf("exercise_off_protocol")); return false; }
      }
      return true;
    });
    for (const x of ph.exercises) {
      const before = { sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds };
      if (x.sets !== null) x.sets = clampInt(x.sets, 1, 10);
      if (x.reps !== null) x.reps = clampInt(x.reps, 1, 100);
      if (x.holdSeconds !== null) x.holdSeconds = x.holdSeconds <= 0 ? null : clampInt(x.holdSeconds, 1, 600);
      if (x.restSeconds !== null) x.restSeconds = clampInt(x.restSeconds, 0, 600);
      const after = { sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds };
      if (canonicalJson(before) !== canonicalJson(after)) fix("exercise_dose_clamped", "clamped", `exercise:${ph.position}:${x.exerciseId}`, GATE_REASONS.exercise_dose_clamped, before, after);
    }
  }

  // ── EG1–EG9b — الأجهزة ──
  const forbidden = new Map<string, SnapForbidden[]>();
  for (const f of ctx.forbidden) forbidden.set(f.deviceCode, [...(forbidden.get(f.deviceCode) ?? []), f]);
  fixed.forbidden = ctx.forbidden.slice();
  const seen = new Set<string>();
  const kept: typeof fixed.devices = [];
  const dropDev = (code: string, deviceCode: string, reasonAr: string) => {
    fix(code, "removed", `device:${deviceCode}`, reasonAr, undefined, undefined, untouchedDev(deviceCode));
    fixed.removed.push({ deviceCode, reasonAr, by: "gate", code });
  };
  for (const d of fixed.devices) {
    const target = `device:${d.deviceCode}`;
    const untouched = untouchedDev(d.deviceCode);
    if (!ctx.knownDeviceCodes.has(d.deviceCode)) { dropDev("unknown_device", d.deviceCode, GATE_REASONS.unknown_device); continue; }
    if (seen.has(d.deviceCode)) { dropDev("duplicate_device", d.deviceCode, GATE_REASONS.duplicate_device); continue; }
    seen.add(d.deviceCode);
    const fb = forbidden.get(d.deviceCode);
    if (fb) {
      const byApprover = fb.some((f) => f.source === "approver") && !fb.some((f) => f.source === "exam");
      dropDev("forbidden", d.deviceCode, `${byApprover ? "ممنوعٌ بقرار المعتمِد" : "ممنوعٌ بالمعاينة"}: ${fb.map((f) => f.reasonAr).join("؛ ")}`);
      continue;
    }
    if (!ctx.branchAvailable.has(d.deviceCode)) {
      //  EG3 — سطرٌ لم يتغيّر عن النسخة النافذة يبقى بتنبيه (كما يفعل «تعديل» اليوم)؛ والجديدُ أو المعدَّل يُحذف.
      if (untouched) warn("unavailable_kept", target);
      else { dropDev("unavailable_in_branch", d.deviceCode, GATE_REASONS.unavailable_in_branch); continue; }
    }
    const line = library && pr ? pr.devices.find((l) => l.deviceCode === d.deviceCode) ?? null : null;
    if (library && pr) {
      if (!line) { dropDev("not_in_protocol", d.deviceCode, GATE_REASONS.not_in_protocol); continue; }
      if (line.centreUse === "not_used") { dropDev("not_used", d.deviceCode, GATE_REASONS.not_used); continue; }
      if (line.centreUse === "adjunct" && d.use === "core") { fix("use_clamped", "clamped", target, GATE_REASONS.use_clamped, "core", "adjunct", untouched); d.use = "adjunct"; }
      d.evidence = line.evidence;
    }
    //  EG5 — الدقائق.
    const minCap = Math.min(line?.minutes ?? 60, fixed.sessionMinutes ?? 60);
    if (d.minutes !== null && (d.minutes < 1 || d.minutes > minCap)) {
      const v = clampInt(d.minutes, 1, minCap);
      fix("minutes_clamped", "clamped", target, `${GATE_REASONS.minutes_clamped} (١–${arDigits(minCap)})`, d.minutes, v, untouched);
      d.minutes = v;
    }
    //  EG6 — الموعدُ الدوريّ.
    if (line) {
      if (d.everyDays !== line.everyDays || d.times !== line.times) {
        fix("schedule_from_protocol", "clamped", target, GATE_REASONS.schedule_from_protocol, { everyDays: d.everyDays, times: d.times }, { everyDays: line.everyDays, times: line.times }, untouched);
        d.everyDays = line.everyDays; d.times = line.times;
      }
    } else {
      const okE = d.everyDays === null || (d.everyDays >= 1 && d.everyDays <= 60);
      const okT = d.times === null || (d.times >= 1 && d.times <= 30 && d.everyDays !== null);
      if (!okE || !okT) { fix("schedule_invalid", "clamped", target, GATE_REASONS.schedule_invalid, { everyDays: d.everyDays, times: d.times }, null, untouched); d.everyDays = null; d.times = null; }
    }
    //  EG7–EG9b — موديلُ BTL وبرنامجُه وقيمُه.
    const models = btlModelsFor(d.deviceCode);
    if (!models.length) {
      if (d.btl) { fix("btl_model_forced_null", "clamped", target, GATE_REASONS.btl_model_forced_null, d.btl.modelId, null, untouched); d.btl = null; }
      kept.push(d); continue;
    }
    let model = btlModelById(d.btl?.modelId);
    if (model && model.deviceCode !== d.deviceCode) model = null;
    if (!model) {
      if (models.length === 1) {
        model = models[0];
        fix("btl_model_filled", "clamped", target, GATE_REASONS.btl_model_filled, d.btl?.modelId ?? null, model.id, untouched);
        d.btl = { modelId: model.id, modelNameEn: model.nameEn, modelNameAr: model.nameAr, program: d.btl?.program ?? null, fallback: d.btl?.fallback ?? [], flags: [] };
      } else {
        fixed.removed.push({ deviceCode: d.deviceCode, reasonAr: GATE_REASONS.btl_model_missing, by: "gate", code: "btl_model_missing" });
        fix("btl_model_missing", "removed", target, `${GATE_REASONS.btl_model_required}: ${models.map((m) => m.nameAr).join(" أو ")}`, d.btl?.modelId ?? null, null, untouched);
        continue;
      }
    }
    const btl = d.btl!;
    btl.modelNameEn = model.nameEn; btl.modelNameAr = model.nameAr;
    if (btl.program && !model.programs.includes(btl.program)) { fix("program_stripped", "removed", target, GATE_REASONS.program_stripped, btl.program, null, untouched); btl.program = null; }
    const baseLine = baseDev(d.deviceCode);
    const flags: string[] = [];
    btl.fallback = btl.fallback.filter((f) => {
      const p = model!.params.find((x) => x.key === f.key);
      const t = `${target}:${f.key}`;
      const bv = baseLine?.btl?.modelId === model!.id ? baseLine.btl.fallback.find((x) => x.key === f.key) ?? null : null;
      const sameAsBase = Boolean(bv && bv.value === f.value);
      const u = Boolean(bv && bv.value === f.value && bv.source === f.source);
      if (!p) { fix("param_unknown", "removed", t, GATE_REASONS.param_unknown, f, null, u); return false; }
      f.unit = p.unit; f.labelEn = p.labelEn; f.labelAr = p.labelAr;
      if (f.value < p.min || f.value > p.max) { fix("param_out_of_range", "removed", t, `${GATE_REASONS.param_out_of_range} (${arDigits(p.min)}–${arDigits(p.max)} ${unitAr(p.unit)})`, f, null, u); return false; }
      //  EG9b — المصدر.
      const pk = BTL_TO_PROTOCOL_KEY[f.key];
      const written = line && pk ? numOf(line.params[pk]) : null;
      if (policy === "direct_edit") {
        //  القيمةُ كما في النسخة النافذة بمصدرها تبقى؛ والجديدةُ أو المعدَّلة: «protocol» بقيمته، أو «approver».
        if (u) return true;
        if (f.source === "protocol") {
          if (written === null || written !== f.value) { fix("param_unsourced", "removed", t, `${reasonOf("param_source_invalid")}${written !== null ? ` (${arDigits(written)})` : ""}`, f, null, u); return false; }
        } else if (f.source !== "approver" && !u) { fix("param_unsourced", "removed", t, reasonOf("param_source_invalid"), f, null, u); return false; }
      } else {
        if (sameAsBase) { f.source = bv!.source; return true; }
        if (f.source === "protocol") {
          if (written === null) { fix("param_unsourced", "removed", t, `${GATE_REASONS.param_unsourced} — البروتوكولُ لم يكتبها`, f, null, u); return false; }
          if (written !== f.value) {
            if (policy === "approval") { warn("param_differs_from_protocol", t, `${GATE_REASONS.param_differs_from_protocol} (${arDigits(written)})`); flags.push(`param_differs_from_protocol:${f.key}`); }
            else { fix("param_unsourced", "removed", t, `${GATE_REASONS.param_differs_from_protocol} (${arDigits(written)})`, f, null, u); return false; }
          }
        } else if (!f.source || !ctx.fetchedUrls.has(normalizeSourceUrl(f.source))) { fix("param_unsourced", "removed", t, GATE_REASONS.param_unsourced, f, null, u); return false; }
      }
      return true;
    });
    for (const r of model.crossRules) {
      const w = btl.fallback.find((k) => k.key === r.whenKey);
      const li = btl.fallback.findIndex((k) => k.key === r.limitKey);
      if (w && li >= 0 && w.value > r.whenAbove && btl.fallback[li].value > r.max) {
        fix("param_cross_rule", "removed", `${target}:${r.limitKey}`, `${GATE_REASONS.param_cross_rule}: ${r.textAr}`, btl.fallback[li], null, untouched);
        btl.fallback.splice(li, 1);
      }
    }
    btl.flags = flags;
    //  النصُّ المعروض يتبع ما بقي (إن غيّرته البوّابةُ).
    if (baseLine && canonicalJson(baseLine.btl) === canonicalJson(btl)) { d.parameters = baseLine.parameters; d.parametersEn = baseLine.parametersEn; }
    else {
      d.parameters = [line?.parameters, btlLineText(btl, "ar")].filter(Boolean).join("\n") || null;
      d.parametersEn = [line?.parametersEn, btlLineText(btl, "en")].filter(Boolean).join("\n") || null;
    }
    kept.push(d);
  }
  fixed.devices = kept;
  //  نصُّ المعاملات يتغيّر مع قيمٍ تحذفها البوّابة — والمرشَّحُ الأصليّ في التعديل المباشر يبقى كما كُتب (لا تصحيحَ بصمت).

  // ── EG13c — المقاييس ──
  //  خارجَ المكتبة لا بروتوكولَ تُقرأ منه المقاييس: ما كان للخطّة مقاييسُ لا تُمحى بتعديل (والخطّةُ بلاها من أوّلها تبقى كما اعتُمدت).
  if (!library && base?.measuresOwn && base.measures.length && (!fixed.measuresOwn || !fixed.measures.length)) always("measures_required_ool", "measures");
  const seenM = new Set<string>();
  fixed.measures = fixed.measures.filter((m) => {
    if (!m.code || !m.nameAr || !m.nameEn || !Number.isFinite(m.min) || !Number.isFinite(m.max) || m.min >= m.max || seenM.has(m.code)) {
      fix("measure_dropped", "removed", `measure:${m.code}`, GATE_REASONS.measure_dropped, m, null); return false;
    }
    seenM.add(m.code); return true;
  });
  // ── EG13s — المصادر ──
  if (policy === "opus_amend" || policy === "accept") {
    fixed.sources = fixed.sources.filter((s) => {
      const inherited = Boolean(base?.sources.some((b) => normalizeSourceUrl(b.url) === normalizeSourceUrl(s.url)));
      if (inherited || ctx.fetchedUrls.has(normalizeSourceUrl(s.url))) return true;
      fix("source_new_unfetched", "removed", `source:${normalizeSourceUrl(s.url)}`, reasonOf("source_new_unfetched"), s.url, null);
      return false;
    });
  }
  if (!library && !fixed.sources.length) always("sources_missing", "sources");
  // ── EG14 — خطّةٌ فارغة ──
  const exerciseCount = fixed.phases.reduce((n, p) => n + p.exercises.length, 0);
  if (!fixed.devices.length && !exerciseCount) always("empty_plan", null);
  if (library && pr && !fixed.devices.some((d) => d.use === "core")) info("no_core_device", "devices");

  // ── الخاتمة بحسب السياسة ──
  const since = ctx.baseVersion ? ` ${arDigits(ctx.baseVersion)}` : "";
  const out: (GateLogEntry & { by: "gate"; sinceBase?: boolean })[] = log.map(({ fix: isFix, ...e }) => {
    if (!isFix) return e;
    if (policy === "direct_edit") {
      return { ...e, kind: "blocking" as const, reasonAr: e.sinceBase ? `${reasonOf("bound_changed_since")}${since}: ${e.reasonAr}` : e.reasonAr };
    }
    return e;
  });
  const fixes = log.filter((e) => e.fix);
  const blocking = out.filter((e) => e.kind === "blocking");
  const warnings = out.filter((e) => e.kind === "warning");
  if (policy === "direct_edit") {
    return { snapshot: candidate, log: out, blocking, warnings, suggestedEdit: fixes.length ? editFromSnapshot(fixed) : null, changed: false };
  }
  return { snapshot: fixed, log: out, blocking, warnings, suggestedEdit: null, changed: fixes.length > 0 };
}
