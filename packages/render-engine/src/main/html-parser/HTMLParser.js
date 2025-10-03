import { Document } from './Document.js';
import { Element } from './Element.js';
import { Text } from './Text.js';
import { HTMLTokenizer } from './HTMLTokenizer.js';

// HTML解析器
export class HTMLParser {
  constructor() {
    this.tokenizer = new HTMLTokenizer();
  }

  parse(html) {
    const tokens = this.tokenizer.tokenize(html);
    return this.buildTree(tokens);
  }

  buildTree(tokens) {
    const document = new Document();
    const stack = [document];

    // 如果没有html标签，创建一个默认的html结构
    let hasHtmlElement = false;
    let hasBodyElement = false;

    for (const token of tokens) {
      if (token.type === 'startTag' && token.tagName.toLowerCase() === 'html') {
        hasHtmlElement = true;
        break;
      }
    }

    // 如果没有html标签，添加html和body标签
    if (!hasHtmlElement) {
      const htmlElement = document.createElement('html');
      const bodyElement = document.createElement('body');

      document.appendChild(htmlElement);
      htmlElement.appendChild(bodyElement);
      document.documentElement = htmlElement;

      // 将原始tokens添加到body中
      stack.push(htmlElement);
      stack.push(bodyElement);
    }

    for (const token of tokens) {
      const parent = stack[stack.length - 1];

      switch (token.type) {
        case 'startTag':
          const element = document.createElement(token.tagName);

          // 设置属性
          for (const [name, value] of Object.entries(token.attributes)) {
            element.setAttribute(name, value);
          }

          parent.appendChild(element);

          // 如果不是自闭合标签，压入栈
          if (!token.selfClosing) {
            stack.push(element);
          }

          // 如果是html标签，设置为documentElement
          if (token.tagName.toLowerCase() === 'html') {
            document.documentElement = element;
          }
          break;

        case 'endTag':
          if (stack.length > 1) {
            const popped = stack.pop();
            if (popped.tagName.toLowerCase() !== token.tagName.toLowerCase()) {
              console.warn(`标签不匹配: 期望 ${token.tagName}, 实际 ${popped.tagName}`);
            }
          }
          break;

        case 'text':
          const text = document.createTextNode(token.value);
          parent.appendChild(text);
          break;
      }
    }

    return document;
  }
}