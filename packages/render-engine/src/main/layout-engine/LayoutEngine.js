import { BoxModel } from './BoxModel.js';

// 布局引擎
export class LayoutEngine {
  constructor(viewportWidth = 800, viewportHeight = 600) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  layout(domRoot, cssRules = [], styleCalculator = null) {
    // 保存StyleCalculator实例
    this.styleCalculator = styleCalculator;

    // 为所有元素计算样式
    this.calculateComputedStyles(domRoot, cssRules);

    // 创建渲染对象
    const renderTree = this.createRenderTree(domRoot);

    // 从根节点开始布局
    this.layoutNode(renderTree.root, 0, 0, this.viewportWidth);

    return renderTree;
  }

  calculateComputedStyles(element, cssRules) {
    if (element.nodeType === 1) { // 元素节点
      // 使用StyleCalculator计算computed style，如果没有提供则使用默认样式
      if (this.styleCalculator) {
        element.computedStyle = this.styleCalculator.calculateStyles(element, cssRules);
      } else {
        element.computedStyle = element.computedStyle || {
          display: 'block',
          width: 'auto',
          height: 'auto',
          margin: '0',
          padding: '0',
          border: 'none',
          color: 'black',
          'font-size': '16px',
          'font-family': 'serif'
        };
      }
    }

    // 递归处理子节点
    if (element.childNodes && Array.isArray(element.childNodes)) {
      for (const child of element.childNodes) {
        this.calculateComputedStyles(child, cssRules);
      }
    }
  }

  createRenderTree(domRoot) {
    const renderTree = {
      root: null,
      nodes: []
    };

    const createRenderObject = (element) => {
      if (element.nodeType === 1) { // 元素节点
        const renderObject = {
          element: element,
          style: element.computedStyle,
          children: [],
          layout: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
          },
          boxModel: new BoxModel(element.computedStyle)
        };

        renderTree.nodes.push(renderObject);

        // 处理子节点
        for (const child of element.childNodes) {
          const childRenderObject = createRenderObject(child);
          if (childRenderObject) {
            renderObject.children.push(childRenderObject);
          }
        }

        return renderObject;
      } else if (element.nodeType === 3) { // 文本节点
        return {
          element: element,
          style: element.parentNode.computedStyle,
          children: [],
          layout: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
          },
          boxModel: new BoxModel({})
        };
      }

      return null;
    };

    renderTree.root = createRenderObject(domRoot);
    return renderTree;
  }

  layoutNode(node, x, y, availableWidth) {
    if (!node) return;

    const style = node.style;
    const boxModel = node.boxModel;

    switch (style.display) {
      case 'none':
        node.layout = { x: 0, y: 0, width: 0, height: 0 };
        break;

      case 'block':
        this.layoutBlock(node, x, y, availableWidth);
        break;

      case 'inline':
        this.layoutInline(node, x, y, availableWidth);
        break;

      case 'inline-block':
        this.layoutInlineBlock(node, x, y, availableWidth);
        break;

      default:
        this.layoutBlock(node, x, y, availableWidth);
    }
  }

  layoutBlock(node, x, y, availableWidth) {
    const style = node.style;
    const boxModel = node.boxModel;

    // 计算宽度
    let width;
    if (style.width === 'auto') {
      width = availableWidth - boxModel.totalHorizontalSpace;
    } else {
      width = boxModel.parseLength(style.width);
    }

    // 计算子元素的高度
    let contentHeight = 0;
    let currentY = y + boxModel.margin.top + boxModel.border.top + boxModel.padding.top;

    for (const child of node.children) {
      if (child.element.nodeType === 1 || child.element.nodeType === 3) {
        this.layoutNode(child, x + boxModel.margin.left + boxModel.border.left + boxModel.padding.left, currentY, width);
        const childMarginBottom = child.boxModel ? child.boxModel.margin.bottom : 0;
        currentY += child.layout.height + childMarginBottom;
        contentHeight += child.layout.height + childMarginBottom;
      }
    }

    // 计算高度
    let height;
    if (style.height === 'auto') {
      height = contentHeight + boxModel.padding.top + boxModel.padding.bottom;
    } else {
      height = boxModel.parseLength(style.height);
    }

    node.layout = {
      x: x + boxModel.margin.left,
      y: y + boxModel.margin.top,
      width: width,
      height: height
    };
  }

  layoutInline(node, x, y, availableWidth) {
    const style = node.style;
    const boxModel = node.boxModel;

    // 简化的行内布局
    let width = 0;
    let height = 16; // 默认字体高度

    if (node.element.nodeType === 3) { // 文本节点
      // 简单估算文本宽度
      width = node.element.data ? node.element.data.length * 8 : 0; // 假设每个字符8px宽
    } else if (node.element.nodeType === 1) { // 元素节点
      // 如果是内联元素，计算其子元素的总宽度
      for (const child of node.children) {
        this.layoutInline(child, x, y, availableWidth);
        width += child.layout.width;
      }
    }

    // 加上padding
    if (boxModel) {
      width += boxModel.padding.left + boxModel.padding.right;
      height += boxModel.padding.top + boxModel.padding.bottom;
    }

    node.layout = {
      x: x + (boxModel ? boxModel.margin.left : 0),
      y: y + (boxModel ? boxModel.margin.top : 0),
      width: width,
      height: height
    };
  }

  layoutInlineBlock(node, x, y, availableWidth) {
    // inline-block作为块级元素布局，但在行内显示
    this.layoutBlock(node, x, y, availableWidth);
  }
}