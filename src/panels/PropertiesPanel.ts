import type { EditorState } from '../core/EditorState';
import type { SelectionManager } from '../core/SelectionManager';
import type { CommandManager } from '../core/CommandManager';
import { ChangeAttributeCommand } from '../core/commands/ChangeAttributeCommand';
import { DeleteElementCommand } from '../core/commands/DeleteElementCommand';
import { CompositeCommand } from '../core/commands/CompositeCommand';
import { ColorPicker } from './ColorPicker';
import { getComputedAttribute } from '../utils/svg';

export class PropertiesPanel {
  private colorPicker = new ColorPicker();
  private fillSwatch!: HTMLButtonElement;
  private strokeSwatch!: HTMLButtonElement;
  private strokeWidthInput!: HTMLInputElement;
  private opacityInput!: HTMLInputElement;
  private opacityValue!: HTMLSpanElement;
  private posXInput!: HTMLInputElement;
  private posYInput!: HTMLInputElement;
  private widthInput!: HTMLInputElement;
  private heightInput!: HTMLInputElement;
  private emptyState!: HTMLDivElement;
  private propsContent!: HTMLDivElement;

  constructor(
    private container: HTMLElement,
    private state: EditorState,
    private selectionManager: SelectionManager,
    private commandManager: CommandManager
  ) {
    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Empty state
    this.emptyState = document.createElement('div');
    this.emptyState.className = 'properties-empty';
    this.emptyState.innerHTML = `
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="4" y="4" width="32" height="32" rx="2"/>
        <path d="M14 20h12M20 14v12"/>
      </svg>
      <p>Select an element to edit its properties</p>
    `;
    this.container.appendChild(this.emptyState);

    // Properties content
    this.propsContent = document.createElement('div');
    this.propsContent.className = 'props-content';
    this.propsContent.style.display = 'none';

    // Fill section
    const fillSection = this.createSection('Fill');
    const fillRow = this.createRow('Color');
    this.fillSwatch = document.createElement('button');
    this.fillSwatch.className = 'color-swatch';
    this.fillSwatch.onclick = () => {
      const current = this.getSelectedAttr('fill');
      this.colorPicker.show(this.fillSwatch, current, (color) => {
        this.applyAttribute('fill', color);
        if (color && color !== 'none') {
          this.fillSwatch.style.backgroundColor = color;
          this.fillSwatch.classList.remove('none');
        } else {
          this.fillSwatch.style.backgroundColor = '';
          this.fillSwatch.classList.add('none');
        }
      });
    };
    fillRow.querySelector('.prop-value')!.appendChild(this.fillSwatch);
    fillSection.appendChild(fillRow);
    this.propsContent.appendChild(fillSection);

    // Stroke section
    const strokeSection = this.createSection('Stroke');
    const strokeColorRow = this.createRow('Color');
    this.strokeSwatch = document.createElement('button');
    this.strokeSwatch.className = 'color-swatch';
    this.strokeSwatch.onclick = () => {
      const current = this.getSelectedAttr('stroke');
      this.colorPicker.show(this.strokeSwatch, current, (color) => {
        this.applyAttribute('stroke', color);
        if (color && color !== 'none') {
          this.strokeSwatch.style.backgroundColor = color;
          this.strokeSwatch.classList.remove('none');
        } else {
          this.strokeSwatch.style.backgroundColor = '';
          this.strokeSwatch.classList.add('none');
        }
      });
    };
    strokeColorRow.querySelector('.prop-value')!.appendChild(this.strokeSwatch);
    strokeSection.appendChild(strokeColorRow);

    const strokeWidthRow = this.createRow('Width');
    this.strokeWidthInput = document.createElement('input');
    this.strokeWidthInput.type = 'number';
    this.strokeWidthInput.min = '0';
    this.strokeWidthInput.max = '100';
    this.strokeWidthInput.step = '0.5';
    this.strokeWidthInput.onchange = () => {
      this.applyAttribute('stroke-width', this.strokeWidthInput.value);
    };
    strokeWidthRow.querySelector('.prop-value')!.appendChild(this.strokeWidthInput);
    strokeSection.appendChild(strokeWidthRow);
    this.propsContent.appendChild(strokeSection);

    // Opacity section
    const opacitySection = this.createSection('Opacity');
    const opacityRow = this.createRow('Value');
    this.opacityInput = document.createElement('input');
    this.opacityInput.type = 'range';
    this.opacityInput.min = '0';
    this.opacityInput.max = '1';
    this.opacityInput.step = '0.05';
    this.opacityValue = document.createElement('span');
    this.opacityValue.style.minWidth = '36px';
    this.opacityValue.style.textAlign = 'right';
    this.opacityValue.style.fontSize = '12px';
    this.opacityInput.oninput = () => {
      this.opacityValue.textContent = `${Math.round(parseFloat(this.opacityInput.value) * 100)}%`;
    };
    this.opacityInput.onchange = () => {
      this.applyAttribute('opacity', this.opacityInput.value);
    };
    const opacityValueDiv = opacityRow.querySelector('.prop-value')!;
    opacityValueDiv.appendChild(this.opacityInput);
    opacityValueDiv.appendChild(this.opacityValue);
    opacitySection.appendChild(opacityRow);
    this.propsContent.appendChild(opacitySection);

    // Transform section
    const transformSection = this.createSection('Dimensions');
    const xRow = this.createRow('X');
    this.posXInput = document.createElement('input');
    this.posXInput.type = 'number';
    this.posXInput.readOnly = true;
    xRow.querySelector('.prop-value')!.appendChild(this.posXInput);
    transformSection.appendChild(xRow);

    const yRow = this.createRow('Y');
    this.posYInput = document.createElement('input');
    this.posYInput.type = 'number';
    this.posYInput.readOnly = true;
    yRow.querySelector('.prop-value')!.appendChild(this.posYInput);
    transformSection.appendChild(yRow);

    const wRow = this.createRow('W');
    this.widthInput = document.createElement('input');
    this.widthInput.type = 'number';
    this.widthInput.readOnly = true;
    wRow.querySelector('.prop-value')!.appendChild(this.widthInput);
    transformSection.appendChild(wRow);

    const hRow = this.createRow('H');
    this.heightInput = document.createElement('input');
    this.heightInput.type = 'number';
    this.heightInput.readOnly = true;
    hRow.querySelector('.prop-value')!.appendChild(this.heightInput);
    transformSection.appendChild(hRow);

    this.propsContent.appendChild(transformSection);

    // Delete button
    const deleteSection = document.createElement('div');
    deleteSection.className = 'panel-section props-delete-section';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'props-delete-btn';
    deleteBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h10M6 5V4a1 1 0 011-1h2a1 1 0 011 1v1M5 5v7a1 1 0 001 1h4a1 1 0 001-1V5"/></svg> Delete Element`;
    deleteBtn.onclick = () => this.deleteSelected();
    deleteSection.appendChild(deleteBtn);
    this.propsContent.appendChild(deleteSection);

    this.container.appendChild(this.propsContent);
  }

  private setupListeners(): void {
    this.state.on('selection-changed', (elements) => {
      if (elements.length === 0) {
        this.emptyState.style.display = '';
        this.propsContent.style.display = 'none';
      } else {
        this.emptyState.style.display = 'none';
        this.propsContent.style.display = '';
        this.updateFromSelection();
      }
    });

    this.state.on('command-executed', () => {
      if (this.selectionManager.count > 0) {
        this.updateFromSelection();
      }
    });
  }

  private updateFromSelection(): void {
    const selected = this.selectionManager.selected;
    if (selected.length === 0) return;

    const el = selected[0];

    // Fill
    const fill = getComputedAttribute(el, 'fill');
    if (fill && fill !== 'none') {
      this.fillSwatch.style.backgroundColor = fill;
      this.fillSwatch.classList.remove('none');
    } else {
      this.fillSwatch.style.backgroundColor = '';
      this.fillSwatch.classList.toggle('none', fill === 'none');
    }

    // Stroke
    const stroke = getComputedAttribute(el, 'stroke');
    if (stroke && stroke !== 'none') {
      this.strokeSwatch.style.backgroundColor = stroke;
      this.strokeSwatch.classList.remove('none');
    } else {
      this.strokeSwatch.style.backgroundColor = '';
      this.strokeSwatch.classList.toggle('none', stroke === 'none' || !stroke);
    }

    // Stroke width
    const sw = getComputedAttribute(el, 'stroke-width');
    this.strokeWidthInput.value = sw || '1';

    // Opacity
    const opacity = getComputedAttribute(el, 'opacity') || '1';
    this.opacityInput.value = opacity;
    this.opacityValue.textContent = `${Math.round(parseFloat(opacity) * 100)}%`;

    // Dimensions
    try {
      const bbox = (el as SVGGraphicsElement).getBBox();
      this.posXInput.value = String(Math.round(bbox.x * 10) / 10);
      this.posYInput.value = String(Math.round(bbox.y * 10) / 10);
      this.widthInput.value = String(Math.round(bbox.width * 10) / 10);
      this.heightInput.value = String(Math.round(bbox.height * 10) / 10);
    } catch {
      this.posXInput.value = '';
      this.posYInput.value = '';
      this.widthInput.value = '';
      this.heightInput.value = '';
    }
  }

  private getSelectedAttr(attr: string): string | null {
    const selected = this.selectionManager.selected;
    if (selected.length === 0) return null;
    return getComputedAttribute(selected[0], attr);
  }

  private deleteSelected(): void {
    const selected = this.selectionManager.selected;
    if (selected.length === 0) return;

    const commands = selected.map((el) => new DeleteElementCommand(el));
    if (commands.length === 1) {
      this.commandManager.execute(commands[0]);
    } else {
      this.commandManager.execute(new CompositeCommand(commands, 'Delete elements'));
    }
    this.selectionManager.clearSelection();
    this.state.refreshLayers();
  }

  private applyAttribute(attr: string, value: string | null): void {
    const selected = this.selectionManager.selected;
    if (selected.length === 0) return;

    const commands = selected.map((el) => {
      const oldValue = el.getAttribute(attr);
      return new ChangeAttributeCommand(el, attr, oldValue, value);
    });

    if (commands.length === 1) {
      this.commandManager.execute(commands[0]);
    } else {
      this.commandManager.execute(new CompositeCommand(commands, `Change ${attr}`));
    }

    this.state.refreshLayers();
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const header = document.createElement('div');
    header.className = 'panel-section-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'panel-section-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
    section.appendChild(header);

    return section;
  }

  private createRow(label: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'prop-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'prop-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'prop-value';

    row.append(labelEl, valueEl);
    return row;
  }
}
