//  ══ فهرسُ قدرات القراءة — يُكتشَف من التطبيق نفسِه لا يُكتب باليد ══════
//
//  المساعدُ كان يرى ثماني نوافذ من أصل ١٣٢ نقطةَ قراءة، فكلُّ سؤالٍ خارجها
//  يُردّ باعتذار. وأداةٌ جديدة لكلّ سؤالٍ قائمةٌ ثابتة والتطبيقُ يتحرّك،
//  فالفجوةُ لا تُغلَق أبداً. فالفهرسُ **مُشتَقّ** من جدول مسارات
//
//    Express
//
//  فما يُضاف غداً يُكتشَف من تلقائه.
//
//  ══ و«الطريقةُ قراءةٌ» ليست ضماناً — مُثبَتٌ لا مفترَض ══════════════════
//
//  `GET /api/logout` **يُنهي الجلسة**، و`GET /api/cron/daily-income` يشغّل
//  تقريراً ويرسله. فلو قيل «كلُّ قراءةٍ آمنة» لَسجّل المساعدُ خروجَ الموظّف
//  وهو يحاول الإجابة. ولذلك: الاكتشافُ تلقائيّ، **والسماحُ صريح**.
//
//  وثلاثةُ أصنافٍ لا صنفان:
//    • `DESCRIBED` — مسموحةٌ وموصوفة، يراها النموذج ويناديها.
//    • `BLOCKED`   — ممنوعةٌ بقرارٍ مكتوب، ومعه **سببُه** فلا يُرفَع بالسهو.
//    • وما ليس في الاثنين ⟶ **لا يُنادى**، ويُفشل الحارسَ المعماريّ في
//      `test:ai-capabilities` — فنقطةٌ جديدة تُجبر صاحبَها على قرارٍ صريح
//      بدل أن تنفتح صامتةً أو تختفي صامتةً.
//
//  ══ ولا سلطةَ في هذا الملفّ ═════════════════════════════════════════════
//
//  لا يقرأ جلسةً ولا صلاحية. الحارسُ الحقيقيُّ هو النقطةُ نفسُها حين تُنفَّذ
//  بجلسة السائل (`invoke.ts`). وهذا الملفّ يقول **ما هو موجود**، لا مَن يراه.

/** وصفُ قدرةٍ واحدة كما يقرؤه النموذج. */
export interface Capability {
  /** المسار — هو الاسمُ نفسُه: فريدٌ ومستقرٌّ ويصفُ نفسَه. */
  path: string;
  /** سطرٌ عربيٌّ يقول ماذا تُرجع. */
  description: string;
  /** معاملاتُ المسار (`:id`) — إلزاميةٌ كلُّها. */
  pathParams: string[];
  /** معاملاتُ الاستعلام المفهومة — إرشادٌ للنموذج لا حصرٌ في الخادم. */
  query: string[];
  /** تُرجع مالاً ⟹ تحتاج الوضعَ الماليَّ للمساعد فوق حارسِ النقطة نفسِها. */
  financial: boolean;
}

/**
 * **الممنوعُ بقرارٍ مكتوب** — ومعه سببُه، فلا يُرفَع لأن أحداً لم يعرف لِمَ
 * وُضع. والمفتاحُ مسارٌ حرفيّ.
 */
export const BLOCKED: Record<string, string> = {
  //  ══ أثرٌ جانبيٌّ حقيقيّ خلف طريقةِ قراءة ══
  "/api/logout": "يُنهي الجلسة — نداؤه يُخرج الموظّفَ من النظام.",
  "/api/cron/daily-income": "مشغّلُ كرون: يحسب ويرسل. ومحروسٌ بمفتاحِ بيئةٍ لا بجلسة.",
  "/api/custom-stats/:id/calculate": "تشغيلُ حسابٍ مخصَّص — تنفيذٌ لا قراءة.",
  //  ══ أسرارٌ لا تُقرأ في محادثة ══
  "/api/admin/settings": "تحمل إعداداتٍ إداريةً منها أسرارُ تكامل.",
  "/api/admin/settings/telegram": "توكنُ تلغرام — سرٌّ لا يُقال في محادثة.",
  "/api/admin/settings/backup-email": "بريدُ النسخة الاحتياطية — إعدادٌ لا جواب.",
  //  ══ تفريغٌ ضخم لا يُقرأ في محادثة ══
  "/api/admin/export/patients": "تفريغُ كلّ المرضى — حجمٌ لا يُقرأ في جواب.",
  "/api/invoice-items/bulk": "إدخالٌ مجمَّع، لا سؤالَ يُجاب عنه.",
  //  ══ دَورانٌ على الذات ══
  "/api/ai/conversations": "سجلُّ المحادثات — يُقرأ من شاشته لا من المساعد.",
  "/api/ai/conversations/mine": "كسابقتها.",
  "/api/ai/conversations/users": "كسابقتها.",
  "/api/ai/conversations/thread/:conversationId": "كسابقتها.",
  "/api/ai/knowledge/articles": "معرفةُ المساعد تصله بالاسترجاع لا بأداة.",
  "/api/ai/knowledge/suggestions": "كسابقتها.",
  "/api/ai/status": "حالةُ المزوّد — شأنٌ تشغيليٌّ لا جواب.",
  "/api/ai-notes": "ملاحظاتُ مفسِّر الشذوذ — سياقٌ داخليّ.",
  //  ══ للتدريب أدواتُه الثلاث القائمة، فلا بابان ══
  "/api/training/tracks": "لأدوات التدريب بابُها الخاصّ.",
  "/api/training/next": "كسابقتها.",
  "/api/training/modules/:id/lesson": "كسابقتها.",
  "/api/training/admin/tracks": "كسابقتها.",
  "/api/training/management/progress": "كسابقتها.",
  //  ══ لا جوابَ فيها ══
  "/api/auth/user": "هويّةُ الجلسة — يعرفها المساعدُ أصلاً.",
  "/api/patients/name-availability": "فحصُ نموذجٍ لحظةَ التسجيل.",
  "/api/patients/lookup-by-name": "تنبيهُ تكرارٍ داخل نموذج التسجيل.",
};

/**
 * **المسموحُ والموصوف** — سطرٌ لكلّ نقطة، مكتوبٌ من قراءة الشيفرة لا من
 * تخمين اسم المسار. و`financial` تعني «تُرجع مبلغاً» فتُضاف طبقةُ وضع
 * المساعد الماليّ فوق حارسِ النقطة.
 */
export const DESCRIBED: Record<string, { d: string; q?: string[]; f?: true }> = {
  //  ══ التصنيع ══
  "/api/manufacturing/overview": { d: "لوحةُ أداء التصنيع: لكلّ خبيرٍ عددُ أوامره والنشطةُ والمكتملةُ و**المتأخّرةُ عن موعد التسليم** ونسبةُ نجاح أوّل قياس ومتوسّطُ المدّة، ومعها تفصيلٌ بالفروع وبالمراحل وأسبابُ إعادة العمل.", q: ["branchId", "serviceType"] },
  "/api/manufacturing/notifications": { d: "أوامرُ التصنيع قربَ موعد التسليم أو بعده، صفّاً صفّاً: متأخّرة · اليوم · غداً · بعد يومين. ولكلّ صفٍّ المريضُ والخبيرُ والفرعُ والمرحلة، **وسببُ التوقّف إن وُجد** — وهو ما يفرّق المتأخّرَ بلا عذر (الأحمر) عن المتأخّر بعذرٍ مسجَّل (الكهرمانيّ).", q: ["branchId"] },
  "/api/manufacturing/orders": { d: "قائمةُ أوامر التصنيع والصيانة بحالاتها ومراحلها وخبرائها.", q: ["branchId", "status", "serviceType", "expertUserId"] },
  "/api/manufacturing/orders/:id": { d: "تفصيلُ أمرِ تصنيعٍ واحد: مراحلُه وسجلُّه وموادُّه ومواصفاتُ جهازه." },
  "/api/manufacturing/my-orders": { d: "أوامرُ التصنيع المسنَدة إلى صاحب الجلسة نفسِه (للخبير)." },
  "/api/manufacturing/experts": { d: "خبراءُ الأطراف الفعّالون في فرعٍ محدَّد.", q: ["branchId"] },
  "/api/manufacturing/patient/:patientId/orders": { d: "أوامرُ التصنيع والصيانة لمريضٍ بعينه." },
  "/api/manufacturing/patient/:patientId/summary": { d: "ملخّصُ حالة التصنيع في بطاقة المريض." },
  //  ══ المرضى ══
  "/api/patients/registry": { d: "سجلُّ المرضى بالبحث والترشيح — الاسمُ والرمزُ والفرعُ والتصنيف.", q: ["search", "branchId", "limit", "offset"] },
  "/api/patients/:id/cases": { d: "خيوطُ خدمات المريض (أطراف · مساند · علاج طبيعي) بحالاتها." },
  "/api/patients/:id/financial-summary": { d: "الكلفةُ والمدفوعُ والمتبقّي لمريضٍ بعينه.", f: true },
  "/api/patients/:patientId/device-episodes": { d: "حلقاتُ أجهزة المريض: ما طُلب وحالتُه ومسارُه وتسلسلُه." },
  "/api/patients/:patientId/treatment-plans": { d: "خططُ العلاج المسجَّلة للمريض." },
  "/api/patients/:patientId/pending-charges": { d: "مبالغُ «بلا معاينة» المعلَّقة على المريض.", f: true },
  "/api/patients/:id/branch-access": { d: "الفروعُ التي أُتيح لها ملفُّ هذا المريض." },
  "/api/patients/:id/branch-access/:branchId/experts": { d: "خبراءُ فرعٍ مُتاحٍ لهذا المريض." },
  "/api/patients/:id/case-type/:caseType/removal-preview": { d: "أثرُ سحب نوع حالةٍ أو إغلاقها قبل التنفيذ." },
  "/api/patient-trash": { d: "سلّةُ المرضى المحذوفين: مَن حذف ومتى ولماذا وكم بقي من مهلة الاستعادة." },
  "/api/patient-trash/count": { d: "عددُ الملفّات في السلّة." },
  "/api/patient-trash/delete-preview/:id": { d: "أثرُ حذف مريضٍ قبل التنفيذ." },
  //  ══ المعاينةُ والمراجعة ══
  "/api/medical/pending": { d: "خريطةُ انتظار المعاينة: أيُّ مريضٍ ينتظر معاينةً وفي أيّ اختصاص." },
  "/api/medical/worklist": { d: "قائمةُ عمل الطبيب — الحالاتُ المنتظرة في اختصاصاته هو." },
  "/api/medical/worklist/count": { d: "عددُ ما ينتظر الطبيبَ." },
  "/api/medical/patients/:patientId/exams": { d: "معايناتُ مريضٍ: تسلسلُها وملاحقُها ونسخُها وما ينتظر." },
  "/api/medical/recent-purchases": { d: "مرضى الطبيب الذين اشتروا حديثاً." },
  "/api/medical/me": { d: "صلاحيةُ صاحب الجلسة الطبّية واختصاصاتُه." },
  "/api/medical-review/queue": { d: "طابورُ مراجعة حركة مرضى الأطراف والمساند: مَن جاء وماذا جرى ومتى ومَن تولّاه." },
  "/api/medical-review/patients/:id/requests": { d: "تاريخُ طلبات مراجعة الطبيب لمريضٍ بعينه." },
  //  ══ ما بعد المعاينة ══
  "/api/followups/decision-queue": { d: "طابورُ «بانتظار الحسم» و«تم الحسم» بعد المعاينة.", q: ["state", "branchId", "serviceType"] },
  "/api/followups/decision-queue/count": { d: "عددُ المنتظرين للحسم." },
  "/api/followups/patient/:patientId": { d: "متابعاتُ ما بعد المعاينة لمريضٍ بعينه." },
  "/api/followups": { d: "متابعاتُ ما بعد المعاينة." },
  "/api/followups/governed": { d: "المتابعاتُ الخاضعة للحوكمة." },
  "/api/followups/approvals": { d: "طلباتُ اعتماد السعر المعلَّقة الموروثة.", f: true },
  "/api/follow-ups": { d: "متابعاتُ الاتصال بالمرضى." },
  "/api/follow-ups/history": { d: "تاريخُ متابعات الاتصال." },
  //  ══ «بلا معاينة» ══
  "/api/no-exam/review": { d: "طابورُ المبالغ السابقة بانتظار الإكمال.", f: true },
  "/api/no-exam/review/count": { d: "عددُ المبالغ المعلَّقة." },
  "/api/no-exam/returned": { d: "العملياتُ المُعادة للتصحيح وسببُ إعادة كلٍّ منها." },
  "/api/no-exam/returned/count": { d: "عددُ المُعادة للتصحيح." },
  "/api/no-exam/charges/:id/events": { d: "رحلةُ مبلغٍ معلَّق: إنشاؤه وإعادتُه وتصحيحُه وإكمالُه.", f: true },
  //  ══ المال ══
  "/api/accounting/summary": { d: "الملخّصُ المحاسبيّ لفترة: الواردُ والمبيعاتُ والمصاريفُ والصافي وتقسيمُ الأقسام والديونُ ونسبةُ التحصيل.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/accounting/daily-summary": { d: "ملخّصُ يومٍ واحد محاسبياً.", q: ["date", "branchId"], f: true },
  "/api/accounting/debtors": { d: "المرضى الذين عليهم مبالغُ متبقّية.", q: ["branchId"], f: true },
  "/api/accounting/payments": { d: "الدفعاتُ المقبوضة في فترة.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/accounting/visits": { d: "الزياراتُ في فترةٍ بجانبها المحاسبيّ.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/accounting/branch-comparison": { d: "مقارنةُ الفروع مالياً.", q: ["startDate", "endDate"], f: true },
  "/api/accounting/monthly-trends": { d: "اتّجاهاتٌ شهرية للمال.", q: ["branchId"], f: true },
  "/api/accounting/profitability-by-service": { d: "ربحيّةُ كلّ خدمة.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/dashboard/live-revenue": { d: "الإيرادُ الحيُّ في لوحة التحكّم.", q: ["branchId"], f: true },
  "/api/expenses": { d: "المصاريف المسجَّلة.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/expenses/:id": { d: "مصروفٌ واحد بتفصيله.", f: true },
  "/api/expenses/by-category/summary": { d: "المصاريفُ مجمَّعةً بالتصنيف.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/expense-categories": { d: "تصنيفاتُ المصاريف." },
  "/api/expenses/subcategories": { d: "التصنيفاتُ الفرعية للمصاريف." },
  "/api/invoices": { d: "الفواتير بحالاتها ومبالغها.", q: ["branchId", "status"], f: true },
  "/api/invoices/:id": { d: "فاتورةٌ واحدة ببنودها.", f: true },
  "/api/invoices/stats/summary": { d: "ملخّصُ الفواتير.", f: true },
  "/api/invoices/next-number": { d: "رقمُ الفاتورة التالي." },
  "/api/installment-plans": { d: "خططُ التقسيط.", f: true },
  "/api/installment-plans/:id": { d: "خطّةُ تقسيطٍ واحدة.", f: true },
  "/api/installment-plans/patient/:patientId": { d: "خططُ تقسيط مريضٍ بعينه.", f: true },
  "/api/discounts": { d: "طلباتُ الخصم وحالاتُها.", q: ["status", "branchId"], f: true },
  "/api/discounts/pending/count": { d: "عددُ طلبات الخصم المعلَّقة." },
  "/api/discounts/patient/:patientId": { d: "خصوماتُ مريضٍ بعينه.", f: true },
  "/api/admin/payment-corrections": { d: "طلباتُ تصحيح الدفعات.", f: true },
  "/api/admin/payment-corrections/pending-count": { d: "عددُ تصحيحات الدفعات المعلَّقة." },
  "/api/purchases": { d: "مشترياتُ المركز.", f: true },
  "/api/purchases/:id": { d: "عمليةُ شراءٍ واحدة.", f: true },
  "/api/purchases/stats/summary": { d: "ملخّصُ المشتريات.", f: true },
  "/api/vendors": { d: "المورّدون." },
  "/api/vendors/:id": { d: "مورّدٌ واحد." },
  //  ══ المحاسبةُ المزدوجة ══
  "/api/accounting/v2/accounts": { d: "دليلُ الحسابات.", f: true },
  "/api/accounting/v2/accounts/:id": { d: "حسابٌ واحد من الدليل.", f: true },
  "/api/accounting/v2/journal": { d: "قيودُ اليومية.", q: ["startDate", "endDate", "branchId"], f: true },
  "/api/accounting/v2/journal/:id": { d: "قيدٌ واحد بسطوره.", f: true },
  "/api/accounting/v2/periods": { d: "الفتراتُ المحاسبية." },
  "/api/accounting/v2/audit": { d: "تدقيقُ المحاسبة المزدوجة.", f: true },
  "/api/accounting/v2/reports/trial-balance": { d: "ميزانُ المراجعة.", f: true },
  "/api/accounting/v2/reports/income-statement": { d: "قائمةُ الدخل.", f: true },
  "/api/accounting/v2/reports/balance-sheet": { d: "الميزانيةُ العمومية.", f: true },
  //  ══ التقارير ══
  "/api/reports/daily": { d: "التقريرُ اليوميّ لفرع: الواردُ والمصاريفُ والصافي ودفعاتُ اليوم.", q: ["date", "branchId"], f: true },
  "/api/reports/all-branches": { d: "تقريرُ كلّ الفروع ليومٍ واحد.", q: ["date"], f: true },
  "/api/reports/overall": { d: "التقريرُ الشامل.", f: true },
  "/api/reports/detailed/:branchId": { d: "تقريرٌ مفصَّل لفرع.", f: true },
  "/api/reports/nightly": { d: "التقريرُ الليليّ.", f: true },
  "/api/reports/daily-patient-report": { d: "تقريرُ مرضى اليوم.", q: ["date", "branchId"] },
  "/api/daily-review": { d: "المراجعةُ اليومية: ما جرى فعلياً في الأطراف والمساند اليوم عبر الفروع، الأحدثُ أوّلاً.", q: ["date"], f: true },
  //  ══ الإحصاءُ والشذوذ ══
  "/api/statistics/monthly-new-patients": { d: "المرضى الجدد شهرياً.", q: ["branchId"] },
  "/api/statistics/revenue-by-treatment": { d: "الإيرادُ بحسب نوع العلاج.", q: ["branchId"], f: true },
  "/api/statistics/visits-by-treatment": { d: "الزياراتُ بحسب نوع العلاج.", q: ["branchId"] },
  "/api/custom-stats": { d: "الإحصاءاتُ المخصَّصة المعرَّفة." },
  "/api/custom-stats/:id": { d: "تعريفُ إحصاءٍ مخصَّص." },
  "/api/anomalies": { d: "الشذوذُ المكتشَف: فواتيرُ متأخّرة ومرضى بلا دفعات وانحرافاتُ دفتر الكلف." },
  "/api/anomalies/decisions": { d: "قراراتُ الشذوذ السابقة." },
  //  ══ الاستطلاعات ══
  "/api/survey-templates": { d: "قوالبُ الاستطلاع." },
  "/api/survey-templates/:id/questions": { d: "أسئلةُ قالبٍ." },
  "/api/survey-responses": { d: "إجاباتُ الاستطلاع." },
  "/api/survey-responses/:id/answers": { d: "إجاباتُ استجابةٍ واحدة." },
  "/api/survey-responses/patient/:patientId": { d: "استطلاعاتُ مريضٍ بعينه." },
  "/api/survey-results": { d: "نتائجُ الاستطلاعات مجمَّعة." },
  //  ══ نقاطٌ سُجّلت بأنماطٍ أخرى (`app.get(\n  \"...\"` و`app.get(api.x.path`)
  //  — لم يجدها بحثٌ نصّيّ، ووجدها **الاكتشافُ من جدول المسارات**. وهذا
  //  بعينه الفرقُ بين فهرسٍ يُكتب باليد وفهرسٍ يُشتَقّ.
  "/api/branches": { d: "قائمةُ فروع المجموعة بأسمائها." },
  "/api/patients": { d: "سجلُّ المرضى الكامل بزياراتهم وأسمائهم البديلة وأنواع حالاتهم (القائمةُ القديمة).", q: ["branchId"] },
  "/api/patients/:id": { d: "ملفُّ مريضٍ كامل: بياناتُه وزياراتُه ودفعاتُه ومستنداتُه — والمالُ فيه محجوبٌ عمّن لا يملك عرضَ الدفعات." },
  "/api/reports/daily/:branchId": { d: "التقريرُ اليوميّ لفرعٍ بعينه.", q: ["date"], f: true },
  "/api/followups/patient/:patientId/return-to-purchase-eligible": { d: "هل يصلح هذا المريضُ لِـ«عاد للشراء» ولأيّ عملية." },
  "/api/session-tracking/branches": { d: "الفروعُ المتاحة في تتبّع الجلسات اليومية." },
  "/api/session-tracking/devices": { d: "أجهزةُ العلاج الطبيعي المفعَّلة بترتيب عرضها." },
  "/api/session-tracking/daily": { d: "عدّاداتُ جلسات الأجهزة ليومٍ وشفتٍ وفرع.", q: ["date", "branchId", "shift"] },
  "/api/session-tracking/monthly": { d: "جلساتُ الأجهزة شهرياً مقابل الأهداف.", q: ["month", "branchId"] },
  "/api/session-tracking/list": { d: "سجلُّ إدخالات تتبّع الجلسات.", q: ["branchId"] },
  "/api/session-tracking/analytics": { d: "تحليلُ تتبّع الجلسات: الأجهزةُ الأكثرُ استعمالاً والاتّجاهات.", q: ["branchId"] },
  //  ══ الإدارة ══
  "/api/admin/users": { d: "حساباتُ الموظّفين: الدورُ والفرعُ والصلاحياتُ وحالةُ التفعيل." },
  "/api/admin/branches/full": { d: "الفروعُ بتفاصيلها." },
  "/api/admin/branches/:id/settings": { d: "إعداداتُ فرعٍ تشغيلية." },
  "/api/admin/employee-accuracy": { d: "دقّةُ إدخال الموظّفين." },
  "/api/admin/performance-targets": { d: "أهدافُ الأداء المحدَّدة." },
  "/api/admin/backup-status": { d: "حالةُ النسخة الاحتياطية اليومية." },
  "/api/branch-settings": { d: "إعداداتُ الفرع الحالي." },
};

/** ما يُكتشَف من جدول المسارات ولم يُقرَّر فيه بعد — يُفشل الحارسَ المعماريّ. */
export interface CatalogBuild {
  capabilities: Capability[];
  /** مساراتٌ موصوفةٌ هنا ولا وجودَ لها في التطبيق — وصفٌ شاخ. */
  describedButMissing: string[];
  /** مساراتُ قراءةٍ حقيقية لا في الموصوف ولا في الممنوع — قرارٌ ناقص. */
  undecided: string[];
}

const PATH_PARAM = /:([A-Za-z0-9_]+)/g;

function paramsOf(path: string): string[] {
  return Array.from(path.matchAll(PATH_PARAM)).map((m) => m[1]);
}

/**
 * يقرأ جدولَ مسارات التطبيق ويبني الفهرس.
 *
 * `app` هو تطبيقُ Express نفسُه — وجدولُه `_router.stack` في الإصدار الرابع.
 * وغيابُه لا يُسقط شيئاً: فهرسٌ فارغ، والأداةُ تقول «لا قدرات» بدل أن تنهار.
 */
export function buildCatalog(app: any): CatalogBuild {
  const stack: any[] = app?._router?.stack ?? app?.router?.stack ?? [];
  const found = new Set<string>();
  for (const layer of stack) {
    const route = layer?.route;
    if (!route || typeof route.path !== "string") continue;
    if (route.methods?.get !== true) continue;
    if (!route.path.startsWith("/api/")) continue;
    found.add(route.path);
  }

  const capabilities: Capability[] = [];
  for (const path of Array.from(found).sort()) {
    const entry = DESCRIBED[path];
    if (!entry) continue;
    capabilities.push({
      path,
      description: entry.d,
      pathParams: paramsOf(path),
      query: entry.q ?? [],
      financial: entry.f === true,
    });
  }

  return {
    capabilities,
    describedButMissing: Object.keys(DESCRIBED).filter((p) => !found.has(p)).sort(),
    undecided: Array.from(found).filter((p) => !DESCRIBED[p] && !BLOCKED[p]).sort(),
  };
}
