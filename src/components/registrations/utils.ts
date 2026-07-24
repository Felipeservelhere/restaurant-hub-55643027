import type { Usuario, Pessoa, Mesa, Pagamento, Prato, TabKey } from "./types";

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const avatarPalette = [
  "bg-orange-100 text-orange-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

export const colorFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

export const stripeFor = (seed: string) => {
  const cols = ["bg-brand", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-amber-500"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return cols[h % cols.length];
};

export function searchMatch(record: Record<string, unknown>, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.values(record).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.join(" ").toLowerCase().includes(needle);
    return String(v).toLowerCase().includes(needle);
  });
}

export function sortRecords<T extends Record<string, unknown>>(items: T[], key: keyof T, dir: "asc" | "desc"): T[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
    return String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR", { numeric: true }) * mult;
  });
}

export const sortFieldsByTab: Record<TabKey, { key: string; label: string }[]> = {
  usuarios: [
    { key: "nome", label: "Nome" },
    { key: "login", label: "Login" },
    { key: "perfil", label: "Perfil" },
    { key: "situacao", label: "Situação" },
  ],
  pessoas: [
    { key: "nome", label: "Nome" },
    { key: "documento", label: "CPF/CNPJ" },
    { key: "cidade", label: "Cidade" },
    { key: "situacao", label: "Situação" },
  ],
  mesas: [
    { key: "identificacao", label: "Identificação" },
    { key: "local", label: "Local" },
    { key: "tipo", label: "Tipo" },
  ],
  pagamentos: [
    { key: "descricao", label: "Descrição" },
    { key: "taxa", label: "Taxa" },
    { key: "prazo", label: "Prazo" },
    { key: "atalho", label: "Atalho" },
    { key: "situacao", label: "Situação" },
  ],
  pratos: [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "valor", label: "Valor" },
    { key: "situacao", label: "Situação" },
  ],
};

export type AnyRecord = Usuario | Pessoa | Mesa | Pagamento | Prato;