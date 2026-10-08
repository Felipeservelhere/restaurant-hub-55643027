/** Avisa o shell PHP (fora do iframe) para escurecer header/sidebar com o modal. */
export function setParentModalDim(open: boolean): void {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "csg-cadastros-modal", open: !!open }, "*");
    }
  } catch {
    /* ignore */
  }
}
