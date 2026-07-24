import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Users, UserRound, Utensils, CreditCard, Coffee, Info } from "lucide-react";
import type { AnyRecord } from "./utils";
import type { TabKey, Usuario, Pessoa, Mesa, Pagamento, Prato, PessoaTipo } from "./types";
import { atalhos, perfis, ufs, uid } from "./types";

type Section = { title: string; hint?: string };

const sectionsByTab: Record<TabKey, Section[]> = {
  usuarios: [
    { title: "Identificação" },
    { title: "Segurança", hint: "Escolha uma senha forte com pelo menos 6 caracteres." },
  ],
  pessoas: [
    { title: "Documento e nome", hint: "Ao digitar CPF/CNPJ os dados podem ser preenchidos automaticamente." },
    { title: "Fiscal" },
    { title: "Contato" },
    { title: "Endereço" },
    { title: "Complementares" },
  ],
  mesas: [{ title: "Identificação" }],
  pagamentos: [{ title: "Forma de pagamento" }, { title: "Atalho e situação" }],
  pratos: [{ title: "Item do cardápio" }, { title: "Situação e observações" }],
};

const iconByTab: Record<TabKey, React.ReactNode> = {
  usuarios: <Users className="h-6 w-6" />,
  pessoas: <UserRound className="h-6 w-6" />,
  mesas: <Utensils className="h-6 w-6" />,
  pagamentos: <CreditCard className="h-6 w-6" />,
  pratos: <Coffee className="h-6 w-6" />,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 flex items-center gap-3 pt-2">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-brand">{children}</h4>
      <div className="h-px flex-1 bg-gradient-to-r from-brand/40 to-transparent" />
    </div>
  );
}

function Field({
  label, required, className, children, hint,
}: { label: string; required?: boolean; className?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-ink-muted">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-ink-muted/80">{hint}</p>}
    </div>
  );
}

export interface RecordModalProps {
  tab: TabKey;
  open: boolean;
  initial: AnyRecord | null;
  onClose: () => void;
  onSave: (record: AnyRecord) => void;
}

export function RecordModal({ tab, open, initial, onClose, onSave }: RecordModalProps) {
  const [data, setData] = useState<any>(() => defaultFor(tab));
  const [confirmSenha, setConfirmSenha] = useState("");

  useEffect(() => {
    if (open) {
      setData(initial ? { ...initial } : defaultFor(tab));
      setConfirmSenha(initial && (initial as Usuario).senha ? (initial as Usuario).senha! : "");
    }
  }, [open, initial, tab]);

  const requiredFields = requiredFor(tab);
  const filledRequired = requiredFields.filter((f) => {
    const v = data[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;

  const senhaOk = tab !== "usuarios" || (data.senha && data.senha === confirmSenha);
  const valid = filledRequired === requiredFields.length && senhaOk;

  const title = initial ? "Editar registro" : "Novo cadastro";
  const subtitle = tab === "pessoas" ? "Pessoas" : tab === "usuarios" ? "Usuários" : tab === "mesas" ? "Mesas e comandas" : tab === "pagamentos" ? "Tipos de pagamento" : "Pratos e copos";

  const handleSave = () => {
    if (!valid) return;
    const rec = { ...data };
    if (!rec.id) rec.id = uid();
    onSave(rec);
  };

  const sections = sectionsByTab[tab];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[960px] p-0 gap-0 overflow-hidden border-0 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">
          {/* Left dark panel */}
          <aside className="bg-[#1f2b47] text-white p-6 flex flex-col gap-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-orange-500 shadow-lg">
              {iconByTab[tab]}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60">{title} · {subtitle}</p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">
                {getRecordTitle(tab, data) || "—"}
              </h2>
            </div>
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={s.title} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">{i + 1}</span>
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-xl bg-white/5 p-3 text-xs text-white/70">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-brand" />
                <p>{sections[0].hint || "Preencha os campos obrigatórios marcados com asterisco."}</p>
              </div>
            </div>
          </aside>

          {/* Right form */}
          <div className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b bg-surface-2/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-brand transition-all"
                    style={{ width: `${(filledRequired / Math.max(requiredFields.length, 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-ink-muted">
                  {filledRequired} de {requiredFields.length} campos obrigatórios preenchidos
                </span>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-ink-muted transition hover:bg-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {renderFields(tab, data, setData, confirmSenha, setConfirmSenha)}
              </div>
            </div>

            <div className="flex items-center justify-between border-t bg-surface-2/60 px-6 py-4">
              <p className="text-xs text-ink-muted">
                <span className="text-danger">*</span> Campos obrigatórios
                {tab === "usuarios" && data.senha && !senhaOk && (
                  <span className="ml-3 text-danger">As senhas não coincidem.</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={handleSave}
                  disabled={!valid}
                  className="bg-gradient-to-r from-brand to-orange-500 text-brand-foreground shadow-md hover:opacity-95 disabled:opacity-40"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getRecordTitle(tab: TabKey, d: any) {
  if (tab === "usuarios") return d.nome;
  if (tab === "pessoas") return d.nome;
  if (tab === "mesas") return d.identificacao;
  if (tab === "pagamentos") return d.descricao;
  return d.nome;
}

function defaultFor(tab: TabKey): any {
  switch (tab) {
    case "usuarios": return { id: "", nome: "", login: "", perfil: "Operador", situacao: "Ativo", senha: "" };
    case "pessoas": return { id: "", documento: "", nome: "", tipos: [], contribuinte: "9", telefone: "", email: "", cep: "", uf: "SP", logradouro: "", numero: "", bairro: "", cidade: "", situacao: "Ativo" };
    case "mesas": return { id: "", identificacao: "", tipo: "Mesa", local: "" };
    case "pagamentos": return { id: "", descricao: "", taxa: 0, prazo: 0, atalho: "—", situacao: "Ativo" };
    case "pratos": return { id: "", nome: "", tipo: "Prato", valor: 0, situacao: "Ativo" };
  }
}

function requiredFor(tab: TabKey): string[] {
  switch (tab) {
    case "usuarios": return ["nome", "login", "perfil", "senha"];
    case "pessoas": return ["documento", "nome", "tipos", "cep", "uf", "logradouro", "numero", "bairro", "cidade"];
    case "mesas": return ["identificacao", "tipo", "local"];
    case "pagamentos": return ["descricao"];
    case "pratos": return ["nome", "tipo", "valor"];
  }
}

function renderFields(
  tab: TabKey, data: any, setData: (u: any) => void,
  confirmSenha: string, setConfirmSenha: (s: string) => void,
) {
  const upd = (patch: any) => setData({ ...data, ...patch });

  if (tab === "usuarios") {
    return (
      <>
        <SectionTitle>Identificação</SectionTitle>
        <Field label="Nome" required>
          <Input value={data.nome} onChange={(e) => upd({ nome: e.target.value })} placeholder="Nome completo" />
        </Field>
        <Field label="Login" required hint="Use apenas letras, números e ponto.">
          <Input value={data.login} onChange={(e) => upd({ login: e.target.value })} placeholder="ex.: joao.silva" />
        </Field>
        <Field label="Perfil" required>
          <Select value={data.perfil} onValueChange={(v) => upd({ perfil: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{perfis.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Situação">
          <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
          </Select>
        </Field>
        <SectionTitle>Segurança</SectionTitle>
        <Field label="Senha" required>
          <Input type="password" value={data.senha ?? ""} onChange={(e) => upd({ senha: e.target.value })} />
        </Field>
        <Field label="Confirmar senha" required>
          <Input type="password" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} />
        </Field>
      </>
    );
  }

  if (tab === "pessoas") {
    const tipos: PessoaTipo[] = data.tipos || [];
    const toggleTipo = (t: PessoaTipo) => {
      const n = tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t];
      upd({ tipos: n });
    };
    return (
      <>
        <SectionTitle>Documento e nome</SectionTitle>
        <Field label="CPF/CNPJ" required hint="Ao digitar, buscaremos dados públicos automaticamente.">
          <Input value={data.documento} onChange={(e) => upd({ documento: e.target.value })} placeholder="000.000.000-00" />
        </Field>
        <Field label="Nome / Razão social" required>
          <Input value={data.nome} onChange={(e) => upd({ nome: e.target.value })} />
        </Field>
        <Field label="Tipo" required className="col-span-2">
          <div className="flex flex-wrap gap-3">
            {(["Cliente","Fornecedor","Funcionario"] as PessoaTipo[]).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm transition hover:border-brand/50 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft">
                <Checkbox checked={tipos.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                {t === "Funcionario" ? "Funcionário" : t}
              </label>
            ))}
          </div>
        </Field>

        <SectionTitle>Fiscal</SectionTitle>
        <Field label="Contribuinte ICMS" className="col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: "9", t: "9 · Não contribuinte" },
              { v: "1", t: "1 · Contribuinte" },
              { v: "2", t: "2 · Isento" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => upd({ contribuinte: o.v })}
                className={`rounded-xl border p-3 text-left text-sm transition ${data.contribuinte === o.v ? "border-brand bg-brand-soft text-ink" : "border-border bg-surface hover:border-brand/40"}`}
              >
                <div className="text-lg font-semibold text-brand">{o.v}</div>
                <div className="text-xs text-ink-muted">{o.t.split(" · ")[1]}</div>
              </button>
            ))}
          </div>
        </Field>
        <Field label={data.contribuinte === "1" ? "Inscrição Estadual" : "CAD/PRO"} className="col-span-2">
          <Input value={data.ieCadPro ?? ""} onChange={(e) => upd({ ieCadPro: e.target.value })} />
        </Field>

        <SectionTitle>Contato</SectionTitle>
        <Field label="Telefone"><Input value={data.telefone} onChange={(e) => upd({ telefone: e.target.value })} placeholder="(11) 99999-0000" /></Field>
        <Field label="E-mail"><Input value={data.email} onChange={(e) => upd({ email: e.target.value })} placeholder="nome@email.com" /></Field>

        <SectionTitle>Endereço</SectionTitle>
        <Field label="CEP" required><Input value={data.cep} onChange={(e) => upd({ cep: e.target.value })} /></Field>
        <Field label="UF" required>
          <Select value={data.uf} onValueChange={(v) => upd({ uf: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Logradouro" required className="col-span-2"><Input value={data.logradouro} onChange={(e) => upd({ logradouro: e.target.value })} /></Field>
        <Field label="Número" required><Input value={data.numero} onChange={(e) => upd({ numero: e.target.value })} /></Field>
        <Field label="Complemento"><Input value={data.complemento ?? ""} onChange={(e) => upd({ complemento: e.target.value })} /></Field>
        <Field label="Bairro" required><Input value={data.bairro} onChange={(e) => upd({ bairro: e.target.value })} /></Field>
        <Field label="Cidade" required><Input value={data.cidade} onChange={(e) => upd({ cidade: e.target.value })} /></Field>

        <SectionTitle>Complementares</SectionTitle>
        <Field label="Situação">
          <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Observações" className="col-span-2">
          <Textarea rows={3} value={data.observacoes ?? ""} onChange={(e) => upd({ observacoes: e.target.value })} />
        </Field>
      </>
    );
  }

  if (tab === "mesas") {
    return (
      <>
        <SectionTitle>Identificação</SectionTitle>
        <Field label="Identificação" required><Input value={data.identificacao} onChange={(e) => upd({ identificacao: e.target.value })} placeholder="Mesa 01" /></Field>
        <Field label="Tipo" required>
          <Select value={data.tipo} onValueChange={(v) => upd({ tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Mesa">Mesa</SelectItem><SelectItem value="Comanda">Comanda</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Local" required className="col-span-2"><Input value={data.local} onChange={(e) => upd({ local: e.target.value })} placeholder="Salão principal" /></Field>
      </>
    );
  }

  if (tab === "pagamentos") {
    return (
      <>
        <SectionTitle>Forma de pagamento</SectionTitle>
        <Field label="Descrição" required className="col-span-2"><Input value={data.descricao} onChange={(e) => upd({ descricao: e.target.value })} /></Field>
        <Field label="Taxa (%)"><Input type="number" step="0.01" value={data.taxa} onChange={(e) => upd({ taxa: Number(e.target.value) })} /></Field>
        <Field label="Prazo (dias)"><Input type="number" value={data.prazo} onChange={(e) => upd({ prazo: Number(e.target.value) })} /></Field>
        <SectionTitle>Atalho e situação</SectionTitle>
        <Field label="Tecla de atalho">
          <Select value={data.atalho} onValueChange={(v) => upd({ atalho: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{atalhos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Situação">
          <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
          </Select>
        </Field>
      </>
    );
  }

  // pratos
  return (
    <>
      <SectionTitle>Item do cardápio</SectionTitle>
      <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => upd({ nome: e.target.value })} /></Field>
      <Field label="Tipo" required>
        <Select value={data.tipo} onValueChange={(v) => upd({ tipo: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Prato">Prato</SelectItem><SelectItem value="Copo">Copo</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label="Valor (R$)" required><Input type="number" step="0.01" value={data.valor} onChange={(e) => upd({ valor: Number(e.target.value) })} /></Field>
      <SectionTitle>Situação e observações</SectionTitle>
      <Field label="Situação">
        <Select value={data.situacao} onValueChange={(v) => upd({ situacao: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label="Observações" className="col-span-2">
        <Textarea rows={3} value={data.observacoes ?? ""} onChange={(e) => upd({ observacoes: e.target.value })} />
      </Field>
    </>
  );
}