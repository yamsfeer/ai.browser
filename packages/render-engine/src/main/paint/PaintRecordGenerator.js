/**
 * Paint Record生成器
 * 基于已有的Layer Tree为每个层生成对应的Paint Records
 * 这是Layer Tree计算之后的步骤
 */

import { RectPaintRecord, TextPaintRecord, ImagePaintRecord, PathPaintRecord, ShadowPaintRecord } from './PaintRecord.js';

export class PaintRecordGenerator {
  constructor(options = {}) {
    this.enableOptimizations = options.enableOptimizations !== false;
    this.mergeSimilarRecords = options.mergeSimilarRecords !== false;
    this.cullInvisibleRecords = options.cullInvisibleRecords !== false;

    // 统计信息
    this.stats = {
      totalLayers: 0,
      generatedRecords: 0,
      optimizedRecords: 0,
      culledRecords: 0
    };
  }

  /**
   * 为Layer Tree生成Paint Records
   * @param {LayerTree} layerTree - 已计算好的Layer Tree
   * @param {Object} options - 生成选项
   * @returns {LayerTree} 包含Paint Records的LayerTree
   */
  generate(layerTree, options = {}) {
    const startTime = performance.now();
    this.resetStats();

    if (!layerTree || !layerTree.root) {
      console.warn('PaintRecordGenerator: 无效的LayerTree');
      return layerTree;
    }

    // 为每个层生成Paint Records
    this.generateForLayer(layerTree.root);

    // 应用优化
    if (this.enableOptimizations) {
      this.optimizePaintRecords(layerTree);
    }

    // 更新统计信息
    this.stats.generationTime = performance.now() - startTime;

    if (options.debug) {
      console.log('Paint Record生成完成:', this.stats);
    }

    return layerTree;
  }

  /**
   * 为单个层生成Paint Records
   * @param {Layer} layer - 层
   */
  generateForLayer(layer) {
    if (!layer) {
      return;
    }

    this.stats.totalLayers++;

    // 如果层有关联的Layout Node，为其生成Paint Records
    if (layer.layoutNode) {
      // 检查节点是否可见
      if (this.isNodeVisible(layer.layoutNode)) {
        // 生成绘制记录
        const records = this.createPaintRecordsForNode(layer.layoutNode, layer);
        layer.addPaintRecords(records);
      } else {
        this.stats.culledRecords++;
      }
    }

    // 递归处理子层
    for (const child of layer.children) {
      this.generateForLayer(child);
    }
  }

  /**
   * 为Layout Node生成Paint Records
   * @param {Object} node - Layout节点
   * @param {Layer} layer - 对应的层
   * @returns {Array<PaintRecord>} Paint Record数组
   */
  createPaintRecordsForNode(node, layer) {
    const records = [];
    const style = node.style || {};
    const layout = node.layout || {};

    // 生成背景绘制记录
    const backgroundRecord = this.createBackgroundRecord(node, layer);
    if (backgroundRecord) {
      records.push(backgroundRecord);
    }

    // 生成边框绘制记录
    const borderRecord = this.createBorderRecord(node, layer);
    if (borderRecord) {
      records.push(borderRecord);
    }

    // 生成内容绘制记录
    const contentRecords = this.createContentRecords(node, layer);
    records.push(...contentRecords);

    // 生成阴影记录
    const shadowRecord = this.createShadowRecord(node, layer, records);
    if (shadowRecord) {
      // 用阴影记录替换原始记录
      return [shadowRecord];
    }

    this.stats.generatedRecords += records.length;
    return records;
  }

  /**
   * 检查节点是否可见
   * @param {Object} node - 布局节点
   * @returns {boolean} 是否可见
   */
  isNodeVisible(node) {
    if (!node.layout) {
      return false;
    }

    const { layout } = node;
    const style = node.style || {};

    // 检查尺寸
    if (layout.width <= 0 || layout.height <= 0) {
      return false;
    }

    // 检查可见性样式
    if (style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0') {
      return false;
    }

    return true;
  }

  /**
   * 创建背景绘制记录
   * @param {Object} node - 节点
   * @param {Layer} layer - 层
   * @returns {RectPaintRecord|null} 背景绘制记录
   */
  createBackgroundRecord(node, layer) {
    const style = node.style || {};
    const layout = node.layout || {};

    const backgroundColor = style['background-color'];
    if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor === 'none') {
      return null;
    }

    return new RectPaintRecord({
      fillStyle: backgroundColor,
      bounds: { x: 0, y: 0, width: layout.width, height: layout.height },
      layerId: layer.id
    });
  }

  /**
   * 创建边框绘制记录
   * @param {Object} node - 节点
   * @param {Layer} layer - 层
   * @returns {PathPaintRecord|null} 边框绘制记录
   */
  createBorderRecord(node, layer) {
    const style = node.style || {};
    const layout = node.layout || {};
    const boxModel = node.boxModel;

    if (!boxModel || style.border === 'none' || style.border === '0') {
      return null;
    }

    const borderColor = style['border-color'] || '#000000';
    const borderWidth = boxModel.border;

    // 简化：只绘制完整的边框，不处理不同边不同宽度的情况
    if (borderWidth.top > 0) {
      const path = [
        { type: 'moveTo', x: 0, y: 0 },
        { type: 'lineTo', x: layout.width, y: 0 },
        { type: 'lineTo', x: layout.width, y: layout.height },
        { type: 'lineTo', x: 0, y: layout.height },
        { type: 'closePath' }
      ];

      return new PathPaintRecord({
        path,
        strokeStyle: borderColor,
        lineWidth: borderWidth.top,
        stroked: true,
        filled: false,
        bounds: { x: 0, y: 0, width: layout.width, height: layout.height },
        layerId: layer.id
      });
    }

    return null;
  }

  /**
   * 创建内容绘制记录
   * @param {Object} node - 节点
   * @param {Layer} layer - 层
   * @returns {Array<PaintRecord>} 内容绘制记录数组
   */
  createContentRecords(node, layer) {
    const records = [];

    // 文本内容
    if (node.element && node.element.nodeType === 3) {
      const text = node.element.data || '';
      if (text.trim()) {
        const textRecord = this.createTextRecord(node, text, layer);
        if (textRecord) {
          records.push(textRecord);
        }
      }
    }

    // 子元素的内容会在递归处理子层时生成
    // 这里只处理当前节点的内容

    return records;
  }

  /**
   * 创建文本绘制记录
   * @param {Object} node - 节点
   * @param {string} text - 文本内容
   * @param {Layer} layer - 层
   * @returns {TextPaintRecord|null} 文本绘制记录
   */
  createTextRecord(node, text, layer) {
    const style = node.style || {};
    const layout = node.layout || {};

    if (!text.trim()) {
      return null;
    }

    return new TextPaintRecord({
      text,
      bounds: { x: 0, y: 0, width: layout.width, height: layout.height },
      font: `${style['font-weight'] || 'normal'} ${style['font-style'] || 'normal'} ${style['font-size'] || '16px'} ${style['font-family'] || 'serif'}`,
      fillStyle: style.color || '#000000',
      textAlign: style['text-align'] || 'left',
      textBaseline: 'top',
      layerId: layer.id
    });
  }

  /**
   * 创建阴影绘制记录
   * @param {Object} node - 节点
   * @param {Layer} layer - 层
   * @param {Array<PaintRecord>} contentRecords - 内容绘制记录
   * @returns {ShadowPaintRecord|null} 阴影绘制记录
   */
  createShadowRecord(node, layer, contentRecords) {
    const style = node.style || {};

    const shadowColor = style['box-shadow'] || style['text-shadow'];
    if (!shadowColor || shadowColor === 'none') {
      return null;
    }

    // 简化：只处理第一个内容记录的阴影
    if (contentRecords.length > 0) {
      const shadowParams = this.parseShadow(shadowColor);
      return new ShadowPaintRecord({
        ...shadowParams,
        targetRecord: contentRecords[0],
        bounds: contentRecords[0].bounds,
        layerId: layer.id
      });
    }

    return null;
  }

  /**
   * 解析阴影属性
   * @param {string} shadow - 阴影属性值
   * @returns {Object} 阴影参数
   */
  parseShadow(shadow) {
    // 简化实现：解析基本的box-shadow
    const match = shadow.match(/rgba?\([^)]+\)\s+(\d+)px\s+(\d+)px\s+(\d+)px/);
    if (match) {
      return {
        shadowColor: match[1],
        shadowOffsetX: parseInt(match[2]),
        shadowOffsetY: parseInt(match[3]),
        shadowBlur: parseInt(match[4])
      };
    }

    // 默认阴影
    return {
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowBlur: 4
    };
  }

  /**
   * 优化Paint Records
   * @param {LayerTree} layerTree - 层树
   */
  optimizePaintRecords(layerTree) {
    layerTree.traverseLayers((layer) => {
      if (this.cullInvisibleRecords) {
        this.cullInvisibleRecordsInLayer(layer);
      }

      if (this.mergeSimilarRecords) {
        this.mergeSimilarRecordsInLayer(layer);
      }
    });
  }

  /**
   * 在层中剔除不可见的绘制记录
   * @param {Layer} layer - 层
   */
  cullInvisibleRecordsInLayer(layer) {
    const originalCount = layer.paintRecords.length;
    layer.paintRecords = layer.paintRecords.filter(record => {
      return record.visible && record.opacity > 0;
    });
    this.stats.culledRecords += originalCount - layer.paintRecords.length;
  }

  /**
   * 在层中合并相似的绘制记录
   * @param {Layer} layer - 层
   */
  mergeSimilarRecordsInLayer(layer) {
    // 简化实现：合并相邻的背景色相同的矩形
    const mergedRecords = [];
    let currentRectRecord = null;

    for (const record of layer.paintRecords) {
      if (record.type === 'rect' && record.filled && !record.stroked) {
        if (!currentRectRecord) {
          currentRectRecord = record;
        } else if (currentRectRecord.fillStyle === record.fillStyle) {
          // 合并矩形：创建包含两个矩形的新矩形
          const mergedBounds = this.mergeBounds(currentRectRecord.bounds, record.bounds);
          currentRectRecord.bounds = mergedBounds;
        } else {
          mergedRecords.push(currentRectRecord);
          currentRectRecord = record;
        }
      } else {
        if (currentRectRecord) {
          mergedRecords.push(currentRectRecord);
          currentRectRecord = null;
        }
        mergedRecords.push(record);
      }
    }

    if (currentRectRecord) {
      mergedRecords.push(currentRectRecord);
    }

    const originalCount = layer.paintRecords.length;
    layer.paintRecords = mergedRecords;
    this.stats.optimizedRecords += originalCount - mergedRecords.length;
  }

  /**
   * 合并两个矩形边界
   * @param {Object} bounds1 - 边界1
   * @param {Object} bounds2 - 边界2
   * @returns {Object} 合并后的边界
   */
  mergeBounds(bounds1, bounds2) {
    const x = Math.min(bounds1.x, bounds2.x);
    const y = Math.min(bounds1.y, bounds2.y);
    const width = Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width) - x;
    const height = Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height) - y;

    return { x, y, width, height };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalLayers: 0,
      generatedRecords: 0,
      optimizedRecords: 0,
      culledRecords: 0,
      generationTime: 0
    };
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats };
  }
}