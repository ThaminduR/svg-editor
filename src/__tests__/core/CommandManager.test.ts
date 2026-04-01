import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandManager } from '../../core/CommandManager';
import { EditorState } from '../../core/EditorState';
import type { Command } from '../../core/commands/Command';

function mockCommand(): Command {
  return {
    execute: vi.fn(),
    undo: vi.fn(),
    description: 'test',
  };
}

describe('CommandManager', () => {
  let state: EditorState;
  let cm: CommandManager;

  beforeEach(() => {
    state = new EditorState();
    cm = new CommandManager(state);
  });

  it('execute() calls command.execute and enables undo', () => {
    const cmd = mockCommand();
    cm.execute(cmd);
    expect(cmd.execute).toHaveBeenCalledOnce();
    expect(cm.canUndo()).toBe(true);
    expect(cm.canRedo()).toBe(false);
  });

  it('undo() reverses the last command and enables redo', () => {
    const cmd = mockCommand();
    cm.execute(cmd);
    cm.undo();
    expect(cmd.undo).toHaveBeenCalledOnce();
    expect(cm.canUndo()).toBe(false);
    expect(cm.canRedo()).toBe(true);
  });

  it('redo() re-executes the command', () => {
    const cmd = mockCommand();
    cm.execute(cmd);
    cm.undo();
    cm.redo();
    expect(cmd.execute).toHaveBeenCalledTimes(2);
    expect(cm.canUndo()).toBe(true);
    expect(cm.canRedo()).toBe(false);
  });

  it('undo on empty stack is a no-op', () => {
    cm.undo();
    expect(cm.canUndo()).toBe(false);
    expect(cm.canRedo()).toBe(false);
  });

  it('execute() clears the redo stack', () => {
    const cmd1 = mockCommand();
    const cmd2 = mockCommand();
    cm.execute(cmd1);
    cm.undo();
    expect(cm.canRedo()).toBe(true);
    cm.execute(cmd2);
    expect(cm.canRedo()).toBe(false);
  });

  it('clear() empties both stacks', () => {
    cm.execute(mockCommand());
    cm.execute(mockCommand());
    cm.undo();
    cm.clear();
    expect(cm.canUndo()).toBe(false);
    expect(cm.canRedo()).toBe(false);
  });

  it('emits undo-redo-changed events', () => {
    const handler = vi.fn();
    state.on('undo-redo-changed', handler);
    cm.execute(mockCommand());
    expect(handler).toHaveBeenCalledWith({ canUndo: true, canRedo: false });
    cm.undo();
    expect(handler).toHaveBeenCalledWith({ canUndo: false, canRedo: true });
  });
});
