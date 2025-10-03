// HTML词法分析器
export class HTMLTokenizer {
  constructor() {
    this.state = 'data';
    this.tokens = [];
    this.currentToken = null;
    this.buffer = '';
    this.pos = 0;
  }

  tokenize(html) {
    this.html = html;
    this.pos = 0;
    this.tokens = [];
    this.state = 'data';

    while (this.pos < this.html.length) {
      const char = this.html[this.pos];

      switch (this.state) {
        case 'data':
          this.handleDataState(char);
          break;
        case 'tagOpen':
          this.handleTagOpenState(char);
          break;
        case 'tagName':
          this.handleTagNameState(char);
          break;
        case 'endTagOpen':
          this.handleEndTagOpenState(char);
          break;
        case 'attributeName':
          this.handleAttributeNameState(char);
          break;
        case 'attributeValue':
          this.handleAttributeValueState(char);
          break;
        case 'afterAttributeQuoted':
          this.handleAfterAttributeQuotedState(char);
          break;
        case 'selfClosingStartTag':
          this.handleSelfClosingStartTagState(char);
          break;
        default:
          this.pos++;
      }
    }

    if (this.buffer.length > 0) {
      this.emitToken({ type: 'text', value: this.buffer });
      this.buffer = '';
    }

    return this.tokens;
  }

  handleDataState(char) {
    if (char === '<') {
      if (this.buffer.length > 0) {
        this.emitToken({ type: 'text', value: this.buffer });
        this.buffer = '';
      }
      this.state = 'tagOpen';
    } else {
      this.buffer += char;
    }
    this.pos++;
  }

  handleTagOpenState(char) {
    if (char === '/') {
      this.state = 'endTagOpen';
      this.pos++;
    } else if (char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z') {
      this.currentToken = { type: 'startTag', tagName: '', attributes: {} };
      this.buffer = char;
      this.state = 'tagName';
      this.pos++;
    } else {
      this.buffer += '<';
      this.state = 'data';
    }
  }

  handleTagNameState(char) {
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      this.currentToken.tagName = this.buffer;
      this.buffer = '';
      this.state = 'attributeName';
      this.pos++;
    } else if (char === '>') {
      this.currentToken.tagName = this.buffer;
      this.emitToken(this.currentToken);
      this.currentToken = null;
      this.buffer = '';
      this.state = 'data';
      this.pos++;
    } else if (char === '/') {
      this.currentToken.tagName = this.buffer;
      this.state = 'selfClosingStartTag';
      this.pos++;
    } else {
      this.buffer += char;
      this.pos++;
    }
  }

  handleEndTagOpenState(char) {
    if (char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z') {
      this.currentToken = { type: 'endTag', tagName: '' };
      this.buffer = char;
      this.state = 'tagName';
      this.pos++;
    }
  }

  handleAttributeNameState(char) {
    if (char === '=') {
      this.currentAttributeName = this.buffer;
      this.buffer = '';
      this.state = 'attributeValue';
      this.pos++;
    } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (this.buffer.length > 0) {
        this.currentToken.attributes[this.buffer] = '';
        this.buffer = '';
      }
      this.pos++;
    } else if (char === '>') {
      if (this.buffer.length > 0) {
        this.currentToken.attributes[this.buffer] = '';
      }
      this.emitToken(this.currentToken);
      this.currentToken = null;
      this.buffer = '';
      this.state = 'data';
      this.pos++;
    } else {
      this.buffer += char;
      this.pos++;
    }
  }

  handleAttributeValueState(char) {
    if (char === '"' || char === "'") {
      this.quoteChar = char;
      this.buffer = '';
      this.pos++;
      while (this.pos < this.html.length && this.html[this.pos] !== this.quoteChar) {
        this.buffer += this.html[this.pos];
        this.pos++;
      }
      this.currentToken.attributes[this.currentAttributeName] = this.buffer;
      this.buffer = '';
      this.pos++;
      this.state = 'afterAttributeQuoted';
    } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '>') {
      this.currentToken.attributes[this.currentAttributeName] = this.buffer;
      this.buffer = '';
      if (char === '>') {
        this.emitToken(this.currentToken);
        this.currentToken = null;
        this.state = 'data';
      } else {
        this.state = 'attributeName';
      }
      this.pos++;
    } else {
      this.buffer += char;
      this.pos++;
    }
  }

  handleAfterAttributeQuotedState(char) {
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      this.state = 'attributeName';
      this.pos++;
    } else if (char === '>') {
      this.emitToken(this.currentToken);
      this.currentToken = null;
      this.state = 'data';
      this.pos++;
    } else if (char === '/') {
      this.state = 'selfClosingStartTag';
      this.pos++;
    } else {
      this.state = 'attributeName';
      this.buffer = char;
      this.pos++;
    }
  }

  handleSelfClosingStartTagState(char) {
    if (char === '>') {
      this.currentToken.selfClosing = true;
      this.emitToken(this.currentToken);
      this.currentToken = null;
      this.state = 'data';
      this.pos++;
    }
  }

  emitToken(token) {
    this.tokens.push(token);
  }
}