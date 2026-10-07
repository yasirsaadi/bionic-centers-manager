// **مستنداتُ المرضى في قاعدة البيانات** (ترحيل ١٠٣، §4.cf) — الحفظُ والقراءة.
// المستندُ (`documents`) ومحتواه (`document_files`) يُكتبان في معاملةٍ واحدة: لا مستندَ بلا ملفّ، ولا ملفَّ بلا مستند.
// ورابطُ المستند `/api/documents/:id/file` — يُقرأ بجلسةٍ تصل المريضَ، لا مجلّدٌ مفتوحٌ لكلّ مَن عرف الرابط.

import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { documents, documentFiles } from "@shared/schema";

/** الأنواعُ المقبولة — صورٌ وPDF، كما يقبلها زرُّ الرفع. */
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
/** أقصى حجمٍ للملفّ: ١٠ ميغابايت — والصورُ تُضغط في المتصفّح قبل الرفع فتصل أصغرَ بكثير. */
export const MAX_BYTES = 10 * 1024 * 1024;

export const fileUrlOf = (documentId: number) => `/api/documents/${documentId}/file`;

export async function createDocumentWithFile(p: {
  patientId: number; documentType: string; fileName: string; mimeType: string; content: Buffer;
}) {
  return db.transaction(async (tx) => {
    const [doc] = await tx.insert(documents).values({
      patientId: p.patientId, documentType: p.documentType, fileName: p.fileName, fileUrl: "",
    }).returning();
    await tx.insert(documentFiles).values({ documentId: doc.id, content: p.content, mimeType: p.mimeType, sizeBytes: p.content.length });
    const [withUrl] = await tx.update(documents).set({ fileUrl: fileUrlOf(doc.id) }).where(eq(documents.id, doc.id)).returning();
    return withUrl;
  });
}

export async function getDocument(id: number) {
  const [d] = await db.select().from(documents).where(eq(documents.id, id));
  return d ?? null;
}

export async function getDocumentFile(documentId: number) {
  const [f] = await db.select().from(documentFiles).where(eq(documentFiles.documentId, documentId));
  return f ?? null;
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf",
};

/**
 * **نقلُ ما بقي من القرص إلى القاعدة — مرّةً عند الإقلاع، ولا يتكرّر** (§4.cf).
 * مجلّدُ `uploads/` كان مُتتبَّعاً في git بستّة ملفّاتٍ من كانون الثاني — فهي تصل الخادمَ مع كلّ نشر وتُفتح اليوم. فكلُّ مستندٍ
 * رابطُه `/uploads/…` وملفُّه موجودٌ على القرص يُنقل محتواه إلى `document_files` ويصير رابطُه النقطة. وما لا ملفَّ له يبقى كما هو
 * فيقول «غير متوفّر». ويُعاد بلا أثر: ما نُقل لم يعد رابطُه `/uploads/`.
 */
export async function importLegacyUploads(dir = "uploads"): Promise<{ imported: number; missing: number }> {
  const rows = await db.select({ id: documents.id, fileUrl: documents.fileUrl }).from(documents)
    .where(sql`${documents.fileUrl} LIKE '/uploads/%' AND NOT EXISTS (SELECT 1 FROM document_files f WHERE f.document_id = ${documents.id})`);
  let imported = 0, missing = 0;
  for (const r of rows) {
    const base = path.basename(r.fileUrl);
    const mime = MIME_BY_EXT[path.extname(base).toLowerCase()];
    const full = path.join(dir, base);
    if (!mime || !fs.existsSync(full)) { missing++; continue; }
    const content = await fs.promises.readFile(full);
    if (content.length === 0) { missing++; continue; }
    await db.transaction(async (tx) => {
      await tx.insert(documentFiles).values({ documentId: r.id, content, mimeType: mime, sizeBytes: content.length }).onConflictDoNothing();
      await tx.update(documents).set({ fileUrl: fileUrlOf(r.id) }).where(eq(documents.id, r.id));
    });
    imported++;
  }
  return { imported, missing };
}
