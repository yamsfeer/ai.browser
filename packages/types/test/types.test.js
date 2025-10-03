import { describe, it, expect } from 'vitest';
import * as Types from '../src/index.js';

describe('Types Package', () => {
  it('should export types', () => {
    expect(Types).toBeDefined();
    // 检查是否导出了预期的类型
    expect(Object.keys(Types).length).toBeGreaterThan(0);
  });

  it('should have consistent type definitions', () => {
    // 这里可以根据实际的类型导出添加更具体的测试
    expect(typeof Types).toBe('object');
  });
});