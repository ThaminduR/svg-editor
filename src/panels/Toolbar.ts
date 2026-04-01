import type { EditorState } from '../core/EditorState';
import type { CommandManager } from '../core/CommandManager';
import type { FileHandler } from '../io/FileHandler';
import type { SvgExporter } from '../io/SvgExporter';
import type { CanvasView } from '../canvas/CanvasView';
import { EditorMode } from '../types';

const ICONS = {
  select: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2l10 7-5 1.5L7.5 16z"/></svg>`,
  hand: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2v10M5.5 5v7a3.5 3.5 0 007 0V5M3 7v5a6 6 0 0012 0V7"/></svg>`,
  eraser: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.5 3.5l4 4-7.5 7.5H3.5v-3.5z"/><path d="M8.5 5.5l4 4"/><path d="M3 15h12"/></svg>`,
  undo: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h7a4 4 0 010 8H8M4 7l3-3M4 7l3 3"/></svg>`,
  redo: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 7H7a4 4 0 000 8h3M14 7l-3-3M14 7l-3 3"/></svg>`,
  zoomIn: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5"/><path d="M12 12l4 4M6 8h4M8 6v4"/></svg>`,
  zoomOut: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5"/><path d="M12 12l4 4M6 8h4"/></svg>`,
  fit: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="12" height="12" rx="1"/><path d="M3 7h12M7 3v12"/></svg>`,
  import: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12v2a2 2 0 002 2h8a2 2 0 002-2v-2M9 2v10M5.5 8.5L9 12l3.5-3.5"/></svg>`,
  export: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12v2a2 2 0 002 2h8a2 2 0 002-2v-2M9 12V2M5.5 5.5L9 2l3.5 3.5"/></svg>`,
};

export class Toolbar {
  private undoBtn!: HTMLButtonElement;
  private redoBtn!: HTMLButtonElement;
  private selectBtn!: HTMLButtonElement;
  private handBtn!: HTMLButtonElement;
  private eraserBtn!: HTMLButtonElement;
  private zoomDisplay!: HTMLSpanElement;

  constructor(
    container: HTMLElement,
    private state: EditorState,
    private commandManager: CommandManager,
    private fileHandler: FileHandler,
    private exporter: SvgExporter,
    private canvasView: CanvasView
  ) {
    this.render(container);
    this.setupListeners();
  }

  private render(container: HTMLElement): void {
    container.innerHTML = '';

    const title = document.createElement('span');
    title.className = 'app-title';
    title.textContent = 'SVG Editor';
    container.appendChild(title);

    // Tools group
    const toolsGroup = this.createGroup();
    this.selectBtn = this.createIconBtn('select', ICONS.select, 'Select (V)');
    this.selectBtn.classList.add('active');
    this.handBtn = this.createIconBtn('hand', ICONS.hand, 'Hand (H)');
    this.eraserBtn = this.createIconBtn('eraser', ICONS.eraser, 'Eraser (E)');
    toolsGroup.append(this.selectBtn, this.handBtn, this.eraserBtn);
    container.appendChild(toolsGroup);

    container.appendChild(this.createSeparator());

    // Undo/Redo group
    const historyGroup = this.createGroup();
    this.undoBtn = this.createIconBtn('undo', ICONS.undo, 'Undo (Ctrl+Z)');
    this.undoBtn.disabled = true;
    this.redoBtn = this.createIconBtn('redo', ICONS.redo, 'Redo (Ctrl+Shift+Z)');
    this.redoBtn.disabled = true;
    historyGroup.append(this.undoBtn, this.redoBtn);
    container.appendChild(historyGroup);

    container.appendChild(this.createSeparator());

    // Zoom group
    const zoomGroup = this.createGroup();
    const zoomOutBtn = this.createIconBtn('zoom-out', ICONS.zoomOut, 'Zoom Out');
    this.zoomDisplay = document.createElement('span');
    this.zoomDisplay.className = 'zoom-display';
    this.zoomDisplay.textContent = '100%';
    const zoomInBtn = this.createIconBtn('zoom-in', ICONS.zoomIn, 'Zoom In');
    const fitBtn = this.createIconBtn('fit', ICONS.fit, 'Fit to View (Ctrl+0)');
    zoomGroup.append(zoomOutBtn, this.zoomDisplay, zoomInBtn, fitBtn);
    container.appendChild(zoomGroup);

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'toolbar-spacer';
    container.appendChild(spacer);

    // Import/Export group
    const ioGroup = this.createGroup();
    const importBtn = this.createIconBtn('import', ICONS.import, 'Import (Ctrl+O)');
    const exportBtn = this.createIconBtn('export', ICONS.export, 'Export (Ctrl+S)');
    ioGroup.append(importBtn, exportBtn);
    container.appendChild(ioGroup);

    // Event handlers
    this.selectBtn.onclick = () => { this.state.activeTool = EditorMode.SELECT; };
    this.handBtn.onclick = () => { this.state.activeTool = EditorMode.HAND; };
    this.eraserBtn.onclick = () => { this.state.activeTool = EditorMode.ERASER; };
    this.undoBtn.onclick = () => this.commandManager.undo();
    this.redoBtn.onclick = () => this.commandManager.redo();
    zoomInBtn.onclick = () => {
      const rect = this.canvasView.workspace.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Access panZoom through zoom event
      this.state.zoom = this.state.zoom * 1.25;
      // We can't directly access panZoom, so dispatch a synthetic zoom
      const vb = this.canvasView.viewBox;
      vb.width /= 1.25;
      vb.height /= 1.25;
      vb.x += (this.canvasView.viewBox.width - vb.width) / 2;
      vb.y += (this.canvasView.viewBox.height - vb.height) / 2;
      this.canvasView.viewBox = vb;
    };
    zoomOutBtn.onclick = () => {
      this.state.zoom = this.state.zoom * 0.8;
      const vb = this.canvasView.viewBox;
      vb.width /= 0.8;
      vb.height /= 0.8;
      vb.x += (this.canvasView.viewBox.width - vb.width) / 2;
      vb.y += (this.canvasView.viewBox.height - vb.height) / 2;
      this.canvasView.viewBox = vb;
    };
    fitBtn.onclick = () => this.canvasView.fitToView();
    importBtn.onclick = () => this.fileHandler.triggerImport();
    exportBtn.onclick = () => this.fileHandler.triggerExport(this.exporter);
  }

  private setupListeners(): void {
    this.state.on('tool-changed', (mode) => {
      this.selectBtn.classList.toggle('active', mode === EditorMode.SELECT);
      this.handBtn.classList.toggle('active', mode === EditorMode.HAND);
      this.eraserBtn.classList.toggle('active', mode === EditorMode.ERASER);
    });

    this.state.on('undo-redo-changed', ({ canUndo, canRedo }) => {
      this.undoBtn.disabled = !canUndo;
      this.redoBtn.disabled = !canRedo;
    });

    this.state.on('zoom-changed', (zoom) => {
      this.zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
    });
  }

  private createGroup(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'toolbar-group';
    return div;
  }

  private createIconBtn(name: string, icon: string, tooltip: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'icon-btn tooltip';
    btn.setAttribute('data-tooltip', tooltip);
    btn.setAttribute('data-btn', name);
    btn.innerHTML = icon;
    return btn;
  }

  private createSeparator(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'separator';
    return div;
  }
}
