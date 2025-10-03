/**
 * Paint Record
 * 表示一个绘制操作的记录，包含绘制指令和元数据
 */

export class PaintRecord {
  constructor(type, params = {}) {
    this.type = type;
    this.params = params;
    this.layerId = params.layerId || null;
    this.zIndex = params.zIndex || 0;
    this.bounds = params.bounds || { x: 0, y: 0, width: 0, height: 0 };
    this.opacity = params.opacity || 1.0;
    this.visible = params.visible !== false;
    this.clipRect = params.clipRect || null;
    this.transform = params.transform || null;
    this.timestamp = performance.now();
  }

  /**
   * 执行绘制操作
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   */
  execute(context) {
    if (!this.visible || this.opacity <= 0) {
      return;
    }

    // 保存状态
    context.save();

    try {
      // 应用裁剪
      if (this.clipRect) {
        context.beginPath();
        context.rect(this.clipRect.x, this.clipRect.y, this.clipRect.width, this.clipRect.height);
        context.clip();
      }

      // 应用透明度
      context.globalAlpha *= this.opacity;

      // 应用变换
      if (this.transform) {
        context.setTransform(...this.transform);
      }

      // 执行具体绘制
      this.executePaintOperation(context);
    } finally {
      // 恢复状态
      context.restore();
    }
  }

  /**
   * 执行具体的绘制操作（由子类实现）
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   */
  executePaintOperation(context) {
    throw new Error('executePaintOperation must be implemented by subclass');
  }

  /**
   * 检查是否与指定区域重叠
   * @param {Object} rect - 检查区域
   * @returns {boolean} 是否重叠
   */
  intersectsRect(rect) {
    return !(this.bounds.x > rect.x + rect.width ||
             rect.x > this.bounds.x + this.bounds.width ||
             this.bounds.y > rect.y + rect.height ||
             rect.y > this.bounds.y + this.bounds.height);
  }

  /**
   * 获取绘制记录的字符串表示
   * @returns {string} 字符串表示
   */
  toString() {
    return `PaintRecord(${this.type}, bounds: [${this.bounds.x},${this.bounds.y},${this.bounds.width},${this.bounds.height}])`;
  }

  /**
   * 克隆绘制记录
   * @returns {PaintRecord} 克隆的记录
   */
  clone() {
    return new PaintRecord(this.type, { ...this.params });
  }
}

/**
 * 矩形绘制记录
 */
export class RectPaintRecord extends PaintRecord {
  constructor(params = {}) {
    super('rect', params);
    this.fillStyle = params.fillStyle || '#000000';
    this.strokeStyle = params.strokeStyle || null;
    this.lineWidth = params.lineWidth || 1;
    this.filled = params.filled !== false;
    this.stroked = params.stroked === true;
  }

  executePaintOperation(context) {
    if (this.filled) {
      context.fillStyle = this.fillStyle;
      context.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }

    if (this.stroked) {
      context.strokeStyle = this.strokeStyle;
      context.lineWidth = this.lineWidth;
      context.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }
  }
}

/**
 * 文本绘制记录
 */
export class TextPaintRecord extends PaintRecord {
  constructor(params = {}) {
    super('text', params);
    this.text = params.text || '';
    this.font = params.font || '16px serif';
    this.fillStyle = params.fillStyle || '#000000';
    this.maxWidth = params.maxWidth || null;
    this.textAlign = params.textAlign || 'left';
    this.textBaseline = params.textBaseline || 'top';
  }

  executePaintOperation(context) {
    context.font = this.font;
    context.fillStyle = this.fillStyle;
    context.textAlign = this.textAlign;
    context.textBaseline = this.textBaseline;

    if (this.maxWidth !== null) {
      context.fillText(this.text, this.bounds.x, this.bounds.y, this.maxWidth);
    } else {
      context.fillText(this.text, this.bounds.x, this.bounds.y);
    }
  }
}

/**
 * 图片绘制记录
 */
export class ImagePaintRecord extends PaintRecord {
  constructor(params = {}) {
    super('image', params);
    this.image = params.image;
    this.sourceRect = params.sourceRect || null; // 源图片裁剪区域
  }

  executePaintOperation(context) {
    if (!this.image) {
      return;
    }

    if (this.sourceRect) {
      // 9参数版本：源裁剪 + 目标区域
      context.drawImage(
        this.image,
        this.sourceRect.x, this.sourceRect.y,
        this.sourceRect.width, this.sourceRect.height,
        this.bounds.x, this.bounds.y,
        this.bounds.width, this.bounds.height
      );
    } else {
      // 3参数版本：直接绘制到目标区域
      context.drawImage(
        this.image,
        this.bounds.x, this.bounds.y,
        this.bounds.width, this.bounds.height
      );
    }
  }
}

/**
 * 路径绘制记录
 */
export class PathPaintRecord extends PaintRecord {
  constructor(params = {}) {
    super('path', params);
    this.path = params.path || [];
    this.fillStyle = params.fillStyle || null;
    this.strokeStyle = params.strokeStyle || '#000000';
    this.lineWidth = params.lineWidth || 1;
    this.filled = params.filled === true;
    this.stroked = params.stroked !== false;
  }

  executePaintOperation(context) {
    if (this.path.length === 0) {
      return;
    }

    context.beginPath();

    // 构建路径
    for (const command of this.path) {
      switch (command.type) {
        case 'moveTo':
          context.moveTo(command.x, command.y);
          break;
        case 'lineTo':
          context.lineTo(command.x, command.y);
          break;
        case 'arc':
          context.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle);
          break;
        case 'quadraticCurveTo':
          context.quadraticCurveTo(command.cpx, command.cpy, command.x, command.y);
          break;
        case 'bezierCurveTo':
          context.bezierCurveTo(command.cp1x, command.cp1y, command.cp2x, command.cp2y, command.x, command.y);
          break;
        case 'closePath':
          context.closePath();
          break;
      }
    }

    // 填充
    if (this.filled && this.fillStyle) {
      context.fillStyle = this.fillStyle;
      context.fill();
    }

    // 描边
    if (this.stroked) {
      context.strokeStyle = this.strokeStyle;
      context.lineWidth = this.lineWidth;
      context.stroke();
    }
  }
}

/**
 * 阴影绘制记录（装饰器）
 */
export class ShadowPaintRecord extends PaintRecord {
  constructor(params = {}) {
    super('shadow', params);
    this.shadowColor = params.shadowColor || 'rgba(0, 0, 0, 0.5)';
    this.shadowBlur = params.shadowBlur || 10;
    this.shadowOffsetX = params.shadowOffsetX || 0;
    this.shadowOffsetY = params.shadowOffsetY || 0;
    this.targetRecord = params.targetRecord || null;
  }

  executePaintOperation(context) {
    if (!this.targetRecord) {
      return;
    }

    // 应用阴影设置
    context.shadowColor = this.shadowColor;
    context.shadowBlur = this.shadowBlur;
    context.shadowOffsetX = this.shadowOffsetX;
    context.shadowOffsetY = this.shadowOffsetY;

    // 执行目标绘制记录
    this.targetRecord.execute(context);
  }
}