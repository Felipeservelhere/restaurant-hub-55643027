// Cliente HTTP do SPA Cadastros → api/cadastros_aba.php (sessão PHP).
import type { Mesa, Pagamento, Pessoa, Prato, TabKey, Usuario } from "@/components/registrations/types";

export const SYS_BASE = (() => {
  const m = location.pathname.match(/^(.*?)cadastros-aba\//);
  return m ? m[1] : "/CSGourmet/";
})();

function endpoint(entity: TabKey, action: string): string {
  return `${location.origin}${SYS_BASE}api/cadastros_aba.php?entity=${encodeURIComponent(entity)}&action=${encodeURIComponent(action)}`;
}

async function req<T = any>(entity: TabKey, action: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await fetch(endpoint(entity, action), init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j && j.ok === false)) {
    throw new Error((j && (j.erro || j.error)) || `Falha HTTP ${r.status}`);
  }
  return j as T;
}

export type CadEntityMap = {
  usuarios: Usuario;
  pessoas: Pessoa;
  mesas: Mesa;
  pagamentos: Pagamento;
  pratos: Prato;
};

export async function listEntity<K extends TabKey>(entity: K): Promise<CadEntityMap[K][]> {
  const j = await req<{ ok: boolean; itens: CadEntityMap[K][] }>(entity, "list");
  return Array.isArray(j.itens) ? j.itens : [];
}

export async function listPessoas(): Promise<{ itens: Pessoa[]; empresa: { cidade: string; uf: string } }> {
  const j = await req<{ ok: boolean; itens: Pessoa[]; empresa?: { cidade?: string; uf?: string } }>("pessoas", "list");
  return {
    itens: Array.isArray(j.itens) ? j.itens : [],
    empresa: { cidade: j.empresa?.cidade || "", uf: j.empresa?.uf || "" },
  };
}

export async function reorderPessoas(ids: string[]): Promise<void> {
  await req("pessoas", "reorder", { ids });
}

export async function saveEntity<K extends TabKey>(entity: K, record: CadEntityMap[K] & { senha?: string }): Promise<CadEntityMap[K]> {
  const j = await req<{ ok: boolean; item: CadEntityMap[K] }>(entity, "save", record);
  return j.item;
}

export async function deleteEntity(entity: TabKey, id: string): Promise<void> {
  await req(entity, "delete", { id });
}

export async function toggleEntity(entity: TabKey, id: string): Promise<void> {
  await req(entity, "toggle", { id });
}

export async function loteMesas(payload: {
  de: number;
  ate: number;
  tipo: "Mesa" | "Comanda";
  local: string;
}): Promise<Mesa[]> {
  const j = await req<{ ok: boolean; itens: Mesa[] }>("mesas", "lote", payload);
  return Array.isArray(j.itens) ? j.itens : [];
}

/** Consulta CNPJ na SintegraBrasil (api/fornecedor_cnpj.php). */
export async function consultarCnpjSintegra(cnpj: string): Promise<{
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  ie?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
}> {
  const digits = String(cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("CNPJ inválido");
  const url = `${location.origin}${SYS_BASE}api/fornecedor_cnpj.php?cnpj=${encodeURIComponent(digits)}`;
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok || !j?.dados) {
    throw new Error((j && j.msg) || "Não foi possível consultar o CNPJ.");
  }
  return j.dados;
}
