import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Users, UserRound, Utensils, CreditCard, Coffee, Loader2, Shield, UserRoundPen, Crown, Wallet, Bike, ConciergeBell, Check } from "lucide-react";
import type { AnyRecord } from "./utils";
import type { Mesa, Pagamento, TabKey } from "./types";
import { atalhos, perfis, tabConfig, ufs, uid } from "./types";
import { consultarCnpjSintegra } from "@/lib/cadastros-api";
import { setParentModalDim } from "@/lib/parent-overlay";

const iconByTab: Record<TabKey, React.ReactNode> = {
  usuarios: <Users className="h-5 w-5" />,
  pessoas: <UserRound className="h-5 w-5" />,
  mesas: <Utensils className="h-5 w-5" />,
  pagamentos: <CreditCard className="h-5 w-5" />,
  pratos: <Coffee className="h-5 w-5" />,
};

function Field({
  label, required, className, children, hint, dense,
}: { label: string; required?: boolean; className?: string; children: React.ReactNode; hint?: string; dense?: boolean }) {
  return (
    <div className={className}>
      <Label className={dense ? "text-[11px] font-semibold text-ink-muted" : "text-xs font-semibold text-ink-muted"}>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <div className={dense ? "mt-1" : "mt-1.5"}>{children}</div>
      {hint && <p className="mt-0.5 text-[10px] text-ink-muted/80">{hint}</p>}
    </div>
  );
}

function Block({ title, children, cols = 2, dense }: { title: string; children: React.ReactNode; cols?: 2 | 3; dense?: boolean }) {
  return (
    <section className={dense ? "rounded-xl border border-border/70 bg-surface p-3" : "rounded-2xl border border-border/80 bg-surface p-4 shadow-sm"}>
      <h4 className={dense ? "mb-2 text-xs font-bold tracking-tight text-ink" : "mb-3 text-sm font-bold tracking-tight text-ink"}>{title}</h4>
      <div className={[
        "grid grid-cols-1 gap-x-3",
        dense ? "gap-y-2" : "gap-y-3 gap-x-4",
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      ].join(" ")}>{children}</div>
    </section>
  );
}

export interface RecordModalProps {
  tab: TabKey;
  open: boolean;
  initial: AnyRecord | null;
  onClose: () => void;
  onSave: (record: AnyRecord) => void;
  /** Cidade/UF da empresa — usados como padrão ao criar pessoa. */
  empresaDefaults?: { cidade: string; uf: string };
  /** Lista atual de tipos de pagamento — usada para detectar atalho duplicado. */
  pagamentos?: Pagamento[];
  /** Chamado quando o usuário confirma reatribuir um atalho já usado por outro pagamento. */
  onClearPagamentoAtalho?: (id: string) => void;
  /** Lista atual de mesas — usada na prévia do cadastro em lote. */
  mesas?: Mesa[];
  /** Chamado ao confirmar o cadastro em lote (aba mesas). */
  onSaveLote?: (novas: Mesa[]) => void | Promise<void>;
}

export function RecordModal({
  tab, open, initial, onClose, onSave, empresaDefaults, pagamentos, onClearPagamentoAtalho, mesas, onSaveLote,
}: RecordModalProps) {
  const [data, setData] = useState<any>(() => defaultFor(tab, empresaDefaults));
  const [confirmSenha, setConfirmSenha] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjMsg, setCnpjMsg] = useState("");
  const lastCnpjRef = useRef("");
  const cnpjTimerRef = useRef<number | null>(null);
  const lastCepRef = useRef("");
  const cepTimerRef = useRef<number | null>(null);

  const [mesaMode, setMesaMode] = useState<"unico" | "lote">("unico");
  const [loteTipo, setLoteTipo] = useState<"Mesa" | "Comanda">("Mesa");
  const [loteDe, setLoteDe] = useState(1);
  const [loteAte, setLoteAte] = useState(10);
  const [loteLocal, setLoteLocal] = useState("Salão principal");
  /** Pessoa sendo salva sem CPF/CNPJ ou telefone: campos que faltam (abre o aviso). */
  const [faltando, setFaltando] = useState<string[] | null>(null);

  useEffect(() => {
    if (open) {
      setData(initial ? { ...initial, senha: "" } : defaultFor(tab, empresaDefaults));
      setFaltando(null);
      setConfirmSenha("");
      setCnpjLoading(false);
      setCnpjMsg("");
      lastCnpjRef.current = "";
      if (cnpjTimerRef.current) window.clearTimeout(cnpjTimerRef.current);
      lastCepRef.current = "";
      if (cepTimerRef.current) window.clearTimeout(cepTimerRef.current);
      setMesaMode("unico");
      setLoteTipo("Mesa");
      setLoteDe(1);
      setLoteAte(10);
      setLoteLocal("Salão principal");
    }
  }, [open, initial, tab, empresaDefaults]);

  useEffect(() => {
    setParentModalDim(open);
    return () => setParentModalDim(false);
  }, [open]);

  const isEdit = !!(initial && (initial as any).id);
  const requiredFields = requiredFor(tab, isEdit);
  const filledRequired = requiredFields.filter((f) => {
    const v = data[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;

  const senhaOk =
    tab !== "usuarios" ||
    (isEdit
      ? ((!data.senha && !confirmSenha) || (data.senha && data.senha === confirmSenha))
      : !!(data.senha && data.senha === confirmSenha));
  const valid = filledRequired === requiredFields.length && senhaOk;
  const cfg = tabConfig[tab];
  const headline = getRecordTitle(tab, data) || (isEdit ? "Editar registro" : cfg.ctaLabel);
  const progress = Math.round((filledRequired / Math.max(requiredFields.length, 1)) * 100);

  const lookupCnpj = async (raw?: string, force = false) => {
    if (tab !== "pessoas") return;
    const digits = String(raw ?? data.documento ?? "").replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjMsg(digits.length > 0 && digits.length !== 11 ? "Informe um CNPJ com 14 dígitos para consultar." : "");
      return;
    }
    if (cnpjLoading || (!force && lastCnpjRef.current === digits)) return;
    setCnpjLoading(true);
    setCnpjMsg("Consultando SintegraBrasil…");
    try {
      const d = await consultarCnpjSintegra(digits);
      lastCnpjRef.current = digits;
      const nome = (d.razao_social || d.nome_fantasia || "").trim();
      const ie = String(d.ie || "").trim();
      const cepDigits = String(d.cep || "").replace(/\D/g, "");
      const cepFmt = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : cepDigits;
      setData((prev: any) => ({
        ...prev,
        documento: digits,
        nome: nome || prev.nome,
        telefone: (d.telefone || "").trim() || prev.telefone,
        email: (d.email || "").trim() || prev.email,
        cep: cepFmt || prev.cep,
        uf: (d.uf || prev.uf || "SP").toString().slice(0, 2).toUpperCase(),
        logradouro: (d.logradouro || "").trim() || prev.logradouro,
        numero: (d.numero || "").trim() || prev.numero,
        complemento: (d.complemento || "").trim() || prev.complemento || "",
        bairro: (d.bairro || "").trim() || prev.bairro,
        cidade: (d.cidade || "").trim() || prev.cidade,
        ieCadPro: ie || prev.ieCadPro || "",
        contribuinte: ie ? "1" : (prev.contribuinte || "9"),
      }));
      setCnpjMsg(nome ? `Dados de “${nome}” preenchidos.` : "Consulta ok — revise os campos.");
    } catch (e: any) {
      setCnpjMsg(e?.message || "Falha na consulta. Preencha manualmente.");
    } finally {
      setCnpjLoading(false);
    }
  };

  const lookupCep = async (raw?: string, force = false) => {
    if (tab !== "pessoas") return;
    const digits = String(raw ?? data.cep ?? "").replace(/\D/g, "");
    if (digits.length !== 8 || (!force && lastCepRef.current === digits)) return;
    lastCepRef.current = digits;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const j = JSON.parse(new TextDecoder("utf-8").decode(await r.arrayBuffer()));
      if (j.erro) return;
      // O CEP só decide com certeza município e UF; logradouro/bairro vêm como a
      // API responder (inclusive vazio) — número some junto se o logradouro sumir,
      // pra não deixar um número "orfão" de um endereço anterior.
      const logradouro = (j.logradouro || "").trim();
      setData((prev: any) => ({
        ...prev,
        logradouro,
        numero: logradouro ? prev.numero : "",
        bairro: (j.bairro || "").trim(),
        cidade: (j.localidade || "").trim() || prev.cidade,
        uf: (j.uf || prev.uf || "SP").toString().slice(0, 2).toUpperCase(),
      }));
    } catch {
      // falha silenciosa — usuário preenche manualmente
    }
  };

  const handleSave = (mesmoIncompleto = false) => {
    if (!valid) return;
    // Pessoa: só o nome é obrigatório. Sem CPF/CNPJ ou telefone, avisa antes e deixa seguir.
    if (tab === "pessoas" && !mesmoIncompleto) {
      const vazio = (v: unknown) => String(v ?? "").replace(/\D/g, "") === "";
      const f = PESSOA_RECOMENDADOS.filter((c) => vazio(data[c.campo])).map((c) => c.campo);
      if (f.length) { setFaltando(f); return; }
    }
    setFaltando(null);
    const rec = { ...data };
    if (!rec.id) rec.id = "";
    if (tab === "pessoas") rec.tipos = ["Cliente"];
    onSave(rec);
  };

  const showMesaToggle = tab === "mesas" && !isEdit;
  const isLote = showMesaToggle && mesaMode === "lote";

  const gerados = useMemo(() => {
    const arr: { nome: string; existe: boolean }[] = [];
    if (loteDe > 0 && loteAte >= loteDe) {
      for (let i = loteDe; i <= loteAte; i++) {
        const nome = `${loteTipo} ${String(i).padStart(2, "0")}`;
        const existe = (mesas ?? []).some(
          (m) => m.identificacao === nome && m.tipo === loteTipo && m.situacao !== "Inativo",
        );
        arr.push({ nome, existe });
      }
    }
    return arr;
  }, [loteTipo, loteDe, loteAte, mesas]);
  const loteACriar = gerados.filter((g) => !g.existe);

  const handleSaveLote = async () => {
    if (!loteACriar.length) return;
    const novas: Mesa[] = loteACriar.map((g) => ({ id: uid(), identificacao: g.nome, tipo: loteTipo, local: loteLocal }));
    await onSaveLote?.(novas);
    onClose();
  };

  const wide = tab === "pessoas";

  const formLocked = tab === "pessoas" && cnpjLoading;

  const completarDados = () => {
    const primeiro = faltando?.[0];
    setFaltando(null);
    if (primeiro) window.setTimeout(() => document.getElementById(`pessoa-${primeiro}`)?.focus(), 80);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v && !formLocked) onClose(); }}>
      <DialogContent
        hideClose
        className={[
          "max-h-[90vh] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl",
          wide ? "max-w-[920px]" : "max-w-[720px]",
        ].join(" ")}
        onPointerDownOutside={(e) => { if (formLocked) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (formLocked) e.preventDefault(); }}
      >
        <div className="relative flex max-h-[90vh] flex-col bg-background">
          <header className="shrink-0 border-b border-brand/15 bg-gradient-to-br from-brand/[0.08] via-surface to-surface px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-500 text-white shadow-md shadow-brand/30 [&_svg]:h-4 [&_svg]:w-4">
                  {iconByTab[tab]}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                    {isLote ? "Lote" : isEdit ? "Editar" : "Novo"} · {cfg.plural}
                    <span className="ml-2 font-medium normal-case tracking-normal text-ink-muted">
                      {isLote ? `${loteACriar.length} novo(s)` : `${filledRequired}/${requiredFields.length} obrig.`}
                    </span>
                  </p>
                  <h2 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
                    {isLote ? "Cadastro em lote" : headline}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={formLocked}
                className="cursor-pointer rounded-full border bg-surface p-1.5 text-ink-muted transition hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {showMesaToggle && (
              <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border bg-surface p-1">
                {([
                  { id: "unico" as const, label: "Cadastro único" },
                  { id: "lote" as const, label: "Cadastro em lote" },
                ]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMesaMode(m.id)}
                    className={[
                      "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition",
                      mesaMode === m.id
                        ? "bg-gradient-to-r from-brand to-orange-500 text-white shadow-sm shadow-brand/25"
                        : "text-ink-muted hover:bg-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-orange-500 transition-all duration-300"
                style={{ width: isLote ? (loteACriar.length > 0 ? "100%" : "0%") : `${progress}%` }}
              />
            </div>
          </header>

          <div
            className={[
              "relative flex-1 overflow-y-auto px-4 py-3 sm:px-5",
              wide ? "space-y-2" : "space-y-3",
              formLocked ? "pointer-events-none select-none opacity-60" : "",
            ].join(" ")}
            aria-busy={formLocked || undefined}
          >
            {isLote ? (
              <>
                <Block title="Intervalo">
                  <Field label="Tipo">
                    <Select value={loteTipo} onValueChange={(v) => setLoteTipo(v as any)}>
                      <SelectTrigger className={`cursor-pointer ${"h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20"}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mesa">Mesa</SelectItem>
                        <SelectItem value="Comanda">Comanda</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="De">
                    <Input className="h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20" type="number" value={loteDe} onChange={(e) => setLoteDe(Number(e.target.value))} />
                  </Field>
                  <Field label="Até">
                    <Input className="h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20" type="number" value={loteAte} onChange={(e) => setLoteAte(Number(e.target.value))} />
                  </Field>
                  <Field label="Local">
                    <Input className="h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20" value={loteLocal} onChange={(e) => setLoteLocal(e.target.value)} placeholder="Salão principal" />
                  </Field>
                </Block>
                <section className="rounded-2xl border-2 border-brand/20 bg-gradient-to-br from-brand/[0.05] to-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-ink">Prévia</h4>
                    <span className="text-xs font-semibold text-brand">{loteACriar.length} novo(s)</span>
                  </div>
                  <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                    {gerados.length === 0 && <p className="text-xs text-ink-muted">Informe um intervalo válido.</p>}
                    {gerados.map((g) => (
                      <span
                        key={g.nome}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          g.existe
                            ? "border-danger/40 bg-danger/5 text-danger line-through"
                            : "border-brand/25 bg-surface text-ink"
                        }`}
                      >
                        {g.nome}
                      </span>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              renderFields(tab, data, setData, confirmSenha, setConfirmSenha, {
                cnpjLoading,
                cnpjMsg,
                onLookupCnpj: (force?: boolean) => void lookupCnpj(undefined, !!force),
                onDocumentoChange: (v: string) => {
                  setData((prev: any) => ({ ...prev, documento: v }));
                  const dig = v.replace(/\D/g, "");
                  if (cnpjTimerRef.current) window.clearTimeout(cnpjTimerRef.current);
                  if (dig.length === 14) {
                    cnpjTimerRef.current = window.setTimeout(() => void lookupCnpj(v, false), 450);
                  } else {
                    setCnpjMsg("");
                  }
                },
                onLookupCep: (force?: boolean) => void lookupCep(undefined, !!force),
                onCepChange: (v: string) => {
                  setData((prev: any) => ({ ...prev, cep: v }));
                  const dig = v.replace(/\D/g, "");
                  if (cepTimerRef.current) window.clearTimeout(cepTimerRef.current);
                  if (dig.length === 8) {
                    cepTimerRef.current = window.setTimeout(() => void lookupCep(v, false), 450);
                  }
                },
              }, {
                list: pagamentos ?? [],
                onClearAtalho: onClearPagamentoAtalho,
              })
            )}
            {formLocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-md">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  Consultando CNPJ…
                </div>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t bg-surface px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-ink-muted">
                {formLocked ? (
                  <span className="font-medium text-brand">Aguarde a consulta do CNPJ…</span>
                ) : isLote ? (
                  <>Registros já existentes ficam marcados e não são duplicados.</>
                ) : (
                  <>
                    <span className="text-danger">*</span> obrigatório
                    {tab === "usuarios" && data.senha && !senhaOk && (
                      <span className="ml-2 font-medium text-danger">As senhas não coincidem.</span>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={onClose} disabled={formLocked}>
                  Cancelar
                </Button>
                {isLote ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveLote()}
                    disabled={loteACriar.length === 0}
                    className="cursor-pointer bg-gradient-to-r from-brand to-orange-500 text-brand-foreground shadow-md shadow-brand/25 hover:opacity-95 disabled:opacity-40"
                  >
                    Criar {loteACriar.length} {loteACriar.length === 1 ? "registro" : "registros"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave()}
                    disabled={!valid || formLocked}
                    className="cursor-pointer bg-gradient-to-r from-brand to-orange-500 text-brand-foreground shadow-md shadow-brand/25 hover:opacity-95 disabled:opacity-40"
                  >
                    Salvar {cfg.singular}
                  </Button>
                )}
              </div>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>

    {/* Aviso: pessoa só com o nome (ou sem um dos dois). Segue se a pessoa quiser. */}
    <Dialog open={!!faltando} onOpenChange={(v) => { if (!v) setFaltando(null); }}>
      <DialogContent hideClose className="max-w-[440px] gap-0 border-0 p-0 shadow-2xl sm:rounded-2xl">
        <div className="px-6 pb-5 pt-6">
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <UserRoundPen className="h-5 w-5" />
          </span>
          <DialogTitle className="text-lg font-bold tracking-tight text-ink">
            {faltando && faltando.length === PESSOA_RECOMENDADOS.length ? "Cadastrar só com o nome?" : "Cadastrar com dados faltando?"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-muted">
            {data?.nome ? <><strong className="text-ink">{data.nome}</strong> vai ser salvo assim. </> : null}
            Dá para completar depois, editando o cadastro.
          </DialogDescription>
          <ul className="mt-4 space-y-2">
            {PESSOA_RECOMENDADOS.filter((c) => faltando?.includes(c.campo)).map((c) => (
              <li key={c.campo} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                <span className="font-semibold text-ink">Sem {c.rotulo}:</span>{" "}
                <span className="text-ink-muted">{c.efeito}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t bg-surface px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={completarDados}>
            Completar dados
          </Button>
          <Button
            type="button"
            autoFocus
            onClick={() => handleSave(true)}
            className="cursor-pointer bg-gradient-to-r from-brand to-orange-500 text-brand-foreground shadow-md shadow-brand/25 hover:opacity-95"
          >
            Salvar assim mesmo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Pessoa: recomendados (não obrigatórios). A ordem é a do formulário — "Completar dados" foca o primeiro. */
const PESSOA_RECOMENDADOS: { campo: string; rotulo: string; efeito: string }[] = [
  { campo: "documento", rotulo: "CPF/CNPJ", efeito: "não dá para colocar a pessoa na nota fiscal." },
  { campo: "telefone", rotulo: "telefone", efeito: "não dá para avisar pelo WhatsApp nem ligar na entrega." },
];

function getRecordTitle(tab: TabKey, d: any) {
  if (tab === "usuarios") return d.nome;
  if (tab === "pessoas") return d.nome;
  if (tab === "mesas") return d.identificacao;
  if (tab === "pagamentos") return d.descricao;
  return d.nome;
}

function defaultFor(tab: TabKey, empresaDefaults?: { cidade: string; uf: string }): any {
  switch (tab) {
    case "usuarios": return {
      id: "", nome: "", login: "", perfil: "Garçom/Atendente", situacao: "Ativo", senha: "",
      perm_apagar_item: false, perm_cancelar_pedido: false, perm_conceder_desconto: false, perm_acesso_cardapio: false,
      perm_ver_valores: false, perm_ver_entregas: false,
    };
    case "pessoas": return {
      id: "", documento: "", nome: "", tipos: ["Cliente"], contribuinte: "9", telefone: "", email: "",
      cep: "", uf: empresaDefaults?.uf || "SP", logradouro: "", numero: "", bairro: "",
      cidade: empresaDefaults?.cidade || "", situacao: "Ativo", ieCadPro: "", complemento: "", observacoes: "",
    };
    case "mesas": return { id: "", identificacao: "", tipo: "Mesa", local: "" };
    case "pagamentos": return { id: "", descricao: "", taxa: 0, prazo: 0, atalho: "—", situacao: "Ativo" };
    case "pratos": return { id: "", nome: "", tipo: "Prato", valor: 0, situacao: "Ativo" };
  }
}

function requiredFor(tab: TabKey, isEdit = false): string[] {
  switch (tab) {
    case "usuarios": return isEdit ? ["nome", "login", "perfil"] : ["nome", "login", "perfil", "senha"];
    // Só o nome: CPF/CNPJ e telefone são recomendados (aviso ao salvar sem eles).
    case "pessoas": return ["nome"];
    case "mesas": return ["identificacao", "tipo"];
    case "pagamentos": return ["descricao"];
    case "pratos": return ["nome", "tipo", "valor"];
  }
}

function renderFields(
  tab: TabKey, data: any, setData: (u: any) => void,
  confirmSenha: string, setConfirmSenha: (s: string) => void,
  pessoasOpts?: {
    cnpjLoading: boolean;
    cnpjMsg: string;
    onLookupCnpj: (force?: boolean) => void;
    onDocumentoChange: (v: string) => void;
    onLookupCep?: (force?: boolean) => void;
    onCepChange?: (v: string) => void;
  },
  pagamentosOpts?: {
    list: Pagamento[];
    onClearAtalho?: (id: string) => void;
  },
) {
  const upd = (patch: any) => setData({ ...data, ...patch });
  const inputCls = "h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20";

  if (tab === "usuarios") {
    const isCaixa = data.perfil === "Caixa";
    const isGarcom = data.perfil === "Garçom/Atendente";
    // Login sugerido pelo nome ("João da Silva" → "joao.silva") enquanto a pessoa não mexer nele.
    const sugerirLogin = (nome: string) => {
      const partes = nome
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
      if (partes.length === 0) return "";
      return partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
    };
    const mudarNome = (nome: string) => {
      const automatico = !data.id && (!data.login || data.login === sugerirLogin(data.nome || ""));
      upd(automatico ? { nome, login: sugerirLogin(nome) } : { nome });
    };
    const perfisCards: { valor: string; titulo: string; desc: string; Icone: typeof Crown }[] = [
      { valor: "Garçom/Atendente", titulo: "Garçom", desc: "Mesas e pedidos, no PC e no celular", Icone: ConciergeBell },
      { valor: "Caixa", titulo: "Caixa", desc: "Pedidos e fechamento no caixa", Icone: Wallet },
      { valor: "Administrador", titulo: "Administrador", desc: "Acesso total, sem restrições", Icone: Crown },
      { valor: "Entregador", titulo: "Entregador", desc: "Só a tela de entregas", Icone: Bike },
    ].filter((c) => (perfis as string[]).includes(c.valor));
    const perm = (key: string, label: string) => (
      <label
        key={key}
        htmlFor={`perm-${key}`}
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-1.5 transition ${data[key] ? "border-brand/40 bg-brand/[0.06]" : "border-border/80 bg-surface"}`}
      >
        <span className="text-[13px] font-medium leading-snug text-ink">{label}</span>
        <Switch id={`perm-${key}`} checked={!!data[key]} onCheckedChange={(v) => upd({ [key]: v })} />
      </label>
    );
    const senhaDiferente = !!data.senha && !!confirmSenha && data.senha !== confirmSenha;
    return (
      <div className="space-y-2.5">
        {/* Perfil em cartões: escolher olhando, sem abrir lista nem ler parágrafo. */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">O que essa pessoa faz? <span className="text-danger">*</span></span>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-muted">
              {data.situacao === "Ativo" ? "Ativo" : "Inativo"}
              <Switch checked={data.situacao === "Ativo"} onCheckedChange={(v) => upd({ situacao: v ? "Ativo" : "Inativo" })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {perfisCards.map(({ valor, titulo, desc, Icone }) => {
              const ativo = data.perfil === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => upd({ perfil: valor })}
                  className={`relative flex cursor-pointer flex-col items-start gap-0.5 rounded-2xl border-2 px-3 py-2.5 text-left transition ${ativo ? "border-brand bg-brand/[0.07] shadow-sm shadow-brand/20" : "border-border/80 bg-surface hover:border-brand/40"}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ativo ? "bg-gradient-to-br from-brand to-orange-500 text-white" : "bg-muted text-ink-muted"}`}>
                    <Icone className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-sm font-bold text-ink">{titulo}</span>
                  <span className="text-[11px] leading-snug text-ink-muted">{desc}</span>
                  {ativo && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome" required>
            <Input autoFocus={!data.id} className={inputCls} value={data.nome} onChange={(e) => mudarNome(e.target.value)} placeholder="Ex.: João da Silva" />
          </Field>
          <Field label="Login" required>
            <Input className={inputCls} value={data.login} onChange={(e) => upd({ login: e.target.value })} placeholder="sai do nome, ex.: joao.silva" autoCapitalize="off" spellCheck={false} />
          </Field>
          <Field label="Senha" required={!data.id} hint={data.id ? "Em branco = manter a atual." : undefined}>
            <Input className={inputCls} type="password" value={data.senha ?? ""} onChange={(e) => upd({ senha: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="Repetir senha" required={!data.id} hint={senhaDiferente ? "As senhas não são iguais." : undefined}>
            <Input
              className={`${inputCls} ${senhaDiferente ? "border-danger focus-visible:border-danger" : ""}`}
              type="password"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {(isGarcom || isCaixa) && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <Shield className="h-3.5 w-3.5" />
              {isCaixa ? "Pode fazer sem pedir senha de administrador" : "Permissão"}
            </div>
            <div className={`grid grid-cols-1 gap-2 ${isCaixa ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {isGarcom && perm("perm_ver_entregas", "Ver e criar entregas e retiradas")}
              {isCaixa && perm("perm_apagar_item", "Apagar itens")}
              {isCaixa && perm("perm_cancelar_pedido", "Cancelar pedido")}
              {isCaixa && perm("perm_conceder_desconto", "Dar desconto")}
              {isCaixa && perm("perm_acesso_cardapio", "Mexer no cardápio")}
              {isCaixa && perm("perm_ver_valores", "Ver valores")}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === "pessoas") {
    const inp = "h-9 rounded-lg border-border/80 bg-surface text-sm text-ink focus-visible:border-brand focus-visible:ring-brand/20";
    return (
      <>
        <Block title="Identificação e contato" cols={3} dense>
          <Field dense label="CPF/CNPJ" className="sm:col-span-2" hint={pessoasOpts?.cnpjMsg || "Recomendado. CNPJ com 14 dígitos consulta sozinho"}>
            <div className="relative">
              <Input
                id="pessoa-documento"
                className={`${inp} w-full ${pessoasOpts?.cnpjLoading ? "pr-9" : ""}`}
                value={data.documento}
                onChange={(e) => pessoasOpts?.onDocumentoChange(e.target.value) ?? upd({ documento: e.target.value })}
                onBlur={() => pessoasOpts?.onLookupCnpj(false)}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                disabled={pessoasOpts?.cnpjLoading}
              />
              {pessoasOpts?.cnpjLoading && (
                <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand" />
              )}
            </div>
          </Field>
          <Field dense label="Telefone" hint="Recomendado">
            <Input id="pessoa-telefone" className={inp} value={data.telefone} onChange={(e) => upd({ telefone: e.target.value })} placeholder="(11) 99999-0000" />
          </Field>
          <Field dense label="Nome / Razão social" required className="sm:col-span-2">
            <Input className={inp} value={data.nome} onChange={(e) => upd({ nome: e.target.value })} />
          </Field>
          <Field dense label="E-mail">
            <Input className={inp} value={data.email} onChange={(e) => upd({ email: e.target.value })} placeholder="nome@email.com" />
          </Field>
        </Block>

        <Block title="Endereço" cols={3} dense>
          <Field dense label="CEP">
            <Input
              className={inp}
              value={data.cep}
              onChange={(e) => (pessoasOpts?.onCepChange ? pessoasOpts.onCepChange(e.target.value) : upd({ cep: e.target.value }))}
              onBlur={() => pessoasOpts?.onLookupCep?.(false)}
              placeholder="00000-000"
            />
          </Field>
          <Field dense label="UF">
            <Select value={data.uf} onValueChange={(v) => upd({ uf: v })}>
              <SelectTrigger className={`cursor-pointer ${inp}`}><SelectValue /></SelectTrigger>
              <SelectContent>{ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field dense label="Número"><Input className={inp} value={data.numero} onChange={(e) => upd({ numero: e.target.value })} /></Field>
          <Field dense label="Logradouro" className="sm:col-span-2">
            <Input className={inp} value={data.logradouro} onChange={(e) => upd({ logradouro: e.target.value })} />
          </Field>
          <Field dense label="Complemento"><Input className={inp} value={data.complemento ?? ""} onChange={(e) => upd({ complemento: e.target.value })} /></Field>
          <Field dense label="Bairro"><Input className={inp} value={data.bairro} onChange={(e) => upd({ bairro: e.target.value })} /></Field>
          <Field dense label="Cidade" className="sm:col-span-2"><Input className={inp} value={data.cidade} onChange={(e) => upd({ cidade: e.target.value })} /></Field>
        </Block>

        <Block title="Fiscal" cols={3} dense>
          <Field dense label="Contribuinte ICMS">
            <Select value={data.contribuinte} onValueChange={(v) => upd({ contribuinte: v })}>
              <SelectTrigger className={`cursor-pointer ${inp}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9 — Não contrib.</SelectItem>
                <SelectItem value="1">1 — Contribuinte</SelectItem>
                <SelectItem value="2">2 — Isento</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field dense label="CAD/PRO ou IE">
            <Input className={inp} value={data.ieCadPro ?? ""} onChange={(e) => upd({ ieCadPro: e.target.value })} placeholder="IE ou CAD/PRO" />
          </Field>
          <Field dense label="Situação">
            <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
              <SelectTrigger className={`cursor-pointer ${inp}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field dense label="Observações" className="sm:col-span-3">
            <Textarea className="min-h-[56px] rounded-lg text-sm" rows={2} value={data.observacoes ?? ""} onChange={(e) => upd({ observacoes: e.target.value })} />
          </Field>
        </Block>
      </>
    );
  }

  if (tab === "mesas") {
    return (
      <Block title="Identificação">
        <Field label="Identificação" required>
          <Input className={inputCls} value={data.identificacao} onChange={(e) => upd({ identificacao: e.target.value })} placeholder="Mesa 01" />
        </Field>
        <Field label="Tipo" required>
          <Select value={data.tipo} onValueChange={(v) => upd({ tipo: v })}>
            <SelectTrigger className={`cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mesa">Mesa</SelectItem>
              <SelectItem value="Comanda">Comanda</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Local" className="sm:col-span-2">
          <Input className={inputCls} value={data.local} onChange={(e) => upd({ local: e.target.value })} placeholder="Salão principal" />
        </Field>
      </Block>
    );
  }

  if (tab === "pagamentos") {
    return (
      <>
        <Block title="Forma de pagamento">
          <Field label="Descrição" required className="sm:col-span-2">
            <Input className={inputCls} value={data.descricao} onChange={(e) => upd({ descricao: e.target.value })} placeholder="PIX, Dinheiro…" />
          </Field>
          <Field label="Taxa (%)">
            <Input className={inputCls} type="number" step="0.01" value={data.taxa} onChange={(e) => upd({ taxa: Number(e.target.value) })} />
          </Field>
          <Field label="Prazo (dias)">
            <Input className={inputCls} type="number" value={data.prazo} onChange={(e) => upd({ prazo: Number(e.target.value) })} />
          </Field>
        </Block>
        <Block title="Atalho e situação">
          <Field label="Tecla de atalho">
            <Select
              value={data.atalho}
              onValueChange={(v) => {
                if (v !== "—") {
                  const conflito = pagamentosOpts?.list.find((p) => p.atalho === v && p.id !== data.id);
                  if (conflito) {
                    const ok = window.confirm(
                      `A tecla ${v} já está em uso por "${conflito.descricao}".\n\nDeseja usar ${v} aqui? O atalho de "${conflito.descricao}" será removido.`,
                    );
                    if (!ok) return;
                    pagamentosOpts?.onClearAtalho?.(conflito.id);
                  }
                }
                upd({ atalho: v });
              }}
            >
              <SelectTrigger className={`cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>{atalhos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
              <SelectTrigger className={`cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Block>
      </>
    );
  }

  return (
    <>
      <Block title="Item">
        <Field label="Nome" required className="sm:col-span-2">
          <Input className={inputCls} value={data.nome} onChange={(e) => upd({ nome: e.target.value })} />
        </Field>
        <Field label="Tipo" required>
          <Select value={data.tipo} onValueChange={(v) => upd({ tipo: v })}>
            <SelectTrigger className={`cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Prato">Prato</SelectItem>
              <SelectItem value="Copo">Copo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valor (R$)" required>
          <Input className={inputCls} type="number" step="0.01" value={data.valor} onChange={(e) => upd({ valor: Number(e.target.value) })} />
        </Field>
      </Block>
      <Block title="Situação e observações">
        <Field label="Situação">
          <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
            <SelectTrigger className={`cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea className="min-h-[88px] rounded-xl" rows={3} value={data.observacoes ?? ""} onChange={(e) => upd({ observacoes: e.target.value })} />
        </Field>
      </Block>
    </>
  );
}
