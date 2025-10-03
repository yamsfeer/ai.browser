import { CSSRule } from './CSSRule.js';
import { CSSTokenizer } from './CSSTokenizer.js';

// CSS解析器
export class CSSParser {
  constructor() {
    this.tokenizer = new CSSTokenizer();
  }

  parse(cssText) {
    const tokens = this.tokenizer.tokenize(cssText);
    return this.parseRules(tokens);
  }

  parseRules(tokens) {
    const rules = [];
    let currentSelectors = [];
    let currentDeclarations = {};
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      switch (token.type) {
        case 'selector':
          // 累积选择器，而不是覆盖
          const newSelectors = token.value.split(',').map(s => s.trim());
          currentSelectors = currentSelectors.concat(newSelectors);
          i++;
          break;

        case 'lbrace':
          currentDeclarations = {};
          i++;
          // 解析声明块
          while (i < tokens.length && tokens[i].type !== 'rbrace') {
            if (tokens[i].type === 'property') {
              const property = tokens[i].value;
              // 跳过冒号
              if (i + 1 < tokens.length && tokens[i + 1].type === 'colon') {
                i += 2;
                // 获取值
                if (i < tokens.length && tokens[i].type === 'value') {
                  currentDeclarations[property] = tokens[i].value;
                  i++;
                }
                // 跳过分号
                if (i < tokens.length && tokens[i].type === 'semicolon') {
                  i++;
                }
              } else {
                i++;
              }
            } else {
              i++;
            }
          }
          break;

        case 'rbrace':
          if (currentSelectors.length > 0) {
            rules.push(new CSSRule(currentSelectors, currentDeclarations));
            currentSelectors = [];
            currentDeclarations = {};
          }
          i++;
          break;

        default:
          i++;
          break;
      }
    }

    return rules;
  }
}