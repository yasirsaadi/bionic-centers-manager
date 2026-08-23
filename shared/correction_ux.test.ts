import assert from "node:assert/strict";
import fs from "node:fs";
import { purchasePresentation, followupEventView } from "./followup_events";
import { CORRECTION_INTENT_LABELS } from "./administrative_reversal";

assert.equal(purchasePresentation({
  status: "closed_admin_void", convertedWorkOrderId: 243,
}), "admin_void", "administrative void must outrank historical work-order identity");
assert.equal(purchasePresentation({
  status: "closed_exam_cancelled", convertedWorkOrderId: 243,
}), "exam_cancelled");
assert.equal(purchasePresentation({
  status: "closed_without_purchase", convertedWorkOrderId: 243,
}), "closed");
assert.equal(purchasePresentation({ status: "converted", convertedWorkOrderId: 243 }), "converted");

const event = followupEventView({
  eventType: "administrative_reversal", note: "اختير الجهاز الخطأ",
  payload: { workOrderId: 243, replacementEpisodeId: 88 },
});
assert.equal(event.title, "أُلغيت العملية إدارياً");
assert(event.facts.includes("أمر التصنيع السابق: #243"));
assert(event.facts.includes("طلب الاستبدال الجديد: #88"));

assert.equal(CORRECTION_INTENT_LABELS.purchase_mistake, "تم تسجيل الشراء بالخطأ");
assert.equal(CORRECTION_INTENT_LABELS.replace_requested_item, "تم اختيار جهاز أو جزء خاطئ");

const dialog = fs.readFileSync("client/src/components/AdministrativeReversalDialog.tsx", "utf8");
assert(dialog.includes("ما الذي تريد تصحيحه؟"));
assert(dialog.includes("requestedItemOptions(preview.serviceType)"));
assert(!dialog.includes("REVERSAL_MODE_LABELS"));

const card = fs.readFileSync("client/src/components/PostExamDecisionCard.tsx", "utf8");
assert(card.includes('data-testid="card-admin-void-history"'));
assert(card.includes("عملية ملغاة إدارياً"));

const store = fs.readFileSync("server/admin_reversal/store.ts", "utf8");
assert(store.includes("'awaiting_exam', 0"));
assert(store.includes("replacementEpisodeId"));
assert(store.includes("replacementRequestedItem"));

console.log("✅ correction UX contracts pass");
