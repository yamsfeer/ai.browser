import { Node } from './Node.js';

// 元素节点
export class Element extends Node {
  constructor(tagName) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.style = {};
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

  removeAttribute(name) {
    delete this.attributes[name];
  }

  get id() {
    return this.getAttribute('id');
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  get classList() {
    const classes = this.className.split(/\s+/).filter(c => c);
    return {
      contains: (className) => classes.includes(className),
      add: (className) => {
        if (!classes.includes(className)) {
          classes.push(className);
          this.className = classes.join(' ');
        }
      },
      remove: (className) => {
        const index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          this.className = classes.join(' ');
        }
      }
    };
  }

  get textContent() {
    return this.childNodes
      .map(child => child.textContent || child.nodeValue || '')
      .join('');
  }

  contains(node) {
    if (!node) return false;

    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }

    return false;
  }

  querySelector(selector) {
    return this._querySelector(this, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    this._querySelectorAll(this, selector, results);
    return results;
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