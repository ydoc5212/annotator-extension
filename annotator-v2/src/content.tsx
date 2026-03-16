import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import css from "./index.css?inline";

const container = document.createElement("div");
container.id = "annotator-v2-root";
container.style.position = "absolute";
container.style.top = "0";
container.style.left = "0";
container.style.width = "100%";
container.style.zIndex = "2147483647";
container.style.pointerEvents = "none";

// Track full document height so the overlay covers all content
const updateHeight = () => {
  const h = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  container.style.height = h + "px";
};
updateHeight();

let debounceTimer: ReturnType<typeof setTimeout>;
const ro = new ResizeObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateHeight, 100);
});
ro.observe(document.body);
ro.observe(document.documentElement);

const shadowRoot = container.attachShadow({ mode: "open" });

// Inject compiled Tailwind CSS directly into shadow DOM
const style = document.createElement("style");
style.textContent = css;
shadowRoot.appendChild(style);

const mountPoint = document.createElement("div");
mountPoint.id = "app-mount";
mountPoint.style.width = "100%";
mountPoint.style.height = "100%";
shadowRoot.appendChild(mountPoint);

document.body.appendChild(container);

createRoot(mountPoint).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Listen for toggle messages from background script (icon click)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_OVERLAY") {
    window.dispatchEvent(new CustomEvent("annotator-toggle"));
  }
});
