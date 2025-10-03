import { describe, it, expect } from 'vitest';
import { CSSParser, CSSTokenizer, CSSRule, StyleCalculator } from '../src/main/css-parser/index.js';

// 简单的Element类用于测试
class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.nodeType = 1; // Element node type
    this.parentNode = null;
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
}

describe('CSS Tokenizer', () => {
  it('should tokenize simple CSS', () => {
    const tokenizer = new CSSTokenizer();
    const css = 'div { color: red; }';
    const tokens = tokenizer.tokenize(css);

    expect(tokens).toEqual([
      { type: 'selector', value: 'div' },
      { type: 'lbrace', value: '{' },
      { type: 'property', value: 'color' },
      { type: 'colon', value: ':' },
      { type: 'value', value: 'red' },
      { type: 'semicolon', value: ';' },
      { type: 'rbrace', value: '}' }
    ]);
  });

  it('should handle multiple selectors', () => {
    const tokenizer = new CSSTokenizer();
    const css = 'div, .class { color: red; }';
    const tokens = tokenizer.tokenize(css);

    expect(tokens[0].value).toBe('div, .class');
  });

  it('should handle multiple properties', () => {
    const tokenizer = new CSSTokenizer();
    const css = 'div { color: red; background: blue; }';
    const tokens = tokenizer.tokenize(css);

    const valueTokens = tokens.filter(t => t.type === 'value');
    expect(valueTokens).toHaveLength(2);
    expect(valueTokens[0].value).toBe('red');
    expect(valueTokens[1].value).toBe('blue');
  });
});

describe('CSS Parser', () => {
  it('should parse simple CSS rules', () => {
    const css = 'div { color: red; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toBeInstanceOf(CSSRule);
    expect(rules[0].selectors).toEqual(['div']);
    expect(rules[0].declarations).toEqual({ color: 'red' });
  });

  it('should parse multiple rules', () => {
    const css = `
      div { color: red; }
      .class { background: blue; }
    `;
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(2);
    expect(rules[0].selectors).toEqual(['div']);
    expect(rules[0].declarations).toEqual({ color: 'red' });
    expect(rules[1].selectors).toEqual(['.class']);
    expect(rules[1].declarations).toEqual({ background: 'blue' });
  });

  it('should parse class selectors', () => {
    const css = '.test-class { margin: 10px; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    expect(rules[0].selectors).toEqual(['.test-class']);
    expect(rules[0].declarations).toEqual({ margin: '10px' });
  });

  it('should parse ID selectors', () => {
    const css = '#test-id { padding: 5px; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    expect(rules[0].selectors).toEqual(['#test-id']);
    expect(rules[0].declarations).toEqual({ padding: '5px' });
  });

  it('should parse multiple properties', () => {
    const css = 'div { color: red; background: blue; margin: 10px; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.declarations).toEqual({
      color: 'red',
      background: 'blue',
      margin: '10px'
    });
  });

  it('should handle complex selectors', () => {
    const css = 'div.container .item { font-size: 14px; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    expect(rules[0].selectors).toEqual(['div.container .item']);
  });

  it('should handle multiple selectors in one rule', () => {
    const css = 'h1, h2, h3 { color: #333; }';
    const parser = new CSSParser();
    const rules = parser.parse(css);

    expect(rules).toHaveLength(1);
    expect(rules[0].selectors).toEqual(['h1', 'h2', 'h3']);
    expect(rules[0].declarations).toEqual({ color: '#333' });
  });
});

describe('CSS Rule', () => {
  let rule;

  beforeEach(() => {
    rule = new CSSRule(['div', '.container'], { color: 'red', margin: '10px' });
  });

  it('should match tag selector', () => {
    const element = new Element('div');
    expect(rule.matches(element)).toBe(true);
  });

  it('should match class selector', () => {
    const element = new Element('div');
    element.className = 'container';
    expect(rule.matches(element)).toBe(true);
  });

  it('should match ID selector', () => {
    const idRule = new CSSRule(['#my-id'], { color: 'blue' });
    const element = new Element('div');
    element.id = 'my-id';
    expect(idRule.matches(element)).toBe(true);
  });

  it('should match universal selector', () => {
    const universalRule = new CSSRule(['*'], { color: 'black' });
    const element = new Element('div');
    expect(universalRule.matches(element)).toBe(true);
  });

  it('should match attribute selector', () => {
    const attrRule = new CSSRule(['[data-test]'], { display: 'none' });
    const element = new Element('div');
    element.setAttribute('data-test', 'value');
    expect(attrRule.matches(element)).toBe(true);
  });

  it('should not match when no selector matches', () => {
    const element = new Element('p');
    element.className = 'other';
    expect(rule.matches(element)).toBe(false);
  });
});

describe('Style Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new StyleCalculator();
  });

  it('should apply user agent styles', () => {
    const div = new Element('div');
    const styles = calculator.calculateStyles(div, []);

    expect(styles.display).toBe('block');
  });

  it('should apply author styles', () => {
    const div = new Element('div');
    const rules = [
      new CSSRule(['div'], { color: 'red', margin: '20px' })
    ];
    const styles = calculator.calculateStyles(div, rules);

    expect(styles.color).toBe('red');
    expect(styles.margin).toBe('20px');
    expect(styles.display).toBe('block'); // From user agent styles
  });

  it('should apply inline styles', () => {
    const div = new Element('div');
    div.style = { color: 'blue', padding: '10px' };
    const styles = calculator.calculateStyles(div, []);

    expect(styles.color).toBe('blue');
    expect(styles.padding).toBe('10px');
  });

  it('should handle inheritance', () => {
    const parent = new Element('div');
    parent.computedStyle = { color: 'green', 'font-size': '18px' };

    const child = new Element('span');
    child.parentNode = parent; // Set parent relationship
    const styles = calculator.calculateStyles(child, []);

    expect(styles.color).toBe('green'); // Should inherit
    expect(styles['font-size']).toBe('18px'); // Should inherit
  });

  it('should apply default values', () => {
    const element = new Element('span');
    const styles = calculator.calculateStyles(element, []);

    expect(styles.display).toBe('inline');
    expect(styles.color).toBe('black');
    expect(styles['background-color']).toBe('transparent');
  });

  it('should handle specific user agent styles', () => {
    const p = new Element('p');
    const styles = calculator.calculateStyles(p, []);

    expect(styles['margin-top']).toBe('1em');
    expect(styles['margin-bottom']).toBe('1em');
  });

  it('should override styles in correct order', () => {
    const div = new Element('div');
    div.style = { color: 'blue' }; // Inline styles (highest priority)

    const rules = [
      new CSSRule(['div'], { color: 'red' }) // Author styles
    ];

    const styles = calculator.calculateStyles(div, rules);

    expect(styles.color).toBe('blue'); // Inline should override
    expect(styles.display).toBe('block'); // From user agent
  });
});