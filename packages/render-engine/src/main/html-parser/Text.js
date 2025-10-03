import { Node } from './Node.js';

// 文本节点
export class Text extends Node {
  constructor(data) {
    super(3, '#text');
    this.data = data;
  }

  get nodeValue() {
    return this.data;
  }

  set nodeValue(value) {
    this.data = value;
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = value;
  }
}