import { useMemo, useState } from "react";
import {
  Users, UserRound, Utensils, CreditCard, Coffee, Search, Filter,
  MoreHorizontal, Layers, ArrowDownAZ, ArrowUpAZ, RotateCcw, Bell,
  Plus, Pencil, Trash2, MessageCircle, MapPin, Phone, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  seedMesas, seedPagamentos, seedPessoas, seedPratos, seedUsuarios,
  tabConfig,
} from "./types";
import type {
  Mesa, Pagamento, Pessoa, Prato, TabKey, Usuario,
} from "./types";
import { colorFor, formatBRL, initials, searchMatch, sortFieldsByTab, sortRecords, stripeFor } from "./utils";
import type { AnyRecord } from "./utils";
import { RecordModal } from "./RecordModal";
import { BatchModal } from "./BatchModal";

const tabIcons: Record<TabKey, React.ReactNode> = {
  usuarios: <Users className="h-5 w-5" />,
  pessoas: <UserRound className="h-5 w-5" />,
  mesas: <Utensils className="h-5 w-5" />,
  pagamentos: <CreditCard className="h-5 w-5" />,
  pratos: <Coffee className="h-5 w-5" />,
};

export function RegistrationsPage() {
  const [tab, setTab] = useState<TabKey>("pessoas");
  const [usuarios, setUsuarios] = useState<Usuario[]>(seedUsuarios);
  const [pessoas, setPessoas] = useState<Pessoa[]>(seedPessoas);
  const [mesas, setMesas] = useState<Mesa[]>(seedMesas);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(seedPagamentos);
  const [pratos, setPratos] = useState<Prato[]>(seedPratos);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const changeTab = (t: TabKey) => {
    setTab(t);
    setQ("");
    setSortDir("asc");
    setSortKey(sortFieldsByTab[t][0].key);
    setPage(1);
  };

  const counts = {
    usuarios: usuarios.length,
    pessoas: pessoas.length,
    mesas: mesas.length,
    pagamentos: pagamentos.length,
    pratos: pratos.length,
  };

  const currentList: AnyRecord[] =
    tab === "usuarios" ? usuarios :
    tab === "pessoas" ? pessoas :
    tab === "mesas" ? mesas :
    tab === "pagamentos" ? pagamentos : pratos;

  const inactiveCount = (currentList as any[]).filter((r) => r.situacao === "Inativo").length;

  const filtered = useMemo(
    () => (currentList as any[]).filter((r) => searchMatch(r, q)),
    [currentList, q],
  );
  const sorted = useMemo(
    () => sortRecords(filtered as any, sortKey as any, sortDir),
    [filtered, sortKey, sortDir],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (rec: AnyRecord) => { setEditing(rec); setModalOpen(true); };

  const save = (rec: AnyRecord) => {
    const update = <T extends AnyRecord>(list: T[], setter: (v: T[]) => void) => {
      const idx = list.findIndex((x) => x.id === rec.id);
      if (idx >= 0) {
        const n = [...list]; n[idx] = rec as T; setter(n);
      } else setter([rec as T, ...list]);
    };
    if (tab === "usuarios") update(usuarios, setUsuarios);
    else if (tab === "pessoas") update(pessoas, setPessoas);
    else if (tab === "mesas") update(mesas, setMesas);
    else if (tab === "pagamentos") update(pagamentos, setPagamentos);
    else update(pratos, setPratos);
    setModalOpen(false);
  };

  const remove = (id: string) => {
    if (tab === "usuarios") setUsuarios(usuarios.filter((r) => r.id !== id));
    else if (tab === "pessoas") setPessoas(pessoas.filter((r) => r.id !== id));
    else if (tab === "mesas") setMesas(mesas.filter((r) => r.id !== id));
    else if (tab === "pagamentos") setPagamentos(pagamentos.filter((r) => r.id !== id));
    else setPratos(pratos.filter((r) => r.id !== id));
  };

  const reload = () => {
    if (tab === "usuarios") setUsuarios(seedUsuarios);
    else if (tab === "pessoas") setPessoas(seedPessoas);
    else if (tab === "mesas") setMesas(seedMesas);
    else if (tab === "pagamentos") setPagamentos(seedPagamentos);
    else setPratos(seedPratos);
    setQ(""); setPage(1);
  };

  const cfg = tabConfig[tab];

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="mx-auto max-w-[1360px] px-6 py-6 lg:px-10 lg:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span>Painel</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-ink">Cadastros</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-orange-500 text-white shadow-lg shadow-brand/30">
                {tabIcons[tab]}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">{cfg.title}</h1>
                <p className="text-sm text-ink-muted">{cfg.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-full border bg-surface p-3 text-ink-muted transition hover:text-ink">
              <Bell className="h-4 w-4" />
              {inactiveCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {inactiveCount}
                </span>
              )}
            </button>
            <Button
              onClick={openNew}
              className="group h-12 gap-3 rounded-2xl bg-gradient-to-br from-brand to-orange-500 pl-3 pr-5 text-brand-foreground shadow-xl shadow-brand/30 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand/40"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Plus className="h-4 w-4" />
              </span>
              <span className="font-semibold">{cfg.ctaLabel}</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(tabConfig) as TabKey[]).map((k) => {
            const active = k === tab;
            return (
              <button
                key={k}
                onClick={() => changeTab(k)}
                className={[
                  "group flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                  active
                    ? "border-brand bg-surface shadow-lg -translate-y-0.5"
                    : "border-transparent bg-white/60 hover:bg-white",
                ].join(" ")}
              >
                <span className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                  active ? "bg-brand text-white" : "bg-brand-soft text-brand",
                ].join(" ")}>
                  {tabIcons[k]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{tabConfig[k].plural}</p>
                  <p className="text-xs text-ink-muted">{counts[k]} {counts[k] === 1 ? "registro" : "registros"}</p>
                </div>
                <span className={[
                  "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  active ? "bg-brand text-white" : "bg-muted text-ink-muted",
                ].join(" ")}>
                  {counts[k]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary cards */}
        <SummaryCards tab={tab} usuarios={usuarios} pessoas={pessoas} mesas={mesas} pagamentos={pagamentos} pratos={pratos} />

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-surface p-2 shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar..."
              className="h-10 rounded-full border-transparent bg-surface-2 pl-9 focus-visible:border-brand focus-visible:bg-surface"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" /> Filtros</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><MoreHorizontal className="h-4 w-4" /> Mais</Button>
          {tab === "mesas" && (
            <Button variant="outline" size="sm" className="gap-1.5 border-brand text-brand hover:bg-brand-soft" onClick={() => setBatchOpen(true)}>
              <Layers className="h-4 w-4" /> Lote
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Ordenar</span>
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortFieldsByTab[tab].map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                title={sortDir === "asc" ? "A → Z" : "Z → A"}
              >
                {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
              </Button>
            </div>
            <span className="hidden md:inline text-xs text-ink-muted">{sorted.length} resultado(s)</span>
            <Button variant="ghost" size="sm" onClick={reload} className="gap-1.5">
              <RotateCcw className="h-4 w-4" /> Recarregar
            </Button>
          </div>
        </div>

        {/* Cards list */}
        <div className="mt-4 space-y-3">
          {pageItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/70 bg-surface p-12 text-center">
              <p className="text-sm font-semibold text-ink">Nenhum registro encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Ajuste a busca ou cadastre um novo {cfg.singular}.</p>
            </div>
          ) : (
            pageItems.map((r) => (
              <RowCard
                key={(r as any).id}
                tab={tab}
                record={r}
                onEdit={() => openEdit(r)}
                onDelete={() => remove((r as any).id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span>Mostrar</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{[10,25,50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <span>por página</span>
          </div>
          <div className="text-xs text-ink-muted">
            {sorted.length === 0
              ? "0 registros"
              : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sorted.length)} de ${sorted.length} registros`}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={[
                    "h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition",
                    p === page ? "bg-brand text-brand-foreground shadow" : "text-ink hover:bg-muted",
                  ].join(" ")}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <RecordModal
        tab={tab}
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
      <BatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        mesas={mesas}
        onCreate={(novas) => setMesas([...novas, ...mesas])}
        onDelete={(ids) => setMesas(mesas.filter((m) => !ids.includes(m.id)))}
      />
    </div>
  );
}

/* ---------- Summary ---------- */
function SummaryCards({
  tab, usuarios, pessoas, mesas, pagamentos, pratos,
}: {
  tab: TabKey; usuarios: Usuario[]; pessoas: Pessoa[]; mesas: Mesa[]; pagamentos: Pagamento[]; pratos: Prato[];
}) {
  const items = (() => {
    if (tab === "pessoas") {
      const total = pessoas.length;
      const inativas = pessoas.filter((p) => p.situacao === "Inativo").length;
      return [
        { label: "Total", value: total, icon: <UserRound />, tone: "bg-brand-soft text-brand" },
        { label: "Clientes", value: pessoas.filter((p) => p.tipos.includes("Cliente")).length, icon: <UserRound />, tone: "bg-sky-100 text-sky-700" },
        { label: "Fornecedores", value: pessoas.filter((p) => p.tipos.includes("Fornecedor")).length, icon: <UserRound />, tone: "bg-violet-100 text-violet-700" },
        { label: "Funcionários", value: pessoas.filter((p) => p.tipos.includes("Funcionario")).length, icon: <UserRound />, tone: "bg-emerald-100 text-emerald-700" },
        { label: "Inativos", value: inativas, hint: `${total ? Math.round((inativas / total) * 100) : 0}% do total`, icon: <UserRound />, tone: "bg-rose-100 text-rose-700" },
      ];
    }
    if (tab === "usuarios") {
      return [
        { label: "Total", value: usuarios.length, icon: <Users />, tone: "bg-brand-soft text-brand" },
        { label: "Ativos", value: usuarios.filter((u) => u.situacao === "Ativo").length, icon: <Users />, tone: "bg-emerald-100 text-emerald-700" },
        { label: "Administradores", value: usuarios.filter((u) => u.perfil === "Administrador").length, icon: <Users />, tone: "bg-violet-100 text-violet-700" },
        { label: "Inativos", value: usuarios.filter((u) => u.situacao === "Inativo").length, icon: <Users />, tone: "bg-rose-100 text-rose-700" },
      ];
    }
    if (tab === "mesas") {
      return [
        { label: "Total", value: mesas.length, icon: <Utensils />, tone: "bg-brand-soft text-brand" },
        { label: "Mesas", value: mesas.filter((m) => m.tipo === "Mesa").length, icon: <Utensils />, tone: "bg-sky-100 text-sky-700" },
        { label: "Comandas", value: mesas.filter((m) => m.tipo === "Comanda").length, icon: <Utensils />, tone: "bg-emerald-100 text-emerald-700" },
      ];
    }
    if (tab === "pagamentos") {
      return [
        { label: "Total de formas", value: pagamentos.length, icon: <CreditCard />, tone: "bg-brand-soft text-brand" },
        { label: "Ativas", value: pagamentos.filter((p) => p.situacao === "Ativo").length, icon: <CreditCard />, tone: "bg-emerald-100 text-emerald-700" },
        { label: "Inativas", value: pagamentos.filter((p) => p.situacao === "Inativo").length, icon: <CreditCard />, tone: "bg-rose-100 text-rose-700" },
      ];
    }
    return [
      { label: "Total", value: pratos.length, icon: <Coffee />, tone: "bg-brand-soft text-brand" },
      { label: "Pratos", value: pratos.filter((p) => p.tipo === "Prato").length, icon: <Coffee />, tone: "bg-sky-100 text-sky-700" },
      { label: "Copos", value: pratos.filter((p) => p.tipo === "Copo").length, icon: <Coffee />, tone: "bg-violet-100 text-violet-700" },
      { label: "Inativos", value: pratos.filter((p) => p.situacao === "Inativo").length, icon: <Coffee />, tone: "bg-rose-100 text-rose-700" },
    ];
  })();

  return (
    <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{it.label}</span>
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${it.tone}`}>{it.icon}</span>
          </div>
          <div className="mt-3 text-3xl font-bold text-ink">{it.value}</div>
          {("hint" in it) && it.hint && <div className="text-xs text-ink-muted">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Row cards ---------- */
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" | "success" | "danger" | "info" | "violet" | "sky" | "emerald" }) {
  const map: Record<string, string> = {
    muted: "bg-muted text-ink",
    brand: "bg-brand-soft text-brand",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}

function DataBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="mt-0.5 truncate text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

function RowCard({
  tab, record, onEdit, onDelete,
}: { tab: TabKey; record: AnyRecord; onEdit: () => void; onDelete: () => void }) {
  const seed = (record as any).id as string;
  const stripe = stripeFor(seed);
  const av = colorFor(seed);

  const heading = tab === "usuarios" ? (record as Usuario).nome
    : tab === "pessoas" ? (record as Pessoa).nome
    : tab === "mesas" ? (record as Mesa).identificacao
    : tab === "pagamentos" ? (record as Pagamento).descricao
    : (record as Prato).nome;

  const sub = tab === "usuarios" ? `@${(record as Usuario).login}`
    : tab === "pessoas" ? (record as Pessoa).documento
    : tab === "mesas" ? (record as Mesa).local
    : tab === "pagamentos" ? `Atalho ${(record as Pagamento).atalho}`
    : (record as Prato).observacoes || (record as Prato).tipo;

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-surface pl-4 pr-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${stripe}`} />
      <div className="flex items-center gap-4 pl-3">
        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${av}`}>
          {initials(heading)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-semibold text-ink">{heading}</h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{sub}</p>
        </div>

        <div className="hidden md:grid gap-6 flex-[2] min-w-0" style={{ gridTemplateColumns: `repeat(${blocksFor(tab, record).length}, minmax(0, 1fr))` }}>
          {blocksFor(tab, record).map((b, i) => (
            <DataBlock key={i} label={b.label}>{b.value}</DataBlock>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function blocksFor(tab: TabKey, r: AnyRecord): { label: string; value: React.ReactNode }[] {
  if (tab === "usuarios") {
    const u = r as Usuario;
    return [
      { label: "Perfil", value: <Chip tone={u.perfil === "Administrador" ? "violet" : u.perfil === "Gerente" ? "info" : "muted"}>{u.perfil}</Chip> },
      { label: "Situação", value: <Chip tone={u.situacao === "Ativo" ? "success" : "danger"}>{u.situacao}</Chip> },
    ];
  }
  if (tab === "pessoas") {
    const p = r as Pessoa;
    return [
      { label: "Tipos", value: (
        <div className="flex flex-wrap gap-1">
          {p.tipos.map((t) => (
            <Chip key={t} tone={t === "Cliente" ? "sky" : t === "Fornecedor" ? "violet" : "emerald"}>
              {t === "Funcionario" ? "Funcionário" : t}
            </Chip>
          ))}
        </div>
      )},
      { label: "Telefone", value: (
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-ink-muted" />
          {p.telefone}
          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
        </span>
      )},
      { label: "Cidade / UF", value: (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-ink-muted" />
          {p.cidade} / {p.uf}
        </span>
      )},
      { label: "Situação", value: <Chip tone={p.situacao === "Ativo" ? "success" : "danger"}>{p.situacao}</Chip> },
    ];
  }
  if (tab === "mesas") {
    const m = r as Mesa;
    return [
      { label: "Local", value: m.local },
      { label: "Tipo", value: <Chip tone={m.tipo === "Mesa" ? "info" : "violet"}>{m.tipo}</Chip> },
    ];
  }
  if (tab === "pagamentos") {
    const p = r as Pagamento;
    return [
      { label: "Taxa", value: `${p.taxa.toFixed(2)}%` },
      { label: "Prazo", value: `${p.prazo} dia(s)` },
      { label: "Atalho", value: <kbd className="inline-flex items-center justify-center rounded-md border border-b-2 border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-[0_2px_0_var(--color-border)]">{p.atalho}</kbd> },
      { label: "Situação", value: <Chip tone={p.situacao === "Ativo" ? "success" : "danger"}>{p.situacao}</Chip> },
    ];
  }
  const pr = r as Prato;
  return [
    { label: "Tipo", value: <Chip tone={pr.tipo === "Prato" ? "info" : "violet"}>{pr.tipo}</Chip> },
    { label: "Valor", value: <span className="font-semibold text-ink">{formatBRL(pr.valor)}</span> },
    { label: "Situação", value: <Chip tone={pr.situacao === "Ativo" ? "success" : "danger"}>{pr.situacao}</Chip> },
  ];
}