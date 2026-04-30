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

// Register the service worker. Used for offline fallback and the
// stale-while-revalidate cache. We listen for `updatefound` so the UI
// can show an "update available" banner — see PWAInstallPrompt for
// the corresponding listener and refresh handler.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // When a new SW finishes installing while the page is open,
        // fire a custom event the React tree can react to.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("pwa-update-ready"));
            }
          });
        });
      })
      .catch(() => {
        /* swallow — failing to register the SW shouldn't break the app */
      });

    // After the new SW activates (either via skipWaiting or naturally),
    // reload once so all clients pick up the new asset URLs together.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
