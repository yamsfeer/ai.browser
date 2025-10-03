// 盒模型
export class BoxModel {
  constructor(style = {}) {
    style = style || {};
    this.margin = this.parseBox(style.margin || '0');

    // 处理border-width或border属性
    let borderWidth = style['border-width'] || '0';
    if (style.border && style.border !== 'none') {
      // 从border属性中提取宽度，如 "1px solid black" -> "1px"
      const borderMatch = style.border.match(/^(\d+(?:\.\d+)?)(px|em|rem|px)?/);
      if (borderMatch) {
        borderWidth = borderMatch[0];
      }
    }
    this.border = this.parseBox(borderWidth);

    this.padding = this.parseBox(style.padding || '0');

    this.content = {
      width: 0,
      height: 0
    };

    this.borderStyle = style['border-style'] || 'none';
    this.borderColor = style['border-color'] || 'black';
  }

  parseBox(value) {
    // 解析margin、padding、border值
    // 支持：top right bottom left 或统一值

    if (typeof value === 'number') {
      return {
        top: value,
        right: value,
        bottom: value,
        left: value
      };
    }

    const parts = value.toString().split(/\s+/);

    switch (parts.length) {
      case 1:
        const val = this.parseLength(parts[0]);
        return {
          top: val,
          right: val,
          bottom: val,
          left: val
        };
      case 2:
        const v1 = this.parseLength(parts[0]);
        const v2 = this.parseLength(parts[1]);
        return {
          top: v1,
          right: v2,
          bottom: v1,
          left: v2
        };
      case 3:
        const t = this.parseLength(parts[0]);
        const rl = this.parseLength(parts[1]);
        const b = this.parseLength(parts[2]);
        return {
          top: t,
          right: rl,
          bottom: b,
          left: rl
        };
      case 4:
        return {
          top: this.parseLength(parts[0]),
          right: this.parseLength(parts[1]),
          bottom: this.parseLength(parts[2]),
          left: this.parseLength(parts[3])
        };
      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }

  parseLength(value) {
    // 解析长度值（px, em, %等）
    if (typeof value === 'number') {
      return value;
    }

    if (!value || typeof value !== 'string') {
      return 0;
    }

    const match = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/);
    if (!match) {
      return 0;
    }

    const num = parseFloat(match[1]);
    const unit = match[2] || 'px';

    switch (unit) {
      case 'px':
        return num;
      case 'em':
        return num * 16; // 假设1em = 16px
      case 'rem':
        return num * 16; // 假设1rem = 16px
      case '%':
        return num / 100; // 返回比例，需要父元素上下文
      default:
        return num;
    }
  }

  get totalHorizontalSpace() {
    return this.margin.left + this.border.left + this.padding.left +
           this.padding.right + this.border.right + this.margin.right;
  }

  get totalVerticalSpace() {
    return this.margin.top + this.border.top + this.padding.top +
           this.padding.bottom + this.border.bottom + this.margin.bottom;
  }

  getContentBox(width, height) {
    return {
      width: width - this.padding.left - this.padding.right - this.border.left - this.border.right,
      height: height - this.padding.top - this.padding.bottom - this.border.top - this.border.bottom
    };
  }

  getBorderBox(contentWidth, contentHeight) {
    return {
      width: contentWidth + this.padding.left + this.padding.right + this.border.left + this.border.right,
      height: contentHeight + this.padding.top + this.padding.bottom + this.border.top + this.border.bottom
    };
  }

  getMarginBox(borderWidth, borderHeight) {
    return {
      width: borderWidth + this.margin.left + this.margin.right,
      height: borderHeight + this.margin.top + this.margin.bottom
    };
  }
}