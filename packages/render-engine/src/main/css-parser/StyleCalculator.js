// 样式计算器
export class StyleCalculator {
  constructor() {
    this.userAgentStyles = this.getDefaultStyles();
  }

  calculateStyles(element, cssRules) {
    const styles = {};

    // 1. 应用User Agent样式
    Object.assign(styles, this.userAgentStyles[element.tagName.toLowerCase()] || {});

    // 2. 应用作者样式
    for (const rule of cssRules) {
      if (rule.matches(element)) {
        Object.assign(styles, rule.declarations);
      }
    }

    // 3. 应用内联样式
    if (element.style) {
      Object.assign(styles, element.style);
    }

    // 4. 处理继承
    if (element.parentNode && element.parentNode.nodeType === 1) {
      const parentStyles = element.parentNode.computedStyle || {};
      this.inheritStyles(styles, parentStyles);
    }

    // 5. 计算默认值
    this.computeDefaults(styles);

    return styles;
  }

  inheritStyles(styles, parentStyles) {
    const inheritableProperties = [
      'color',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'text-align',
      'visibility'
    ];

    for (const prop of inheritableProperties) {
      if (!(prop in styles) && prop in parentStyles) {
        styles[prop] = parentStyles[prop];
      }
    }
  }

  computeDefaults(styles) {
    const defaults = {
      'display': 'inline',
      'color': 'black',
      'background-color': 'transparent',
      'font-family': 'serif',
      'font-size': '16px',
      'font-weight': 'normal',
      'line-height': 'normal',
      'text-align': 'left',
      'margin': '0',
      'padding': '0',
      'border': 'none'
    };

    for (const [prop, defaultValue] of Object.entries(defaults)) {
      if (!(prop in styles)) {
        styles[prop] = defaultValue;
      }
    }
  }

  getDefaultStyles() {
    return {
      'html': {
        'display': 'block'
      },
      'head': {
        'display': 'none'
      },
      'body': {
        'display': 'block',
        'margin': '8px'
      },
      'div': {
        'display': 'block'
      },
      'p': {
        'display': 'block',
        'margin-top': '1em',
        'margin-bottom': '1em'
      },
      'h1': {
        'display': 'block',
        'font-size': '2em',
        'font-weight': 'bold',
        'margin-top': '0.67em',
        'margin-bottom': '0.67em'
      },
      'h2': {
        'display': 'block',
        'font-size': '1.5em',
        'font-weight': 'bold',
        'margin-top': '0.83em',
        'margin-bottom': '0.83em'
      },
      'h3': {
        'display': 'block',
        'font-size': '1.17em',
        'font-weight': 'bold',
        'margin-top': '1em',
        'margin-bottom': '1em'
      },
      'span': {
        'display': 'inline'
      },
      'a': {
        'display': 'inline',
        'color': '#0000EE',
        'text-decoration': 'underline'
      },
      'img': {
        'display': 'inline-block'
      },
      'ul': {
        'display': 'block',
        'list-style-type': 'disc',
        'margin-top': '1em',
        'margin-bottom': '1em',
        'padding-left': '40px'
      },
      'ol': {
        'display': 'block',
        'list-style-type': 'decimal',
        'margin-top': '1em',
        'margin-bottom': '1em',
        'padding-left': '40px'
      },
      'li': {
        'display': 'list-item'
      }
    };
  }
}