import { describe, it, expect } from 'vitest';
import { LayoutEngine, BoxModel } from '../src/main/layout-engine/index.js';

// 简单的Element类用于测试
class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.nodeType = 1;
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  hasAttribute(name) {
    return name in this.attributes;
  }
}

class Text {
  constructor(data) {
    this.data = data;
    this.nodeType = 3;
    this.parentNode = null;
  }
}

describe('Layout Engine', () => {
  it('should create layout engine instance', () => {
    const layoutEngine = new LayoutEngine(800, 600);
    expect(layoutEngine).toBeInstanceOf(LayoutEngine);
    expect(layoutEngine.viewportWidth).toBe(800);
    expect(layoutEngine.viewportHeight).toBe(600);
  });

  describe('Box Model', () => {
    it('should create box model with default values', () => {
      const boxModel = new BoxModel();
      expect(boxModel.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
      expect(boxModel.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
      expect(boxModel.border).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });

    it('should parse box values correctly', () => {
      const style = { margin: '10px', padding: '5px 10px', 'border-width': '1px 2px 3px 4px' };
      const boxModel = new BoxModel(style);

      expect(boxModel.margin).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
      expect(boxModel.padding).toEqual({ top: 5, right: 10, bottom: 5, left: 10 });
      expect(boxModel.border).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    });

    it('should handle different length units', () => {
      const boxModel = new BoxModel();
      expect(boxModel.parseLength('10px')).toBe(10);
      expect(boxModel.parseLength('1em')).toBe(16);
      expect(boxModel.parseLength('50%')).toBe(0.5);
      expect(boxModel.parseLength('1.5rem')).toBe(24);
    });

    it('should calculate total space correctly', () => {
      const style = { margin: '10px', padding: '5px', 'border-width': '2px' };
      const boxModel = new BoxModel(style);

      expect(boxModel.totalHorizontalSpace).toBe(34); // 10+2+5+5+2+10
      expect(boxModel.totalVerticalSpace).toBe(34);
    });
  });

  describe('Layout Engine Layout', () => {
    it('should layout simple block element', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      const div = new Element('div');
      div.computedStyle = {
        display: 'block',
        width: '200px',
        height: '100px',
        margin: '10px',
        padding: '5px'
      };

      const renderTree = layoutEngine.layout(div);
      expect(renderTree).toBeDefined();
      expect(renderTree.root).toBeDefined();
      expect(renderTree.root.layout).toEqual({
        x: 10,
        y: 10,
        width: 200,
        height: 100 // 固定高度不包含padding
      });
    });

    it('should layout nested elements', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      const parent = new Element('div');
      parent.computedStyle = {
        display: 'block',
        width: '400px',
        margin: '20px',
        padding: '10px'
      };

      const child = new Element('p');
      child.computedStyle = {
        display: 'block',
        height: '50px',
        margin: '5px'
      };

      parent.appendChild(child);
      const renderTree = layoutEngine.layout(parent);

      expect(renderTree.root.layout.x).toBe(20);
      expect(renderTree.root.layout.y).toBe(20);
      expect(renderTree.root.children[0].layout.x).toBe(35); // 20+10(margin)+5(padding)
      expect(renderTree.root.children[0].layout.y).toBe(35); // 20+10(margin)+5(padding)
    });

    it('should handle inline elements', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      const span = new Element('span');
      span.computedStyle = {
        display: 'inline'
      };

      const text = new Text('Hello World');
      text.computedStyle = span.computedStyle;
      span.appendChild(text);

      const renderTree = layoutEngine.layout(span);
      expect(renderTree.root.layout.width).toBeGreaterThan(0);
      expect(renderTree.root.layout.height).toBe(16); // default font height
    });

    it('should calculate auto width correctly', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      const div = new Element('div');
      div.computedStyle = {
        display: 'block',
        width: 'auto',
        height: '100px',
        margin: '10px',
        padding: '5px',
        border: '2px'
      };

      const renderTree = layoutEngine.layout(div);
      expect(renderTree.root.layout.width).toBe(800 - 34); // viewport width - horizontal space
    });

    it('should calculate auto height based on content', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      const parent = new Element('div');
      parent.computedStyle = {
        display: 'block',
        width: '400px',
        height: 'auto',
        padding: '10px'
      };

      const child1 = new Element('p');
      child1.computedStyle = {
        display: 'block',
        height: '50px'
      };

      const child2 = new Element('p');
      child2.computedStyle = {
        display: 'block',
        height: '30px'
      };

      parent.appendChild(child1);
      parent.appendChild(child2);

      const renderTree = layoutEngine.layout(parent);
      expect(renderTree.root.layout.height).toBe(100); // 50+30+20(padding) - auto height只包含内容和padding
    });
  });

  describe('Layout Engine Integration', () => {
    it('should work with StyleCalculator when provided', () => {
      const layoutEngine = new LayoutEngine(800, 600);

      // Mock StyleCalculator
      const mockStyleCalculator = {
        calculateStyles: (element, cssRules) => ({
          display: 'block',
          width: '300px',
          height: '150px',
          margin: '15px',
          padding: '8px'
        })
      };

      const div = new Element('div');
      const renderTree = layoutEngine.layout(div, [], mockStyleCalculator);

      expect(renderTree.root.layout.width).toBe(300);
      expect(renderTree.root.layout.height).toBe(150); // 固定高度，不包含padding
      expect(renderTree.root.layout.x).toBe(15);
      expect(renderTree.root.layout.y).toBe(15);
    });
  });
});