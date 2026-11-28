// **ردُّ JSON يقول «Bionic AI» لا «Opus»** (`shared/ai_brand.ts`): ما خزّنته القاعدةُ بالاسم القديم يُبدَّل عند العرض، والمخزَّنُ كما هو.
// النصُّ المسلسَل يُفحص مرّةً؛ والاستبدالُ لا يمسّ مفتاحاً (المفاتيحُ `opus…` بحرفٍ صغير أو ملتصقةٌ بحروف) ولا يكسر JSON
// (البديلُ بلا علامة اقتباسٍ ولا شرطةٍ مائلة).
import type { Express } from "express";
import { brandAiText } from "@shared/ai_brand";

export function installAiBrandJson(app: Express): void {
  app.use((_req, res, next) => {
    const original = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (body === undefined) return original(body);
      const text = JSON.stringify(body);
      if (text === undefined || !text.includes("Opus")) return original(body);
      return original(JSON.parse(brandAiText(text)));
    }) as typeof res.json;
    next();
  });
}
