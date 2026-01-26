import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { toEnglishDigits } from "./lib/utils";

// Global event listener to convert Arabic/Persian digits to English in all inputs
document.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    const originalValue = target.value;
    const convertedValue = toEnglishDigits(originalValue);
    if (originalValue !== convertedValue) {
      const cursorPosition = target.selectionStart || 0;
      target.value = convertedValue;
      // Restore cursor position
      target.setSelectionRange(cursorPosition, cursorPosition);
      // Trigger React's onChange
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
