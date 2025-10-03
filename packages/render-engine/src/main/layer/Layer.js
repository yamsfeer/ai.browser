/**
 * Layer
 * 表示一个独立的绘制层，用于合成器管理
 */

export class Layer {
  constructor(options = {}) {
    this.id = options.id || this.generateId();
    this.parent = options.parent || null;
    this.children = [];

    // 层级属性
    this.zIndex = options.zIndex || 0;
    this.opacity = options.opacity || 1.0;
    this.compositingMode = options.compositingMode || 'normal';

    // 变换属性
    this.transform = options.transform || [1, 0, 0, 1, 0, 0]; // [a, b, c, d, e, f]
    this.bounds = options.bounds || { x: 0, y: 0, width: 0, height: 0 };

    // 裁剪
    this.clipRect = options.clipRect || null;
    this.masksToBounds = options.masksToBounds || false;

    // 绘制记录
    this.paintRecords = [];
    this.needsRepaint = true;
    this.dirtyRegion = null;

    // 优化属性
    this.isFixed = options.isFixed || false;
    this.isScrollContainer = options.isScrollContainer || false;
    this.isComposited = options.isComposited !== false;

    // 缓存
    this.backingStore = null;
    this.lastPaintTime = 0;
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加子层
   * @param {Layer} child - 子层
   */
  addChild(child) {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
    this.children.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 移除子层
   * @param {Layer} child - 子层
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  /**
   * 添加绘制记录
   * @param {PaintRecord} record - 绘制记录
   */
  addPaintRecord(record) {
    record.layerId = this.id;
    this.paintRecords.push(record);
    this.markDirty();
  }

  /**
   * 添加多个绘制记录
   * @param {Array<PaintRecord>} records - 绘制记录数组
   */
  addPaintRecords(records) {
    for (const record of records) {
      record.layerId = this.id;
      this.paintRecords.push(record);
    }
    this.markDirty();
  }

  /**
   * 清空绘制记录
   */
  clearPaintRecords() {
    this.paintRecords = [];
    this.markDirty();
  }

  /**
   * 标记层为需要重绘
   * @param {Object} dirtyRegion - 脏区域
   */
  markDirty(dirtyRegion = null) {
    this.needsRepaint = true;
    this.dirtyRegion = dirtyRegion;

    // 通知父级也需要重绘
    if (this.parent && dirtyRegion) {
      const transformedRegion = this.transformDirtyRegionToParent(dirtyRegion);
      this.parent.markDirty(transformedRegion);
    }
  }

  /**
   * 将脏区域转换到父层坐标系
   * @param {Object} dirtyRegion - 当前层的脏区域
   * @returns {Object} 父层坐标系中的脏区域
   */
  transformDirtyRegionToParent(dirtyRegion) {
    const [a, b, c, d, e, f] = this.transform;
    const x = dirtyRegion.x * a + dirtyRegion.y * c + e;
    const y = dirtyRegion.x * b + dirtyRegion.y * d + f;
    const width = dirtyRegion.width * a + dirtyRegion.height * c;
    const height = dirtyRegion.width * b + dirtyRegion.height * d;

    return { x, y, width, height };
  }

  /**
   * 检查点是否在层内
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @returns {boolean} 是否在层内
   */
  containsPoint(x, y) {
    return x >= this.bounds.x && x <= this.bounds.x + this.bounds.width &&
           y >= this.bounds.y && y <= this.bounds.y + this.bounds.height;
  }

  /**
   * 检查区域是否与层重叠
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
   * 获取层的绝对边界（相对于根层）
   * @returns {Object} 绝对边界
   */
  getAbsoluteBounds() {
    if (!this.parent) {
      return { ...this.bounds };
    }

    const parentBounds = this.parent.getAbsoluteBounds();
    const [a, b, c, d, e, f] = this.transform;

    return {
      x: this.bounds.x * a + this.bounds.y * c + e + parentBounds.x,
      y: this.bounds.x * b + this.bounds.y * d + f + parentBounds.y,
      width: this.bounds.width,
      height: this.bounds.height
    };
  }

  /**
   * 应用变换矩阵
   * @param {Array} transform - 变换矩阵
   */
  setTransform(transform) {
    this.transform = transform;
    this.markDirty();
  }

  /**
   * 设置位置
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   */
  setPosition(x, y) {
    this.bounds.x = x;
    this.bounds.y = y;
    this.markDirty();
  }

  /**
   * 设置尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setSize(width, height) {
    this.bounds.width = width;
    this.bounds.height = height;
    this.markDirty();
  }

  /**
   * 获取所有可见的绘制记录（包括子层）
   * @returns {Array<PaintRecord>} 可见的绘制记录
   */
  getAllVisiblePaintRecords() {
    const records = [];

    // 添加当前层的绘制记录
    if (this.opacity > 0) {
      for (const record of this.paintRecords) {
        if (record.visible && record.opacity > 0) {
          records.push(record);
        }
      }
    }

    // 递归添加子层的绘制记录
    for (const child of this.children) {
      records.push(...child.getAllVisiblePaintRecords());
    }

    return records;
  }

  /**
   * 获取层的统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const childStats = this.children.map(child => child.getStats());
    const totalChildren = childStats.reduce((sum, stats) => sum + stats.totalChildren + 1, 0);
    const totalPaintRecords = this.paintRecords.length +
                            childStats.reduce((sum, stats) => sum + stats.totalPaintRecords, 0);

    return {
      id: this.id,
      paintRecords: this.paintRecords.length,
      children: this.children.length,
      totalChildren,
      totalPaintRecords,
      needsRepaint: this.needsRepaint,
      opacity: this.opacity,
      zIndex: this.zIndex,
      bounds: { ...this.bounds }
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    this.clearPaintRecords();
    this.backingStore = null;

    // 递归清理子层
    for (const child of this.children) {
      child.dispose();
    }
    this.children = [];
  }

  /**
   * 获取层的字符串表示
   * @param {number} depth - 缩进深度
   * @returns {string} 字符串表示
   */
  toString(depth = 0) {
    const indent = '  '.repeat(depth);
    let result = `${indent}Layer(${this.id}) z:${this.zIndex} opacity:${this.opacity} bounds:[${this.bounds.x},${this.bounds.y},${this.bounds.width},${this.bounds.height}]\n`;

    if (this.paintRecords.length > 0) {
      result += `${indent}  PaintRecords: ${this.paintRecords.length}\n`;
    }

    for (const child of this.children) {
      result += child.toString(depth + 1);
    }

    return result;
  }
}

/**
 * LayerTree
 * 管理整个层的树形结构
 */
export class LayerTree {
  constructor() {
    this.root = new Layer({ id: 'root', zIndex: 0 });
    this.allLayers = new Map();
    this.allLayers.set(this.root.id, this.root);
    this.nextLayerId = 1;
  }

  /**
   * 创建新层
   * @param {Object} options - 层选项
   * @returns {Layer} 新层
   */
  createLayer(options = {}) {
    const layer = new Layer({
      id: options.id || `layer_${this.nextLayerId++}`,
      ...options
    });

    this.allLayers.set(layer.id, layer);
    return layer;
  }

  /**
   * 根据ID获取层
   * @param {string} id - 层ID
   * @returns {Layer|null} 层
   */
  getLayerById(id) {
    return this.allLayers.get(id) || null;
  }

  /**
   * 移除层
   * @param {Layer} layer - 要移除的层
   */
  removeLayer(layer) {
    if (layer.parent) {
      layer.parent.removeChild(layer);
    }
    this.allLayers.delete(layer.id);
    layer.dispose();
  }

  /**
   * 获取所有需要重绘的层
   * @returns {Array<Layer>} 需要重绘的层
   */
  getDirtyLayers() {
    const dirtyLayers = [];

    for (const layer of this.allLayers.values()) {
      if (layer.needsRepaint) {
        dirtyLayers.push(layer);
      }
    }

    return dirtyLayers;
  }

  /**
   * 清除所有层的重绘标记
   */
  clearDirtyFlags() {
    for (const layer of this.allLayers.values()) {
      layer.needsRepaint = false;
      layer.dirtyRegion = null;
    }
  }

  /**
   * 获取树的统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const rootStats = this.root.getStats();
    return {
      totalLayers: this.allLayers.size,
      dirtyLayers: this.getDirtyLayers().length,
      rootStats
    };
  }

  /**
   * 遍历所有层
   * @param {Function} callback - 回调函数
   */
  traverseLayers(callback) {
    const traverse = (layer) => {
      callback(layer);
      for (const child of layer.children) {
        traverse(child);
      }
    };

    traverse(this.root);
  }
}