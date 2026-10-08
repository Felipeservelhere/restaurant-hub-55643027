import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { RegistrationsPage } from "../src/components/registrations/RegistrationsPage";
import { startCsgThemeSync, type CsgTheme } from "../src/lib/theme-sync";
import "../src/styles.css";

function App() {
  const [theme, setTheme] = useState<CsgTheme>("light");

  useEffect(() => startCsgThemeSync(setTheme), []);

  return (
    <>
      <RegistrationsPage />
      <Toaster richColors position="top-right" theme={theme} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
