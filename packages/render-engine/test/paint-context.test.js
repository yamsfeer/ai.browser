import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaintContext } from '../src/main/paint/PaintContext.js';

describe('Paint Context', () => {
  let paintContext;
  let mockCanvas2dContext;

  beforeEach(() => {
    mockCanvas2dContext = {
      canvas: { width: 800, height: 600 },
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '16px serif',
      textAlign: 'left',
      textBaseline: 'top',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      setTransform: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };

    paintContext = new PaintContext(mockCanvas2dContext, {
      debug: true
    });
  });

  it('should create paint context with default settings', () => {
    expect(paintContext.context).toBe(mockCanvas2dContext);
    expect(paintContext.viewport).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600
    });
    expect(paintContext.debugMode).toBe(true);
  });

  it('should create default state correctly', () => {
    const defaultState = paintContext.createDefaultState();
    expect(defaultState.fillStyle).toBe('#000000');
    expect(defaultState.strokeStyle).toBe('#000000');
    expect(defaultState.lineWidth).toBe(1);
    expect(defaultState.globalAlpha).toBe(1);
    expect(defaultState.font).toBe('16px serif');
    expect(defaultState.textAlign).toBe('left');
    expect(defaultState.textBaseline).toBe('top');
  });

  it('should manage state stack', () => {
    paintContext.setFillStyle('#ff0000');
    const stateBeforeSave = { ...paintContext.currentState };

    paintContext.save();

    expect(paintContext.stateStack.length).toBe(1);
    expect(paintContext.stateStack[0]).toEqual(stateBeforeSave);
    expect(paintContext.currentState.fillStyle).toBe('#ff0000');

    paintContext.restore();
    expect(paintContext.stateStack.length).toBe(0);
    expect(paintContext.currentState.fillStyle).toBe('#ff0000'); // Restored to saved state
  });

  it('should apply state to canvas context', () => {
    paintContext.setFillStyle('#ff0000');
    paintContext.setStrokeStyle('#00ff00');
    paintContext.setLineWidth(2);
    paintContext.setGlobalAlpha(0.5);
    paintContext.setFont('20px Arial');
    paintContext.setTextAlign('center');
    paintContext.setTextBaseline('middle');

    paintContext.applyState();

    expect(mockCanvas2dContext.fillStyle).toBe('#ff0000');
    expect(mockCanvas2dContext.strokeStyle).toBe('#00ff00');
    expect(mockCanvas2dContext.lineWidth).toBe(2);
    expect(mockCanvas2dContext.globalAlpha).toBe(0.5);
    expect(mockCanvas2dContext.font).toBe('20px Arial');
    expect(mockCanvas2dContext.textAlign).toBe('center');
    expect(mockCanvas2dContext.textBaseline).toBe('middle');
  });

  it('should manage dirty regions', () => {
    paintContext.addDirtyRegion(10, 10, 100, 50);
    paintContext.addDirtyRegion(200, 150, 80, 60);

    expect(paintContext.dirtyRegions).toHaveLength(2);
    expect(paintContext.dirtyRegions[0]).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    expect(paintContext.dirtyRegions[1]).toEqual({ x: 200, y: 150, width: 80, height: 60 });

    paintContext.clearDirtyRegions();
    expect(paintContext.dirtyRegions).toHaveLength(0);
  });

  it('should merge overlapping dirty regions', () => {
    paintContext.addDirtyRegion(10, 10, 100, 100);
    paintContext.addDirtyRegion(50, 50, 100, 100); // Overlapping with first

    const mergedRegions = paintContext.getMergedDirtyRegions();
    expect(mergedRegions).toHaveLength(1);
    expect(mergedRegions[0]).toEqual({ x: 10, y: 10, width: 140, height: 140 });
  });

  it('should check rectangle overlap correctly', () => {
    const rect1 = { x: 10, y: 10, width: 100, height: 100 };
    const rect2 = { x: 50, y: 50, width: 100, height: 100 }; // Overlaps
    const rect3 = { x: 200, y: 200, width: 100, height: 100 }; // Doesn't overlap

    expect(paintContext.rectanglesOverlap(rect1, rect2)).toBe(true);
    expect(paintContext.rectanglesOverlap(rect1, rect3)).toBe(false);
  });

  it('should manage clip regions', () => {
    paintContext.setClipRegion(10, 10, 100, 50);

    expect(paintContext.clipRegions).toHaveLength(1);
    expect(paintContext.clipRegions[0]).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    expect(mockCanvas2dContext.beginPath).toHaveBeenCalled();
    expect(mockCanvas2dContext.rect).toHaveBeenCalledWith(10, 10, 100, 50);
    expect(mockCanvas2dContext.clip).toHaveBeenCalled();

    paintContext.clearClipRegions();
    expect(paintContext.clipRegions).toHaveLength(0);
  });

  it('should check if area should be painted', () => {
    // Test viewport culling
    expect(paintContext.shouldPaint(10, 10, 100, 50)).toBe(true);
    expect(paintContext.shouldPaint(-100, -100, 50, 50)).toBe(false); // Outside viewport
    expect(paintContext.shouldPaint(900, 900, 50, 50)).toBe(false); // Outside viewport

    // Test dirty region culling
    paintContext.addDirtyRegion(50, 50, 100, 100);
    expect(paintContext.shouldPaint(75, 75, 20, 20)).toBe(true); // Inside dirty region
    expect(paintContext.shouldPaint(10, 10, 20, 20)).toBe(false); // Outside dirty region
  });

  it('should reset to default state', () => {
    paintContext.setFillStyle('#ff0000');
    paintContext.addDirtyRegion(10, 10, 100, 50);
    paintContext.setClipRegion(5, 5, 200, 200);

    paintContext.reset();

    expect(paintContext.currentState.fillStyle).toBe('#000000');
    expect(paintContext.dirtyRegions).toHaveLength(0);
    expect(paintContext.clipRegions).toHaveLength(0);
  });

  it('should log debug info', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    paintContext.logDebugInfo();

    expect(consoleSpy).toHaveBeenCalledWith('Paint Context Debug Info:');
    expect(consoleSpy).toHaveBeenCalledWith('Dirty Regions:', 0);
    expect(consoleSpy).toHaveBeenCalledWith('Clip Regions:', 0);
    expect(consoleSpy).toHaveBeenCalledWith('Viewport:', paintContext.viewport);
    expect(consoleSpy).toHaveBeenCalledWith('Current State:', paintContext.currentState);

    consoleSpy.mockRestore();
  });
});