import { describe, it, expect } from 'vitest';
import { JSEngine } from '../src/index.js';

describe('JavaScript Engine', () => {
  it('should create JavaScript engine instance', () => {
    const engine = new JSEngine();
    expect(engine).toBeInstanceOf(JSEngine);
  });

  it('should execute simple JavaScript code', async () => {
    const engine = new JSEngine();
    const result = await engine.execute('2 + 2');
    expect(result).toBe(4);
  });

  it('should handle variable declarations', async () => {
    const engine = new JSEngine();
    await engine.execute('const x = 10;');
    const result = await engine.execute('x * 2');
    expect(result).toBe(20);
  });

  it('should handle function calls', async () => {
    const engine = new JSEngine();
    await engine.execute('function add(a, b) { return a + b; }');
    const result = await engine.execute('add(5, 3)');
    expect(result).toBe(8);
  });

  it('should handle errors gracefully', async () => {
    const engine = new JSEngine();
    await expect(engine.execute('undefinedVariable')).rejects.toThrow();
  });
});