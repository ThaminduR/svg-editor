import type { Tool } from './Tool';
import type { CanvasView } from '../canvas/CanvasView';
import type { PanZoom } from '../canvas/PanZoom';

export class HandTool implements Tool {
  cursor = 'grab';

  constructor(
    private canvasView: CanvasView,
    private panZoom: PanZoom
  ) {}

  onActivate(): void {
    this.canvasView.workspace.parentElement?.classList.add('tool-hand');
  }

  onDeactivate(): void {
    this.canvasView.workspace.parentElement?.classList.remove('tool-hand', 'panning');
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.panZoom.startPan(e.clientX, e.clientY);
    this.canvasView.workspace.parentElement?.classList.add('panning');
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    if (this.panZoom.panning) {
      this.panZoom.movePan(e.clientX, e.clientY);
    }
  }

  onPointerUp(e: PointerEvent): void {
    this.panZoom.endPan();
    this.canvasView.workspace.parentElement?.classList.remove('panning');
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
  }
}
