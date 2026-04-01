import type { EditorState } from '../core/EditorState';
import type { SelectionManager } from '../core/SelectionManager';
import type { CommandManager } from '../core/CommandManager';
import { ChangeAttributeCommand } from '../core/commands/ChangeAttributeCommand';
import { DeleteElementCommand } from '../core/commands/DeleteElementCommand';
import { ReorderCommand } from '../core/commands/ReorderCommand';
import type { LayerInfo } from '../types';

const ICON_EYE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"/><circle cx="8" cy="8" r="2"/></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" opacity="0.3"/><line x1="3" y1="13" x2="13" y2="3"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="8" height="6" rx="1"/><path d="M6 7V5a2 2 0 014 0v2"/></svg>`;
const ICON_UNLOCK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="8" height="6" rx="1"/><path d="M6 7V5a2 2 0 014 0v2" opacity="0.3"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h10M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5v7a1 1 0 001 1h4a1 1 0 001-1V5"/></svg>`;

export class LayersPanel {
  private list!: HTMLUListElement;
  private draggedLayer: LayerInfo | null = null;
  private dragOverRow: HTMLElement | null = null;
  private dropPosition: 'above' | 'below' = 'above';

  constructor(
    private container: HTMLElement,
    private state: EditorState,
    private selectionManager: SelectionManager,
    private commandManager: CommandManager
  ) {
    this.render();
    this.setupListeners();
  }

  moveSelectedUp(): void {
    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return;
    const el = selected[0];
    const next = el.nextElementSibling;
    if (next?.nextElementSibling) {
      this.commandManager.execute(
        new ReorderCommand(el, next.nextElementSibling)
      );
    } else if (next) {
      this.commandManager.execute(new ReorderCommand(el, null));
    }
    this.state.refreshLayers();
  }

  moveSelectedDown(): void {
    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return;
    const el = selected[0];
    const prev = el.previousElementSibling;
    if (prev) {
      this.commandManager.execute(new ReorderCommand(el, prev));
      this.state.refreshLayers();
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-section';
    header.innerHTML = `
      <div class="panel-section-header">
        <span class="panel-section-title">Layers</span>
      </div>
    `;
    this.container.appendChild(header);

    this.list = document.createElement('ul');
    this.list.className = 'layers-list';
    this.container.appendChild(this.list);
  }

  private setupListeners(): void {
    this.state.on('layers-changed', (layers) => this.updateList(layers));
    this.state.on('selection-changed', () => this.updateSelection());
    this.state.on('command-executed', () => {
      this.state.refreshLayers();
    });
  }

  private updateList(layers: LayerInfo[]): void {
    this.list.innerHTML = '';

    // Render in reverse order (topmost layer first)
    const reversed = [...layers].reverse();

    for (const layer of reversed) {
      const row = document.createElement('li');
      row.className = 'layer-row';
      row.draggable = true;

      if (this.selectionManager.isSelected(layer.element)) {
        row.classList.add('selected');
      }
      if (layer.locked) {
        row.classList.add('locked');
      }

      // Layer type icon
      const icon = document.createElement('span');
      icon.className = 'layer-icon';
      icon.innerHTML = this.getLayerIcon(layer.element.tagName.toLowerCase());
      row.appendChild(icon);

      // Layer name
      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = layer.name;
      row.appendChild(name);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'layer-actions';

      // Visibility toggle
      const visBtn = document.createElement('button');
      visBtn.className = `layer-action-btn ${layer.visible ? 'active' : ''}`;
      visBtn.innerHTML = layer.visible ? ICON_EYE : ICON_EYE_OFF;
      visBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleVisibility(layer);
      };
      actions.appendChild(visBtn);

      // Lock toggle
      const lockBtn = document.createElement('button');
      lockBtn.className = `layer-action-btn ${layer.locked ? 'active' : ''}`;
      lockBtn.innerHTML = layer.locked ? ICON_LOCK : ICON_UNLOCK;
      lockBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleLock(layer);
      };
      actions.appendChild(lockBtn);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'layer-action-btn layer-delete-btn';
      deleteBtn.innerHTML = ICON_DELETE;
      deleteBtn.title = 'Delete element';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteLayer(layer);
      };
      actions.appendChild(deleteBtn);

      row.appendChild(actions);

      // Click to select
      row.onclick = () => {
        if (!layer.locked) {
          this.selectionManager.select(layer.element);
        }
      };

      // Drag and drop
      row.addEventListener('dragstart', (e) => {
        this.draggedLayer = layer;
        row.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        this.clearDropIndicator();
        this.draggedLayer = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!this.draggedLayer || this.draggedLayer === layer) return;
        e.dataTransfer!.dropEffect = 'move';

        // Determine above/below based on cursor position within the row
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'above' : 'below';

        if (this.dragOverRow !== row || this.dropPosition !== position) {
          this.clearDropIndicator();
          this.dragOverRow = row;
          this.dropPosition = position;
          row.classList.add(position === 'above' ? 'drop-above' : 'drop-below');
        }
      });
      row.addEventListener('dragleave', (e) => {
        // Only clear if actually leaving the row (not entering a child)
        if (!row.contains(e.relatedTarget as Node)) {
          if (this.dragOverRow === row) {
            this.clearDropIndicator();
          }
        }
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropPos = this.dropPosition;
        this.clearDropIndicator();
        if (!this.draggedLayer || this.draggedLayer === layer) return;

        // The UI list is reversed: first row = topmost layer = last DOM child.
        // "above" in UI = higher z-index = later in DOM.
        // "below" in UI = lower z-index = earlier in DOM.
        const draggedEl = this.draggedLayer.element;
        const targetEl = layer.element;

        let refNode: Node | null;
        if (dropPos === 'above') {
          // Place dragged after target in DOM (higher z-index = above in UI)
          refNode = targetEl.nextSibling;
        } else {
          // Place dragged before target in DOM (lower z-index = below in UI)
          refNode = targetEl;
        }

        this.commandManager.execute(new ReorderCommand(draggedEl, refNode));
        this.state.refreshLayers();
      });

      this.list.appendChild(row);
    }

    if (layers.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'panel-empty';
      empty.textContent = 'No layers';
      this.list.appendChild(empty);
    }
  }

  private clearDropIndicator(): void {
    if (this.dragOverRow) {
      this.dragOverRow.classList.remove('drop-above', 'drop-below');
      this.dragOverRow = null;
    }
  }

  private updateSelection(): void {
    const rows = this.list.querySelectorAll('.layer-row');
    const layers = [...this.state.layers].reverse();

    rows.forEach((row, i) => {
      if (i < layers.length) {
        row.classList.toggle('selected', this.selectionManager.isSelected(layers[i].element));
      }
    });
  }

  private toggleVisibility(layer: LayerInfo): void {
    const el = layer.element;
    const currentDisplay = el.getAttribute('display');
    const newDisplay = currentDisplay === 'none' ? null : 'none';
    this.commandManager.execute(
      new ChangeAttributeCommand(el, 'display', currentDisplay, newDisplay)
    );
    this.state.refreshLayers();
  }

  private deleteLayer(layer: LayerInfo): void {
    if (this.selectionManager.isSelected(layer.element)) {
      this.selectionManager.deselect(layer.element);
    }
    this.commandManager.execute(new DeleteElementCommand(layer.element));
    this.state.refreshLayers();
  }

  private toggleLock(layer: LayerInfo): void {
    const el = layer.element;
    const oldValue = el.getAttribute('data-locked');
    const newValue = oldValue ? null : 'true';
    this.commandManager.execute(
      new ChangeAttributeCommand(el, 'data-locked', oldValue, newValue)
    );
    // Deselect if locking
    if (newValue && this.selectionManager.isSelected(el)) {
      this.selectionManager.deselect(el);
    }
    this.state.refreshLayers();
  }

  private getLayerIcon(tag: string): string {
    switch (tag) {
      case 'rect':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/></svg>`;
      case 'circle':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>`;
      case 'ellipse':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="8" cy="8" rx="6" ry="4"/></svg>`;
      case 'line':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="14" x2="14" y2="2"/></svg>`;
      case 'path':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12 C4 4 12 4 14 12"/></svg>`;
      case 'text':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h8M8 4v10"/></svg>`;
      case 'g':
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="8" height="8" rx="1"/><rect x="5" y="5" width="8" height="8" rx="1"/></svg>`;
      default:
        return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/></svg>`;
    }
  }
}
