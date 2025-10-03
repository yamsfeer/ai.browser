import { describe, it, expect } from 'vitest';
import { HTMLParser, HTMLTokenizer, Node, Element, Text, Document } from '../src/main/html-parser/index.js';

describe('HTML Tokenizer', () => {
  it('should tokenize simple HTML', () => {
    const tokenizer = new HTMLTokenizer();
    const html = '<div>Hello</div>';
    const tokens = tokenizer.tokenize(html);

    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe('startTag');
    expect(tokens[0].tagName).toBe('div');
    expect(tokens[1].type).toBe('text');
    expect(tokens[1].value).toBe('Hello');
    expect(tokens[2].type).toBe('endTag');
    expect(tokens[2].tagName).toBe('div');
  });

  it('should handle attributes', () => {
    const tokenizer = new HTMLTokenizer();
    const html = '<div class="test" id="main">Content</div>';
    const tokens = tokenizer.tokenize(html);

    expect(tokens[0].attributes).toEqual({
      class: 'test',
      id: 'main'
    });
  });

  it('should handle self-closing tags', () => {
    const tokenizer = new HTMLTokenizer();
    const html = '<img src="test.jpg"/>';
    const tokens = tokenizer.tokenize(html);

    expect(tokens[0].selfClosing).toBe(true);
    expect(tokens[0].attributes).toEqual({
      src: 'test.jpg'
    });
  });

  it('should handle multiple attributes', () => {
    const tokenizer = new HTMLTokenizer();
    const html = '<input type="text" placeholder="Enter name" required>';
    const tokens = tokenizer.tokenize(html);

    expect(tokens[0].attributes).toEqual({
      type: 'text',
      placeholder: 'Enter name',
      required: ''
    });
  });
});

describe('HTML Parser', () => {
  it('should parse simple HTML', () => {
    const html = '<div>Hello World</div>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    expect(document).toBeInstanceOf(Document);
    expect(document.documentElement).toBeInstanceOf(Element);
    expect(document.documentElement.tagName).toBe('HTML');
  });

  it('should parse text content', () => {
    const html = '<p>Hello World</p>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    const paragraph = document.querySelector('p');
    expect(paragraph).toBeInstanceOf(Element);
    expect(paragraph.textContent).toBe('Hello World');
  });

  it('should parse attributes', () => {
    const html = '<div class="test" id="main">Content</div>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    const div = document.querySelector('div');
    expect(div.getAttribute('class')).toBe('test');
    expect(div.getAttribute('id')).toBe('main');
  });

  it('should handle nested elements', () => {
    const html = '<div><span>Nested</span></div>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    const div = document.querySelector('div');
    const span = document.querySelector('span');
    expect(div.contains(span)).toBe(true);
  });

  it('should auto-create html and body structure', () => {
    const html = '<p>Simple content</p>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    expect(document.documentElement.tagName).toBe('HTML');
    const body = document.querySelector('body');
    expect(body).toBeInstanceOf(Element);
    expect(body.querySelector('p')).toBeTruthy();
  });

  it('should handle complete HTML document', () => {
    const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    expect(document.documentElement.tagName).toBe('HTML');
    const head = document.querySelector('head');
    const body = document.querySelector('body');
    expect(head.querySelector('title').textContent).toBe('Test');
    expect(body.querySelector('p').textContent).toBe('Content');
  });

  it('should handle complex nested structure', () => {
    const html = `
      <div class="container">
        <h1 id="title">Welcome</h1>
        <div class="content">
          <p>First paragraph</p>
          <p>Second <strong>bold</strong> paragraph</p>
        </div>
      </div>
    `;
    const parser = new HTMLParser();
    const document = parser.parse(html);

    const container = document.querySelector('.container');
    const title = document.querySelector('#title');
    const content = document.querySelector('.content');

    expect(container.getAttribute('class')).toBe('container');
    expect(title.id).toBe('title');
    expect(title.textContent).toBe('Welcome');
    expect(content.querySelectorAll('p').length).toBe(2);
  });

  it('should handle text nodes correctly', () => {
    const html = '<div>Text 1<span>Text 2</span>Text 3</div>';
    const parser = new HTMLParser();
    const document = parser.parse(html);

    const div = document.querySelector('div');
    const span = document.querySelector('span');

    expect(div.childNodes.length).toBe(3); // Text1, span, Text3
    expect(div.childNodes[0]).toBeInstanceOf(Text);
    expect(div.childNodes[0].data).toBe('Text 1');
    expect(span.childNodes[0].data).toBe('Text 2');
    expect(div.childNodes[2].data).toBe('Text 3');
  });
});

describe('DOM API', () => {
  let document;
  let parser;

  beforeEach(() => {
    parser = new HTMLParser();
    document = parser.parse('<div id="root"><p class="text">Hello</p><span class="text">World</span></div>');
  });

  it('should support getElementById', () => {
    const root = document.getElementById('root');
    expect(root).toBeInstanceOf(Element);
    expect(root.id).toBe('root');
  });

  it('should support getElementsByTagName', () => {
    const paragraphs = document.getElementsByTagName('p');
    const spans = document.getElementsByTagName('span');
    const divs = document.getElementsByTagName('div');

    expect(paragraphs.length).toBe(1);
    expect(spans.length).toBe(1);
    expect(divs.length).toBe(1);
  });

  it('should support querySelector with ID selector', () => {
    const root = document.querySelector('#root');
    expect(root.id).toBe('root');
  });

  it('should support querySelector with class selector', () => {
    const textElements = document.querySelectorAll('.text');
    expect(textElements.length).toBe(2);
  });

  it('should support querySelector with tag selector', () => {
    const paragraphs = document.querySelectorAll('p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].textContent).toBe('Hello');
  });
});

describe('Element API', () => {
  let element;

  beforeEach(() => {
    element = new Element('div');
  });

  it('should manage attributes', () => {
    element.setAttribute('id', 'test');
    element.setAttribute('class', 'container');

    expect(element.getAttribute('id')).toBe('test');
    expect(element.getAttribute('class')).toBe('container');
    expect(element.hasAttribute('id')).toBe(true);
    expect(element.hasAttribute('nonexistent')).toBe(false);

    element.removeAttribute('class');
    expect(element.hasAttribute('class')).toBe(false);
    expect(element.getAttribute('class')).toBeUndefined();
  });

  it('should handle classList', () => {
    element.setAttribute('class', 'class1 class2');

    expect(element.classList.contains('class1')).toBe(true);
    expect(element.classList.contains('class3')).toBe(false);

    element.classList.add('class3');
    expect(element.classList.contains('class3')).toBe(true);
    expect(element.className).toBe('class1 class2 class3');

    element.classList.remove('class2');
    expect(element.classList.contains('class2')).toBe(false);
    expect(element.className).toBe('class1 class3');
  });

  it('should handle id and className properties', () => {
    element.id = 'test-id';
    expect(element.getAttribute('id')).toBe('test-id');
    expect(element.id).toBe('test-id');

    element.className = 'test-class';
    expect(element.getAttribute('class')).toBe('test-class');
    expect(element.className).toBe('test-class');
  });
});

describe('Node API', () => {
  let parent;
  let child1;
  let child2;
  let child3;

  beforeEach(() => {
    parent = new Element('div');
    child1 = new Element('span');
    child2 = new Element('span');
    child3 = new Element('span');
  });

  it('should append children', () => {
    parent.appendChild(child1);
    parent.appendChild(child2);

    expect(parent.childNodes.length).toBe(2);
    expect(child1.parentNode).toBe(parent);
    expect(child2.parentNode).toBe(parent);
    expect(child1.nextSibling).toBe(child2);
    expect(child2.previousSibling).toBe(child1);
  });

  it('should insert before', () => {
    parent.appendChild(child1);
    parent.appendChild(child3);
    parent.insertBefore(child2, child3);

    expect(parent.childNodes).toEqual([child1, child2, child3]);
    expect(child2.previousSibling).toBe(child1);
    expect(child2.nextSibling).toBe(child3);
  });

  it('should remove children', () => {
    parent.appendChild(child1);
    parent.appendChild(child2);
    parent.appendChild(child3);

    parent.removeChild(child2);

    expect(parent.childNodes).toEqual([child1, child3]);
    expect(child2.parentNode).toBeNull();
    expect(child1.nextSibling).toBe(child3);
    expect(child3.previousSibling).toBe(child1);
  });
});

describe('Text Node', () => {
  it('should handle text content', () => {
    const text = new Text('Hello World');
    expect(text.data).toBe('Hello World');
    expect(text.nodeValue).toBe('Hello World');
    expect(text.textContent).toBe('Hello World');
  });

  it('should update text content', () => {
    const text = new Text('Original');
    text.nodeValue = 'Updated';
    expect(text.data).toBe('Updated');

    text.textContent = 'Updated Again';
    expect(text.nodeValue).toBe('Updated Again');
  });
});