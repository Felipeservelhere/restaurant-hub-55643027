/** Sincroniza o modo noturno do CSGourmet (csm_theme / data-theme) com a classe .dark do SPA. */

export type CsgTheme = "dark" | "light";

export function applyCsgTheme(theme: CsgTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function readFromParent(): CsgTheme | null {
  try {
    if (window.parent && window.parent !== window) {
      const t = window.parent.document.documentElement.getAttribute("data-theme");
      return t === "dark" ? "dark" : "light";
    }
  } catch {
    /* cross-origin */
  }
  return null;
}

function readFromStorage(): CsgTheme {
  try {
    if (localStorage.getItem("csm_theme") === "dark") return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

export function syncCsgThemeNow(): CsgTheme {
  const theme = readFromParent() ?? readFromStorage();
  applyCsgTheme(theme);
  return theme;
}

/** Escuta postMessage do shell, storage e MutationObserver no parent. */
export function startCsgThemeSync(onChange?: (theme: CsgTheme) => void): () => void {
  const emit = (theme: CsgTheme) => {
    applyCsgTheme(theme);
    onChange?.(theme);
  };

  emit(syncCsgThemeNow());

  const onMsg = (ev: MessageEvent) => {
    const d = ev?.data;
    if (!d || d.type !== "csg-theme") return;
    emit(d.theme === "dark" ? "dark" : "light");
  };
  window.addEventListener("message", onMsg);

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== "csm_theme") return;
    emit(ev.newValue === "dark" ? "dark" : "light");
  };
  window.addEventListener("storage", onStorage);

  let mo: MutationObserver | null = null;
  try {
    if (window.parent && window.parent !== window && window.parent.document?.documentElement) {
      mo = new MutationObserver(() => emit(syncCsgThemeNow()));
      mo.observe(window.parent.document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
  } catch {
    /* ignore */
  }

  return () => {
    window.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
    mo?.disconnect();
  };
}
