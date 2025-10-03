/**
 * 合成器
 * 模拟Chrome的合成器线程，处理层的合成和最终绘制
 */

import { TilingManager } from './tiling/TilingManager.js';
import { Rasterizer } from './raster/Rasterizer.js';

export class Compositor {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    // 配置选项
    this.enableTiling = options.enableTiling !== false;
    this.enableRasterization = options.enableRasterization !== false;
    this.tileSize = options.tileSize || 256;

    // 子组件
    this.tilingManager = new TilingManager({
      tileSize: this.tileSize,
      maxTiles: options.maxTiles || 1000
    });

    this.rasterizer = new Rasterizer({
      enableCaching: options.enableCaching !== false,
      maxCacheSize: options.maxCacheSize || 100 * 1024 * 1024 // 100MB
    });

    // 合成状态
    this.currentLayerTree = null;
    this.viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    this.debugMode = false;

    // 统计信息
    this.stats = {
      layersComposited: 0,
      tilesCreated: 0,
      tilesRasterized: 0,
      compositorTime: 0,
      drawCalls: 0,
      memoryUsage: 0
    };
  }

  /**
   * 合成层树
   * @param {LayerTree} layerTree - 层树
   * @param {Object} options - 合成选项
   * @returns {Object} 合成统计信息
   */
  composite(layerTree, options = {}) {
    const startTime = performance.now();
    this.resetStats();

    this.currentLayerTree = layerTree;
    this.viewport = options.viewport || this.viewport;

    try {
      // 阶段1: 预处理层
      this.preprocessLayers(layerTree);

      // 阶段2: 分块处理
      const tiles = this.enableTiling ? this.generateTiles(layerTree) : null;

      // 阶段3: 光栅化
      if (this.enableRasterization && tiles) {
        this.rasterizeTiles(tiles);
      }

      // 阶段4: 最终绘制
      this.renderFinalComposition(layerTree, tiles, options);

    } catch (error) {
      console.error('Compositor: 合成失败', error);
      this.handleCompositorError(error);
    }

    // 更新统计信息
    this.stats.compositorTime = performance.now() - startTime;

    if (this.debugMode) {
      console.log('合成完成:', this.stats);
    }

    return this.stats;
  }

  /**
   * 预处理层
   * @param {LayerTree} layerTree - 层树
   */
  preprocessLayers(layerTree) {
    layerTree.traverseLayers((layer) => {
      // 计算层的绝对位置
      this.calculateAbsoluteBounds(layer);

      // 检查层是否在视口内
      layer.isVisibleInViewport = this.isLayerVisibleInViewport(layer);

      // 排序层（根据z-index）
      this.sortLayerChildren(layer);

      if (layer.isVisibleInViewport) {
        this.stats.layersComposited++;
      }
    });
  }

  /**
   * 计算层的绝对边界
   * @param {Layer} layer - 层
   */
  calculateAbsoluteBounds(layer) {
    if (!layer.parent) {
      layer.absoluteBounds = { ...layer.bounds };
      return;
    }

    const parentAbsoluteBounds = layer.parent.absoluteBounds || layer.parent.bounds;
    const [a, b, c, d, e, f] = layer.transform;

    layer.absoluteBounds = {
      x: layer.bounds.x * a + layer.bounds.y * c + e + parentAbsoluteBounds.x,
      y: layer.bounds.x * b + layer.bounds.y * d + f + parentAbsoluteBounds.y,
      width: layer.bounds.width,
      height: layer.bounds.height
    };
  }

  /**
   * 检查层是否在视口内可见
   * @param {Layer} layer - 层
   * @returns {boolean} 是否可见
   */
  isLayerVisibleInViewport(layer) {
    const bounds = layer.absoluteBounds || layer.bounds;

    return !(bounds.x > this.viewport.x + this.viewport.width ||
             bounds.x + bounds.width < this.viewport.x ||
             bounds.y > this.viewport.y + this.viewport.height ||
             bounds.y + bounds.height < this.viewport.y) &&
           layer.opacity > 0;
  }

  /**
   * 对层的子级进行排序
   * @param {Layer} layer - 层
   */
  sortLayerChildren(layer) {
    layer.children.sort((a, b) => {
      // 首先按z-index排序
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      // 然后按DOM顺序（在children数组中的位置）
      return layer.children.indexOf(a) - layer.children.indexOf(b);
    });

    // 递归排序子层
    for (const child of layer.children) {
      this.sortLayerChildren(child);
    }
  }

  /**
   * 生成分块
   * @param {LayerTree} layerTree - 层树
   * @returns {Array<Tile>} 分块数组
   */
  generateTiles(layerTree) {
    const tiles = [];

    layerTree.traverseLayers((layer) => {
      if (!layer.isVisibleInViewport || !layer.needsRepaint) {
        return;
      }

      const layerTiles = this.tilingManager.generateTilesForLayer(layer, this.viewport);
      tiles.push(...layerTiles);
    });

    this.stats.tilesCreated = tiles.length;

    if (this.debugMode) {
      console.log(`生成了 ${tiles.length} 个分块`);
    }

    return tiles;
  }

  /**
   * 光栅化分块
   * @param {Array<Tile>} tiles - 分块数组
   */
  rasterizeTiles(tiles) {
    for (const tile of tiles) {
      if (tile.needsRasterization) {
        this.rasterizer.rasterizeTile(tile);
        this.stats.tilesRasterized++;
      }
    }

    if (this.debugMode) {
      console.log(`光栅化了 ${this.stats.tilesRasterized} 个分块`);
    }
  }

  /**
   * 最终合成绘制
   * @param {LayerTree} layerTree - 层树
   * @param {Array<Tile>} tiles - 分块数组
   * @param {Object} options - 绘制选项
   */
  renderFinalComposition(layerTree, tiles, options = {}) {
    // 清空画布
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.enableTiling && tiles) {
      // 使用分块绘制
      this.renderTiles(tiles, options);
    } else {
      // 直接绘制层
      this.renderLayers(layerTree.root, options);
    }

    // 调试模式绘制
    if (this.debugMode) {
      this.renderDebugInfo(layerTree, tiles);
    }
  }

  /**
   * 绘制分块
   * @param {Array<Tile>} tiles - 分块数组
   * @param {Object} options - 绘制选项
   */
  renderTiles(tiles, options = {}) {
    // 按位置排序分块以确保正确的绘制顺序
    tiles.sort((a, b) => {
      if (a.layer.zIndex !== b.layer.zIndex) {
        return a.layer.zIndex - b.layer.zIndex;
      }
      return a.layer.id.localeCompare(b.layer.id);
    });

    for (const tile of tiles) {
      if (tile.rasterizedContent && this.isTileVisible(tile)) {
        this.drawTile(tile);
        this.stats.drawCalls++;
      }
    }
  }

  /**
   * 检查分块是否可见
   * @param {Tile} tile - 分块
   * @returns {boolean} 是否可见
   */
  isTileVisible(tile) {
    return !(tile.x > this.viewport.x + this.viewport.width ||
             tile.x + tile.width < this.viewport.x ||
             tile.y > this.viewport.y + this.viewport.height ||
             tile.y + tile.height < this.viewport.y);
  }

  /**
   * 绘制分块
   * @param {Tile} tile - 分块
   */
  drawTile(tile) {
    if (!tile.rasterizedContent) {
      return;
    }

    this.context.save();

    // 应用层的变换
    if (tile.layer.transform) {
      this.context.setTransform(...tile.layer.transform);
    }

    // 应用透明度
    this.context.globalAlpha *= tile.layer.opacity;

    // 绘制分块内容
    this.context.drawImage(
      tile.rasterizedContent,
      tile.x, tile.y, tile.width, tile.height
    );

    this.context.restore();
  }

  /**
   * 直接绘制层
   * @param {Layer} layer - 层
   * @param {Object} options - 绘制选项
   */
  renderLayers(layer, options = {}) {
    if (!layer.isVisibleInViewport) {
      return;
    }

    // 保存状态
    this.context.save();

    // 应用层变换
    if (layer.transform) {
      this.context.setTransform(...layer.transform);
    }

    // 应用裁剪
    if (layer.clipRect) {
      this.context.beginPath();
      this.context.rect(layer.clipRect.x, layer.clipRect.y, layer.clipRect.width, layer.clipRect.height);
      this.context.clip();
    }

    // 应用透明度
    this.context.globalAlpha *= layer.opacity;

    // 绘制当前层的Paint Records
    this.renderPaintRecords(layer);

    // 递归绘制子层
    for (const child of layer.children) {
      this.renderLayers(child, options);
    }

    // 恢复状态
    this.context.restore();

    this.stats.drawCalls += layer.paintRecords.length;
  }

  /**
   * 绘制Paint Records
   * @param {Layer} layer - 层
   */
  renderPaintRecords(layer) {
    for (const record of layer.paintRecords) {
      if (record.visible) {
        // 设置绘制坐标（相对于层的位置）
        const originalBounds = record.bounds;
        record.bounds.x += layer.bounds.x;
        record.bounds.y += layer.bounds.y;

        // 执行绘制
        record.execute(this.context);

        // 恢复原始坐标
        record.bounds = originalBounds;
      }
    }
  }

  /**
   * 绘制调试信息
   * @param {LayerTree} layerTree - 层树
   * @param {Array<Tile>} tiles - 分块数组
   */
  renderDebugInfo(layerTree, tiles) {
    this.context.save();
    this.context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.context.lineWidth = 1;
    this.context.font = '12px monospace';

    // 绘制分块边界
    if (tiles) {
      for (const tile of tiles) {
        this.context.strokeRect(tile.x, tile.y, tile.width, tile.height);
        this.context.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.context.fillText(
          `Tile(${tile.tileX},${tile.tileY})`,
          tile.x + 2, tile.y + 12
        );
      }
    }

    // 绘制层边界
    layerTree.traverseLayers((layer) => {
      if (layer.isVisibleInViewport) {
        const bounds = layer.absoluteBounds || layer.bounds;
        this.context.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.context.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.context.fillText(
          `Layer(${layer.id}) z:${layer.zIndex}`,
          bounds.x + 2, bounds.y + 12
        );
      }
    });

    // 绘制统计信息
    this.renderStats();

    this.context.restore();
  }

  /**
   * 绘制统计信息
   */
  renderStats() {
    const stats = [
      `层: ${this.stats.layersComposited}`,
      `分块: ${this.stats.tilesCreated}`,
      `光栅化: ${this.stats.tilesRasterized}`,
      `绘制调用: ${this.stats.drawCalls}`,
      `时间: ${this.stats.compositorTime.toFixed(2)}ms`
    ];

    this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.context.fillRect(10, 10, 200, stats.length * 15 + 10);

    this.context.fillStyle = '#ffffff';
    stats.forEach((stat, index) => {
      this.context.fillText(stat, 15, 25 + index * 15);
    });
  }

  /**
   * 处理合成器错误
   * @param {Error} error - 错误对象
   */
  handleCompositorError(error) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#ff0000';
    this.context.font = '16px monospace';
    this.context.fillText('合成器错误: ' + error.message, 10, 30);
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      layersComposited: 0,
      tilesCreated: 0,
      tilesRasterized: 0,
      compositorTime: 0,
      drawCalls: 0,
      memoryUsage: 0
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
  }

  /**
   * 调整画布大小
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  resizeCanvas(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport = { x: 0, y: 0, width, height };
  }

  /**
   * 设置视口
   * @param {Object} viewport - 视口信息
   */
  setViewport(viewport) {
    this.viewport = { ...this.viewport, ...viewport };
  }

  /**
   * 获取合成器信息
   * @returns {Object} 合成器信息
   */
  getCompositorInfo() {
    return {
      stats: this.stats,
      viewport: this.viewport,
      enableTiling: this.enableTiling,
      enableRasterization: this.enableRasterization,
      tileSize: this.tileSize,
      tilingManager: this.tilingManager.getStats(),
      rasterizer: this.rasterizer.getStats()
    };
  }

  /**
   * 销毁合成器
   */
  dispose() {
    this.tilingManager.dispose();
    this.rasterizer.dispose();
    this.currentLayerTree = null;
  }
}