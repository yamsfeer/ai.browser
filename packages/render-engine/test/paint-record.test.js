import { describe, it, expect, beforeEach } from 'vitest';
import {
  PaintRecord,
  RectPaintRecord,
  TextPaintRecord,
  ImagePaintRecord,
  PathPaintRecord,
  ShadowPaintRecord
} from '../src/main/paint/PaintRecord.js';

describe('Paint Record', () => {
  let mockContext;

  // 创建一个测试专用的 PaintRecord 子类
  class TestPaintRecord extends PaintRecord {
    executePaintOperation(context) {
      // 测试专用，不做任何操作
    }
  }

  beforeEach(() => {
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '16px serif',
      textAlign: 'left',
      textBaseline: 'top',
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setTransform: vi.fn(),
      clip: vi.fn(),
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  });

  describe('Base Paint Record', () => {
    it('should create paint record with default values', () => {
      const record = new PaintRecord('test');

      expect(record.type).toBe('test');
      expect(record.params).toEqual({});
      expect(record.layerId).toBeNull();
      expect(record.zIndex).toBe(0);
      expect(record.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
      expect(record.opacity).toBe(1.0);
      expect(record.visible).toBe(true);
      expect(record.clipRect).toBeNull();
      expect(record.transform).toBeNull();
      expect(record.timestamp).toBeGreaterThan(0);
    });

    it('should create paint record with custom params', () => {
      const params = {
        layerId: 'layer1',
        zIndex: 10,
        bounds: { x: 10, y: 20, width: 100, height: 50 },
        opacity: 0.8,
        visible: false,
        clipRect: { x: 0, y: 0, width: 200, height: 150 }
      };

      const record = new PaintRecord('test', params);

      expect(record.layerId).toBe('layer1');
      expect(record.zIndex).toBe(10);
      expect(record.bounds).toEqual(params.bounds);
      expect(record.opacity).toBe(0.8);
      expect(record.visible).toBe(false);
      expect(record.clipRect).toEqual(params.clipRect);
    });

    it('should skip execution when not visible', () => {
      const record = new PaintRecord('test', { visible: false });
      record.execute(mockContext);

      expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should skip execution when opacity is 0', () => {
      const record = new PaintRecord('test', { opacity: 0 });
      record.opacity = 0; // 显式设置为 0 以覆盖默认值
      record.execute(mockContext);

      expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should apply clipping and opacity during execution', () => {
      const record = new TestPaintRecord('test', {
        clipRect: { x: 10, y: 10, width: 100, height: 50 }
      });
      record.opacity = 0.5; // 显式设置

      record.execute(mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.rect).toHaveBeenCalledWith(10, 10, 100, 50);
      expect(mockContext.clip).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should check rectangle intersection', () => {
      const record = new PaintRecord('test', {
        bounds: { x: 10, y: 10, width: 100, height: 100 }
      });

      const overlappingRect = { x: 50, y: 50, width: 100, height: 100 };
      const nonOverlappingRect = { x: 200, y: 200, width: 50, height: 50 };

      expect(record.intersectsRect(overlappingRect)).toBe(true);
      expect(record.intersectsRect(nonOverlappingRect)).toBe(false);
    });

    it('should clone paint record', () => {
      const original = new PaintRecord('test', {
        opacity: 0.8,
        zIndex: 5
      });

      const cloned = original.clone();

      expect(cloned.type).toBe(original.type);
      expect(cloned.opacity).toBe(original.opacity);
      expect(cloned.zIndex).toBe(original.zIndex);
      expect(cloned).not.toBe(original);
      expect(cloned.params).not.toBe(original.params);
    });

    it('should throw error when executePaintOperation is called on base class', () => {
      const record = new PaintRecord('test');
      expect(() => record.executePaintOperation(mockContext)).toThrow(
        'executePaintOperation must be implemented by subclass'
      );
    });
  });

  describe('Rect Paint Record', () => {
    it('should create rect paint record', () => {
      const params = {
        fillStyle: '#ff0000',
        strokeStyle: '#00ff00',
        lineWidth: 2,
        bounds: { x: 10, y: 10, width: 100, height: 50 },
        stroked: true  // 需要明确设置为 true
      };

      const record = new RectPaintRecord(params);

      expect(record.type).toBe('rect');
      expect(record.fillStyle).toBe('#ff0000');
      expect(record.strokeStyle).toBe('#00ff00');
      expect(record.lineWidth).toBe(2);
      expect(record.filled).toBe(true);
      expect(record.stroked).toBe(true);
    });

    it('should execute filled rectangle painting', () => {
      const record = new RectPaintRecord({
        fillStyle: '#ff0000',
        filled: true,
        stroked: false,
        bounds: { x: 10, y: 10, width: 100, height: 50 }
      });

      record.execute(mockContext);

      expect(mockContext.fillStyle).toBe('#ff0000');
      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 10, 100, 50);
      expect(mockContext.strokeRect).not.toHaveBeenCalled();
    });

    it('should execute stroked rectangle painting', () => {
      const record = new RectPaintRecord({
        strokeStyle: '#00ff00',
        lineWidth: 3,
        filled: false,
        stroked: true,
        bounds: { x: 10, y: 10, width: 100, height: 50 }
      });

      record.execute(mockContext);

      expect(mockContext.strokeStyle).toBe('#00ff00');
      expect(mockContext.lineWidth).toBe(3);
      expect(mockContext.strokeRect).toHaveBeenCalledWith(10, 10, 100, 50);
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('Text Paint Record', () => {
    it('should create text paint record', () => {
      const params = {
        text: 'Hello World',
        font: '20px Arial',
        fillStyle: '#000000',
        bounds: { x: 10, y: 10, width: 200, height: 30 }
      };

      const record = new TextPaintRecord(params);

      expect(record.type).toBe('text');
      expect(record.text).toBe('Hello World');
      expect(record.font).toBe('20px Arial');
      expect(record.fillStyle).toBe('#000000');
    });

    it('should execute text painting', () => {
      const record = new TextPaintRecord({
        text: 'Hello World',
        font: '20px Arial',
        fillStyle: '#000000',
        bounds: { x: 10, y: 10, width: 200, height: 30 },
        textAlign: 'center',
        textBaseline: 'middle'
      });

      record.execute(mockContext);

      expect(mockContext.font).toBe('20px Arial');
      expect(mockContext.fillStyle).toBe('#000000');
      expect(mockContext.textAlign).toBe('center');
      expect(mockContext.textBaseline).toBe('middle');
      expect(mockContext.fillText).toHaveBeenCalledWith('Hello World', 10, 10);
    });

    it('should execute text painting with maxWidth', () => {
      const record = new TextPaintRecord({
        text: 'Hello World',
        bounds: { x: 10, y: 10, width: 100, height: 30 },
        maxWidth: 150
      });

      record.execute(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith('Hello World', 10, 10, 150);
    });
  });

  describe('Image Paint Record', () => {
    it('should create image paint record', () => {
      const mockImage = { width: 100, height: 100 };
      const record = new ImagePaintRecord({
        image: mockImage,
        bounds: { x: 10, y: 10, width: 100, height: 100 }
      });

      expect(record.type).toBe('image');
      expect(record.image).toBe(mockImage);
    });

    it('should execute image painting without source rect', () => {
      const mockImage = { width: 100, height: 100 };
      const record = new ImagePaintRecord({
        image: mockImage,
        bounds: { x: 10, y: 10, width: 100, height: 100 }
      });

      record.execute(mockContext);

      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage, 10, 10, 100, 100
      );
    });

    it('should execute image painting with source rect', () => {
      const mockImage = { width: 200, height: 200 };
      const sourceRect = { x: 10, y: 10, width: 50, height: 50 };
      const record = new ImagePaintRecord({
        image: mockImage,
        sourceRect,
        bounds: { x: 10, y: 10, width: 100, height: 100 }
      });

      record.execute(mockContext);

      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        10, 10, 50, 50,  // source
        10, 10, 100, 100 // destination
      );
    });

    it('should skip execution when image is null', () => {
      const record = new ImagePaintRecord({});
      record.execute(mockContext);

      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('Path Paint Record', () => {
    it('should create path paint record', () => {
      const path = [
        { type: 'moveTo', x: 10, y: 10 },
        { type: 'lineTo', x: 100, y: 100 }
      ];

      const record = new PathPaintRecord({
        path,
        fillStyle: '#ff0000',
        strokeStyle: '#000000',
        lineWidth: 2
      });

      expect(record.type).toBe('path');
      expect(record.path).toEqual(path);
      expect(record.fillStyle).toBe('#ff0000');
      expect(record.strokeStyle).toBe('#000000');
    });

    it('should execute path painting', () => {
      const path = [
        { type: 'moveTo', x: 10, y: 10 },
        { type: 'lineTo', x: 100, y: 100 },
        { type: 'arc', x: 50, y: 50, radius: 25, startAngle: 0, endAngle: Math.PI },
        { type: 'closePath' }
      ];

      const record = new PathPaintRecord({
        path,
        strokeStyle: '#000000',
        lineWidth: 2,
        filled: false,
        stroked: true
      });

      record.execute(mockContext);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockContext.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockContext.arc).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI);
      expect(mockContext.closePath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should skip execution when path is empty', () => {
      const record = new PathPaintRecord({ path: [] });
      record.execute(mockContext);

      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });
  });

  describe('Shadow Paint Record', () => {
    it('should create shadow paint record', () => {
      const targetRecord = new RectPaintRecord({ fillStyle: '#ff0000' });
      const record = new ShadowPaintRecord({
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        targetRecord
      });

      expect(record.type).toBe('shadow');
      expect(record.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
      expect(record.shadowBlur).toBe(10);
      expect(record.shadowOffsetX).toBe(2);
      expect(record.shadowOffsetY).toBe(2);
      expect(record.targetRecord).toBe(targetRecord);
    });

    it('should apply shadow and execute target record', () => {
      const targetRecord = {
        execute: vi.fn()
      };

      const record = new ShadowPaintRecord({
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 10,
        targetRecord
      });

      record.execute(mockContext);

      expect(mockContext.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
      expect(mockContext.shadowBlur).toBe(10);
      expect(targetRecord.execute).toHaveBeenCalledWith(mockContext);
    });

    it('should skip execution when target record is null', () => {
      const record = new ShadowPaintRecord({ targetRecord: null });
      record.execute(mockContext);

      expect(mockContext.shadowColor).not.toBe('rgba(0, 0, 0, 0.5)');
    });
  });
});