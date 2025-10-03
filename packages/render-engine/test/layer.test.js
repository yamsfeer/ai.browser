import { describe, it, expect, beforeEach } from 'vitest';
import { Layer, LayerTree } from '../src/main/layer/Layer.js';

describe('Layer', () => {
  let layer;

  beforeEach(() => {
    layer = new Layer();
  });

  it('should create layer with default values', () => {
    expect(layer.id).toBeDefined();
    expect(layer.id).toMatch(/^layer_\d+_[a-z0-9]+$/);
    expect(layer.parent).toBeNull();
    expect(layer.children).toEqual([]);
    expect(layer.zIndex).toBe(0);
    expect(layer.opacity).toBe(1.0);
    expect(layer.compositingMode).toBe('normal');
    expect(layer.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(layer.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(layer.paintRecords).toEqual([]);
    expect(layer.needsRepaint).toBe(true);
    expect(layer.isComposited).toBe(true);
  });

  it('should create layer with custom options', () => {
    const options = {
      id: 'test-layer',
      zIndex: 10,
      opacity: 0.8,
      bounds: { x: 10, y: 20, width: 100, height: 50 },
      isFixed: true,
      isComposited: false
    };

    const customLayer = new Layer(options);

    expect(customLayer.id).toBe('test-layer');
    expect(customLayer.zIndex).toBe(10);
    expect(customLayer.opacity).toBe(0.8);
    expect(customLayer.bounds).toEqual(options.bounds);
    expect(customLayer.isFixed).toBe(true);
    expect(customLayer.isComposited).toBe(false);
  });

  it('should manage children', () => {
    const child1 = new Layer({ id: 'child1', zIndex: 5 });
    const child2 = new Layer({ id: 'child2', zIndex: 3 });
    const child3 = new Layer({ id: 'child3', zIndex: 7 });

    // Add children
    layer.addChild(child1);
    layer.addChild(child2);
    layer.addChild(child3);

    expect(layer.children).toHaveLength(3);
    expect(child1.parent).toBe(layer);
    expect(child2.parent).toBe(layer);
    expect(child3.parent).toBe(layer);

    // Children should be sorted by zIndex
    expect(layer.children[0].id).toBe('child2'); // zIndex 3
    expect(layer.children[1].id).toBe('child1'); // zIndex 5
    expect(layer.children[2].id).toBe('child3'); // zIndex 7

    // Remove child
    layer.removeChild(child1);
    expect(layer.children).toHaveLength(2);
    expect(child1.parent).toBeNull();
    expect(layer.children).toEqual([child3, child2]); // Still sorted
  });

  it('should handle child with existing parent', () => {
    const oldParent = new Layer({ id: 'old-parent' });
    const child = new Layer({ id: 'child' });

    oldParent.addChild(child);
    expect(child.parent).toBe(oldParent);
    expect(oldParent.children).toContain(child);

    layer.addChild(child);
    expect(child.parent).toBe(layer);
    expect(layer.children).toContain(child);
    expect(oldParent.children).not.toContain(child);
  });

  it('should manage paint records', () => {
    const mockRecord1 = { layerId: null };
    const mockRecord2 = { layerId: null };

    layer.addPaintRecord(mockRecord1);
    expect(layer.paintRecords).toHaveLength(1);
    expect(mockRecord1.layerId).toBe(layer.id);
    expect(layer.needsRepaint).toBe(true);

    layer.addPaintRecords([mockRecord2]);
    expect(layer.paintRecords).toHaveLength(2);
    expect(mockRecord2.layerId).toBe(layer.id);

    layer.clearPaintRecords();
    expect(layer.paintRecords).toHaveLength(0);
    expect(layer.needsRepaint).toBe(true);
  });

  it('should mark dirty regions', () => {
    const dirtyRegion = { x: 10, y: 10, width: 100, height: 50 };

    layer.markDirty(dirtyRegion);
    expect(layer.needsRepaint).toBe(true);
    expect(layer.dirtyRegion).toEqual(dirtyRegion);

    layer.markDirty(); // Without region
    expect(layer.dirtyRegion).toBeNull();
    expect(layer.needsRepaint).toBe(true);
  });

  it('should transform dirty region to parent coordinates', () => {
    const parentLayer = new Layer();
    parentLayer.addChild(layer);

    layer.transform = [2, 0, 0, 2, 10, 5]; // Scale by 2, translate by (10, 5)
    const dirtyRegion = { x: 10, y: 10, width: 100, height: 50 };

    layer.markDirty(dirtyRegion);
    expect(parentLayer.needsRepaint).toBe(true); // Parent should be marked dirty
  });

  it('should check if point is in layer', () => {
    layer.bounds = { x: 10, y: 20, width: 100, height: 50 };

    expect(layer.containsPoint(15, 25)).toBe(true);
    expect(layer.containsPoint(110, 25)).toBe(true); // On right edge
    expect(layer.containsPoint(15, 70)).toBe(true);  // On bottom edge
    expect(layer.containsPoint(5, 25)).toBe(false);   // Left of layer
    expect(layer.containsPoint(15, 75)).toBe(false);  // Below layer
    expect(layer.containsPoint(115, 25)).toBe(false); // Right of layer
  });

  it('should check rectangle intersection', () => {
    layer.bounds = { x: 10, y: 10, width: 100, height: 100 };

    const intersectingRect = { x: 50, y: 50, width: 100, height: 100 };
    const nonIntersectingRect = { x: 200, y: 200, width: 50, height: 50 };

    expect(layer.intersectsRect(intersectingRect)).toBe(true);
    expect(layer.intersectsRect(nonIntersectingRect)).toBe(false);
  });

  it('should get absolute bounds', () => {
    const parentLayer = new Layer();
    parentLayer.bounds = { x: 10, y: 20, width: 200, height: 150 };
    parentLayer.addChild(layer);

    layer.bounds = { x: 5, y: 10, width: 100, height: 80 };

    const absoluteBounds = layer.getAbsoluteBounds();
    expect(absoluteBounds).toEqual({
      x: 15, // 10 + 5
      y: 30, // 20 + 10
      width: 100,
      height: 80
    });
  });

  it('should apply transform and set position/size', () => {
    const newTransform = [1.5, 0, 0, 1.5, 20, 10];
    layer.setTransform(newTransform);
    expect(layer.transform).toEqual(newTransform);
    expect(layer.needsRepaint).toBe(true);

    layer.setPosition(50, 100);
    expect(layer.bounds.x).toBe(50);
    expect(layer.bounds.y).toBe(100);
    expect(layer.needsRepaint).toBe(true);

    layer.setSize(200, 150);
    expect(layer.bounds.width).toBe(200);
    expect(layer.bounds.height).toBe(150);
    expect(layer.needsRepaint).toBe(true);
  });

  it('should get all visible paint records including children', () => {
    const parentRecord = { visible: true, opacity: 1.0 };
    const childRecord = { visible: true, opacity: 1.0 };
    const invisibleRecord = { visible: false, opacity: 1.0 };
    const transparentRecord = { visible: true, opacity: 0.0 };

    const childLayer = new Layer();
    layer.addChild(childLayer);

    layer.addPaintRecord(parentRecord);
    layer.addPaintRecord(invisibleRecord);
    childLayer.addPaintRecord(childRecord);
    childLayer.addPaintRecord(transparentRecord);

    const visibleRecords = layer.getAllVisiblePaintRecords();
    expect(visibleRecords).toHaveLength(2);
    expect(visibleRecords).toContain(parentRecord);
    expect(visibleRecords).toContain(childRecord);
    expect(visibleRecords).not.toContain(invisibleRecord);
    expect(visibleRecords).not.toContain(transparentRecord);
  });

  it('should get stats', () => {
    const childLayer = new Layer();
    layer.addChild(childLayer);

    layer.addPaintRecords([{ visible: true }, { visible: true }]);
    childLayer.addPaintRecords([{ visible: true }]);

    const stats = layer.getStats();
    expect(stats.id).toBe(layer.id);
    expect(stats.paintRecords).toBe(2);
    expect(stats.children).toBe(1);
    expect(stats.totalChildren).toBe(1); // Only direct children
    expect(stats.totalPaintRecords).toBe(3); // Including child
    expect(stats.needsRepaint).toBe(true);
    expect(stats.opacity).toBe(1.0);
    expect(stats.zIndex).toBe(0);
  });

  it('should dispose resources', () => {
    const childLayer = new Layer();
    layer.addChild(childLayer);

    layer.addPaintRecords([{ visible: true }]);
    layer.backingStore = { some: 'data' };

    layer.dispose();

    expect(layer.paintRecords).toHaveLength(0);
    expect(layer.backingStore).toBeNull();
    expect(layer.children).toHaveLength(0);
    expect(childLayer.parent).toBeNull();
  });

  it('should convert to string representation', () => {
    const childLayer = new Layer({ id: 'child', zIndex: 5 });
    layer.addPaintRecords([{ visible: true }]);
    layer.addChild(childLayer);

    const str = layer.toString();
    expect(str).toContain(`Layer(${layer.id})`);
    expect(str).toContain('z:0');
    expect(str).toContain('opacity:1');
    expect(str).toContain('bounds:[0,0,0,0]');
    expect(str).toContain('PaintRecords: 1');
    expect(str).toContain('Layer(child) z:5');
  });
});

describe('Layer Tree', () => {
  let layerTree;

  beforeEach(() => {
    layerTree = new LayerTree();
  });

  it('should create layer tree with root', () => {
    expect(layerTree.root).toBeInstanceOf(Layer);
    expect(layerTree.root.id).toBe('root');
    expect(layerTree.root.zIndex).toBe(0);
    expect(layerTree.allLayers.size).toBe(1);
    expect(layerTree.allLayers.has('root')).toBe(true);
  });

  it('should create new layers', () => {
    const layer1 = layerTree.createLayer({ zIndex: 5 });
    const layer2 = layerTree.createLayer({ id: 'custom-layer' });

    expect(layer1).toBeInstanceOf(Layer);
    expect(layer1.zIndex).toBe(5);
    expect(layer2.id).toBe('custom-layer');
    expect(layerTree.allLayers.size).toBe(3); // root + layer1 + layer2
    expect(layerTree.allLayers.has(layer1.id)).toBe(true);
    expect(layerTree.allLayers.has(layer2.id)).toBe(true);
  });

  it('should get layer by ID', () => {
    const layer = layerTree.createLayer({ id: 'test-layer' });
    const found = layerTree.getLayerById('test-layer');
    const notFound = layerTree.getLayerById('nonexistent');

    expect(found).toBe(layer);
    expect(notFound).toBeNull();
  });

  it('should remove layers', () => {
    const layer = layerTree.createLayer({ id: 'test-layer' });
    layerTree.root.addChild(layer);

    expect(layerTree.allLayers.size).toBe(2);
    expect(layerTree.allLayers.has('test-layer')).toBe(true);

    layerTree.removeLayer(layer);

    expect(layerTree.allLayers.size).toBe(1);
    expect(layerTree.allLayers.has('test-layer')).toBe(false);
    expect(layerTree.root.children).toHaveLength(0);
  });

  it('should get dirty layers', () => {
    const layer1 = layerTree.createLayer({ id: 'layer1' });
    const layer2 = layerTree.createLayer({ id: 'layer2' });

    layer1.markDirty();
    // layer2 remains clean

    const dirtyLayers = layerTree.getDirtyLayers();
    expect(dirtyLayers).toHaveLength(1);
    expect(dirtyLayers).toContain(layer1);
    expect(dirtyLayers).not.toContain(layer2);
  });

  it('should clear dirty flags', () => {
    const layer1 = layerTree.createLayer({ id: 'layer1' });
    const layer2 = layerTree.createLayer({ id: 'layer2' });

    layer1.markDirty({ x: 10, y: 10, width: 100, height: 50 });
    layer2.markDirty();

    layerTree.clearDirtyFlags();

    expect(layer1.needsRepaint).toBe(false);
    expect(layer1.dirtyRegion).toBeNull();
    expect(layer2.needsRepaint).toBe(false);
    expect(layer2.dirtyRegion).toBeNull();
  });

  it('should get stats', () => {
    const layer1 = layerTree.createLayer({ id: 'layer1' });
    const layer2 = layerTree.createLayer({ id: 'layer2' });

    layer1.markDirty();
    layerTree.root.addChild(layer1);
    layerTree.root.addChild(layer2);

    const stats = layerTree.getStats();
    expect(stats.totalLayers).toBe(3); // root + layer1 + layer2
    expect(stats.dirtyLayers).toBe(1); // only layer1 is dirty
    expect(stats.rootStats).toBeDefined();
  });

  it('should traverse layers', () => {
    const layer1 = layerTree.createLayer({ id: 'layer1' });
    const layer2 = layerTree.createLayer({ id: 'layer2' });
    const layer3 = layerTree.createLayer({ id: 'layer3' });

    layerTree.root.addChild(layer1);
    layer1.addChild(layer2);
    layerTree.root.addChild(layer3);

    const visited = [];
    layerTree.traverseLayers((layer) => {
      visited.push(layer.id);
    });

    expect(visited).toEqual(['root', 'layer1', 'layer2', 'layer3']);
  });
});