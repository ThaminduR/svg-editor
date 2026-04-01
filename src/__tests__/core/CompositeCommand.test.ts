import { describe, it, expect, vi } from 'vitest';
import { CompositeCommand } from '../../core/commands/CompositeCommand';
import type { Command } from '../../core/commands/Command';

describe('CompositeCommand', () => {
  it('execute() runs all sub-commands in order', () => {
    const order: number[] = [];
    const cmds: Command[] = [
      { execute: () => order.push(1), undo: vi.fn(), description: 'a' },
      { execute: () => order.push(2), undo: vi.fn(), description: 'b' },
      { execute: () => order.push(3), undo: vi.fn(), description: 'c' },
    ];
    const composite = new CompositeCommand(cmds);
    composite.execute();
    expect(order).toEqual([1, 2, 3]);
  });

  it('undo() runs all sub-commands in reverse order', () => {
    const order: number[] = [];
    const cmds: Command[] = [
      { execute: vi.fn(), undo: () => order.push(1), description: 'a' },
      { execute: vi.fn(), undo: () => order.push(2), description: 'b' },
      { execute: vi.fn(), undo: () => order.push(3), description: 'c' },
    ];
    const composite = new CompositeCommand(cmds);
    composite.undo();
    expect(order).toEqual([3, 2, 1]);
  });
});
