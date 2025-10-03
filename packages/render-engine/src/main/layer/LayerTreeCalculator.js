/**
 * Layer Tree计算器
 * 根据Layout Tree和样式属性计算哪些元素需要成为独立的合成层
 * 这是Paint Record生成的前置步骤
 */

import { Layer, LayerTree } from './Layer.js';

export class LayerTreeCalculator {
  constructor(options = {}) {
    this.enableCompositingOptimization = options.enableCompositingOptimization !== false;
    this.maxLayerCount = options.maxLayerCount || 1000;

    // 统计信息
    this.stats = {
      totalNodes: 0,
      layersCreated: 0,
      compositingReasons: {},
      totalCompositingReasons: 0
    };
  }

  /**
   * 计算Layer Tree
   * @param {Object} layoutTree - 布局树
   * @param {Object} options - 计算选项
   * @returns {LayerTree} 计算出的Layer Tree
   */
  calculate(layoutTree, options = {}) {
    const startTime = performance.now();
    this.resetStats();

    // 创建LayerTree
    const layerTree = new LayerTree();

    // 创建根层
    const rootLayer = layerTree.root;
    if (layoutTree.root && layoutTree.root.layout) {
      rootLayer.bounds = { ...layoutTree.root.layout };
    }

    // 遍历Layout Tree计算层
    this.calculateForNode(layoutTree.root, rootLayer, layerTree);

    // 后处理：优化层树
    if (this.enableCompositingOptimization) {
      this.optimizeLayerTree(layerTree);
    }

    // 更新统计信息
    this.stats.calculationTime = performance.now() - startTime;

    if (options.debug) {
      console.log('Layer Tree计算完成:', this.stats);
      console.log('LayerTree结构:');
      console.log(layerTree.root.toString());
    }

    return layerTree;
  }

  /**
   * 为节点计算层
   * @param {Object} node - 布局节点
   * @param {Layer} parentLayer - 父层
   * @param {LayerTree} layerTree - 层树
   */
  calculateForNode(node, parentLayer, layerTree) {
    if (!node) {
      return;
    }

    this.stats.totalNodes++;

    // 判断节点是否需要成为新层
    const compositingReason = this.shouldCreateNewLayer(node);
    const targetLayer = compositingReason
      ? this.createLayerForNode(node, parentLayer, layerTree, compositingReason)
      : parentLayer;

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.calculateForNode(child, targetLayer, layerTree);
      }
    }
  }

  /**
   * 判断节点是否需要成为新层
   * @param {Object} node - 节点
   * @returns {string|null} 如果需要新层，返回原因；否则返回null
   */
  shouldCreateNewLayer(node) {
    const style = node.style || {};

    // Chrome的compositing criteria:
    // 1. 3D transform
    if (style.transform && style.transform !== 'none') {
      this.recordCompositingReason('transform');
      return 'transform';
    }

    // 2. opacity < 1
    if (style.opacity !== undefined && parseFloat(style.opacity) < 1) {
      this.recordCompositingReason('opacity');
      return 'opacity';
    }

    // 3. position: fixed
    if (style.position === 'fixed') {
      this.recordCompositingReason('fixed-position');
      return 'fixed-position';
    }

    // 4. z-index > 0 且有定位
    if (this.hasPositioning(style) && this.hasPositiveZIndex(style)) {
      this.recordCompositingReason('z-index');
      return 'z-index';
    }

    // 5. will-change属性
    if (style['will-change']) {
      const willChangeValue = style['will-change'];
      if (willChangeValue.includes('transform') ||
          willChangeValue.includes('opacity') ||
          willChangeValue.includes('scroll-position')) {
        this.recordCompositingReason('will-change');
        return 'will-change';
      }
    }

    // 6. filter
    if (style.filter && style.filter !== 'none') {
      this.recordCompositingReason('filter');
      return 'filter';
    }

    // 7. backdrop-filter
    if (style['backdrop-filter'] && style['backdrop-filter'] !== 'none') {
      this.recordCompositingReason('backdrop-filter');
      return 'backdrop-filter';
    }

    // 8. mix-blend-mode 不是 normal
    if (style['mix-blend-mode'] && style['mix-blend-mode'] !== 'normal') {
      this.recordCompositingReason('mix-blend-mode');
      return 'mix-blend-mode';
    }

    // 9. isolation: isolate
    if (style.isolation === 'isolate') {
      this.recordCompositingReason('isolation');
      return 'isolation';
    }

    // 10. clip-path 或 clip
    if (style['clip-path'] && style['clip-path'] !== 'none') {
      this.recordCompositingReason('clip-path');
      return 'clip-path';
    }

    // 11. mask 或 mask-image
    if (style.mask && style.mask !== 'none') {
      this.recordCompositingReason('mask');
      return 'mask';
    }

    // 12. box-shadow (复杂的阴影)
    if (this.hasComplexBoxShadow(style)) {
      this.recordCompositingReason('box-shadow');
      return 'box-shadow';
    }

    // 13. overflow: scroll 或 auto (滚动容器)
    if (style.overflow === 'scroll' || style.overflow === 'auto') {
      this.recordCompositingReason('scroll-container');
      return 'scroll-container';
    }

    // 14. reflection
    if (style['-webkit-box-reflect']) {
      this.recordCompositingReason('reflection');
      return 'reflection';
    }

    // 15. video, canvas, iframe 等特定元素
    if (this.isCompositingElement(node)) {
      this.recordCompositingReason('compositing-element');
      return 'compositing-element';
    }

    // 16. animation 或 transition (某些情况下)
    if (this.hasActiveAnimation(style)) {
      this.recordCompositingReason('animation');
      return 'animation';
    }

    return null; // 不需要新层
  }

  /**
   * 检查是否有定位属性
   * @param {Object} style - 样式对象
   * @returns {boolean} 是否有定位
   */
  hasPositioning(style) {
    return style.position === 'absolute' ||
           style.position === 'relative' ||
           style.position === 'fixed' ||
           style.position === 'sticky';
  }

  /**
   * 检查是否有正的z-index
   * @param {Object} style - 样式对象
   * @returns {boolean} 是否有正z-index
   */
  hasPositiveZIndex(style) {
    const zIndex = parseInt(style['z-index']);
    return !isNaN(zIndex) && zIndex > 0;
  }

  /**
   * 检查是否有复杂的box-shadow
   * @param {Object} style - 样式对象
   * @returns {boolean} 是否有复杂阴影
   */
  hasComplexBoxShadow(style) {
    const boxShadow = style['box-shadow'];
    if (!boxShadow || boxShadow === 'none') {
      return false;
    }

    // 简单检查：如果有blur > 0或者有多个阴影，认为需要compositing
    return boxShadow.includes('px 0px') || boxShadow.includes(',');
  }

  /**
   * 检查是否是需要compositing的元素类型
   * @param {Object} node - 节点
   * @returns {boolean} 是否是compositing元素
   */
  isCompositingElement(node) {
    if (!node.element || !node.element.tagName) {
      return false;
    }

    const tagName = node.element.tagName.toLowerCase();

    // 某些元素总是需要compositing layer
    return tagName === 'video' ||
           tagName === 'canvas' ||
           tagName === 'iframe' ||
           tagName === 'embed' ||
           tagName === 'object';
  }

  /**
   * 检查是否有活动的动画
   * @param {Object} style - 样式对象
   * @returns {boolean} 是否有活动动画
   */
  hasActiveAnimation(style) {
    // 简化实现：检查animation属性
    return style.animation && style.animation !== 'none';
  }

  /**
   * 记录compositing原因
   * @param {string} reason - 原因
   */
  recordCompositingReason(reason) {
    if (!this.stats.compositingReasons[reason]) {
      this.stats.compositingReasons[reason] = 0;
    }
    this.stats.compositingReasons[reason]++;
    this.stats.totalCompositingReasons++;
  }

  /**
   * 为节点创建新层
   * @param {Object} node - 节点
   * @param {Layer} parentLayer - 父层
   * @param {LayerTree} layerTree - 层树
   * @param {string} reason - 创建层的原因
   * @returns {Layer} 新创建的层
   */
  createLayerForNode(node, parentLayer, layerTree, reason) {
    const style = node.style || {};
    const layout = node.layout || {};

    const layer = layerTree.createLayer({
      zIndex: parseInt(style['z-index']) || 0,
      opacity: parseFloat(style.opacity) || 1.0,
      bounds: { ...layout },
      isFixed: style.position === 'fixed',
      isComposited: true,
      compositingReason: reason
    });

    // 设置变换
    if (style.transform && style.transform !== 'none') {
      layer.setTransform(this.parseTransform(style.transform));
    }

    // 设置裁剪
    if (style.overflow === 'hidden' || style.overflow === 'scroll' || style.overflow === 'auto') {
      layer.clipRect = { x: 0, y: 0, width: layout.width, height: layout.height };
      layer.masksToBounds = true;
      layer.isScrollContainer = style.overflow === 'scroll' || style.overflow === 'auto';
    }

    // 将节点引用存储在层中，用于后续Paint Record生成
    layer.layoutNode = node;

    parentLayer.addChild(layer);
    this.stats.layersCreated++;

    return layer;
  }

  /**
   * 解析transform属性
   * @param {string} transform - transform属性值
   * @returns {Array} 变换矩阵
   */
  parseTransform(transform) {
    // 简化实现：只支持基本的translate, scale, rotate
    // 默认返回单位矩阵
    return [1, 0, 0, 1, 0, 0];
  }

  /**
   * 优化层树
   * @param {LayerTree} layerTree - 层树
   */
  optimizeLayerTree(layerTree) {
    // 优化1: 移除不必要的层
    this.removeUnnecessaryLayers(layerTree);

    // 优化2: 合并相邻的层（如果可能）
    this.mergeCompatibleLayers(layerTree);

    // 优化3: 重新排序层以确保正确的z-index
    this.reorderLayers(layerTree);
  }

  /**
   * 移除不必要的层
   * @param {LayerTree} layerTree - 层树
   */
  removeUnnecessaryLayers(layerTree) {
    // 如果层只有一个子层且没有特殊属性，可以合并
    layerTree.traverseLayers((layer) => {
      if (layer.children.length === 1 &&
          layer.opacity === 1.0 &&
          (!layer.transform ||
           (layer.transform[0] === 1 && layer.transform[1] === 0 &&
            layer.transform[2] === 0 && layer.transform[3] === 1 &&
            layer.transform[4] === 0 && layer.transform[5] === 0))) {

        const child = layer.children[0];
        if (!child.clipRect && !layer.clipRect) {
          // 可以合并
          this.mergeLayers(layer, child);
        }
      }
    });
  }

  /**
   * 合并兼容的层
   * @param {LayerTree} layerTree - 层树
   */
  mergeCompatibleLayers(layerTree) {
    // 简化实现：这里可以实现更复杂的层合并逻辑
    // 目前暂时跳过
  }

  /**
   * 重新排序层
   * @param {LayerTree} layerTree - 层树
   */
  reorderLayers(layerTree) {
    layerTree.traverseLayers((layer) => {
      // 按z-index排序子层
      layer.children.sort((a, b) => a.zIndex - b.zIndex);
    });
  }

  /**
   * 合并两个层
   * @param {Layer} parent - 父层
   * @param {Layer} child - 子层
   */
  mergeLayers(parent, child) {
    // 将子层的属性合并到父层
    parent.bounds = { ...child.bounds };
    parent.layoutNode = child.layoutNode;
    parent.compositingReason = parent.compositingReason + ', ' + child.compositingReason;

    // 移动子层的子节点到父层
    for (const grandChild of child.children) {
      grandChild.parent = parent;
      parent.children.push(grandChild);
    }

    // 移除子层
    parent.removeChild(child);
    child.dispose();
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalNodes: 0,
      layersCreated: 0,
      compositingReasons: {},
      totalCompositingReasons: 0,
      calculationTime: 0
    };
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 获取compositing原因统计
   * @returns {Object} 原因统计
   */
  getCompositingReasonStats() {
    const reasons = [];
    for (const [reason, count] of Object.entries(this.stats.compositingReasons)) {
      reasons.push({
        reason,
        count,
        percentage: ((count / this.stats.totalCompositingReasons) * 100).toFixed(1) + '%'
      });
    }

    // 按数量排序
    reasons.sort((a, b) => b.count - a.count);

    return {
      total: this.stats.totalCompositingReasons,
      reasons
    };
  }
}