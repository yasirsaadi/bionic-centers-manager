# bionic-centers-manager — مرجع للمساعد الذكي

> هذا الملف يحوي خلاصة المشروع وآخر ما تمّ عليه. اقرأه أولاً قبل أي تعديل
> أو إجابة لتفهم السياق الكامل.

---

## 1. ما هو المشروع

نظام إدارة مراكز الأطراف الصناعية والعلاج الطبيعي (Bionic Centers Manager).
- المالك: Dr Yasir (yasir.s81@gmail.com)
- اللغة الأساسية للواجهة: العربية (RTL).
- المنطقة الزمنية: بغداد (UTC+3).
- المستخدمون الفعليون: موظفو استقبال، مدراء فروع، ومسؤول واحد (admin).

### الوحدات الأساسية
- **المرضى** (`patients`) — بيانات شخصية، نوع الإصابة، الفرع، إجمالي التكلفة.
- **الزيارات** (`visits`) — كل جلسة علاج. مرتبطة بمريض وفرع. تحوي
  `treatment_type`، `session_count`، `cost`، `shift`، `created_by`.
- **الدفعات** (`payments`) — مدفوعات المريض، مع
  `payment_treatment_type` و `session_count`.
- **الفواتير** (`invoices`) + `invoice_items` — للجانب المحاسبي.
- **خطط التقسيط** (`installment_plans`).
- **المستخدمون** (`system_users`) — حسابات الموظفين بأدوار:
  `reception` / `branch_manager` / `admin`. كل حساب يحمل أعلام صلاحية
  دقيقة (مثل `can_delete_visits`, `can_edit_visits`, `can_delete_patients`،
  وغيرها).
- **سجل التدقيق** (`audit_log`) — يستقبل أحداث (create / update / delete)
  مع `entity_type`، `entity_id`، `user_id`، `ip_address`، `old_values`،
  `new_values`. ليست كل النقاط النهائية تكتب فيه — راجع "ثغرات معروفة".
- **تتبّع الجلسات اليومية** (`daily_sessions`, `session_counts`,
  `monthly_targets`) — إحصاءات الأجهزة الـ15 في كل فرع/شفت/يوم.
- **الكشف عن الشذوذ** (`anomaly_decisions` + `server/anomalies/detector.ts`)
  — يكشف فواتير متأخّرة، مرضى بلا دفعات، إلخ. قراءة فقط.
- **النسخ الاحتياطي البريدي** (`server/backup.ts`) — كرون يومي 23:55
  بغداد يرسل
  Excel بكل البيانات لبريد المالك.

### حماية بيانات الزيارات (مهمّة بعد حادثة 2026-06-08)
- **حذف ناعم**: `visits.deleted_at`. كل القراءات تصفّي
  `IS NULL`. `storage.deleteVisit` يحدّث العمود بدل
  `DELETE FROM`، فالضغطة الخاطئة لا تمحو الصف.
- **جدول جنائي**: `visits_forensic_log` يستقبل صورة كاملة من كل صف
  يُحذف فعلياً من `visits` (الكاسكيد عند حذف مريض مثلاً) مع معلومات
  جلسة Postgres (current_user, application_name, client_addr).
- **ترِكر**: `trg_log_visit_delete BEFORE DELETE ON visits` يكتب في
  الجدول الجنائي مهما كان مصدر الحذف (تطبيق، SQL مباشر من Neon Console،
  أي شيء).
- **تسجيل تدقيق لحذف المريض**: `DELETE /api/patients/:id` يكتب الآن في
  `audit_log` قبل تنفيذ الكاسكيد. قبل اليوم كان الحذف صامتاً تماماً.

---

## 2. البنية التقنية

- **الخلفية**: Node 20 + Express + TypeScript + Drizzle ORM.
- **قاعدة البيانات**: PostgreSQL على Neon (production branch).
- **الواجهة**: React + Vite + TanStack Query + Radix UI + Tailwind.
- **النشر**: Render Web Service (auto-deploy على كل دمج إلى `main`).
- **التحقّق من المخطّط**: Drizzle Kit (`npm run db:push` للتطوير).
- **الـ migrations**: ملفات في `server/migrations/`، يشغّلها
  `server/migrations/runner.ts` عند بدء الخادم. كل migration **يجب**
  أن يكون idempotent (يستخدم `IF NOT EXISTS` ونحوه).
- **الجلسات**: `connect-pg-simple` على نفس قاعدة البيانات
  (`sessions` table).
- **المصادقة**: جلسة `branchSession` على `req.session` تحوي
  `userId`, `branchId`, `displayName`, `isAdmin`, `permissions`.

### بيئة عمل وحيدة
- Render خلف Cloudflare، لذلك `req.ip` يُظهر حافة Cloudflare لا IP
  المستخدم الحقيقي. (لم نفعّل قراءة `X-Forwarded-For` بعد).
- ريبلت سابقاً كان يستضيف المشروع، الآن **متوقّف** (يتطلّب تجديد).
  ملف `.replit` ومجلّد `server/replit_integrations/auth/` لا يزالان
  في الريبو لأن المصادقة بُنيت فوقهما؛ يمكن إعادة تسميتها لاحقاً.

---

## 3. أحداث جلسة 2026-06-08

في هذا اليوم تمّ دمج 4 PRs ومعالجة حادثة فقدان بيانات.

### الجدول الزمني للنشر (Baghdad)
| الوقت | الحدث |
|---|---|
| 13:26 | بدء نشر PR #72 |
| 13:28 | PR #72 live (audit + confirm delete) |
| 13:44 | بدء نشر PR #73 |
| 13:46 | PR #73 live (لا منح ضمني لمدراء الفروع) |
| 18:02 | بدء نشر PR #74 |
| 18:04 | PR #74 live (soft delete + forensic trigger) |

### PR #71 — Stop global error handler from crashing the process
**الخلفية**: معالج أخطاء express كان يعيد `throw err` بعد ردّ JSON،
ما يسقط العملية على كل خطأ في طلب — ومنه ضياع طلبات بشكل عشوائي
على الإنتاج.
**التغيير**: حذف `throw err`. الإجراء يبقى آمناً لأن JSON قد أُرسل
للعميل، وحدّ Sentry/تسجيل الأخطاء يكفي.

### PR #72 — Protect visits: confirm-to-delete + audit edit/delete
**الخلفية**: المريض حميد ذياب سبع (ID 1473) فقد زياراته بشكل صامت.
لا يوجد دليل من سجلّ التطبيق.
**التغيير**:
- نافذة تأكيد (`AlertDialog`) قبل حذف زيارة في الواجهة.
- استدعاء `logAudit` في كلٍّ من `PATCH /api/visits/:id` و
  `DELETE /api/visits/:id` مع `oldValues` + `newValues` + IP +
  user_agent.

### PR #73 — Stop auto-granting visit-delete to branch_manager role
**الخلفية**: منطق تسجيل الدخول كان يمنح `canDeleteVisits=true` لكل
من دوره `branch_manager` بغضّ النظر عن العمود في صفّه. الواجهة لا
تكشف هذا المنح الضمني.
**التغيير**: في `server/routes.ts` تحوّل
```ts
canDeleteVisits: grantAll || systemUser.canDeleteVisits
```
إلى
```ts
canDeleteVisits: Boolean(systemUser.canDeleteVisits)
```
بقي `canEditVisits` على المنح الضمني لأن التعديل قابل للاسترجاع.

### PR #74 — Protect visits with soft delete + Postgres-level forensic trigger
**الخلفية**: تحقيق ميداني كامل بالكود وبيانات Neon لم يجد مساراً
يفسّر فقدان زيارات حميد ذياب. مفصّل في القسم 4 أدناه.
**التغيير** (3 طبقات حماية مستقلّة):
1. `migration 011_visit_soft_delete_and_forensic.ts`:
   - عمود `deleted_at TIMESTAMPTZ` + partial indexes.
   - جدول `visits_forensic_log` بـ 16 عمود.
   - ترِكر `trg_log_visit_delete BEFORE DELETE` على visits.
2. الحذف الناعم في كل أنحاء التطبيق:
   - `storage.deleteVisit` يضع `deleted_at` بدل `DELETE`.
   - كل القراءات (`getVisitsByPatientId / ByPatientIds / ByBranch /
     getAllVisits` + raw SQL الإحصائيات + التقرير اليومي + كاشف
     الشذوذ + القراءات الإنلاين في handlers) تصفّي
     `deleted_at IS NULL`.
3. `DELETE /api/patients/:id` يستدعي `logAudit` قبل الكاسكيد.

---

## 4. حادثة فقدان زيارات حميد ذياب سبع

### الوقائع
- المريض: **حميد ذياب سبع** = ID **1473**.
- في صبيحة 2026-06-08 كان لديه 4 زيارات ظاهرة في الواجهة:
  - 03/06 الساعة 20:06 بغداد
  - 04/06 الساعة 13:53 بغداد
  - 07/06 الساعة 17:20 بغداد
  - 08/06 الساعة 12:08 بغداد (أنشأتها ريام)
- بعد ظهر 08/06، **اختفت الزيارات الأربع دفعة واحدة**. بقيت فقط
  زيارة id=7909 (الساعة 13:07 بغداد، أنشأتها ريام أيضاً، **بعد**
  حدث الاختفاء).
- ريام (user_id=7، role=reception، `can_delete_visits=true`)
  هي المستخدم الوحيد الذي دخل اليوم.
- المالك يؤكّد أن ريام لم تحذف ولا أحد دخل بصلاحية حذف عمداً.
- قبل الاختفاء، ريام لاحظت أن حميد ذياب لديه "ناقص 1 جلسة" — أي
  عدد زياراته أكبر من جلساته المدفوعة.
- **`audit_log` لا يحوي أي قيد حذف زيارة** قبل النشر أو بعده.
  (PR #72 الذي يضيف audit للحذف نُشر 13:28؛ الاختفاء وقع بعد ذلك
  وفقاً للمالك، ومع ذلك لا سجل).
- **دفعات حميد ذياب الخمس سليمة**. صفّه في `patients` سليم.

### ما استبعدته المراجعة الكاملة للكود
| المحتمل | الحكم |
|---|---|
| `DELETE /api/visits/:id` | يسجّل تدقيقاً منذ PR #72؛ لا سجلّات |
| `deletePatient(1473)` cascade | كان سيمسح الدفعات. سليمة. |
| FK CASCADE | كل FKs على visits = NO ACTION |
| Triggers قديمة | لا توجد (`information_schema.triggers` فارغ قبل PR #74) |
| حذف مستخدم نظام/فرع اليوم | لا |
| حذف مريض اليوم | لا (لا فجوات في patient_ids) |
| كاشف الشذوذ، sessions module، backup cron، treatment plans | كلها قراءة فقط أو لا تلمس visits |
| PATCH /api/visits/:id | يحدّث 6 حقول فقط، لا يحذف ولا يعيد إسناد |
| Frontend hooks / useEffect | لا حلقات حذف، لا تأثيرات تلقائية |
| ريبلت يعمل ويصل لنفس DB | متوقّف (متأكّد) |
| Neon Backup & Restore | لم تحدث عملية اليوم |
| استدعاء SQL مباشر | لم يحدث (متأكّد) |

### النتيجة المعلنة
**لا يمكنني تحديد السبب من الكود وحده**. النمط الذي رأيناه (4 زيارات
محدّدة محذوفة + 6 زيارات لمرضى آخرين أنشأتها ريام اليوم بـ IDs
7900-7906 ما عدا 7903، مع إبقاء صفّ المريض ودفعاته وبدون سجل تدقيق)
لا تنتجه أي شيفرة في الإنتاج اليوم. الحماية في PR #74 وُضعت تحديداً
لضمان أن أي تكرار سيخلّف أدلة قاطعة.

### ما يجب على المالك فعله
1. **إعادة إدخال زيارات حميد ذياب الأربع المفقودة** يدوياً من
   السجلات الورقية (المالك يحتفظ بها).
2. **مراقبة دورية**:
   ```sql
   SELECT * FROM visits_forensic_log ORDER BY logged_at DESC LIMIT 20;
   ```
   المعتاد أن يبقى الجدول فارغاً. أي صفّ فيه = إشارة فورية.

---

## 5. ثغرات معروفة لم تُعالج بعد

- **`req.ip` يُظهر حافة Cloudflare**: نحتاج `app.set('trust proxy', N)`
  مع N متوافق مع Cloudflare وقراءة `X-Forwarded-For`.
- **عناصر ريبلت**: `.replit`, `server/replit_integrations/auth/`
  لا تزال موجودة. الكود يعمل لكن التسمية مضلّلة بعد الانتقال إلى
  Render.
- **`deletePatient` cascade ضخم وصامت سابقاً**: الآن audit_log
  يسجّله، لكن قد يستحقّ تحويله إلى soft delete أيضاً (المريض
  وتوابعه) لحماية أعمق.
- **توحيد الجلسات والمصادقة بين Render وأي مثيل سابق**: حالياً
  لا يوجد فرض على عدد المثيلات، فإذا تعدّدت عمّال Render قد ترى
  تضارباً (نظرياً).
- **مهلة إعادة النشر**: PR #74 لا يحوي اختبارات؛ كل التحقّق يدوي
  عبر استعلامات Neon.

---

## 6. الأماكن المهمّة في الريبو

```
server/
  index.ts               # نقطة البدء؛ يشغّل migrations ثم registerRoutes ثم cron
  routes.ts              # كل نقاط REST. ضخم (~4900 سطراً).
  storage.ts             # جميع عمليات Drizzle. ضخم. يحوي deletePatient cascade.
  db.ts                  # pg pool + Drizzle client + معالج الأخطاء.
  backup.ts              # كرون النسخة اليومية بالبريد.
  accounting/
    ledger.ts            # logAudit() يكتب في audit_log.
    routes.ts            # نقاط محاسبية.
  anomalies/
    detector.ts          # كشف الشذوذ (قراءة فقط).
  sessions_module/
    routes.ts            # تتبّع الجلسات اليومية لكل جهاز.
  replit_integrations/
    auth/                # المصادقة (مُعاد استخدامها بعد الانتقال).
  migrations/
    runner.ts            # يشغّل الـ migrations المرتّبة على البدء.
    001_..010_..., 011_visit_soft_delete_and_forensic.ts
shared/
  schema.ts              # Drizzle schemas + zod inserts. صدر الحقيقة لجميع الجداول.
client/src/
  hooks/use-patients.ts  # mutations: addVisit / updateVisit / deleteVisit
  pages/PatientDetails.tsx # صفحة المريض (تعرض الجلسات والمتبقّي).
.replit                  # إعداد ريبلت (المشروع قديماً عليه).
```

---

## 7. أوامر مفيدة

```bash
# تحقّق الأنواع
npx tsc --noEmit

# تشغيل التطوير
npm run dev

# دمج تحديثات schema للقاعدة المحلية
npm run db:push

# عند ملاحظة سلوك غير مفهوم على الإنتاج، الاستعلامات الأولى:
# (تنفّذ في Neon Console > SQL Editor)
SELECT entity_type, action, COUNT(*) AS n, MAX(created_at) AS last
FROM audit_log
GROUP BY entity_type, action
ORDER BY entity_type, action;

SELECT * FROM visits_forensic_log
ORDER BY logged_at DESC LIMIT 50;
```

---

## 8. ملاحظات للمساعد التالي

- المالك يكتب بالعربية ويفضّل الردود بالعربية مع اقتباس أسماء التقنية
  بالإنجليزية. الأسلوب مباشر وموجز.
- **سياسة الدمج (أمر دائم من المالك 2026-06-08)**: عند الانتهاء من أي
  PR طلبه المالك، **ادمجه فوراً** بدون انتظار موافقة صريحة لكل مرة.
  المالك أعطى تفويضاً عاماً ولا يريد سؤاله في كل دمج. وأبلغ هذا
  للمساعدين القادمين عبر هذا الملف.
- **لا تنفّذ شيئاً مدمّراً على الإنتاج بدون إذن صريح**: مثل
  drop column, drop table, DELETE بدون WHERE.
- إن طلب المالك تشخيص اختفاء بيانات: ابدأ بـ
  `audit_log` و `visits_forensic_log`. هما المصدران الرسميان الآن.
- الـ migrations تُشغّل تلقائياً عند بدء الخادم. لا حاجة لخطوة يدوية
  على Render.
- النشر يحدث تلقائياً عند الدمج إلى `main`، لكن **يمكن يدوياً** عبر
  Render Dashboard → Manual Deploy → Deploy latest commit.
- المالك ليس له شيل على Neon ولا psql محلياً (لاحظ Neon Console فقط).
  السكربتات المقترحة يجب أن تكون لصقاً مباشراً في SQL Editor.
