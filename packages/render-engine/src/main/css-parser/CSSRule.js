// CSS规则类
export class CSSRule {
  constructor(selectors, declarations) {
    this.selectors = selectors;
    this.declarations = declarations;
  }

  matches(element) {
    // 检查是否有选择器匹配该元素
    return this.selectors.some(selector => this.matchSelector(element, selector));
  }

  matchSelector(element, selector) {
    // 简单的选择器匹配
    selector = selector.trim();

    // 标签选择器
    if (selector === element.tagName.toLowerCase()) {
      return true;
    }

    // 类选择器
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return element.classList.contains(className);
    }

    // ID选择器
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return element.id === id;
    }

    // 通用选择器
    if (selector === '*') {
      return true;
    }

    // 属性选择器
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const attributeMatch = selector.match(/^\[([^\]]+)\]$/);
      if (attributeMatch) {
        const attributeName = attributeMatch[1];
        return element.hasAttribute(attributeName);
      }
    }

    return false;
  }
}