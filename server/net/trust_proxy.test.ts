// `req.ip` = جهازُ الموظّف خلف Cloudflare وموازن Render (§4.bq) — `npm run test:trust-proxy`.
// خادمُ Express حقيقيّ على منفذٍ محلّيّ، والترويساتُ بشكلها المقيس على الإنتاج.
import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { TRUST_PROXY } from "./trust_proxy";
import { readFileSync } from "fs";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${expected}\n      got:      ${got}`}`);
}

const app = express();
app.set("trust proxy", TRUST_PROXY);
app.get("/ip", (req, res) => { res.send(req.ip ?? ""); });
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const port = (server.address() as AddressInfo).port;
const ipFor = (xff?: string) => new Promise<string>((resolve, reject) => {
  http.get({ host: "127.0.0.1", port, path: "/ip", headers: xff ? { "x-forwarded-for": xff } : {} }, (res) => {
    let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b));
  }).on("error", reject);
});

same("١. الشكلُ المقيس على الإنتاج ⟵ جهازُ الموظّف", await ipFor("37.239.130.199, 172.69.150.58"), "37.239.130.199");
same("٢. وعنوانٌ مزوَّرٌ يسارَه لا يُبلَغ", await ipFor("1.2.3.4, 37.239.130.199, 172.69.150.58"), "37.239.130.199");
same("٣. وحافّةُ Cloudflare بعنوان IPv6", await ipFor("37.239.130.199, 2606:4700:10::6816:1"), "37.239.130.199");
same("٤. وقفزةٌ غريبة لا يُوثَق بها — يقف عندها", await ipFor("37.239.130.199, 5.5.5.5"), "5.5.5.5");
same("٥. وبلا ترويسة ⟵ عنوانُ المقبس", await ipFor(), "127.0.0.1");

//  ٦. والخادمُ الحقيقيّ يضبط القيمةَ نفسَها — لا رقمَ قفزاتٍ باقياً.
const auth = readFileSync("server/replit_integrations/auth/replitAuth.ts", "utf8")
  .replace(/^[ \t]*\/\/.*$/gm, "");
same("٦. `setupAuth` يضبط TRUST_PROXY", /app\.set\("trust proxy", TRUST_PROXY\)/.test(auth)
  && !/app\.set\("trust proxy", \d+\)/.test(auth), true);

server.close();
if (failures > 0) { console.log(`\n❌ ${failures} فشل`); process.exit(1); }
console.log("\n✅ كل فحوص عنوان الجهاز نجحت");
