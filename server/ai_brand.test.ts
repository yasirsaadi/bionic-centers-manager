// «Bionic AI» لا «Opus» فيما يراه الموظّفون (قرارُ المالك ٢٠٢٦-١١-٢٨ — `shared/ai_brand.ts`).
//   أ. التبديلُ عند العرض: النصُّ القديم يُبدَّل، والمفاتيحُ والأسماءُ الداخلية لا تُمسّ.
//   ب. ردُّ الخادم الحقيقيّ عبر `installAiBrandJson`: ما خزّنته القاعدةُ بالاسم القديم يصل بالجديد، وJSON سليم.
//   ج. حارسُ الشيفرة: لا نصَّ ظاهراً جديداً يكتب «Opus» في الواجهة أو المشترك أو الخادم (خارج التعليقات والترحيلات).
import express from "express";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { brandAiText, AI_BRAND } from "@shared/ai_brand";
import { installAiBrandJson } from "./ai_brand_json";

let failures = 0;
function same(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${label}`);
  if (!ok) console.log(`      expected: ${JSON.stringify(want)}\n      got:      ${JSON.stringify(got)}`);
}

async function main() {
  console.log("── أ. التبديلُ عند العرض ──");
  same("أ.١ الاسمُ القديم في جملةٍ عربية", brandAiText("لم يكتب Opus الخطّة"), "لم يكتب Bionic AI الخطّة");
  same("أ.٢ «Claude Opus» كاتباً ⟵ «Bionic AI» لا «Claude Bionic AI»", brandAiText("Claude Opus"), AI_BRAND);
  same("أ.٣ الأسماءُ الداخلية لا تُمسّ", ["opusVersion", "isOpusAwaiting", "OpusPanel", "physio_opus_plan_ready", "اختبار-Opus"].map(brandAiText),
    ["opusVersion", "isOpusAwaiting", "OpusPanel", "physio_opus_plan_ready", "اختبار-Opus"]);
  same("أ.٤ نصٌّ بلا الاسم يعود كما هو", brandAiText("خطّةٌ يدوية"), "خطّةٌ يدوية");
  same("أ.٥ **«خدمةُ Claude» المخزَّنة قبل التغيير تُعرض «خدمةُ Bionic AI»** ولا تُمسّ «Claude» في غيرها",
    [brandAiText("رفضت خدمةُ Claude الطلب"), brandAiText("تعذّر الاتّصال بخدمة Claude"), brandAiText("Claude Code")],
    ["رفضت خدمةُ Bionic AI الطلب", "تعذّر الاتّصال بخدمة Bionic AI", "Claude Code"]);

  console.log("\n── ب. ردُّ الخادم ──");
  const app = express();
  installAiBrandJson(app);
  const stored = { createdByName: "Claude Opus", error: "لم يكتب Opus خطّة: \"اقتباس\"", isOpusAwaiting: true, opusVersion: 2, n: 3, list: ["Opus: ملاحظة", null] };
  app.get("/x", (_req, res) => res.json(stored));
  app.get("/y", (_req, res) => res.status(409).json({ error: "خطّةٌ يدوية" }));
  const srv = app.listen(0);
  const port = (srv.address() as any).port;
  const r = await fetch(`http://127.0.0.1:${port}/x`);
  same("ب.١ **ما خُزّن بالاسم القديم يصل بالجديد** والمفاتيحُ والأرقامُ كما هي", await r.json(),
    { createdByName: "Bionic AI", error: "لم يكتب Bionic AI خطّة: \"اقتباس\"", isOpusAwaiting: true, opusVersion: 2, n: 3, list: ["Bionic AI: ملاحظة", null] });
  const r2 = await fetch(`http://127.0.0.1:${port}/y`);
  same("ب.٢ الحالةُ والنصُّ بلا الاسم كما هما", [r2.status, await r2.json()], [409, { error: "خطّةٌ يدوية" }]);
  srv.close();

  console.log("\n── ج. حارسُ الشيفرة ──");
  const pat = /(?<![A-Za-z_\-])Opus(?![A-Za-z_0-9])/;
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) { if (n !== "node_modules" && f !== join("server", "migrations")) walk(f); continue; }
      if (!/\.(ts|tsx)$/.test(n) || /\.test\.ts$/.test(n) || f === join("shared", "ai_brand.ts") || f === join("server", "ai_brand_json.ts")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)) return;
        const code = l.split("  //")[0];
        if (pat.test(code) || /(خدمةُ|خدمة|لخدمة|بخدمة) Claude/.test(code)) hits.push(`${f}:${i + 1}`);
      });
    }
  };
  ["client/src", "shared", "server"].forEach(walk);
  same("ج.١ **لا نصَّ ظاهرٌ يكتب «Opus»** — الاسمُ «Bionic AI» (`AI_BRAND`)", hits, []);
  const modelShown: string[] = [];
  const walkClient = (d: string) => readdirSync(d).forEach((n) => { const f = join(d, n);
    if (statSync(f).isDirectory()) return walkClient(f);
    if (/\.tsx?$/.test(n) && readFileSync(f, "utf8").includes("OPUS_MODEL_ID")) modelShown.push(f); });
  walkClient("client/src");
  same("ج.٢ **ولا شارةَ باسم النموذج في الواجهة** (`OPUS_MODEL_ID` للخادم وحده)", modelShown, []);

  console.log(`\n${failures === 0 ? "✅ كلُّ التأكيدات نجحت" : `❌ ${failures} تأكيداً سقط`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
