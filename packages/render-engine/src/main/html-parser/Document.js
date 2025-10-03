import { Node } from './Node.js';
import { Element } from './Element.js';
import { Text } from './Text.js';

// 文档节点
export class Document extends Node {
  constructor() {
    super(9, '#document');
    this.documentElement = null;
  }

  createElement(tagName) {
    return new Element(tagName);
  }

  createTextNode(data) {
    return new Text(data);
  }

  getElementById(id) {
    return this._findElementById(this.documentElement, id);
  }

  _findElementById(element, id) {
    if (!element) return null;

    if (element.id === id) {
      return element;
    }

    for (const child of element.childNodes) {
      if (child.nodeType === 1) {
        const found = this._findElementById(child, id);
        if (found) return found;
      }
    }

    return null;
  }

  getElementsByTagName(tagName) {
    const results = [];
    this._collectElementsByTagName(this.documentElement, tagName.toUpperCase(), results);
    return results;
  }

  _collectElementsByTagName(element, tagName, results) {
    if (!element) return;

    if (element.tagName === tagName) {
      results.push(element);
    }

    for (const child of element.childNodes) {
      if (child.nodeType === 1) {
        this._collectElementsByTagName(child, tagName, results);
      }
    }
  }

  querySelector(selector) {
    return this._querySelector(this.documentElement, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    this._querySelectorAll(this.documentElement, selector, results);
    return results;
  }

  _querySelectorAll(element, selector, results) {
    if (!element) return;

    if (this._matchesSelector(element, selector)) {
      results.push(element);
    }

    for (const child of element.childNodes) {
      if (child.nodeType === 1) {
        this._querySelectorAll(child, selector, results);
      }
    }
  }

  _querySelector(element, selector) {
    if (!element) return null;

    if (this._matchesSelector(element, selector)) {
      return element;
    }

    for (const child of element.childNodes) {
      if (child.nodeType === 1) {
        const found = this._querySelector(child, selector);
        if (found) return found;
      }
    }

    return null;
  }

  _matchesSelector(element, selector) {
    if (selector.startsWith('#')) {
      return element.id === selector.substring(1);
    } else if (selector.startsWith('.')) {
      return element.classList.contains(selector.substring(1));
    } else {
      return element.tagName.toLowerCase() === selector.toLowerCase();
    }
  }
}
