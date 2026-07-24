import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Layers, X } from "lucide-react";
import type { Mesa } from "./types";
import { uid } from "./types";

export function BatchModal({
  open, onClose, mesas, onCreate, onDelete,
}: {
  open: boolean;
  onClose: () => void;
  mesas: Mesa[];
  onCreate: (novas: Mesa[]) => void;
  onDelete: (ids: string[]) => void;
}) {
  const [tipo, setTipo] = useState<"Mesa" | "Comanda">("Mesa");
  const [de, setDe] = useState(1);
  const [ate, setAte] = useState(10);
  const [local, setLocal] = useState("Salão principal");

  const gerados = useMemo(() => {
    const arr: { nome: string; existe: boolean }[] = [];
    if (de > 0 && ate >= de) {
      for (let i = de; i <= ate; i++) {
        const nome = `${tipo} ${String(i).padStart(2, "0")}`;
        const existe = mesas.some((m) => m.identificacao === nome && m.tipo === tipo);
        arr.push({ nome, existe });
      }
    }
    return arr;
  }, [tipo, de, ate, mesas]);
  const criar = gerados.filter((g) => !g.existe);

  const [delTipo, setDelTipo] = useState<"Mesa" | "Comanda">("Mesa");
  const [delDe, setDelDe] = useState(1);
  const [delAte, setDelAte] = useState(10);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => {
    const n = new Set(selecionados);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelecionados(n);
  };

  const marcarIntervalo = () => {
    const ids = mesas
      .filter((m) => m.tipo === delTipo)
      .filter((m) => {
        const num = parseInt(m.identificacao.replace(/\D/g, ""), 10);
        return !isNaN(num) && num >= delDe && num <= delAte;
      })
      .map((m) => m.id);
    setSelecionados(new Set(ids));
  };

  const handleCreate = () => {
    const novas: Mesa[] = criar.map((g) => ({ id: uid(), identificacao: g.nome, tipo, local }));
    onCreate(novas);
    onClose();
  };

  const handleDelete = () => {
    onDelete(Array.from(selecionados));
    setSelecionados(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[820px] p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-surface-2/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-500 text-white shadow">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Operações em lote</h3>
              <p className="text-xs text-ink-muted">Cadastrar e excluir mesas ou comandas em grupo.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Tabs defaultValue="criar" className="px-6 py-5">
          <TabsList>
            <TabsTrigger value="criar">Cadastrar em lote</TabsTrigger>
            <TabsTrigger value="excluir">Excluir em lote</TabsTrigger>
          </TabsList>

          <TabsContent value="criar" className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-ink-muted">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Mesa">Mesa</SelectItem><SelectItem value="Comanda">Comanda</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-ink-muted">De</Label>
                <Input className="mt-1.5" type="number" value={de} onChange={(e) => setDe(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs text-ink-muted">Até</Label>
                <Input className="mt-1.5" type="number" value={ate} onChange={(e) => setAte(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs text-ink-muted">Local</Label>
                <Input className="mt-1.5" value={local} onChange={(e) => setLocal(e.target.value)} />
              </div>
            </div>

            <div className="rounded-xl border bg-surface-2/50 p-3">
              <p className="mb-2 text-xs font-medium text-ink-muted">Prévia dos registros</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                {gerados.length === 0 && <p className="text-xs text-ink-muted">Informe um intervalo válido.</p>}
                {gerados.map((g) => (
                  <span
                    key={g.nome}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${g.existe ? "border-danger/40 bg-danger/5 text-danger line-through" : "border-border bg-surface text-ink"}`}
                  >
                    {g.nome}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={criar.length === 0}
                className="bg-gradient-to-r from-brand to-orange-500 text-brand-foreground"
              >
                Criar {criar.length} {criar.length === 1 ? "registro" : "registros"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="excluir" className="mt-4 space-y-4">
            <div className="rounded-xl border bg-surface-2/50 p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Excluir por intervalo</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-ink-muted">Tipo</Label>
                  <Select value={delTipo} onValueChange={(v) => setDelTipo(v as any)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Mesa">Mesa</SelectItem><SelectItem value="Comanda">Comanda</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-ink-muted">De</Label><Input className="mt-1.5" type="number" value={delDe} onChange={(e) => setDelDe(Number(e.target.value))} /></div>
                <div><Label className="text-xs text-ink-muted">Até</Label><Input className="mt-1.5" type="number" value={delAte} onChange={(e) => setDelAte(Number(e.target.value))} /></div>
                <div className="flex items-end"><Button variant="outline" className="w-full" onClick={marcarIntervalo}>Marcar intervalo</Button></div>
              </div>
            </div>

            <div className="rounded-xl border">
              <div className="flex items-center justify-between border-b bg-surface-2/50 px-3 py-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selecionados.size === mesas.length && mesas.length > 0}
                    onCheckedChange={(v) => setSelecionados(v ? new Set(mesas.map((m) => m.id)) : new Set())}
                  />
                  Selecionar todos
                </label>
                <span className="text-xs text-ink-muted">{selecionados.size} selecionado(s)</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {mesas.map((m) => (
                  <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2/60">
                    <Checkbox checked={selecionados.has(m.id)} onCheckedChange={() => toggleSel(m.id)} />
                    <span className="font-medium text-ink">{m.identificacao}</span>
                    <span className="text-xs text-ink-muted">· {m.tipo} · {m.local}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={selecionados.size === 0}>
                <Trash2 className="h-4 w-4" /> Excluir {selecionados.size} registro(s)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}