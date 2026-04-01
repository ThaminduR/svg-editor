import type { SelectionManager } from './SelectionManager';
import type { CommandManager } from './CommandManager';
import type { CanvasView } from '../canvas/CanvasView';
import { DeleteElementCommand } from './commands/DeleteElementCommand';
import { CompositeCommand } from './commands/CompositeCommand';

export class ClipboardManager {
  private clipboard: string[] = [];

  constructor(
    private selectionManager: SelectionManager,
    private commandManager: CommandManager,
    private canvasView: CanvasView
  ) {}

  copy(): void {
    this.clipboard = this.selectionManager.selected.map((el) => el.outerHTML);
  }

  cut(): void {
    this.copy();
    this.deleteSelected();
  }

  paste(): void {
    if (this.clipboard.length === 0) return;

    const parser = new DOMParser();
    const contentGroup = this.canvasView.getContentElement();

    for (const html of this.clipboard) {
      const doc = parser.parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${html}</svg>`,
        'image/svg+xml'
      );
      const el = doc.documentElement.firstElementChild;
      if (el) {
        const clone = el.cloneNode(true) as SVGElement;
        // Offset pasted element slightly
        const existing = clone.getAttribute('transform') || '';
        clone.setAttribute('transform', `${existing} translate(10, 10)`);
        contentGroup.appendChild(clone);
      }
    }
  }

  deleteSelected(): void {
    const selected = this.selectionManager.selected;
    if (selected.length === 0) return;

    const commands = selected.map((el) => new DeleteElementCommand(el));
    this.commandManager.execute(new CompositeCommand(commands, 'Delete elements'));
    this.selectionManager.clearSelection();
  }
}
