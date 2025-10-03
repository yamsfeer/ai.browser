/**
 * 现代化渲染引擎
 * 使用Paint Record架构，模拟Chrome的合成器渲染管线
 */

import { LayerTreeCalculator } from './main/layer/LayerTreeCalculator.js';
import { PaintRecordGenerator } from './main/paint/PaintRecordGenerator.js';
import { GPUSimulator } from './gpu/GPUSimulator.js';
import { Compositor } from './compositor/Compositor.js';

export class RenderEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    // 核心组件 - 按照正确的渲染管线顺序
    this.layerTreeCalculator = new LayerTreeCalculator({
      enableCompositingOptimization: options.enableCompositingOptimization !== false,
      maxLayerCount: options.maxLayerCount || 1000,
    });

    this.paintRecordGenerator = new PaintRecordGenerator({
      enableOptimizations: options.enableOptimizations !== false,
      mergeSimilarRecords: options.mergeSimilarRecords !== false,
      cullInvisibleRecords: options.cullInvisibleRecords !== false,
    });

    this.gpuSimulator = new GPUSimulator({
      maxDrawQuads: options.maxDrawQuads || 10000,
      maxTextureSize: options.maxTextureSize || 4096,
      enableBatching: options.enableBatching !== false,
      enableInstancing: options.enableInstancing || false,
      vramSize: options.vramSize || 512 * 1024 * 1024, // 512MB
    });

    this.compositor = new Compositor(canvas, {
      enableTiling: options.enableTiling !== false,
      tileSize: options.tileSize || 256,
      enableRasterization: options.enableRasterization !== false,
    });

    // 渲染状态
    this.currentLayerTree = null;
    this.lastRenderTree = null;
    this.debugMode = options.debug || false;

    // 统计信息
    this.stats = {
      totalNodes: 0,
      paintRecordsGenerated: 0,
      layersCreated: 0,
      tilesCreated: 0,
      drawQuadsCreated: 0,
      compositorTime: 0,
      gpuTime: 0,
      totalRenderTime: 0,
      frameCount: 0,
      averageFrameTime: 0,
    };
  }

  /**
   * 渲染布局树 - 按照正确的渲染管线顺序
   * @param {Object} renderTree - 布局引擎计算的渲染树
   * @param {Object} options - 渲染选项
   * @returns {Object} 渲染统计信息
   */
  render(renderTree, options = {}) {
    const startTime = performance.now();
    this.resetStats();

    try {
      // 阶段1: 计算Layer Tree
      console.log('📊 开始计算Layer Tree...');
      const layerTree = this.calculateLayerTree(renderTree, options);

      // 阶段2: 为每个层生成Paint Records
      console.log('🎨 开始生成Paint Records...');
      this.generatePaintRecords(layerTree, options);

      // 阶段3: GPU光栅化 - 将Paint Records转换为DrawQuads
      console.log('🔧 开始GPU光栅化...');
      const gpuStats = this.rasterizeLayerTree(layerTree, options);

      // 阶段4: GPU渲染
      console.log('🚀 开始GPU渲染...');
      const renderViewport = {
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
      };
      const gpuRenderStats = this.gpuSimulator.renderFrame(this.context, renderViewport);

      // 阶段5: 合成器处理
      console.log('🎭 开始合成器处理...');
      const compositorStats = this.compositor.composite(layerTree, {
        viewport: renderViewport,
        debug: this.debugMode || options.debug,
        gpuRenderData: gpuRenderStats,
      });

      // 阶段6: 更新统计信息
      this.updateStats(renderTree, layerTree, {
        ...gpuStats,
        ...gpuRenderStats,
        ...compositorStats
      }, startTime);

      // 保存当前状态
      this.currentLayerTree = layerTree;
      this.lastRenderTree = renderTree;
      this.stats.frameCount++;
    } catch (error) {
      console.error('ModernRenderEngine: 渲染失败', error);
      this.handleRenderError(error);
    }

    return this.stats;
  }

  /**
   * 计算Layer Tree - 渲染管线第一步
   * @param {Object} renderTree - 渲染树
   * @param {Object} options - 选项
   * @returns {LayerTree} 层树
   */
  calculateLayerTree(renderTree, options = {}) {
    const layerTree = this.layerTreeCalculator.calculate(renderTree, {
      debug: this.debugMode || options.debug,
    });

    // 更新统计信息
    const calculatorStats = this.layerTreeCalculator.getStats();
    this.stats.totalNodes = calculatorStats.totalNodes;
    this.stats.layersCreated = calculatorStats.layersCreated;

    if (this.debugMode) {
      console.log('Layer Tree计算完成:', calculatorStats);
      console.log('Compositing原因统计:', this.layerTreeCalculator.getCompositingReasonStats());
      console.log('LayerTree结构:');
      console.log(layerTree.root.toString());
    }

    return layerTree;
  }

  /**
   * 生成Paint Records - 渲染管线第二步
   * @param {LayerTree} layerTree - 已计算好的Layer Tree
   * @param {Object} options - 选项
   */
  generatePaintRecords(layerTree, options = {}) {
    this.paintRecordGenerator.generate(layerTree, {
      debug: this.debugMode || options.debug,
    });

    // 更新统计信息
    const generatorStats = this.paintRecordGenerator.getStats();
    this.stats.totalLayers = generatorStats.totalLayers;
    this.stats.paintRecordsGenerated = generatorStats.generatedRecords;

    if (this.debugMode) {
      console.log('Paint Record生成完成:', generatorStats);
    }
  }

  /**
   * GPU光栅化 - 渲染管线第三步
   * @param {LayerTree} layerTree - 已生成Paint Records的Layer Tree
   * @param {Object} options - 选项
   * @returns {Object} GPU统计信息
   */
  rasterizeLayerTree(layerTree, options = {}) {
    const startTime = performance.now();
    let drawQuadsCreated = 0;

    // 清空之前的DrawQuads
    this.gpuSimulator.cleanup();

    // 遍历所有层，将Paint Records转换为DrawQuads
    layerTree.traverseLayers((layer) => {
      if (layer.paintRecords && layer.paintRecords.length > 0) {
        for (const paintRecord of layer.paintRecords) {
          const drawQuad = this.convertPaintRecordToDrawQuad(paintRecord, layer);
          if (drawQuad) {
            this.gpuSimulator.createDrawQuad(drawQuad);
            drawQuadsCreated++;
          }
        }
      }
    });

    const gpuStats = {
      drawQuadsCreated,
      gpuRasterTime: performance.now() - startTime,
      totalLayers: layerTree.getStats().totalLayers,
    };

    this.stats.drawQuadsCreated = drawQuadsCreated;

    if (this.debugMode) {
      console.log('GPU光栅化完成:', gpuStats);
      console.log('GPU状态:', this.gpuSimulator.getGPUInfo());
    }

    return gpuStats;
  }

  /**
   * 将Paint Record转换为DrawQuad
   * @param {Object} paintRecord - Paint Record
   * @param {Object} layer - 所属层
   * @returns {Object|null} DrawQuad配置
   */
  convertPaintRecordToDrawQuad(paintRecord, layer) {
    // 基本的Paint Record到DrawQuad转换
    const quadOptions = {
      position: {
        x: paintRecord.x || 0,
        y: paintRecord.y || 0,
        z: layer.zIndex || 0
      },
      size: {
        width: paintRecord.width || 100,
        height: paintRecord.height || 100
      },
      transform: paintRecord.transform || [1, 0, 0, 1, 0, 0],
      color: paintRecord.color || 'rgba(0, 0, 0, 1)',
      opacity: layer.opacity || 1.0,
      blendMode: paintRecord.blendMode || 'source-over',
      shader: paintRecord.shader || 'default',
      visible: true,
      clipRect: paintRecord.clipRect || null
    };

    // 如果有纹理，添加纹理信息
    if (paintRecord.texture) {
      quadOptions.texture = paintRecord.texture;
    }

    return quadOptions;
  }

  /**
   * 增量渲染
   * @param {Object} renderTree - 新的渲染树
   * @param {Array<Object>} dirtyRegions - 脏区域列表
   * @returns {Object} 渲染统计信息
   */
  incrementalRender(renderTree, dirtyRegions = []) {
    if (!this.currentLayerTree || !this.lastRenderTree) {
      // 首次渲染，使用完整渲染
      return this.render(renderTree);
    }

    const startTime = performance.now();

    // 比较新旧渲染树，找出差异
    const changes = this.detectChanges(renderTree, this.lastRenderTree);

    if (changes.length === 0) {
      return this.stats; // 无变化
    }

    // 标记脏区域
    this.markDirtyRegions(dirtyRegions);

    // 重新生成受影响的层的Paint Records
    this.updateAffectedLayers(changes);

    // 合成器处理
    const compositorStats = this.compositor.composite(this.currentLayerTree, {
      incremental: true,
      dirtyRegions: dirtyRegions,
      viewport: {
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
      },
    });

    // 更新统计信息
    this.updateStats(renderTree, this.currentLayerTree, compositorStats, startTime);
    this.lastRenderTree = renderTree;

    return this.stats;
  }

  /**
   * 检测渲染树变化
   * @param {Object} newTree - 新渲染树
   * @param {Object} oldTree - 旧渲染树
   * @returns {Array<Object>} 变化列表
   */
  detectChanges(newTree, oldTree) {
    const changes = [];

    // 简化实现：比较根节点
    if (this.hasNodeChanged(newTree.root, oldTree.root)) {
      changes.push({
        type: 'node-changed',
        node: newTree.root,
        oldNode: oldTree.root,
      });
    }

    // 递归比较子节点
    this.compareNodeChildren(newTree.root, oldTree.root, changes);

    return changes;
  }

  /**
   * 比较节点子级
   * @param {Object} newNode - 新节点
   * @param {Object} oldNode - 旧节点
   * @param {Array} changes - 变化列表
   */
  compareNodeChildren(newNode, oldNode, changes) {
    const newChildren = newNode.children || [];
    const oldChildren = oldNode.children || [];
    const maxLength = Math.max(newChildren.length, oldChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const newChild = newChildren[i];
      const oldChild = oldChildren[i];

      if (!newChild && oldChild) {
        changes.push({
          type: 'node-removed',
          oldNode: oldChild,
        });
      } else if (newChild && !oldChild) {
        changes.push({
          type: 'node-added',
          node: newChild,
        });
      } else if (newChild && oldChild) {
        if (this.hasNodeChanged(newChild, oldChild)) {
          changes.push({
            type: 'node-changed',
            node: newChild,
            oldNode: oldChild,
          });
        }
        this.compareNodeChildren(newChild, oldChild, changes);
      }
    }
  }

  /**
   * 检查节点是否发生变化
   * @param {Object} newNode - 新节点
   * @param {Object} oldNode - 旧节点
   * @returns {boolean} 是否有变化
   */
  hasNodeChanged(newNode, oldNode) {
    if (!newNode || !oldNode) {
      return true;
    }

    // 检查样式
    if (JSON.stringify(newNode.style) !== JSON.stringify(oldNode.style)) {
      return true;
    }

    // 检查布局
    if (JSON.stringify(newNode.layout) !== JSON.stringify(oldNode.layout)) {
      return true;
    }

    // 检查内容
    if (newNode.element && oldNode.element) {
      if (newNode.element.data !== oldNode.element.data) {
        return true;
      }
    }

    return false;
  }

  /**
   * 标记脏区域
   * @param {Array<Object>} dirtyRegions - 脏区域列表
   */
  markDirtyRegions(dirtyRegions) {
    if (!this.currentLayerTree) {
      return;
    }

    this.currentLayerTree.traverseLayers(layer => {
      for (const dirtyRegion of dirtyRegions) {
        if (layer.intersectsRect(dirtyRegion)) {
          layer.markDirty(dirtyRegion);
        }
      }
    });
  }

  /**
   * 更新受影响的层
   * @param {Array<Object>} changes - 变化列表
   */
  updateAffectedLayers(changes) {
    if (!this.currentLayerTree) {
      return;
    }

    for (const change of changes) {
      if (change.type === 'node-added' || change.type === 'node-changed') {
        // 重新生成Paint Records - 使用正确的类名
        const records = this.paintRecordGenerator.createPaintRecordsForNode(change.node);
        const layer = this.findLayerForNode(change.node);
        if (layer) {
          layer.clearPaintRecords();
          layer.addPaintRecords(records);
        }
      }
    }
  }

  /**
   * 为节点查找对应的层
   * @param {Object} node - 节点
   * @returns {Layer|null} 对应的层
   */
  findLayerForNode(node) {
    if (!this.currentLayerTree) {
      return null;
    }

    // 简化实现：返回根层
    return this.currentLayerTree.root;
  }

  /**
   * 更新统计信息
   * @param {Object} renderTree - 渲染树
   * @param {LayerTree} layerTree - 层树
   * @param {Object} allStats - 所有模块的统计信息
   * @param {number} startTime - 开始时间
   */
  updateStats(renderTree, layerTree, allStats, startTime) {
    this.stats.totalRenderTime = performance.now() - startTime;
    this.stats.compositorTime = allStats.compositorTime || 0;
    this.stats.gpuTime = allStats.gpuTime || allStats.gpuRasterTime || 0;
    this.stats.tilesCreated = allStats.tilesCreated || 0;

    // 合并其他统计信息
    this.stats.totalDrawCalls = allStats.totalDrawCalls || 0;
    this.stats.totalTriangles = allStats.totalTriangles || 0;
    this.stats.totalPixels = allStats.totalPixels || 0;

    // 计算平均帧时间
    if (this.stats.frameCount > 1) {
      this.stats.averageFrameTime =
        (this.stats.averageFrameTime * (this.stats.frameCount - 1) + this.stats.totalRenderTime) /
        this.stats.frameCount;
    } else {
      this.stats.averageFrameTime = this.stats.totalRenderTime;
    }

    // 层树统计
    const layerStats = layerTree.getStats();
    this.stats.layersCreated = layerStats.totalLayers;

    if (this.debugMode) {
      console.log('完整渲染统计:', this.stats);
      console.log('GPU性能统计:', this.gpuSimulator.getPerformanceStats());
    }
  }

  /**
   * 处理渲染错误
   * @param {Error} error - 错误对象
   */
  handleRenderError(error) {
    // 清空画布，显示错误信息
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#ff0000';
    this.context.font = '16px monospace';
    this.context.fillText('渲染错误: ' + error.message, 10, 30);
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalNodes: 0,
      paintRecordsGenerated: 0,
      layersCreated: 0,
      tilesCreated: 0,
      drawQuadsCreated: 0,
      compositorTime: 0,
      gpuTime: 0,
      totalRenderTime: 0,
      frameCount: this.stats.frameCount || 0,
      averageFrameTime: this.stats.averageFrameTime || 0,
      totalDrawCalls: 0,
      totalTriangles: 0,
      totalPixels: 0,
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
   * 设置调试模式
   * @param {boolean} enabled - 是否启用调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.compositor.setDebugMode(enabled);
  }

  /**
   * 调整画布大小
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  resizeCanvas(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.compositor.resizeCanvas(width, height);

    // 标记所有层为脏
    if (this.currentLayerTree) {
      this.currentLayerTree.traverseLayers(layer => layer.markDirty());
    }
  }

  /**
   * 获取当前层树
   * @returns {LayerTree|null} 当前层树
   */
  getCurrentLayerTree() {
    return this.currentLayerTree;
  }

  /**
   * 获取渲染管线信息
   * @returns {Object} 管线信息
   */
  getPipelineInfo() {
    return {
      layerTreeCalculator: this.layerTreeCalculator.getStats(),
      paintRecordGenerator: this.paintRecordGenerator.getStats(),
      compositor: this.compositor.getStats(),
      layerTree: this.currentLayerTree ? this.currentLayerTree.getStats() : null,
      compositingReasons: this.layerTreeCalculator.getCompositingReasonStats(),
      currentStats: this.stats,
    };
  }

  /**
   * 销毁渲染引擎
   */
  dispose() {
    if (this.currentLayerTree) {
      this.currentLayerTree.traverseLayers(layer => layer.dispose());
    }
    this.compositor.dispose();
    this.gpuSimulator.dispose();
    this.currentLayerTree = null;
    this.lastRenderTree = null;
  }
}
