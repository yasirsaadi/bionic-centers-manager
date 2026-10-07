// **ضغطُ صورة المستند في المتصفّح قبل رفعها** (§4.cf): صورةُ الهاتف ٢–٤ ميغابايت تصير نحو ٢٠٠–٤٠٠ كيلوبايت بجودةٍ واضحة،
// فلا تثقل قاعدةَ البيانات. والـPDF، والصورةُ الصغيرة، وما يعجز المتصفّحُ عن قراءته — تُرفع كما هي.
const MAX_SIDE = 2000;
const QUALITY = 0.82;
const SKIP_BELOW = 400 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
