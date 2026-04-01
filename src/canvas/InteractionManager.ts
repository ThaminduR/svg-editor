import type { CanvasView } from './CanvasView';
import type { ToolManager } from '../tools/ToolManager';
import type { EditorState } from '../core/EditorState';

export class InteractionManager {
  constructor(
    private canvasView: CanvasView,
    private toolManager: ToolManager,
    private _state: EditorState
  ) {
    this.setupEvents();
  }

  private setupEvents(): void {
    const svg = this.canvasView.workspace;

    svg.addEventListener('pointerdown', (e) => {
      const tool = this.toolManager.activeTool;
      if (tool) {
        tool.onPointerDown(e);
      }
    });

    svg.addEventListener('pointermove', (e) => {
      const tool = this.toolManager.activeTool;
      if (tool) {
        tool.onPointerMove(e);
      }
    });

    svg.addEventListener('pointerup', (e) => {
      const tool = this.toolManager.activeTool;
      if (tool) {
        tool.onPointerUp(e);
      }
    });

    // Prevent context menu on canvas
    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
}
