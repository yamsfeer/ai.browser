// 导出所有类型定义

// 基础类型
export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

// DOM 相关类型
export interface NodeType {
  ELEMENT_NODE: 1;
  TEXT_NODE: 3;
  DOCUMENT_NODE: 9;
}

export interface Node {
  nodeType: number;
  nodeName: string;
  nodeValue: string;
  parentNode: Node | null;
  childNodes: Node[];
  firstChild: Node | null;
  lastChild: Node | null;
  nextSibling: Node | null;
  previousSibling: Node | null;
  textContent: string;
}

export interface Element extends Node {
  tagName: string;
  attributes: Record<string, string>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
}

export interface Document extends Node {
  documentElement: Element;
  createElement(tagName: string): Element;
  createTextNode(text: string): Node;
  getElementById(id: string): Element | null;
  getElementsByTagName(tagName: string): Element[];
}

// CSS 相关类型
export interface CSSRule {
  selector: string;
  declarations: Record<string, string>;
  specificity: number;
}

export interface CSSStyleSheet {
  rules: CSSRule[];
  addRule(rule: CSSRule): void;
  removeRule(index: number): void;
}

// 布局相关类型
export interface BoxModel {
  x: number;
  y: number;
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// 渲染相关类型
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface RenderCommand {
  type: string;
  data: any;
}

// 事件相关类型
export interface Event {
  type: string;
  target: any;
  bubbles: boolean;
  cancelable: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface EventListener {
  (event: Event): void;
}

// 错误类型
export interface BrowserError {
  message: string;
  stack?: string;
  code?: string;
}