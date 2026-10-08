import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users, UserRound, Utensils, CreditCard, Coffee, Search, Filter,
  MoreHorizontal, ArrowDownAZ, ArrowUpAZ, RotateCcw,
  Plus, Pencil, Trash2, MessageCircle, MapPin, Phone, Loader2, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tabConfig } from "./types";
import type {
  Mesa, Pagamento, Pessoa, Prato, TabKey, Usuario,
} from "./types";
import { colorFor, formatBRL, initials, searchMatch, sortFieldsByTab, sortRecords, stripeFor } from "./utils";
import type { AnyRecord } from "./utils";
import { RecordModal } from "./RecordModal";
import { BatchModal } from "./BatchModal";
import { deleteEntity, listEntity, listPessoas, loteMesas, reorderPessoas, saveEntity } from "@/lib/cadastros-api";
import { toast } from "sonner";

const tabIcons: Record<TabKey, React.ReactNode> = {
  usuarios: <UserRound className="h-5 w-5" />,
  pessoas: <Users className="h-5 w-5" />,
  mesas: <Utensils className="h-5 w-5" />,
  pagamentos: <CreditCard className="h-5 w-5" />,
  pratos: <Coffee className="h-5 w-5" />,
};

export function RegistrationsPage() {
  const [tab, setTab] = useState<TabKey>("pessoas");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pratos, setPratos] = useState<Prato[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("ordem");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [empresaDefaults, setEmpresaDefaults] = useState({ cidade: "", uf: "" });
  const dragIdRef = useRef<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const loadTab = useCallback(async (t: TabKey) => {
    setLoading(true);
    setLoadError(null);
    try {
      if (t === "usuarios") setUsuarios(await listEntity("usuarios"));
      else if (t === "pessoas") {
        const { itens, empresa } = await listPessoas();
        setPessoas(itens);
        setEmpresaDefaults(empresa);
      }
      else if (t === "mesas") setMesas(await listEntity("mesas"));
      else if (t === "pagamentos") setPagamentos(await listEntity("pagamentos"));
      else setPratos(await listEntity("pratos"));
    } catch (e: any) {
      setLoadError(e?.message || "Falha ao carregar");
      toast.error(e?.message || "Falha ao carregar do banco");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  // Prefetch counts for other tabs (leve)
  useEffect(() => {
    void (async () => {
      try {
        const [u, p, m, g, r] = await Promise.all([
          listEntity("usuarios").catch(() => null),
          listPessoas().catch(() => null),
          listEntity("mesas").catch(() => null),
          listEntity("pagamentos").catch(() => null),
          listEntity("pratos").catch(() => null),
        ]);
        if (u) setUsuarios(u);
        if (p) {
          setPessoas(p.itens);
          setEmpresaDefaults(p.empresa);
        }
        if (m) setMesas(m);
        if (g) setPagamentos(g);
        if (r) setPratos(r);
      } catch { /* ignore */ }
    })();
  }, []);

  const changeTab = (t: TabKey) => {
    setTab(t);
    setQ("");
    setSortDir("asc");
    setSortKey(sortFieldsByTab[t][0].key);
    setPage(1);
  };

  const canReorderPessoas = tab === "pessoas" && sortKey === "ordem" && sortDir === "asc" && !q.trim();

  const onReorderPessoas = async (fromId: string, toId: string) => {
    if (!canReorderPessoas || fromId === toId) return;
    const list = sortRecords(pessoas as any, "ordem", "asc") as Pessoa[];
    const from = list.findIndex((p) => p.id === fromId);
    const to = list.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const withOrd = next.map((p, i) => ({ ...p, ordem: i + 1 }));
    setPessoas(withOrd);
    try {
      await reorderPessoas(withOrd.map((p) => p.id));
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar a ordem");
      void loadTab("pessoas");
    }
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

  const save = async (rec: AnyRecord) => {
    setSaving(true);
    try {
      const payload = { ...rec } as any;
      if (!payload.id) delete payload.id;
      const saved = await saveEntity(tab as any, payload);
      const upsert = <T extends { id: string }>(list: T[], setter: (v: T[]) => void, item: T) => {
        const idx = list.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          const n = [...list]; n[idx] = item; setter(n);
        } else setter([item, ...list]);
      };
      if (tab === "usuarios") upsert(usuarios, setUsuarios, saved as Usuario);
      else if (tab === "pessoas") upsert(pessoas, setPessoas, saved as Pessoa);
      else if (tab === "mesas") upsert(mesas, setMesas, saved as Mesa);
      else if (tab === "pagamentos") upsert(pagamentos, setPagamentos, saved as Pagamento);
      else upsert(pratos, setPratos, saved as Prato);
      setModalOpen(false);
      toast.success("Salvo no banco.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Desativar / remover este registro?")) return;
    try {
      await deleteEntity(tab, id);
      if (tab === "usuarios") setUsuarios(usuarios.filter((r) => r.id !== id));
      else if (tab === "pessoas") setPessoas(pessoas.filter((r) => r.id !== id));
      else if (tab === "mesas") setMesas(mesas.filter((r) => r.id !== id));
      else if (tab === "pagamentos") setPagamentos(pagamentos.filter((r) => r.id !== id));
      else setPratos(pratos.filter((r) => r.id !== id));
      toast.success("Removido.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    }
  };

  const clearPagamentoAtalho = async (id: string) => {
    const rec = pagamentos.find((p) => p.id === id);
    if (!rec) return;
    try {
      const saved = await saveEntity("pagamentos", { ...rec, atalho: "—" });
      setPagamentos((prev) => prev.map((p) => (p.id === id ? (saved as Pagamento) : p)));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar atalho anterior");
    }
  };

  const reload = () => { void loadTab(tab); setQ(""); setPage(1); };

  const cfg = tabConfig[tab];

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="mx-auto max-w-[1360px] px-6 py-6 lg:px-10 lg:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
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
            <Button
              onClick={openNew}
              className="group h-12 cursor-pointer gap-3 rounded-2xl bg-gradient-to-br from-brand to-orange-500 pl-3 pr-5 text-brand-foreground shadow-xl shadow-brand/30 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand/40"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Plus className="h-4 w-4" />
              </span>
              <span className="font-semibold">{cfg.ctaLabel}</span>
            </Button>
          </div>
        </div>

        {/* Tabs — navegação em destaque */}
        <nav className="mt-6 rounded-2xl border border-border/80 bg-surface p-2 shadow-sm" aria-label="Seções de cadastro">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {(Object.keys(tabConfig) as TabKey[]).map((k) => {
              const active = k === tab;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => changeTab(k)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                    active
                      ? "border-brand/40 bg-gradient-to-br from-brand/10 via-surface to-brand/5 shadow-md shadow-brand/10 ring-2 ring-brand/25 -translate-y-0.5 dark:from-brand/20 dark:to-brand/5"
                      : "border-transparent bg-surface-2/60 hover:-translate-y-0.5 hover:border-brand/20 hover:bg-surface hover:shadow-sm",
                  ].join(" ")}
                >
                  <span className={[
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200",
                    active
                      ? "scale-105 bg-gradient-to-br from-brand to-orange-500 text-white shadow-md shadow-brand/30"
                      : "bg-brand-soft text-brand group-hover:scale-105",
                  ].join(" ")}>
                    {tabIcons[k]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={["text-[13px] font-bold leading-snug tracking-tight whitespace-normal break-words", active ? "text-brand" : "text-ink"].join(" ")}>
                      {tabConfig[k].plural}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {counts[k]} {counts[k] === 1 ? "registro" : "registros"}
                    </p>
                  </div>
                  <span className={[
                    "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                    active ? "bg-brand text-white" : "bg-muted text-ink-muted group-hover:bg-brand-soft group-hover:text-brand",
                  ].join(" ")}>
                    {counts[k]}
                  </span>
                  {active && (
                    <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand to-orange-500" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Summary cards */}
        <SummaryCards tab={tab} usuarios={usuarios} pessoas={pessoas} mesas={mesas} pagamentos={pagamentos} pratos={pratos} />

        {/* Busca em destaque */}
        <div className="mt-6 rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-brand/[0.06] via-surface to-surface p-4 shadow-sm sm:p-5">
          <label htmlFor="csg-cad-busca" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm shadow-brand/30">
              <Search className="h-4 w-4" />
            </span>
            Buscar em {cfg.plural.toLowerCase()}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand/70" />
            <Input
              id="csg-cad-busca"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={`Digite nome, documento, login… (${cfg.singular})`}
              className="h-14 rounded-2xl border-2 border-brand/20 bg-surface pl-12 pr-4 text-base text-ink shadow-inner placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/20"
            />
          </div>
          {q.trim() && (
            <p className="mt-2 text-xs text-ink-muted">
              Filtrando por “<span className="font-semibold text-ink">{q.trim()}</span>” · {sorted.length} resultado(s)
            </p>
          )}
        </div>

        {/* Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-surface p-2 shadow-sm">
          <Button variant="outline" size="sm" className="cursor-pointer gap-1.5"><Filter className="h-4 w-4" /> Filtros</Button>
          <Button variant="outline" size="sm" className="cursor-pointer gap-1.5"><MoreHorizontal className="h-4 w-4" /> Mais</Button>
          {tab === "mesas" && (
            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={() => setBatchOpen(true)}>
              <Trash2 className="h-4 w-4" /> Excluir em lote
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Ordenar</span>
              <Select
                value={sortKey}
                onValueChange={(v) => {
                  setSortKey(v);
                  if (v === "ordem") setSortDir("asc");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-36 cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortFieldsByTab[tab].map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm"
                className="cursor-pointer"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                title={sortDir === "asc" ? "A → Z" : "Z → A"}
              >
                {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
              </Button>
            </div>
            <span className="hidden md:inline text-xs text-ink-muted">{sorted.length} resultado(s)</span>
            <Button variant="ghost" size="sm" onClick={reload} className="cursor-pointer gap-1.5">
              <RotateCcw className="h-4 w-4" /> Recarregar
            </Button>
          </div>
        </div>

        {/* Cards list */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border bg-surface p-12 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando do banco…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {loadError}
              <div className="mt-3"><Button variant="outline" size="sm" onClick={reload}>Tentar de novo</Button></div>
            </div>
          ) : pageItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/70 bg-surface p-12 text-center">
              <p className="text-sm font-semibold text-ink">Nenhum registro encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Ajuste a busca ou cadastre um novo {cfg.singular}.</p>
            </div>
          ) : (
            pageItems.map((r: any) => (
              <RowCard
                key={r.id}
                tab={tab}
                record={r}
                reorderable={canReorderPessoas}
                onDragStartId={(id) => { dragIdRef.current = id; }}
                onDropId={(id) => {
                  const from = dragIdRef.current;
                  dragIdRef.current = null;
                  if (from) void onReorderPessoas(from, id);
                }}
                onEdit={() => openEdit(r as AnyRecord)}
                onDelete={() => void remove(r.id)}
              />
            ))
          )}
        </div>
        {canReorderPessoas && (
          <p className="mt-2 text-[11px] text-ink-muted">Arraste pelo ícone ⋮⋮ para reordenar as pessoas.</p>
        )}

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
                  type="button"
                  onClick={() => setPage(p)}
                  className={[
                    "h-8 min-w-8 cursor-pointer rounded-lg px-2 text-xs font-medium transition",
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
        empresaDefaults={empresaDefaults}
        pagamentos={pagamentos}
        onClearPagamentoAtalho={(id) => { void clearPagamentoAtalho(id); }}
        mesas={mesas}
        onSaveLote={async (novas) => {
          if (!novas.length) return;
          const nums = novas.map((n) => parseInt(n.identificacao.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
          if (!nums.length) return;
          try {
            const itens = await loteMesas({
              de: Math.min(...nums),
              ate: Math.max(...nums),
              tipo: novas[0].tipo,
              local: novas[0].local || "",
            });
            setMesas(itens);
            toast.success("Lote criado no banco.");
          } catch (e: any) {
            toast.error(e?.message || "Erro no lote");
          }
        }}
        onClose={() => setModalOpen(false)}
        onSave={(rec) => { void save(rec); }}
      />
      <BatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        mesas={mesas}
        onDelete={async (ids) => {
          try {
            for (const id of ids) await deleteEntity("mesas", id);
            setMesas(mesas.filter((m) => !ids.includes(m.id)));
            toast.success("Mesas/comandas excluídas.");
          } catch (e: any) {
            toast.error(e?.message || "Erro ao remover lote");
          }
        }}
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
        { label: "Total", value: total },
        { label: "Ativos", value: pessoas.filter((p) => p.situacao === "Ativo").length },
        { label: "Inativos", value: inativas, hint: `${total ? Math.round((inativas / total) * 100) : 0}% do total` },
      ];
    }
    if (tab === "usuarios") {
      return [
        { label: "Total", value: usuarios.length },
        { label: "Ativos", value: usuarios.filter((u) => u.situacao === "Ativo").length },
        { label: "Administradores", value: usuarios.filter((u) => u.perfil === "Administrador").length },
        { label: "Inativos", value: usuarios.filter((u) => u.situacao === "Inativo").length },
      ];
    }
    if (tab === "mesas") {
      return [
        { label: "Total", value: mesas.length },
        { label: "Mesas", value: mesas.filter((m) => m.tipo === "Mesa").length },
        { label: "Comandas", value: mesas.filter((m) => m.tipo === "Comanda").length },
      ];
    }
    if (tab === "pagamentos") {
      return [
        { label: "Total de formas", value: pagamentos.length },
        { label: "Ativas", value: pagamentos.filter((p) => p.situacao === "Ativo").length },
        { label: "Inativas", value: pagamentos.filter((p) => p.situacao === "Inativo").length },
      ];
    }
    return [
      { label: "Total", value: pratos.length },
      { label: "Pratos", value: pratos.filter((p) => p.tipo === "Prato").length },
      { label: "Copos", value: pratos.filter((p) => p.tipo === "Copo").length },
      { label: "Inativos", value: pratos.filter((p) => p.situacao === "Inativo").length },
    ];
  })();

  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-surface-2/50 px-3 py-2.5 sm:px-4">
      <dl className="flex flex-wrap items-stretch gap-y-2">
        {items.map((it, i) => (
          <div
            key={it.label}
            title={"hint" in it && it.hint ? String(it.hint) : undefined}
            className={[
              "flex min-w-[5.5rem] flex-1 flex-col justify-center px-3 py-0.5 sm:min-w-0",
              i > 0 ? "border-l border-border/70" : "",
            ].join(" ")}
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">{it.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-ink">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- Row cards ---------- */
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" | "success" | "danger" | "info" | "violet" | "sky" | "emerald" }) {
  const map: Record<string, string> = {
    muted: "bg-muted text-ink",
    brand: "bg-brand-soft text-brand",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    info: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
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

function formatEnderecoLinha(p: Pessoa): string {
  const parts = [
    [p.logradouro, p.numero].filter(Boolean).join(", "),
    p.bairro,
  ].filter(Boolean);
  return parts.join(" · ");
}

function RowCard({
  tab, record, onEdit, onDelete, reorderable, onDragStartId, onDropId,
}: {
  tab: TabKey;
  record: AnyRecord;
  onEdit: () => void;
  onDelete: () => void;
  reorderable?: boolean;
  onDragStartId?: (id: string) => void;
  onDropId?: (id: string) => void;
}) {
  const seed = (record as any).id as string;
  const stripe = stripeFor(seed);
  const av = colorFor(seed);
  const pessoa = tab === "pessoas" ? (record as Pessoa) : null;

  const heading = tab === "usuarios" ? (record as Usuario).nome
    : tab === "pessoas" ? (record as Pessoa).nome
    : tab === "mesas" ? (record as Mesa).identificacao
    : tab === "pagamentos" ? (record as Pagamento).descricao
    : (record as Prato).nome;

  const sub = tab === "usuarios" ? `@${(record as Usuario).login}`
    : tab === "pessoas" ? (record as Pessoa).documento
    : tab === "mesas" ? (record as Mesa).local
    : tab === "pagamentos" ? ((record as Pagamento).situacao || "Pagamento")
    : (record as Prato).observacoes || (record as Prato).tipo;

  const enderecoLinha = pessoa ? formatEnderecoLinha(pessoa) : "";
  const cidadeUf = pessoa
    ? [pessoa.cidade, pessoa.uf].filter(Boolean).join(" / ")
    : "";

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-surface pl-4 pr-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        reorderable ? "cursor-default" : "",
      ].join(" ")}
      onDragOver={reorderable ? (e) => { e.preventDefault(); } : undefined}
      onDrop={reorderable ? (e) => {
        e.preventDefault();
        onDropId?.(seed);
      } : undefined}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${stripe}`} />
      <div className="flex items-center gap-3 pl-3 sm:gap-4">
        {reorderable && (
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", seed);
              onDragStartId?.(seed);
            }}
            onDragEnd={() => onDragStartId?.("")}
            className="inline-flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-ink-muted active:cursor-grabbing hover:bg-muted hover:text-ink"
            title="Arrastar para reordenar"
            aria-label="Reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${av}`}>
          {initials(heading)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-semibold text-ink">{heading}</h3>
          </div>
          {pessoa ? (
            <>
              {enderecoLinha ? (
                <p className="mt-0.5 truncate text-[12px] text-ink-muted/55">{enderecoLinha}</p>
              ) : null}
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                  {cidadeUf || "—"}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-0.5 truncate text-xs text-ink-muted">{sub}</p>
          )}
        </div>

        <div className="hidden md:grid gap-6 flex-[2] min-w-0" style={{ gridTemplateColumns: `repeat(${blocksFor(tab, record).length}, minmax(0, 1fr))` }}>
          {blocksFor(tab, record).map((b, i) => (
            <DataBlock key={i} label={b.label}>{b.value}</DataBlock>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
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
      { label: "Perfil", value: <Chip tone={u.perfil === "Administrador" ? "violet" : u.perfil === "Caixa" ? "info" : "muted"}>{u.perfil}</Chip> },
      { label: "Situação", value: <Chip tone={u.situacao === "Ativo" ? "success" : "danger"}>{u.situacao}</Chip> },
    ];
  }
  if (tab === "pessoas") {
    const p = r as Pessoa;
    return [
      { label: "CPF/CNPJ", value: p.documento || "—" },
      { label: "Telefone", value: (
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-ink-muted" />
          {p.telefone || "—"}
          {p.telefone ? <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> : null}
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