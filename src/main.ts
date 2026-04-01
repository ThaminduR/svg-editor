import './styles/main.css';
import './styles/layout.css';
import './styles/canvas.css';
import './styles/toolbar.css';
import './styles/panels.css';
import './styles/color-picker.css';

import { EditorState } from './core/EditorState';
import { CommandManager } from './core/CommandManager';
import { SelectionManager } from './core/SelectionManager';
import { CanvasView } from './canvas/CanvasView';
import { InteractionManager } from './canvas/InteractionManager';
import { SelectionOverlay } from './canvas/SelectionOverlay';
import { TransformHandles } from './canvas/TransformHandles';
import { PanZoom } from './canvas/PanZoom';
import { ToolManager } from './tools/ToolManager';
import { SelectTool } from './tools/SelectTool';
import { HandTool } from './tools/HandTool';
import { EraserTool } from './tools/EraserTool';
import { Toolbar } from './panels/Toolbar';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { LayersPanel } from './panels/LayersPanel';
import { SvgImporter } from './io/SvgImporter';
import { SvgExporter } from './io/SvgExporter';
import { FileHandler } from './io/FileHandler';
import { ClipboardManager } from './core/ClipboardManager';
import { EditorMode } from './types';

class SVGEditorApp {
  private state: EditorState;
  private commandManager: CommandManager;
  private selectionManager: SelectionManager;
  private canvasView: CanvasView;
  private interactionManager: InteractionManager;
  private selectionOverlay: SelectionOverlay;
  private transformHandles: TransformHandles;
  private panZoom: PanZoom;
  private toolManager: ToolManager;
  private toolbar: Toolbar;
  private propertiesPanel: PropertiesPanel;
  private layersPanel: LayersPanel;
  private importer: SvgImporter;
  private exporter: SvgExporter;
  private fileHandler: FileHandler;
  private clipboardManager: ClipboardManager;

  constructor() {
    const canvasContainer = document.getElementById('canvas-area')!;
    const toolbarContainer = document.getElementById('toolbar')!;
    const propertiesContainer = document.getElementById('properties-panel')!;
    const layersContainer = document.getElementById('layers-panel')!;

    // Core
    this.state = new EditorState();
    this.commandManager = new CommandManager(this.state);
    this.selectionManager = new SelectionManager(this.state);

    // Canvas
    this.canvasView = new CanvasView(canvasContainer, this.state);
    this.selectionOverlay = new SelectionOverlay(this.canvasView, this.selectionManager);
    this.transformHandles = new TransformHandles(this.canvasView, this.selectionManager);
    this.panZoom = new PanZoom(this.canvasView, this.state);

    // Tools
    const selectTool = new SelectTool(
      this.canvasView,
      this.selectionManager,
      this.commandManager,
      this.transformHandles,
      this.state
    );
    const handTool = new HandTool(this.canvasView, this.panZoom);
    const eraserTool = new EraserTool(this.canvasView, this.commandManager, this.state);
    this.toolManager = new ToolManager(this.state, { selectTool, handTool, eraserTool });

    // Interaction
    this.interactionManager = new InteractionManager(
      this.canvasView,
      this.toolManager,
      this.state
    );

    // I/O
    this.importer = new SvgImporter();
    this.exporter = new SvgExporter(this.canvasView);
    this.fileHandler = new FileHandler(canvasContainer, this.importer, (svg) => {
      this.canvasView.loadSvgContent(svg);
      this.state.loadSvg(svg, this.canvasView.getContentElement());
      this.selectionManager.clearSelection();
    });

    // Clipboard
    this.clipboardManager = new ClipboardManager(
      this.selectionManager,
      this.commandManager,
      this.canvasView,
      this.state
    );

    // Panels
    this.toolbar = new Toolbar(
      toolbarContainer,
      this.state,
      this.commandManager,
      this.fileHandler,
      this.exporter,
      this.canvasView
    );
    this.propertiesPanel = new PropertiesPanel(
      propertiesContainer,
      this.state,
      this.selectionManager,
      this.commandManager
    );
    this.layersPanel = new LayersPanel(
      layersContainer,
      this.state,
      this.selectionManager,
      this.commandManager
    );

    this.setupKeyboardShortcuts();
    this.setupAutoSave();
    this.restoreFromLocalStorage();
  }

  private static STORAGE_KEY = 'svg-editor-state';

  private setupAutoSave(): void {
    // Save after every command (attribute change, transform, delete, etc.)
    this.state.on('command-executed', () => this.saveToLocalStorage());
    // Also save after SVG import
    this.state.on('svg-loaded', () => this.saveToLocalStorage());
  }

  private saveToLocalStorage(): void {
    try {
      const serializer = new XMLSerializer();
      const contentGroup = this.canvasView.getContentElement();
      const defs = this.canvasView.workspace.querySelector('defs');
      const vb = this.canvasView.originalViewBox;

      // Build a standalone SVG string
      const svgNs = 'http://www.w3.org/2000/svg';
      const doc = document.implementation.createDocument(svgNs, 'svg', null);
      const root = doc.documentElement;
      root.setAttribute('xmlns', svgNs);
      root.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);

      if (defs) {
        root.appendChild(doc.importNode(defs, true));
      }
      for (let i = 0; i < contentGroup.children.length; i++) {
        root.appendChild(doc.importNode(contentGroup.children[i], true));
      }

      const svgString = serializer.serializeToString(root);
      localStorage.setItem(SVGEditorApp.STORAGE_KEY, svgString);
    } catch {
      // Silently fail — localStorage may be full or unavailable
    }
  }

  private restoreFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(SVGEditorApp.STORAGE_KEY);
      if (!saved) return;

      const svg = this.importer.importFromString(saved);
      this.canvasView.loadSvgContent(svg);
      this.state.loadSvg(svg, this.canvasView.getContentElement());
      this.selectionManager.clearSelection();
    } catch {
      // Invalid or corrupt data — ignore and start fresh
      localStorage.removeItem(SVGEditorApp.STORAGE_KEY);
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Prevent defaults for editor shortcuts
      if (isMod && (e.key === 'z' || e.key === 'Z' || e.key === 's' || e.key === 'o' || e.key === 'a')) {
        e.preventDefault();
      }

      // Undo / Redo should work even from inputs
      if (isMod && e.key === 'z' && !e.shiftKey) {
        this.commandManager.undo();
        return;
      }
      if (isMod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        this.commandManager.redo();
        return;
      }

      // Don't handle other shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Save/Export
      if (isMod && e.key === 's') {
        this.fileHandler.triggerExport(this.exporter);
        return;
      }

      // Open/Import
      if (isMod && e.key === 'o') {
        this.fileHandler.triggerImport();
        return;
      }

      // Select all
      if (isMod && e.key === 'a') {
        this.selectionManager.selectAll(this.canvasView.getContentElement());
        return;
      }

      // Copy / Cut / Paste
      if (isMod && e.key === 'c') {
        this.clipboardManager.copy();
        return;
      }
      if (isMod && e.key === 'x') {
        this.clipboardManager.cut();
        return;
      }
      if (isMod && e.key === 'v') {
        this.clipboardManager.paste();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.clipboardManager.deleteSelected();
        return;
      }

      // Tool switching
      if (e.key === 'v' || e.key === 'V') {
        this.state.activeTool = EditorMode.SELECT;
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        this.state.activeTool = EditorMode.HAND;
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        this.state.activeTool = EditorMode.ERASER;
        return;
      }

      // Space for temporary hand tool
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        this.toolManager.setTemporaryTool(EditorMode.HAND);
        return;
      }

      // Layer reorder
      if (e.key === '[') {
        this.layersPanel.moveSelectedDown();
        return;
      }
      if (e.key === ']') {
        this.layersPanel.moveSelectedUp();
        return;
      }

      // Fit to view
      if (e.key === '0' && isMod) {
        e.preventDefault();
        this.canvasView.fitToView();
        return;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        this.toolManager.restoreTool();
      }
    });
  }
}

// Initialize
new SVGEditorApp();
