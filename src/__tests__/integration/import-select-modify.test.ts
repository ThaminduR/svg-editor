import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '../../core/EditorState';
import { CommandManager } from '../../core/CommandManager';
import { SelectionManager } from '../../core/SelectionManager';
import { SvgImporter } from '../../io/SvgImporter';
import { ChangeAttributeCommand } from '../../core/commands/ChangeAttributeCommand';

const TEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect id="r1" x="10" y="10" width="30" height="30" fill="red"/>
  <circle id="c1" cx="70" cy="70" r="20" fill="blue"/>
</svg>`;

describe('Import -> Select -> Modify flow', () => {
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

  it('loads SVG and populates layers', () => {
    expect(state.layers.length).toBe(2);
  });

  it('select element updates selection state', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    sm.select(rect);
    expect(sm.selected).toEqual([rect]);
    expect(sm.isSelected(rect)).toBe(true);
  });

  it('change fill via command updates DOM', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    sm.select(rect);

    const cmd = new ChangeAttributeCommand(rect, 'fill', 'red', 'green');
    cm.execute(cmd);

    expect(rect.getAttribute('fill')).toBe('green');
  });

  it('undo restores original fill', () => {
    const rect = svg.querySelector('#r1') as SVGElement;
    const cmd = new ChangeAttributeCommand(rect, 'fill', 'red', 'green');
    cm.execute(cmd);
    expect(rect.getAttribute('fill')).toBe('green');

    cm.undo();
    expect(rect.getAttribute('fill')).toBe('red');
  });

  it('multiple edits -> undo all -> redo all', () => {
    const rect = svg.querySelector('#r1') as SVGElement;

    cm.execute(new ChangeAttributeCommand(rect, 'fill', 'red', 'green'));
    cm.execute(new ChangeAttributeCommand(rect, 'stroke', null, 'black'));
    cm.execute(new ChangeAttributeCommand(rect, 'opacity', null, '0.5'));

    expect(rect.getAttribute('fill')).toBe('green');
    expect(rect.getAttribute('stroke')).toBe('black');
    expect(rect.getAttribute('opacity')).toBe('0.5');

    cm.undo();
    cm.undo();
    cm.undo();

    expect(rect.getAttribute('fill')).toBe('red');
    expect(rect.hasAttribute('stroke')).toBe(false);
    expect(rect.hasAttribute('opacity')).toBe(false);

    cm.redo();
    cm.redo();
    cm.redo();

    expect(rect.getAttribute('fill')).toBe('green');
    expect(rect.getAttribute('stroke')).toBe('black');
    expect(rect.getAttribute('opacity')).toBe('0.5');
  });
});
