// حدُّ جسم طلبات JSON (٢٠٢٦-١٠-٢٥ — «تعذّر الحفظ: request entity too large» عند سليم في نافذة تعديل البروتوكول، §4.fp).
//
// حدُّ Express الافتراضيّ ١٠٠ كيلوبايت يبقى لكلّ الطلبات، **إلّا مكتبةَ البروتوكولات**: نافذةُ التعديل ترسل البروتوكولَ كلَّه بمراجعه
// في حفظٍ واحد، والمفصَّلةُ بلغت ١٢٢ كيلوبايت (الرقبةُ الارتجاجية بـ١٨٠ مرجعاً) فرُفض حفظُ أحدَ عشرَ بروتوكولاً. والحدُّ هنا فوق أكبر جسمٍ
// يقبله `parseProtocolBody` بحدوده (المراجعُ والنصوصُ ونصوصُ الأجهزة) — فلا يُرفض بالحجم ما تقبله قواعدُه.
// **والاختباراتُ تركّب هذه الدالّةَ نفسَها** (`test:physio-protocol-content`) — فما يُختبر هو حدُّ الإنتاج لا حدٌّ يكتبه الاختبار.
import express, { type Express } from "express";

export const PROTOCOL_JSON_LIMIT = "4mb";
export const PROTOCOL_JSON_PATH = "/api/physio/protocols";

type Verify = (req: any, res: any, buf: Buffer, encoding: string) => void;

export function installJsonParsers(app: Express, verify?: Verify): void {
  //  الأوّلُ يقرأ جسمَ المكتبة بحدّها، فيجده الثاني مقروءاً ويمرّ (`req._body`).
  app.use(PROTOCOL_JSON_PATH, express.json({ limit: PROTOCOL_JSON_LIMIT, verify }));
  app.use(express.json({ verify }));
}
