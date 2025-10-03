// CSS词法分析器
export class CSSTokenizer {
  constructor() {
    this.pos = 0;
    this.tokens = [];
    this.inDeclaration = false;
    this.lastTokenWasColon = false;
  }

  tokenize(css) {
    this.css = css;
    this.pos = 0;
    this.tokens = [];
    this.inDeclaration = false;
    this.lastTokenWasColon = false;

    while (this.pos < this.css.length) {
      const char = this.css[this.pos];

      // 跳过空白字符
      if (this.isWhitespace(char)) {
        this.pos++;
        continue;
      }

      // 选择器（只在声明块外）
      if (!this.inDeclaration && (char === '.' || char === '#' || char === '*' || char === '[' || this.isLetter(char))) {
        this.tokenizeSelector();
        this.lastTokenWasColon = false;
      }
      // 左大括号
      else if (char === '{') {
        this.tokens.push({ type: 'lbrace', value: char });
        this.pos++;
        this.inDeclaration = true;
        this.lastTokenWasColon = false;
      }
      // 右大括号
      else if (char === '}') {
        this.tokens.push({ type: 'rbrace', value: char });
        this.pos++;
        this.inDeclaration = false;
        this.lastTokenWasColon = false;
      }
      // 属性名（只在声明块内，且前面不是冒号）
      else if (this.inDeclaration && !this.lastTokenWasColon && (this.isLetter(char) || char === '-')) {
        this.tokenizeProperty();
        this.lastTokenWasColon = false;
      }
      // 冒号
      else if (char === ':') {
        this.tokens.push({ type: 'colon', value: char });
        this.pos++;
        this.lastTokenWasColon = true;
      }
      // 分号
      else if (char === ';') {
        this.tokens.push({ type: 'semicolon', value: char });
        this.pos++;
        this.lastTokenWasColon = false;
      }
      // 值（在声明块内且前面是冒号，或者任何其他字符）
      else if (this.inDeclaration) {
        this.tokenizeValue();
        this.lastTokenWasColon = false;
      }
      // 未知字符，跳过
      else {
        this.pos++;
      }
    }

    return this.tokens;
  }

  tokenizeSelector() {
    let selector = '';

    while (this.pos < this.css.length) {
      const char = this.css[this.pos];

      if (char === '{') {
        break;
      }

      selector += char;
      this.pos++;
    }

    if (selector.trim()) {
      this.tokens.push({ type: 'selector', value: selector.trim() });
    }
  }

  tokenizeProperty() {
    let property = '';

    while (this.pos < this.css.length) {
      const char = this.css[this.pos];

      if (char === ':') {
        break;
      }

      property += char;
      this.pos++;
    }

    if (property.trim()) {
      this.tokens.push({ type: 'property', value: property.trim() });
    }
  }

  tokenizeValue() {
    let value = '';

    while (this.pos < this.css.length) {
      const char = this.css[this.pos];

      if (char === ';' || char === '}') {
        break;
      }

      value += char;
      this.pos++;
    }

    if (value.trim()) {
      this.tokens.push({ type: 'value', value: value.trim() });
    }
  }

  isWhitespace(char) {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  isLetter(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }
}