/**
 * 绘制上下文
 * 管理绘制状态和优化绘制操作
 */

export class PaintContext {
  constructor(canvas2dContext, options = {}) {
    this.context = canvas2dContext;
    this.viewport = options.viewport || {
      x: 0,
      y: 0,
      width: canvas2dContext.canvas.width,
      height: canvas2dContext.canvas.height
    };

    this.debugMode = options.debug || false;
    this.dirtyRegions = [];
    this.clipRegions = [];

    // 绘制状态栈
    this.stateStack = [];
    this.currentState = this.createDefaultState();
  }

  /**
   * 创建默认绘制状态
   * @returns {Object} 默认状态
   */
  createDefaultState() {
    return {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '16px serif',
      textAlign: 'left',
      textBaseline: 'top',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      transform: [1, 0, 0, 1, 0, 0] // 矩阵变换
    };
  }

  /**
   * 保存当前状态
   */
  save() {
    this.stateStack.push({ ...this.currentState });
    this.context.save();
  }

  /**
   * 恢复上一个状态
   */
  restore() {
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop();
    }
    this.context.restore();
  }

  /**
   * 应用状态到Canvas上下文
   */
  applyState() {
    const state = this.currentState;
    const ctx = this.context;

    ctx.fillStyle = state.fillStyle;
    ctx.strokeStyle = state.strokeStyle;
    ctx.lineWidth = state.lineWidth;
    ctx.globalAlpha = state.globalAlpha;
    ctx.font = state.font;
    ctx.textAlign = state.textAlign;
    ctx.textBaseline = state.textBaseline;
    ctx.shadowColor = state.shadowColor;
    ctx.shadowBlur = state.shadowBlur;
    ctx.shadowOffsetX = state.shadowOffsetX;
    ctx.shadowOffsetY = state.shadowOffsetY;

    if (state.transform) {
      ctx.setTransform(...state.transform);
    }
  }

  /**
   * 设置填充样式
   * @param {string} style - 填充样式
   */
  setFillStyle(style) {
    this.currentState.fillStyle = style;
    this.context.fillStyle = style;
  }

  /**
   * 设置描边样式
   * @param {string} style - 描边样式
   */
  setStrokeStyle(style) {
    this.currentState.strokeStyle = style;
    this.context.strokeStyle = style;
  }

  /**
   * 设置线宽
   * @param {number} width - 线宽
   */
  setLineWidth(width) {
    this.currentState.lineWidth = width;
    this.context.lineWidth = width;
  }

  /**
   * 设置全局透明度
   * @param {number} alpha - 透明度
   */
  setGlobalAlpha(alpha) {
    this.currentState.globalAlpha = alpha;
    this.context.globalAlpha = alpha;
  }

  /**
   * 设置字体
   * @param {string} font - 字体样式
   */
  setFont(font) {
    this.currentState.font = font;
    this.context.font = font;
  }

  /**
   * 设置文本对齐
   * @param {string} align - 对齐方式
   */
  setTextAlign(align) {
    this.currentState.textAlign = align;
    this.context.textAlign = align;
  }

  /**
   * 设置文本基线
   * @param {string} baseline - 基线对齐
   */
  setTextBaseline(baseline) {
    this.currentState.textBaseline = baseline;
    this.context.textBaseline = baseline;
  }

  /**
   * 添加脏矩形区域
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  addDirtyRegion(x, y, width, height) {
    this.dirtyRegions.push({ x, y, width, height });
  }

  /**
   * 清空脏矩形区域
   */
  clearDirtyRegions() {
    this.dirtyRegions = [];
  }

  /**
   * 获取合并后的脏矩形
   * @returns {Array} 脏矩形数组
   */
  getMergedDirtyRegions() {
    if (this.dirtyRegions.length === 0) {
      return [];
    }

    // 简单的矩形合并算法
    const merged = [...this.dirtyRegions];

    for (let i = 0; i < merged.length - 1; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        if (this.rectanglesOverlap(merged[i], merged[j])) {
          merged[i] = this.mergeRectangles(merged[i], merged[j]);
          merged.splice(j, 1);
          j--;
        }
      }
    }

    return merged;
  }

  /**
   * 检查两个矩形是否重叠
   * @param {Object} rect1 - 矩形1
   * @param {Object} rect2 - 矩形2
   * @returns {boolean} 是否重叠
   */
  rectanglesOverlap(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x ||
             rect2.x + rect2.width < rect1.x ||
             rect1.y + rect1.height < rect2.y ||
             rect2.y + rect2.height < rect1.y);
  }

  /**
   * 合并两个矩形
   * @param {Object} rect1 - 矩形1
   * @param {Object} rect2 - 矩形2
   * @returns {Object} 合并后的矩形
   */
  mergeRectangles(rect1, rect2) {
    const x = Math.min(rect1.x, rect2.x);
    const y = Math.min(rect1.y, rect2.y);
    const width = Math.max(rect1.x + rect1.width, rect2.x + rect2.width) - x;
    const height = Math.max(rect1.y + rect1.height, rect2.y + rect2.height) - y;

    return { x, y, width, height };
  }

  /**
   * 设置裁剪区域
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setClipRegion(x, y, width, height) {
    this.clipRegions.push({ x, y, width, height });
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this.context.clip();
  }

  /**
   * 清除裁剪区域
   */
  clearClipRegions() {
    this.clipRegions = [];
    // Canvas会自动清除裁剪，不需要额外操作
  }

  /**
   * 检查区域是否需要绘制
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {boolean} 是否需要绘制
   */
  shouldPaint(x, y, width, height) {
    const area = { x, y, width, height };

    // 检查是否在视口内
    if (!this.isInViewport(area)) {
      return false;
    }

    // 如果有脏矩形，检查是否与脏矩形重叠
    if (this.dirtyRegions.length > 0) {
      return this.dirtyRegions.some(dirty => this.rectanglesOverlap(area, dirty));
    }

    return true;
  }

  /**
   * 检查区域是否在视口内
   * @param {Object} area - 区域信息
   * @returns {boolean} 是否在视口内
   */
  isInViewport(area) {
    return !(area.x > this.viewport.x + this.viewport.width ||
             area.y > this.viewport.y + this.viewport.height ||
             area.x + area.width < this.viewport.x ||
             area.y + area.height < this.viewport.y);
  }

  /**
   * 获取当前状态
   * @returns {Object} 当前状态
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * 重置为默认状态
   */
  reset() {
    this.currentState = this.createDefaultState();
    this.clearDirtyRegions();
    this.clearClipRegions();
    this.applyState();
  }

  /**
   * 输出调试信息
   */
  logDebugInfo() {
    if (this.debugMode) {
      console.log('Paint Context Debug Info:');
      console.log('Dirty Regions:', this.dirtyRegions.length);
      console.log('Clip Regions:', this.clipRegions.length);
      console.log('Viewport:', this.viewport);
      console.log('Current State:', this.currentState);
    }
  }
}