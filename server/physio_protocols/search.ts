// **البحثُ في محتوى البروتوكولات** (§4.dc) — يبني لكلّ بروتوكولٍ حقولَه باللغتين (الاسم، النصوص، الأجهزة، المراحل وبطاقات تمارينها،
// المقاييس، المراجع) ويرتّب بالقاعدة المشتركة `rankProtocols` (`shared/protocol_search.ts`).
// المكتبةُ صغيرة (عشراتُ البروتوكولات) فالبحثُ في الذاكرة بعد خمسة استعلاماتٍ لا فهرسَ نصّياً — وبتطبيعٍ واحدٍ مع سجلّ المرضى.
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  devices, physioExercises, physioProtocolDevices, physioProtocolMeasures, physioProtocolPhaseExercises, physioProtocolPhases, physioProtocols,
} from "@shared/schema";
import { FIELD_WEIGHTS as W, rankProtocols, type ProtocolDoc, type ProtocolMatch, type SearchField } from "@shared/protocol_search";

const f = (key: string, label: string, labelEn: string, weight: number, text: unknown): SearchField =>
  ({ key, label, labelEn, weight, text: typeof text === "string" ? text : null });

/** حقولُ نصّين متقابلين (عربيّ وإنكليزيّ) بالمكان نفسِه. */
const bi = (key: string, label: string, labelEn: string, weight: number, ar: unknown, en: unknown): SearchField[] =>
  [f(key, label, labelEn, weight, ar), f(`${key}En`, label, labelEn, weight, en)];

/** يرتّب مجموعةَ بروتوكولاتٍ (بمعرّفاتها) لسؤال — ويُرجع المطابقاتِ مرتّبةً. */
export async function searchProtocolIds(ids: number[], q: string, lang?: "ar" | "en"): Promise<ProtocolMatch[]> {
  if (!ids.length) return [];
  const [protos, devs, phases, phaseEx, measures] = await Promise.all([
    db.select().from(physioProtocols).where(inArray(physioProtocols.id, ids)),
    db.select({
      protocolId: physioProtocolDevices.protocolId, code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn,
      parameters: physioProtocolDevices.parameters, parametersEn: physioProtocolDevices.parametersEn,
      note: physioProtocolDevices.note, noteEn: physioProtocolDevices.noteEn,
    }).from(physioProtocolDevices).innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
      .where(inArray(physioProtocolDevices.protocolId, ids)).orderBy(asc(physioProtocolDevices.displayOrder)),
    db.select().from(physioProtocolPhases).where(inArray(physioProtocolPhases.protocolId, ids)).orderBy(asc(physioProtocolPhases.position)),
    db.select({
      protocolId: physioProtocolPhases.protocolId, position: physioProtocolPhases.position,
      code: physioExercises.code, nameAr: physioExercises.nameAr, nameEn: physioExercises.nameEn,
      purpose: physioExercises.purpose, purposeEn: physioExercises.purposeEn,
      doseNote: physioProtocolPhaseExercises.doseNote, doseNoteEn: physioProtocolPhaseExercises.doseNoteEn,
      note: physioProtocolPhaseExercises.note, noteEn: physioProtocolPhaseExercises.noteEn,
    }).from(physioProtocolPhaseExercises)
      .innerJoin(physioProtocolPhases, eq(physioProtocolPhases.id, physioProtocolPhaseExercises.phaseId))
      .innerJoin(physioExercises, eq(physioExercises.id, physioProtocolPhaseExercises.exerciseId))
      .where(and(inArray(physioProtocolPhases.protocolId, ids))),
    db.select({ protocolId: physioProtocolMeasures.protocolId, code: physioProtocolMeasures.code, nameAr: physioProtocolMeasures.nameAr,
      nameEn: physioProtocolMeasures.nameEn }).from(physioProtocolMeasures).where(inArray(physioProtocolMeasures.protocolId, ids)),
  ]);

  const docs: ProtocolDoc[] = protos.map((p) => {
    const fields: SearchField[] = [
      f("title", "اسم الحالة", "Condition", W.title, p.titleAr),
      f("titleEn", "اسم الحالة", "Condition", W.title, p.titleEn),
      f("code", "الرمز", "Code", W.code, p.code),
      ...bi("summary", "نظرة عامة", "Overview", W.summary, p.summary, p.summaryEn),
      ...bi("goals", "الأهداف", "Goals", W.goals, p.goals, p.goalsEn),
      ...bi("exercises", "التمارين والبرنامج المنزلي", "Exercises & home programme", W.exercises, p.exercises, p.exercisesEn),
      ...bi("assessment", "التقييم والقياسات", "Assessment", W.assessment, p.assessment, p.assessmentEn),
      ...bi("contraindications", "موانع الاستعمال", "Contraindications", W.contraindications, p.contraindications, p.contraindicationsEn),
      ...bi("precautions", "احتياطات", "Precautions", W.precautions, p.precautions, p.precautionsEn),
    ];
    for (const d of devs.filter((x) => x.protocolId === p.id)) {
      //  اسمُ الجهاز مقتطفُ نفسِه — فالمكانُ «الأجهزة» لا «جهاز: تيكار: تيكار».
      fields.push(...bi(`device:${d.code}`, "الأجهزة", "Devices", W.device, d.nameAr, d.nameEn));
      fields.push(...bi(`deviceParams:${d.code}`, `معاملات ${d.nameAr}`, `${d.nameEn} parameters`, W.deviceText, d.parameters, d.parametersEn));
      fields.push(...bi(`deviceNote:${d.code}`, `ملاحظة ${d.nameAr}`, `${d.nameEn} note`, W.deviceText, d.note, d.noteEn));
    }
    for (const ph of phases.filter((x) => x.protocolId === p.id)) {
      const lab = `المرحلة ${ph.position}`;
      const labEn = `Phase ${ph.position}`;
      fields.push(...bi(`phase${ph.position}`, `${lab}: ${ph.nameAr}`, `${labEn}: ${ph.nameEn}`, W.phaseName, ph.nameAr, ph.nameEn));
      fields.push(...bi(`phase${ph.position}.goals`, `${lab} — الأهداف`, `${labEn} — goals`, W.phaseText, ph.goals, ph.goalsEn));
      fields.push(...bi(`phase${ph.position}.education`, `${lab} — ما يُقال للمريض`, `${labEn} — education`, W.phaseText, ph.education, ph.educationEn));
      fields.push(...bi(`phase${ph.position}.criteria`, `${lab} — معيار الانتقال`, `${labEn} — progression`, W.phaseText, ph.progressCriteria, ph.progressCriteriaEn));
      fields.push(...bi(`phase${ph.position}.notes`, `${lab} — ملاحظات`, `${labEn} — notes`, W.phaseText, ph.notes, ph.notesEn));
    }
    for (const x of phaseEx.filter((e) => e.protocolId === p.id)) {
      const lab = `تمرين: ${x.nameAr} (المرحلة ${x.position})`;
      const labEn = `Exercise: ${x.nameEn} (phase ${x.position})`;
      fields.push(...bi(`ex${x.position}:${x.code}`, `تمارين المرحلة ${x.position}`, `Phase ${x.position} exercises`, W.exerciseCard, x.nameAr, x.nameEn));
      fields.push(...bi(`exPurpose${x.position}:${x.code}`, lab, labEn, W.phaseText, x.purpose, x.purposeEn));
      fields.push(...bi(`exDose${x.position}:${x.code}`, lab, labEn, W.phaseText, [x.doseNote, x.note].filter(Boolean).join(" — ") || null,
        [x.doseNoteEn, x.noteEn].filter(Boolean).join(" — ") || null));
    }
    for (const m of measures.filter((x) => x.protocolId === p.id)) {
      fields.push(...bi(`measure:${m.code}`, "مقياس التقييم", "Outcome measure", W.measure, m.nameAr, m.nameEn));
    }
    const refs = Array.isArray(p.references) ? (p.references as { title?: string; org?: string }[]) : [];
    refs.forEach((r, i) => fields.push(f(`ref${i}`, "المراجع", "References", W.reference, [r.title, r.org].filter(Boolean).join(" — "))));
    return { id: p.id, fields };
  });
  return rankProtocols(docs, q, { lang });
}
