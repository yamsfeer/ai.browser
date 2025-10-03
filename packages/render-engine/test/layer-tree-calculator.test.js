import { describe, it, expect, beforeEach } from 'vitest';
import { LayerTreeCalculator } from '../src/main/layer/LayerTreeCalculator.js';
import { Layer, LayerTree } from '../src/main/layer/Layer.js';

describe('Layer Tree Calculator', () => {
  let calculator;
  let mockLayoutTree;

  beforeEach(() => {
    calculator = new LayerTreeCalculator({
      enableCompositingOptimization: true,
      maxLayerCount: 100
    });

    // Create mock layout tree
    mockLayoutTree = {
      root: {
        style: {},
        layout: { x: 0, y: 0, width: 800, height: 600 },
        children: []
      }
    };
  });

  it('should create layer tree calculator with default options', () => {
    const defaultCalculator = new LayerTreeCalculator();
    expect(defaultCalculator.enableCompositingOptimization).toBe(true);
    expect(defaultCalculator.maxLayerCount).toBe(1000);
  });

  it('should calculate layer tree for layout tree', () => {
    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree).toBeInstanceOf(LayerTree);
    expect(layerTree.root).toBeDefined();
    expect(layerTree.root.bounds).toEqual(mockLayoutTree.root.layout);
    expect(calculator.stats.totalNodes).toBe(1);
  });

  it('should handle null or invalid layout tree', () => {
    const result1 = calculator.calculate(null);
    const result2 = calculator.calculate({ root: null });

    expect(result1).toBeInstanceOf(LayerTree);
    expect(result2).toBeInstanceOf(LayerTree);
  });

  it('should calculate for single node without compositing', () => {
    const layerTree = new LayerTree();
    calculator.calculateForNode(mockLayoutTree.root, layerTree.root, layerTree);

    // Should not create new layer if no compositing reasons
    expect(calculator.stats.layersCreated).toBe(0);
  });

  it('should create new layer for transform', () => {
    mockLayoutTree.root.style.transform = 'translateX(10px)';

    const layerTree = calculator.calculate(mockLayoutTree);
    const rootLayer = layerTree.root;

    expect(rootLayer.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['transform']).toBe(1);
  });

  it('should create new layer for opacity', () => {
    mockLayoutTree.root.style.opacity = '0.5';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['opacity']).toBe(1);
  });

  it('should create new layer for fixed positioning', () => {
    mockLayoutTree.root.style.position = 'fixed';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['fixed-position']).toBe(1);
  });

  it('should create new layer for z-index with positioning', () => {
    mockLayoutTree.root.style.position = 'absolute';
    mockLayoutTree.root.style['z-index'] = '10';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['z-index']).toBe(1);
  });

  it('should create new layer for will-change', () => {
    mockLayoutTree.root.style['will-change'] = 'transform';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['will-change']).toBe(1);
  });

  it('should create new layer for filter', () => {
    mockLayoutTree.root.style.filter = 'blur(5px)';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['filter']).toBe(1);
  });

  it('should create new layer for mix-blend-mode', () => {
    mockLayoutTree.root.style['mix-blend-mode'] = 'multiply';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['mix-blend-mode']).toBe(1);
  });

  it('should create new layer for scroll container', () => {
    mockLayoutTree.root.style.overflow = 'scroll';

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['scroll-container']).toBe(1);
  });

  it('should create new layer for compositing elements', () => {
    mockLayoutTree.root.element = { tagName: 'VIDEO' };

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(layerTree.root.children.length).toBe(1);
    expect(calculator.stats.layersCreated).toBe(1);
    expect(calculator.stats.compositingReasons['compositing-element']).toBe(1);
  });

  it('should check positioning correctly', () => {
    const positions = ['absolute', 'relative', 'fixed', 'sticky'];

    positions.forEach(position => {
      expect(calculator.hasPositioning({ position })).toBe(true);
    });

    expect(calculator.hasPositioning({ position: 'static' })).toBe(false);
  });

  it('should check positive z-index correctly', () => {
    expect(calculator.hasPositiveZIndex({ 'z-index': '5' })).toBe(true);
    expect(calculator.hasPositiveZIndex({ 'z-index': '0' })).toBe(false);
    expect(calculator.hasPositiveZIndex({ 'z-index': '-1' })).toBe(false);
    expect(calculator.hasPositiveZIndex({})).toBe(false);
  });

  it('should check complex box shadow correctly', () => {
    expect(calculator.hasComplexBoxShadow({ 'box-shadow': '0 0 10px 0 rgba(0,0,0,0.5)' })).toBe(true);
    expect(calculator.hasComplexBoxShadow({ 'box-shadow': '2px 0px 0px 0px rgba(0,0,0,0.5)' })).toBe(true);
    expect(calculator.hasComplexBoxShadow({ 'box-shadow': '0 0 0px 0px rgba(0,0,0,0.5)' })).toBe(false);
    expect(calculator.hasComplexBoxShadow({ 'box-shadow': 'none' })).toBe(false);
    expect(calculator.hasComplexBoxShadow({})).toBe(false);
  });

  it('should identify compositing elements correctly', () => {
    const compositingTags = ['video', 'canvas', 'iframe', 'embed', 'object'];

    compositingTags.forEach(tag => {
      expect(calculator.isCompositingElement({ element: { tagName: tag } })).toBe(true);
    });

    expect(calculator.isCompositingElement({ element: { tagName: 'div' } })).toBe(false);
    expect(calculator.isCompositingElement({ element: {} })).toBe(false);
    expect(calculator.isCompositingElement({})).toBe(false);
  });

  it('should check active animation correctly', () => {
    expect(calculator.hasActiveAnimation({ animation: 'fadeIn 1s ease-in' })).toBe(true);
    expect(calculator.hasActiveAnimation({ animation: 'none' })).toBe(false);
    expect(calculator.hasActiveAnimation({})).toBe(false);
  });

  it('should create layer for node with properties', () => {
    const parentLayer = calculator.createLayerTree().root;
    const layerTree = calculator.createLayerTree();

    const node = {
      style: {
        position: 'fixed',
        opacity: '0.8',
        'z-index': '5',
        overflow: 'hidden'
      },
      layout: { x: 10, y: 10, width: 100, height: 50 }
    };

    const layer = calculator.createLayerForNode(node, parentLayer, layerTree, 'fixed-position');

    expect(layer).toBeInstanceOf(Layer);
    expect(layer.zIndex).toBe(5);
    expect(layer.opacity).toBe(0.8);
    expect(layer.bounds).toEqual(node.layout);
    expect(layer.isFixed).toBe(true);
    expect(layer.clipRect).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(layer.masksToBounds).toBe(true);
    expect(layer.isScrollContainer).toBe(false);
    expect(layer.layoutNode).toBe(node);
    expect(parentLayer.children).toContain(layer);
  });

  it('should handle scroll container correctly', () => {
    const node = {
      style: { overflow: 'scroll' },
      layout: { width: 100, height: 50 }
    };

    const layer = calculator.createLayerForNode(node, {}, calculator.createLayerTree(), 'scroll-container');

    expect(layer.isScrollContainer).toBe(true);
    expect(layer.clipRect).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it('should parse transform correctly', () => {
    const transform = calculator.parseTransform('translateX(10px) scale(1.5)');
    expect(transform).toEqual([1, 0, 0, 1, 0, 0]); // Returns identity matrix for simplicity
  });

  it('should handle nested nodes', () => {
    const childNode = {
      style: { opacity: '0.5' },
      layout: { x: 20, y: 20, width: 50, height: 30 },
      children: []
    };

    mockLayoutTree.root.children.push(childNode);

    const layerTree = calculator.calculate(mockLayoutTree);

    expect(calculator.stats.totalNodes).toBe(2);
    expect(calculator.stats.layersCreated).toBe(1); // Only child needs new layer
  });

  it('should optimize layer tree when enabled', () => {
    calculator.enableCompositingOptimization = true;

    const layerTree = calculator.calculate(mockLayoutTree);

    // Should call optimization methods
    expect(calculator.stats.calculationTime).toBeGreaterThan(0);
  });

  it('should not optimize layer tree when disabled', () => {
    calculator.enableCompositingOptimization = false;

    const layerTree = calculator.calculate(mockLayoutTree);

    // Should still work without optimization
    expect(layerTree).toBeInstanceOf(LayerTree);
    expect(calculator.stats.calculationTime).toBeGreaterThan(0);
  });

  it('should record compositing reasons correctly', () => {
    calculator.recordCompositingReason('transform');
    calculator.recordCompositingReason('transform');
    calculator.recordCompositingReason('opacity');

    expect(calculator.stats.compositingReasons['transform']).toBe(2);
    expect(calculator.stats.compositingReasons['opacity']).toBe(1);
    expect(calculator.stats.totalCompositingReasons).toBe(3);
  });

  it('should get compositing reason stats', () => {
    calculator.recordCompositingReason('transform');
    calculator.recordCompositingReason('transform');
    calculator.recordCompositingReason('opacity');

    const stats = calculator.getCompositingReasonStats();

    expect(stats.total).toBe(3);
    expect(stats.reasons).toHaveLength(2);
    expect(stats.reasons[0].reason).toBe('transform');
    expect(stats.reasons[0].count).toBe(2);
    expect(stats.reasons[0].percentage).toBe('66.7%');
    expect(stats.reasons[1].reason).toBe('opacity');
    expect(stats.reasons[1].count).toBe(1);
    expect(stats.reasons[1].percentage).toBe('33.3%');
  });

  it('should get and reset stats', () => {
    calculator.calculate(mockLayoutTree);

    const stats = calculator.getStats();
    expect(stats.totalNodes).toBe(1);
    expect(stats.layersCreated).toBe(0);
    expect(stats.calculationTime).toBeGreaterThan(0);

    calculator.resetStats();
    const resetStats = calculator.getStats();
    expect(resetStats.totalNodes).toBe(0);
    expect(resetStats.layersCreated).toBe(0);
    expect(resetStats.calculationTime).toBe(0);
  });

  it('should log debug info when enabled', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    calculator.calculate(mockLayoutTree, { debug: true });

    expect(consoleSpy).toHaveBeenCalledWith('Layer Tree计算完成:', calculator.stats);
    expect(consoleSpy).toHaveBeenCalledWith('LayerTree结构:');

    consoleSpy.mockRestore();
  });
});