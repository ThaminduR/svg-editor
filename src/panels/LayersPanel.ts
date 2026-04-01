import type { EditorState } from '../core/EditorState';
import type { SelectionManager } from '../core/SelectionManager';
import type { CommandManager } from '../core/CommandManager';
import { ChangeAttributeCommand } from '../core/commands/ChangeAttributeCommand';
import { ReorderCommand } from '../core/commands/ReorderCommand';
import type { LayerInfo } from '../types';

const ICON_EYE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"/><circle cx="8" cy="8" r="2"/></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" opacity="0.3"/><line x1="3" y1="13" x2="13" y2="3"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="8" height="6" rx="1"/><path d="M6 7V5a2 2 0 014 0v2"/></svg>`;
const ICON_UNLOCK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="8" height="6" rx="1"/><path d="M6 7V5a2 2 0 014 0v2" opacity="0.3"/></svg>`;

export class LayersPanel {
  private list!: HTMLUListElement;
  private draggedLayer: LayerInfo | null = null;

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
        row.style.opacity = '0.5';
        e.dataTransfer!.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        row.style.opacity = '';
        this.draggedLayer = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        row.style.borderTop = '2px solid var(--accent)';
      });
      row.addEventListener('dragleave', () => {
        row.style.borderTop = '';
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.style.borderTop = '';
        if (this.draggedLayer && this.draggedLayer !== layer) {
          // Move dragged element before target
          this.commandManager.execute(
            new ReorderCommand(this.draggedLayer.element, layer.element)
          );
          this.state.refreshLayers();
        }
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

  private toggleLock(layer: LayerInfo): void {
    const el = layer.element;
    if (el.hasAttribute('data-locked')) {
      el.removeAttribute('data-locked');
    } else {
      el.setAttribute('data-locked', 'true');
      // Deselect if locked
      if (this.selectionManager.isSelected(el)) {
        this.selectionManager.deselect(el);
      }
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
