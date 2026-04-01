import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '../../core/EditorState';
import { CommandManager } from '../../core/CommandManager';
import { SelectionManager } from '../../core/SelectionManager';
import { SvgImporter } from '../../io/SvgImporter';
import { ChangeAttributeCommand } from '../../core/commands/ChangeAttributeCommand';
import { ReorderCommand } from '../../core/commands/ReorderCommand';

const TEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect id="r1" fill="red" width="30" height="30"/>
  <circle id="c1" fill="blue" r="20"/>
  <path id="p1" d="M0 0L10 10"/>
</svg>`;

describe('Layers integration', () => {
  let state: EditorState;
  let cm: CommandManager;
  let sm: SelectionManager;
  let svg: SVGSVGElement;

  beforeEach(() => {
    state = new EditorState();
    cm = new CommandManager(state);
    sm = new SelectionManager(state);

    const importer = new SvgImporter();
    svg = importer.importFromString(TEST_SVG);
    state.loadSvg(svg);
  });

  it('layers populated from top-level children', () => {
    expect(state.layers.length).toBe(3);
    expect(state.layers[0].name).toBe('rect#r1');
    expect(state.layers[1].name).toBe('circle#c1');
    expect(state.layers[2].name).toBe('path#p1');
  });

  it('toggle visibility sets display:none', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    const cmd = new ChangeAttributeCommand(rect, 'display', null, 'none');
    cm.execute(cmd);

    expect(rect.getAttribute('display')).toBe('none');

    state.refreshLayers();
    const layer = state.layers.find((l) => l.name === 'rect#r1');
    expect(layer?.visible).toBe(false);
  });

  it('toggle visibility undo restores', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    cm.execute(new ChangeAttributeCommand(rect, 'display', null, 'none'));
    cm.undo();
    expect(rect.hasAttribute('display')).toBe(false);
  });

  it('lock layer excludes from selection', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    rect.setAttribute('data-locked', 'true');
    state.refreshLayers();

    const layer = state.layers.find((l) => l.name === 'rect#r1');
    expect(layer?.locked).toBe(true);

    // selectAll should skip locked
    sm.selectAll(svg);
    expect(sm.isSelected(rect)).toBe(false);
  });

  it('reorder changes DOM order and undo restores', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    const path = svg.querySelector('#p1') as SVGElement;

    // Move rect after path (to end)
    cm.execute(new ReorderCommand(rect, null));

    const childIds = Array.from(svg.children).map((c) => c.id);
    expect(childIds).toEqual(['c1', 'p1', 'r1']);

    cm.undo();

    const restored = Array.from(svg.children).map((c) => c.id);
    expect(restored).toEqual(['r1', 'c1', 'p1']);
  });
});
