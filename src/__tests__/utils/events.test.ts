import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../../utils/events';

type TestEvents = {
  foo: string;
  bar: number;
};

describe('TypedEventEmitter', () => {
  it('on() registers handler and emit() fires it', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();
    emitter.on('foo', handler);
    emitter.emit('foo', 'hello');
    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('off() removes handler', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();
    emitter.on('foo', handler);
    emitter.off('foo', handler);
    emitter.emit('foo', 'hello');
    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns unsubscribe function', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();
    const unsub = emitter.on('bar', handler);
    emitter.emit('bar', 42);
    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
    emitter.emit('bar', 99);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports multiple handlers for same event', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('foo', h1);
    emitter.on('foo', h2);
    emitter.emit('foo', 'test');
    expect(h1).toHaveBeenCalledWith('test');
    expect(h2).toHaveBeenCalledWith('test');
  });

  it('emit with no handlers is a no-op', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    expect(() => emitter.emit('foo', 'nothing')).not.toThrow();
  });
});
