import type { Tool } from './Tool';
import type { EditorState } from '../core/EditorState';
import { EditorMode } from '../types';

interface ToolSet {
  selectTool: Tool;
  handTool: Tool;
}

export class ToolManager {
  private tools: Map<EditorMode, Tool>;
  private _activeTool: Tool;
  private previousMode: EditorMode | null = null;

  constructor(
    private state: EditorState,
    toolSet: ToolSet
  ) {
    this.tools = new Map([
      [EditorMode.SELECT, toolSet.selectTool],
      [EditorMode.HAND, toolSet.handTool],
    ]);

    this._activeTool = toolSet.selectTool;
    this._activeTool.onActivate();

    state.on('tool-changed', (mode) => {
      this.switchTo(mode);
    });
  }

  get activeTool(): Tool {
    return this._activeTool;
  }

  setTemporaryTool(mode: EditorMode): void {
    if (this.previousMode !== null) return; // Already in temporary mode
    this.previousMode = this.state.activeTool;
    this.state.activeTool = mode;
  }

  restoreTool(): void {
    if (this.previousMode !== null) {
      this.state.activeTool = this.previousMode;
      this.previousMode = null;
    }
  }

  private switchTo(mode: EditorMode): void {
    const newTool = this.tools.get(mode);
    if (!newTool || newTool === this._activeTool) return;

    this._activeTool.onDeactivate();
    this._activeTool = newTool;
    this._activeTool.onActivate();
  }
}
