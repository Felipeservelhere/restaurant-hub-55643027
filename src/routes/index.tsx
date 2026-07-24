import { createFileRoute } from "@tanstack/react-router";
import { RegistrationsPage } from "@/components/registrations/RegistrationsPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadastros — Retaguarda do restaurante" },
      { name: "description", content: "Gerencie usuários, pessoas, mesas, formas de pagamento e cardápio em uma tela única." },
      { property: "og:title", content: "Cadastros — Retaguarda do restaurante" },
      { property: "og:description", content: "Central de cadastros com busca, ordenação, paginação e operações em lote." },
    ],
  }),
  component: Index,
});

function Index() {
  return <RegistrationsPage />;
}
