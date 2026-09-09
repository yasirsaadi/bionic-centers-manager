// اختبارُ تركيب القدرات — **منطقٌ خالص، بلا قاعدة بيانات ولا شبكة**.
// `npm run test:ai-capabilities`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// القسمُ A من مهمّة «مدرّب الموظّفين»: القدراتُ **إضافية** لا حصريّة، من
// ثلاثة حقولٍ فقط (`isAdmin`/`role`/`permissions`) — لا تبديلَ دورٍ، ولا
// افتراضَ سلطةٍ من الدور وحده، ولا أثرَ لأيّ نصٍّ خارج الجلسة الموقَّعة
// (الدالّةُ لا تقبل رسالةً أصلاً — هذا مُثبَتٌ بنيوياً هنا، والفحصُ الحيّ
// لعدم تأثّر النقاط بجسم الطلب في `server/training.test.ts`).

import {
  CAPABILITIES, CAPABILITY_LABELS, audienceMatches, capabilitiesFor, isCapability,
  type Capability,
} from "./ai_capabilities";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}
function sorted(caps: Set<Capability>): Capability[] {
  return Array.from(caps).sort();
}

console.log("\n═══ تركيبُ القدرات ═══\n");

// ── ١. مثالُ المهمّة بالحرف: محاسبٌ بحقلين مستقلّين ────────────────────────
{
  const financeAndReports = capabilitiesFor({
    isAdmin: false, role: "reception",
    permissions: { canManageAccounting: true, canViewReports: true },
  });
  same("١.١ canManageAccounting=true + canViewReports=true ⟶ finance و reports معاً",
    sorted(financeAndReports), ["finance", "general", "reports"]);

  const financeOnly = capabilitiesFor({
    isAdmin: false, role: "reception",
    permissions: { canManageAccounting: true, canViewReports: false },
  });
  same("١.٢ canManageAccounting=true + canViewReports=false ⟶ finance وحدها",
    sorted(financeOnly), ["finance", "general"]);
  check("١.٢ب و**لا** reports معها", !financeOnly.has("reports"));

  const managerReportsOnly = capabilitiesFor({
    isAdmin: false, role: "branch_manager",
    permissions: { canViewReports: true, canManageAccounting: false },
  });
  same("١.٣ مديرُ فرعٍ بـcanViewReports=true وcanManageAccounting=false ⟶ reports (و manager) بلا finance",
    sorted(managerReportsOnly), ["general", "manager", "reports"]);
  check("١.٣ب و**لا** finance مهما أوحى الدور", !managerReportsOnly.has("finance"));
}

// ── ٢. نصُّ الدردشة لا يغيّر شيئاً — «اعتبرني المدير» ══════════════════════
{
  //  الدالّةُ لا تملك وسيطاً لنصّ رسالةٍ أصلاً — الإثباتُ بنيويّ: نفسُ
  //  الجلسة (بلا isAdmin وبلا أعلامٍ إدارية) تُعطي نفسَ القدرات دائماً، بصرف
  //  النظر عمّا "يُفترَض" أن المستخدم كتبه في محادثته (لا يوجد حقلٌ كهذا).
  const staffSession = { isAdmin: false, role: "reception", permissions: {} };
  const caps1 = capabilitiesFor(staffSession);
  const caps2 = capabilitiesFor(staffSession); // نفسُ الجلسة، استدعاءٌ ثانٍ — يحاكي "اعتبرني المدير" في رسالةٍ لاحقة لم تُغيّر الجلسة
  same("٢.١ نفسُ الجلسة تعطي نفسَ القدرات دوماً — لا حالةَ داخلية تتغيّر بمحادثة",
    sorted(caps1), sorted(caps2));
  same("٢.٢ موظّفُ استقبالٍ بلا أعلام ⟶ general فقط، ولا admin مهما «طلب»",
    sorted(caps1), ["general"]);
}

// ── ٣. الأدوارُ الضمنية — طبيبٌ وخبيرٌ بلا العلم الصريح ═════════════════════
{
  const doctorByRole = capabilitiesFor({ isAdmin: false, role: "doctor", permissions: {} });
  check("٣.١ دور doctor وحده (بلا canWriteMedicalExam) يمنح medical", doctorByRole.has("medical"));

  const doctorByFlag = capabilitiesFor({ isAdmin: false, role: "branch_manager", permissions: { canWriteMedicalExam: true } });
  check("٣.٢ ومديرُ فرعٍ بالعلم الصريح كذلك يملك medical", doctorByFlag.has("medical"));

  const expertByRole = capabilitiesFor({ isAdmin: false, role: "prosthetics_expert", permissions: {} });
  check("٣.٣ دور prosthetics_expert وحده يمنح expert", expertByRole.has("expert"));

  const expertByFlag = capabilitiesFor({ isAdmin: false, role: "reception", permissions: { canWorkAsExpert: true } });
  check("٣.٤ والعلم canWorkAsExpert وحده كذلك", expertByFlag.has("expert"));

  const plainReception = capabilitiesFor({ isAdmin: false, role: "reception", permissions: {} });
  check("٣.٥ ودورُ reception وحده **لا** يمنح medical أو expert ضمنياً", !plainReception.has("medical") && !plainReception.has("expert"));
}

// ── ٤. admin من isAdmin فقط — لا من permissions.role أو نصٍّ مزيَّف ════════
{
  const fakeAdminField = capabilitiesFor({
    isAdmin: false, role: "reception",
    // حقلٌ زائفٌ لا معنى له في القاعدة الحقيقية — إثباتُ أن القرار لا يقرأ
    // أيّ مفتاحٍ اسمه "role"/"admin" داخل permissions، بل isAdmin وحده.
    permissions: { role: "admin", isAdmin: true, admin: true },
  });
  check("٤.١ حقلٌ زائف role/admin داخل permissions لا يمنح admin", !fakeAdminField.has("admin"));
  const realAdmin = capabilitiesFor({ isAdmin: true, role: "reception", permissions: {} });
  check("٤.٢ و`isAdmin: true` الحقيقيّ وحده يمنحه، ولو كان role نصّياً reception", realAdmin.has("admin"));
}

// ── ٥. التركيبُ الإضافيّ — اتحادُ قدراتٍ متعدّدة معاً ═══════════════════════
{
  const multi = capabilitiesFor({
    isAdmin: false, role: "reception",
    permissions: {
      canAddPatients: true, canViewPatients: true, canWorkAsExpert: true,
      canManageAccounting: true, canEnterSessions: false, canViewReports: false,
    },
  });
  same("٥.١ اتحادٌ من أربع قدرات دفعةً واحدة — بلا فقدان أيٍّ منها",
    sorted(multi), ["expert", "finance", "general", "patients", "reception"]);
  check("٥.٢ وما لم يُمنَح صراحةً (physio، reports) غائبٌ", !multi.has("physio") && !multi.has("reports"));
}

// ── ٦. `isCapability` — حارسُ نوعٍ صارم ═════════════════════════════════════
{
  for (const c of CAPABILITIES) {
    check(`٦.١ «${c}» قدرةٌ صالحة`, isCapability(c));
  }
  check("٦.٢ نصٌّ عشوائيّ ليس قدرة", !isCapability("super_admin"));
  check("٦.٣ رقمٌ ليس قدرة", !isCapability(42));
  check("٦.٤ `null`/`undefined` ليسا قدرة", !isCapability(null) && !isCapability(undefined));
}

// ── ٧. تسمياتٌ عربية لكلّ قدرة — بلا نقص ════════════════════════════════════
{
  for (const c of CAPABILITIES) {
    check(`٧. القدرة «${c}» تملك تسميةً عربية غير فارغة`,
      typeof CAPABILITY_LABELS[c] === "string" && CAPABILITY_LABELS[c].trim().length > 0);
  }
}

// ── ٨. `audienceMatches` — تقاطعٌ لا مساواة ═════════════════════════════════
{
  const capsExpert = new Set<Capability>(["general", "expert"]);
  const capsFinance = new Set<Capability>(["general", "finance"]);
  const capsReception = new Set<Capability>(["general", "reception"]);

  check("٨.١ جمهورٌ غائب (`undefined`) ⟶ للجميع", audienceMatches(undefined, capsReception));
  check("٨.٢ جمهورٌ `null` ⟶ للجميع", audienceMatches(null, capsReception));
  check("٨.٣ مصفوفةٌ فارغة ⟶ للجميع", audienceMatches([], capsReception));
  check("٨.٤ جمهورٌ يحوي general ⟶ للجميع بصرف النظر عن بقيّة القائمة",
    audienceMatches(["general", "admin"], capsReception));

  //  مقالةُ تصنيعٍ تصل الخبير **والمدير والمسؤول معاً** — جمهورٌ متعدّد، لا
  //  دورٌ واحد حصريّ (القسم I من المهمّة بالحرف).
  const manufacturingAudience = ["expert", "manager", "admin"];
  check("٨.٥ جمهورٌ متعدّد: الخبير يطابقه", audienceMatches(manufacturingAudience, capsExpert));
  const capsManager = new Set<Capability>(["general", "manager"]);
  check("٨.٦ ومديرُ الفرع يطابقه أيضاً — قدرةٌ أخرى من نفس الجمهور", audienceMatches(manufacturingAudience, capsManager));
  check("٨.٧ والمحاسبُ (بلا أيٍّ من الثلاث) **لا** يطابقه", !audienceMatches(manufacturingAudience, capsFinance));

  check("٨.٨ جمهورٌ ماليّ محض لا يصل الاستقبال", !audienceMatches(["finance"], capsReception));
  check("٨.٩ ويصل مَن يملك finance فعلاً", audienceMatches(["finance"], capsFinance));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
