import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, X } from "lucide-react";
import type { Mesa } from "./types";
import { setParentModalDim } from "@/lib/parent-overlay";

export function BatchModal({
  open, onClose, mesas, onDelete,
}: {
  open: boolean;
  onClose: () => void;
  mesas: Mesa[];
  onDelete: (ids: string[]) => void | Promise<void>;
}) {
  useEffect(() => {
    setParentModalDim(open);
    return () => setParentModalDim(false);
  }, [open]);

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

  const handleDelete = async () => {
    await onDelete(Array.from(selecionados));
    setSelecionados(new Set());
    onClose();
  };

  const inputCls = "h-11 rounded-xl border-border/80 bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent hideClose className="max-h-[92vh] max-w-[720px] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-3xl">
        <div className="flex max-h-[92vh] flex-col bg-background">
          <header className="shrink-0 border-b border-brand/15 bg-gradient-to-br from-brand/[0.08] via-surface to-surface px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-orange-500 text-white shadow-lg shadow-brand/30">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Mesas e comandas</p>
                  <h2 className="text-xl font-bold tracking-tight text-ink">Excluir em lote</h2>
                  <p className="text-xs text-ink-muted">Remove mesas/comandas sem pedido aberto. Com pedido aberto, apenas desativa.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full border bg-surface p-2 text-ink-muted transition hover:bg-muted hover:text-ink"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            <section className="rounded-2xl border bg-surface p-4 shadow-sm">
              <h4 className="mb-3 text-sm font-bold text-ink">Marcar por intervalo</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label className="text-xs font-semibold text-ink-muted">Tipo</Label>
                  <Select value={delTipo} onValueChange={(v) => setDelTipo(v as any)}>
                    <SelectTrigger className={`mt-1.5 cursor-pointer ${inputCls}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mesa">Mesa</SelectItem>
                      <SelectItem value="Comanda">Comanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-ink-muted">De</Label>
                  <Input className={`mt-1.5 ${inputCls}`} type="number" value={delDe} onChange={(e) => setDelDe(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-ink-muted">Até</Label>
                  <Input className={`mt-1.5 ${inputCls}`} type="number" value={delAte} onChange={(e) => setDelAte(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="w-full cursor-pointer" onClick={marcarIntervalo}>
                    Marcar intervalo
                  </Button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b bg-surface-2/50 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={selecionados.size === mesas.length && mesas.length > 0}
                    onCheckedChange={(v) => setSelecionados(v ? new Set(mesas.map((m) => m.id)) : new Set())}
                  />
                  Selecionar todos
                </label>
                <span className="text-xs font-semibold text-brand">{selecionados.size} selecionado(s)</span>
              </div>
              <div className="max-h-64 divide-y overflow-y-auto">
                {mesas.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-brand/[0.04]">
                    <Checkbox checked={selecionados.has(m.id)} onCheckedChange={() => toggleSel(m.id)} />
                    <span className="font-semibold text-ink">{m.identificacao}</span>
                    <span className="text-xs text-ink-muted">· {m.tipo} · {m.local}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <footer className="shrink-0 border-t bg-surface px-5 py-4 sm:px-6">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>Cancelar</Button>
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                onClick={() => void handleDelete()}
                disabled={selecionados.size === 0}
              >
                <Trash2 className="h-4 w-4" /> Excluir {selecionados.size}
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
