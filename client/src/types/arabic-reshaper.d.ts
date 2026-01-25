declare module 'arabic-reshaper' {
  function convertArabic(text: string): string;
  function convertArabicBack(text: string): string;
  export { convertArabic, convertArabicBack };
  export default { convertArabic, convertArabicBack };
}
