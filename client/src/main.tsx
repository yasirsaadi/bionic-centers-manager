import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { toEnglishDigits } from "./lib/utils";

// Global auth guard: if the SERVER session has expired (any /api call returns
// 401) while the client still holds a saved branch_session, the app used to
// stay in a broken "looks logged in but nothing loads" state until a manual
// logout. Instead, detect that dead session centrally, clear the stale local
// session, and return to the login screen. Login/verify endpoints are exempt
// so a wrong-password 401 doesn't trigger a redirect loop.
{
  const AUTH_EXEMPT = ["/api/verify-branch", "/api/auth/switch-branch", "/api/auth/user", "/api/logout"];
  const originalFetch = window.fetch.bind(window);
  let loggingOut = false;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await originalFetch(input as any, init);
    try {
      const raw = typeof input === "string" ? input
        : input instanceof Request ? input.url
        : String(input);
      const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
      if (
        res.status === 401 &&
        path.startsWith("/api/") &&
        !AUTH_EXEMPT.some((p) => path.startsWith(p)) &&
        !loggingOut &&
        localStorage.getItem("branch_session")
      ) {
        loggingOut = true;
        localStorage.removeItem("branch_session");
        localStorage.removeItem("admin_verified");
        window.location.reload();
      }
    } catch {
      /* never let the guard break a request */
    }
    return res;
  };
}

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
