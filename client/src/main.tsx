import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { toEnglishDigits } from "./lib/utils";

// Global event listener to convert Arabic/Persian digits to English in all inputs
let isConverting = false;
document.addEventListener('input', (e) => {
  if (isConverting) return; // Prevent infinite loop
  
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    const originalValue = target.value;
    const convertedValue = toEnglishDigits(originalValue);
    if (originalValue !== convertedValue) {
      isConverting = true;
      const cursorPosition = target.selectionStart || 0;
      
      // Use native value setter to properly trigger React's onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(target, convertedValue);
      } else {
        target.value = convertedValue;
      }
      
      // Restore cursor position
      target.setSelectionRange(cursorPosition, cursorPosition);
      
      // Trigger React's onChange with the converted value
      target.dispatchEvent(new Event('input', { bubbles: true }));
      
      isConverting = false;
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
