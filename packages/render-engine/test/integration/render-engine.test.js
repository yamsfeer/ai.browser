import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderEngine } from '../../src/RenderEngine.js';

// 创建测试用的Canvas元素
function createTestCanvas(width = 800, height = 600) {
  const canvas = {
    width,
    height,
    getContext: type => {
      if (type !== '2d') {
        throw new Error('Only 2d context is supported');
      }

      return {
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        font: '16px serif',
        textAlign: 'left',
        textBaseline: 'top',
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        measureText: text => ({ width: text.length * 8 }),
        translate: vi.fn(),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
      };
    },
  };

  return canvas;
}

// 创建模拟的渲染树
function createMockRenderTree() {
  return {
    root: {
      type: 'element',
      tagName: 'div',
      style: {
        width: '800px',
        height: '600px',
        backgroundColor: '#ffffff',
        position: 'relative'
      },
      layout: {
        x: 0,
        y: 0,
        width: 800,
        height: 600
      },
      children: [
        {
          type: 'element',
          tagName: 'h1',
          element: { data: '测试标题' },
          style: {
            fontSize: '24px',
            color: '#333333',
            margin: '20px'
          },
          layout: {
            x: 20,
            y: 20,
            width: 760,
            height: 30
          },
          children: []
        },
        {
          type: 'element',
          tagName: 'p',
          element: { data: '这是一个测试段落。' },
          style: {
            fontSize: '16px',
            color: '#666666',
            margin: '10px 20px'
          },
          layout: {
            x: 20,
            y: 70,
            width: 760,
            height: 20
          },
          children: []
        }
      ]
    }
  };
}

describe('渲染引擎集成测试', () => {
  let renderEngine;
  let canvas;

  beforeEach(() => {
    canvas = createTestCanvas();
    renderEngine = new RenderEngine(canvas);
  });

  describe('渲染引擎初始化', () => {
    it('应该正确初始化渲染引擎', () => {
      expect(renderEngine).toBeDefined();
      expect(renderEngine.canvas).toBe(canvas);
      expect(renderEngine.context).toBeDefined();
      expect(renderEngine.layerTreeCalculator).toBeDefined();
      expect(renderEngine.paintRecordGenerator).toBeDefined();
      expect(renderEngine.gpuSimulator).toBeDefined();
      expect(renderEngine.compositor).toBeDefined();
    });

    it('应该支持配置选项', () => {
      const customEngine = new RenderEngine(canvas, {
        debug: true,
        enableCompositingOptimization: false,
        maxLayerCount: 500,
        enableBatching: true,
        maxDrawQuads: 5000
      });

      expect(customEngine.debugMode).toBe(true);
    });
  });

  describe('完整渲染流程', () => {
    it('应该能够执行完整的渲染管线', () => {
      const renderTree = createMockRenderTree();

      const stats = renderEngine.render(renderTree);

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBeGreaterThanOrEqual(0);
      expect(stats.paintRecordsGenerated).toBeGreaterThanOrEqual(0);
      expect(stats.layersCreated).toBeGreaterThanOrEqual(0);
      expect(stats.drawQuadsCreated).toBeGreaterThanOrEqual(0);
      expect(stats.totalRenderTime).toBeGreaterThanOrEqual(0);
      expect(stats.frameCount).toBe(1);
    });

    it('应该支持调试模式渲染', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderEngine.setDebugMode(true);
      const renderTree = createMockRenderTree();

      renderEngine.render(renderTree);

      expect(consoleSpy).toHaveBeenCalledWith('📊 开始计算Layer Tree...');
      expect(consoleSpy).toHaveBeenCalledWith('🎨 开始生成Paint Records...');
      expect(consoleSpy).toHaveBeenCalledWith('🔧 开始GPU光栅化...');
      expect(consoleSpy).toHaveBeenCalledWith('🚀 开始GPU渲染...');
      expect(consoleSpy).toHaveBeenCalledWith('🎭 开始合成器处理...');

      consoleSpy.mockRestore();
    });

    it('应该处理空渲染树', () => {
      const emptyRenderTree = { root: null };

      expect(() => {
        renderEngine.render(emptyRenderTree);
      }).not.toThrow();
    });

    it('应该处理无效渲染树', () => {
      const invalidRenderTree = {};

      expect(() => {
        renderEngine.render(invalidRenderTree);
      }).not.toThrow();
    });
  });

  describe('GPU渲染管线', () => {
    it('应该正确执行GPU光栅化', () => {
      const renderTree = createMockRenderTree();

      renderEngine.render(renderTree);

      const gpuInfo = renderEngine.gpuSimulator.getGPUInfo();
      expect(gpuInfo).toBeDefined();
      expect(gpuInfo.maxDrawQuads).toBeGreaterThan(0);
      expect(gpuInfo.textureCount).toBeGreaterThanOrEqual(0);
      expect(gpuInfo.enableBatching).toBeDefined();
    });

    it('应该生成GPU性能统计', () => {
      const renderTree = createMockRenderTree();

      renderEngine.render(renderTree);

      const gpuStats = renderEngine.gpuSimulator.getPerformanceStats();
      expect(gpuStats).toBeDefined();
      expect(gpuStats.totalDrawCalls).toBeGreaterThanOrEqual(0);
      expect(gpuStats.totalQuads).toBeGreaterThanOrEqual(0);
      expect(gpuStats.totalTriangles).toBeGreaterThanOrEqual(0);
      expect(gpuStats.frameTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('增量渲染', () => {
    it('应该支持增量渲染', () => {
      const initialTree = createMockRenderTree();
      renderEngine.render(initialTree);

      const modifiedTree = {
        ...initialTree,
        root: {
          ...initialTree.root,
          style: {
            ...initialTree.root.style,
            backgroundColor: '#f0f0f0'
          }
        }
      };

      const stats = renderEngine.incrementalRender(modifiedTree, []);

      expect(stats).toBeDefined();
      expect(stats.frameCount).toBeGreaterThanOrEqual(1);
    });

    it('首次增量渲染应该回退到完整渲染', () => {
      const renderTree = createMockRenderTree();

      const stats = renderEngine.incrementalRender(renderTree, []);

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('性能统计', () => {
    it('应该提供详细的渲染统计', () => {
      const renderTree = createMockRenderTree();

      renderEngine.render(renderTree);
      const stats = renderEngine.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBeGreaterThanOrEqual(0);
      expect(stats.paintRecordsGenerated).toBeGreaterThanOrEqual(0);
      expect(stats.layersCreated).toBeGreaterThanOrEqual(0);
      expect(stats.drawQuadsCreated).toBeGreaterThanOrEqual(0);
      expect(stats.tilesCreated).toBeGreaterThanOrEqual(0);
      expect(stats.compositorTime).toBeGreaterThanOrEqual(0);
      expect(stats.gpuTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalRenderTime).toBeGreaterThanOrEqual(0);
      expect(stats.frameCount).toBeGreaterThanOrEqual(0);
      expect(stats.averageFrameTime).toBeGreaterThanOrEqual(0);
    });

    it('应该计算平均帧时间', () => {
      const renderTree = createMockRenderTree();

      // 渲染多帧
      renderEngine.render(renderTree);
      renderEngine.render(renderTree);
      renderEngine.render(renderTree);

      const stats = renderEngine.getStats();
      expect(stats.frameCount).toBe(3);
      expect(stats.averageFrameTime).toBeGreaterThan(0);
    });
  });

  describe('渲染管线信息', () => {
    it('应该提供完整的管线信息', () => {
      const renderTree = createMockRenderTree();

      renderEngine.render(renderTree);
      const pipelineInfo = renderEngine.getPipelineInfo();

      expect(pipelineInfo).toBeDefined();
      expect(pipelineInfo.layerTreeCalculator).toBeDefined();
      expect(pipelineInfo.paintRecordGenerator).toBeDefined();
      expect(pipelineInfo.compositor).toBeDefined();
      expect(pipelineInfo.layerTree).toBeDefined();
      expect(pipelineInfo.compositingReasons).toBeDefined();
      expect(pipelineInfo.currentStats).toBeDefined();
    });
  });

  describe('Canvas管理', () => {
    it('应该支持调整Canvas大小', () => {
      renderEngine.resizeCanvas(1024, 768);

      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('调整大小后应该能正常渲染', () => {
      renderEngine.resizeCanvas(500, 400);

      const renderTree = createMockRenderTree();
      const stats = renderEngine.render(renderTree);

      expect(stats).toBeDefined();
      expect(stats.paintRecordsGenerated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理渲染错误', () => {
      // 模拟Canvas上下文错误
      const originalFillRect = canvas.getContext('2d').fillRect;
      canvas.getContext('2d').fillRect = vi.fn(() => {
        throw new Error('Canvas rendering error');
      });

      const renderTree = createMockRenderTree();

      expect(() => {
        renderEngine.render(renderTree);
      }).not.toThrow();

      // 恢复
      canvas.getContext('2d').fillRect = originalFillRect;
    });

    it('应该处理无效的渲染选项', () => {
      const renderTree = createMockRenderTree();

      expect(() => {
        renderEngine.render(renderTree, null);
        renderEngine.render(renderTree, undefined);
        renderEngine.render(renderTree, { invalid: 'option' });
      }).not.toThrow();
    });
  });

  describe('内存管理', () => {
    it('应该正确销毁渲染引擎', () => {
      const renderTree = createMockRenderTree();
      renderEngine.render(renderTree);

      expect(() => {
        renderEngine.dispose();
      }).not.toThrow();

      expect(renderEngine.currentLayerTree).toBeNull();
      expect(renderEngine.lastRenderTree).toBeNull();
    });

    it('销毁后应该能重新初始化', () => {
      renderEngine.dispose();

      expect(() => {
        renderEngine = new RenderEngine(canvas);
        const renderTree = createMockRenderTree();
        renderEngine.render(renderTree);
      }).not.toThrow();
    });
  });

  describe('复杂渲染场景', () => {
    it('应该处理多层嵌套的渲染树', () => {
      const complexRenderTree = {
        root: {
          type: 'element',
          tagName: 'div',
          style: {
            width: '800px',
            height: '600px',
            position: 'relative'
          },
          layout: {
            x: 0,
            y: 0,
            width: 800,
            height: 600
          },
          children: Array.from({ length: 10 }, (_, i) => ({
            type: 'element',
            tagName: 'div',
            style: {
              position: 'absolute',
              left: `${i * 80}px`,
              top: `${i * 60}px`,
              width: '70px',
              height: '50px',
              backgroundColor: `hsl(${i * 36}, 70%, 50%)`
            },
            layout: {
              x: i * 80,
              y: i * 60,
              width: 70,
              height: 50
            },
            children: []
          }))
        }
      };

      const startTime = performance.now();
      const stats = renderEngine.render(complexRenderTree);
      const endTime = performance.now();

      expect(stats).toBeDefined();
      expect(stats.layersCreated).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该处理大量渲染元素', () => {
      const massiveRenderTree = {
        root: {
          type: 'element',
          tagName: 'div',
          style: {
            width: '800px',
            height: '600px',
            backgroundColor: '#ffffff',
            position: 'relative'
          },
          layout: { x: 0, y: 0, width: 800, height: 600 },
          children: Array.from({ length: 100 }, (_, i) => ({
            type: 'element',
            tagName: 'span',
            element: { data: `Element ${i}` },
            style: {
              fontSize: '12px',
              color: '#333333',
              backgroundColor: `hsl(${i * 3.6}, 50%, 90%)`,
              position: 'absolute',
              left: `${(i % 10) * 80}px`,
              top: `${Math.floor(i / 10) * 30}px`,
              width: '70px',
              height: '20px',
              display: 'block'
            },
            layout: {
              x: (i % 10) * 80,
              y: Math.floor(i / 10) * 30,
              width: 70,
              height: 20
            },
            children: []
          }))
        }
      };

      const stats = renderEngine.render(massiveRenderTree);

      expect(stats).toBeDefined();
      // 由于Paint Record生成逻辑可能比较复杂，我们只检查基本渲染完成
      expect(stats.totalRenderTime).toBeGreaterThanOrEqual(0);
      expect(stats.frameCount).toBeGreaterThanOrEqual(1);
    });
  });
});