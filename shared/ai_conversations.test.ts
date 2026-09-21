//  عقدُ سجلّ محادثات المساعد الخالص — `npm run test:ai-conversations-pure`.
//  **بلا قاعدة بيانات ولا شبكة.**
//
//  ══ ولماذا هنا لا في الخادم ═════════════════════════════════════════════
//  درسُ ٤.u بحرفه: قرارٌ مدفونٌ في معالج نقطةٍ لا يُختبَر إلّا بقراءة نصِّه،
//  وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود بصياغةٍ أخرى. فمَن يقرأ
//  «كلَّ المحادثات» قرارٌ يُختبَر دخلاً وخرجاً.

import {
  AI_CHAT_CONVERSATION_ID_MAX, AI_CHAT_PAGE_SIZE, AI_CHAT_RETENTION_DAYS,
  AI_CHAT_SAVED_ANSWER_MAX, AI_CHAT_SAVED_QUESTION_MAX,
  boundedPageSize, canReadAllConversations, canReadOwnConversations, cappedText,
  conversationRowsOf, conversationsPageUrl, decodeConversationCursor,
  encodeConversationCursor, lastUserQuestion, nextConversationPageParam,
  pageFromRows, retentionCutoff, sanitizeConversationId,
} from "./ai_conversations";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(expected === got ? got : got)}`);
}

console.log("── أ. «كلُّ المحادثات» — المسؤولُ العام وحده ──");
check(canReadAllConversations({ isAdmin: true, role: "admin", userId: 1 }),
  "أ١. المسؤولُ العام يقرأ الجميع");
check(canReadAllConversations({ isAdmin: true, role: "doctor", userId: 1 }),
  "أ٢. **وبسلطته لا بدوره** — مسؤولٌ يحمل دوراً آخر يمرّ");
check(!canReadAllConversations({ isAdmin: false, role: "branch_manager", userId: 2 }),
  "أ٣. **ومديرُ الفرع لا** — قياسٌ على معرفة المساعد (٤.n) لا اختراع");
for (const role of ["reception", "accountant", "doctor", "prosthetics_expert", "therapist"]) {
  check(!canReadAllConversations({ isAdmin: false, role, userId: 3 }),
    `أ٤.${role} — لا يقرأ محادثاتِ غيره`);
}
check(!canReadAllConversations(null) && !canReadAllConversations(undefined),
  "أ٥. وبلا جلسةٍ — لا");
check(!canReadAllConversations({ isAdmin: "yes" as any, userId: 1 }),
  "أ٦. **و`isAdmin` غيرُ بوليانيّ لا يُقرأ صدقاً** — `=== true` لا صدقٌ فضفاض");

console.log("\n── ب. «محادثاتي» — كلُّ موظّفٍ له رقمٌ حقيقيّ ──");
check(canReadOwnConversations({ userId: 7, role: "reception" }), "ب١. موظّفٌ عاديّ يقرأ محادثاتِه");
check(canReadOwnConversations({ userId: 1, isAdmin: true }), "ب٢. والمسؤولُ كذلك");
check(!canReadOwnConversations({ userId: 0 }),
  "ب٣. **والصفرُ ليس رقمَ مستخدم** — `Number(null)` تساوي صفراً لا `NaN`");
check(!canReadOwnConversations({ userId: -1 }), "ب٤. ولا السالب");
check(!canReadOwnConversations({ userId: 1.5 as any }), "ب٥. ولا الكسريّ");
check(!canReadOwnConversations({ userId: "7" as any }), "ب٦. ولا النصّ");
check(!canReadOwnConversations({}) && !canReadOwnConversations(null), "ب٧. ولا الغياب");

console.log("\n── ج. معرّفُ المحادثة — تجميعٌ لا هويّة، ويُنقّى ──");
same("ج١. معرّفُ `randomUUID` يمرّ",
  sanitizeConversationId("0f9d2c1e-4b6a-4f17-9d2e-11223344aabb"),
  "0f9d2c1e-4b6a-4f17-9d2e-11223344aabb");
same("ج٢. ومهرَبُ البيئة بلا `crypto` يمرّ", sanitizeConversationId("1726900000000-a1b2c3"),
  "1726900000000-a1b2c3");
same("ج٣. والفراغُ يُقرأ «بلا تجميع»", sanitizeConversationId("   "), null);
same("ج٤. وغيرُ النصّ كذلك", sanitizeConversationId(42), null);
same("ج٥. **وحقنُ SQL/HTML لا يُكتب كما وصل**",
  sanitizeConversationId("'; DROP TABLE x; --"), null);
same("ج٦. ولا المسافات داخلَه", sanitizeConversationId("ab cd"), null);
same("ج٧. **والأطولُ من السقف يُردّ لا يُقصّ**",
  sanitizeConversationId("a".repeat(AI_CHAT_CONVERSATION_ID_MAX + 1)), null);
same("ج٨. وعلى السقف تماماً يمرّ",
  sanitizeConversationId("a".repeat(AI_CHAT_CONVERSATION_ID_MAX)),
  "a".repeat(AI_CHAT_CONVERSATION_ID_MAX));
same("ج٩. والمحيطُ يُقلَّم", sanitizeConversationId("  abc-1  "), "abc-1");

console.log("\n── د. القصُّ الآمن ──");
same("د١. الأقصرُ كما هو", cappedText("سؤال", 10), "سؤال");
same("د٢. والأطولُ يُقصّ", cappedText("abcdef", 3), "abc");
same("د٣. وغيرُ النصّ يصير فارغاً", cappedText(null, 10), "");
same("د٤. وكذلك الرقم", cappedText(5, 10), "");
check(AI_CHAT_SAVED_QUESTION_MAX === 2000,
  "د٥. **وسقفُ السؤال مطابقٌ لقصّ النقطة (٢٠٠٠)** — يُحفَظ ما رآه المساعدُ فعلاً",
  String(AI_CHAT_SAVED_QUESTION_MAX));
check(AI_CHAT_SAVED_ANSWER_MAX > AI_CHAT_SAVED_QUESTION_MAX,
  "د٦. وسقفُ الجواب أوسع — يُولَد ولا يُقصّ في المسار");

console.log("\n── هـ. السؤالُ = آخرُ رسالةِ مستخدم، لا التاريخُ كلُّه ──");
same("هـ١. آخرُ سؤالٍ من تاريخٍ متبادل",
  lastUserQuestion([
    { role: "user", content: "الأول" },
    { role: "assistant", content: "جوابٌ" },
    { role: "user", content: "الثاني" },
  ]), "الثاني");
same("هـ٢. **وتُتخطّى رسالةُ المساعد الأخيرة**",
  lastUserQuestion([
    { role: "user", content: "سؤالي" },
    { role: "assistant", content: "جوابُه" },
  ]), "سؤالي");
same("هـ٣. وتاريخٌ فارغ ⟶ فارغ", lastUserQuestion([]), "");
same("هـ٤. وغيرُ المصفوفة ⟶ فارغ", lastUserQuestion(null), "");
same("هـ٥. **والفراغُ يُتخطّى إلى سؤالٍ حقيقيّ**",
  lastUserQuestion([
    { role: "user", content: "الحقيقيّ" },
    { role: "user", content: "   " },
  ]), "الحقيقيّ");
same("هـ٦. ويُقصّ عند سقفه",
  lastUserQuestion([{ role: "user", content: "x".repeat(AI_CHAT_SAVED_QUESTION_MAX + 50) }]).length,
  AI_CHAT_SAVED_QUESTION_MAX);

console.log("\n── و. نافذةُ التسعين يوماً ──");
check(AI_CHAT_RETENTION_DAYS === 90, "و١. **تسعون يوماً — قرارُ المالك**", String(AI_CHAT_RETENTION_DAYS));
{
  const now = new Date("2026-09-21T12:00:00.000Z");
  const cut = retentionCutoff(now);
  same("و٢. والحدُّ تسعون يوماً قبل الآن بالضبط",
    cut.toISOString(), "2026-06-23T12:00:00.000Z");
  check(cut.getTime() < now.getTime(), "و٣. والحدُّ قبل الآن حتماً");
  //  صفٌّ عمرُه ٨٩ يوماً يُعرَض، و٩١ لا — الحدُّ قاطعٌ لا تقريبيّ.
  const d89 = new Date(now.getTime() - 89 * 86400000);
  const d91 = new Date(now.getTime() - 91 * 86400000);
  check(d89.getTime() >= cut.getTime(), "و٤. وصفُّ ٨٩ يوماً داخلَ النافذة");
  check(d91.getTime() < cut.getTime(), "و٥. وصفُّ ٩١ يوماً خارجَها");
}

console.log("\n── ز. حجمُ الصفحة — سقفٌ في الخادم لا يُؤخَذ من العميل ──");
same("ز١. الغيابُ ⟶ الافتراضيّ", boundedPageSize(undefined), AI_CHAT_PAGE_SIZE);
same("ز٢. والمشوَّهُ ⟶ الافتراضيّ", boundedPageSize("كثير"), AI_CHAT_PAGE_SIZE);
same("ز٣. والصفرُ والسالب ⟶ الافتراضيّ",
  [boundedPageSize(0), boundedPageSize(-5)], [AI_CHAT_PAGE_SIZE, AI_CHAT_PAGE_SIZE]);
same("ز٤. **والأكبرُ من السقف يُقصَر عليه** — لا يُسلَّم الجدولُ كلُّه بطلب",
  boundedPageSize(100000), AI_CHAT_PAGE_SIZE);
same("ز٥. والأصغرُ يُحترَم", boundedPageSize(5), 5);

console.log("\n── ح. المؤشّر — ترميزٌ وفكّ، والمشوَّهُ غيابٌ لا خطأ ──");
same("ح١. الترميزُ صيغةٌ واحدة",
  encodeConversationCursor({ createdAtUs: 1758456000123456, id: 42 }), "1758456000123456.42");
same("ح٢. **ورحلةُ ذهابٍ وإياب لا تفقد كسرَ الميكروثانية**",
  decodeConversationCursor(encodeConversationCursor({ createdAtUs: 1758456000123456, id: 42 })),
  { createdAtUs: 1758456000123456, id: 42 });
//  **وهذا بعينه ما كان ينكسر**: مؤشّرٌ بالملّي ثانية يجعل الحدَّ أقدمَ من
//  الصفّ الذي جاء منه، فيسقط جارُه في الملّي ثانية نفسِها من الصفحتين معاً.
check(1758456000123456 % 1000 !== 0,
  "ح٢ب. **والقيمةُ تحمل كسراً دون الملّي ثانية** — فالاختبارُ يقيس الدقّة فعلاً");
check(Number.isSafeInteger(4102444800000000),
  "ح٢ج. وميكروثانياتُ سنة ٢١٠٠ ما زالت عدداً آمناً في جافاسكربت");
for (const [label, bad] of [
  ["الغياب", undefined], ["العدم", null], ["الفراغ", ""], ["البياض", "   "],
  ["رقمٌ لا نصّ", 123], ["بلا نقطة", "1758456000042"], ["بجزءٍ ثالث", "1.2.3"],
  ["نصٌّ غريب", "abc.def"], ["سالب", "-5.3"], ["كسريّ", "1.5.2"],
  ["صفرُ معرّف", "1758456000123456.0"], ["صفرُ ختم", "0.42"],
  ["كائن", { createdAtUs: 1, id: 2 } as any],
  ["أكبرُ من العدد الآمن", "99999999999999999.42"],
] as [string, unknown][]) {
  check(decodeConversationCursor(bad) === null,
    `ح٣. والمشوَّهُ ⟶ null (${label}) — **الصفحةُ الأولى لا خطأ**`,
    JSON.stringify(decodeConversationCursor(bad)));
}

console.log("\n── ط. صفحةٌ من صفوفٍ جُلبت بـlimit+1 ──");
{
  //  **و`cursorUs` يصل نصّاً من `node-postgres`** (نوعُ `bigint`) — فالصورةُ
  //  هنا نصّيّةٌ عمداً كما تصل فعلاً، لا رقماً مريحاً في الاختبار وحده.
  const row = (id: number, us: string) => ({ id, cursorUs: us });
  const five = [row(50, "1758456000005000"), row(49, "1758456000004000"),
    row(48, "1758456000003000"), row(47, "1758456000002456"), row(46, "1758456000001000")];
  same("ط١. **أقلُّ من السقف ⟶ لا مؤشّر** — «لا مزيد» صراحةً",
    pageFromRows(five.slice(0, 3), 5), { rows: five.slice(0, 3), nextCursor: null });
  same("ط٢. ومساوٍ للسقف بالضبط ⟶ لا مؤشّر أيضاً",
    pageFromRows(five, 5).nextCursor, null);
  const p = pageFromRows(five, 4);
  same("ط٣. **والزائدُ يُسقَط ولا يُعرَض** — أربعةٌ لا خمسة", p.rows.map((r) => r.id), [50, 49, 48, 47]);
  same("ط٤. **والمؤشّرُ من آخرِ صفٍّ مُعاد لا من المحذوف**",
    p.nextCursor, "1758456000002456.47");
  //  وهذا هو الثابتُ الذي يمنع التكرارَ والقفز: الصفحةُ التالية شرطُها
  //  «أقدمُ من آخرِ ما رأيتَه»، لا «تجاوزْ خمسين صفّاً».
  same("ط٥. **والفكُّ يعيد آخرَ صفٍّ بكسرِ ميكروثانيته**",
    decodeConversationCursor(p.nextCursor), { createdAtUs: 1758456000002456, id: 47 });
  same("ط٦. والفارغُ ⟶ صفوفٌ فارغة بلا مؤشّر",
    pageFromRows([], 5), { rows: [], nextCursor: null });
  //  **وقيمةٌ لا تصلح مؤشّراً ⟶ «لا مزيد»** لا مؤشّرٌ كاذب يقفز عن صفوف.
  same("ط٧. وقيمةٌ فاسدة ⟶ لا مؤشّر",
    pageFromRows([row(3, "x"), row(2, "y"), row(1, "z")], 2).nextCursor, null);
}

console.log("\n── ي. رابطُ الصفحة — مكانٌ واحد يبنيه ──");
same("ي١. بلا شيء ⟶ الأساسُ عارياً",
  conversationsPageUrl("/api/ai/conversations/mine"), "/api/ai/conversations/mine");
same("ي٢. **والمرشِّحُ الفارغ لا يُرسَل مُعامِلاً فارغاً**",
  conversationsPageUrl("/api/ai/conversations", { userId: "", cursor: null }),
  "/api/ai/conversations");
same("ي٣. والبياضُ كذلك",
  conversationsPageUrl("/api/ai/conversations", { userId: "  ", cursor: "   " }),
  "/api/ai/conversations");
same("ي٤. والمؤشّرُ وحده",
  conversationsPageUrl("/api/ai/conversations/mine", { cursor: "1758456000000.42" }),
  "/api/ai/conversations/mine?cursor=1758456000000.42");
same("ي٥. والموظّفُ وحده",
  conversationsPageUrl("/api/ai/conversations", { userId: 7 }),
  "/api/ai/conversations?userId=7");
same("ي٦. **والاثنان بترتيبٍ ثابت** — رابطُ نفسِ الطلب واحدٌ دائماً",
  conversationsPageUrl("/api/ai/conversations", { userId: "7", cursor: "1758456000000.42" }),
  "/api/ai/conversations?userId=7&cursor=1758456000000.42");
same("ي٧. والقيمُ تُرمَّز",
  conversationsPageUrl("/api/ai/conversations", { userId: "a b&c=1" }),
  "/api/ai/conversations?userId=a%20b%26c%3D1");

console.log("\n── ك. «هل من مزيد؟» — من قول الخادم لا من عدّ الصفوف ──");
same("ك١. مؤشّرٌ حاضر ⟶ يُعاد كما هو",
  nextConversationPageParam({ rows: [], nextCursor: "1.2" }), "1.2");
for (const [label, page] of [
  ["null صريحة", { rows: [], nextCursor: null }],
  ["غائب", { rows: [] }],
  ["فراغ", { rows: [], nextCursor: "" }],
  ["بياض", { rows: [], nextCursor: "   " }],
  ["الصفحةُ نفسُها null", null],
  ["غائبةٌ تماماً", undefined],
] as [string, any][]) {
  check(nextConversationPageParam(page) === undefined,
    `ك٢. ولا مزيد ⟶ undefined (${label}) — **وهو ما يُطفئ hasNextPage**`,
    JSON.stringify(nextConversationPageParam(page)));
}
//  **صفحةٌ امتلأت ليست دليلاً على وجود تالٍ**: الخمسون صفّاً بلا مؤشّرٍ
//  تعني «انتهى»، وزرُّ «عرض المزيد» يختفي — وهذا بعينه ما كان مفقوداً.
check(nextConversationPageParam({
  rows: Array.from({ length: 50 }, (_, i) => ({ id: i })), nextCursor: null,
}) === undefined, "ك٣. **وخمسون صفّاً بلا مؤشّر ⟶ لا مزيد** — لا تخمينَ من الامتلاء");

console.log("\n── ل. تسطيحُ الصفحات — بلا إزالةِ تكرار، فالفصلُ بالبناء ──");
same("ل١. صفحتان ⟶ صفوفُهما بترتيبهما",
  conversationRowsOf([{ rows: [{ id: 3 }, { id: 2 }] }, { rows: [{ id: 1 }] }]),
  [{ id: 3 }, { id: 2 }, { id: 1 }]);
same("ل٢. والصفحةُ الفارغة لا تكسر شيئاً",
  conversationRowsOf([{ rows: [] }, { rows: [{ id: 1 }] }]), [{ id: 1 }]);
same("ل٣. وصفحةٌ بلا حقلِ صفوف تُتخطّى",
  conversationRowsOf([{ nextCursor: "1.2" } as any, { rows: [{ id: 1 }] }]), [{ id: 1 }]);
same("ل٤. وغيرُ المصفوفة ⟶ فارغ",
  [conversationRowsOf(undefined), conversationRowsOf(null), conversationRowsOf("x" as any)],
  [[], [], []]);

console.log(failures ? `\n❌ ${failures} حالة فاشلة` : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
