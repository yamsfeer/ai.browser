/**
 * 光栅化器
 * 将分块转换为像素缓冲区，模拟GPU光栅化过程
 */

export class RasterBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = null;
    this.canvas = null;
    this.context = null;

    // 创建离屏Canvas用于光栅化
    this.createBuffer();
  }

  /**
   * 创建缓冲区
   */
  createBuffer() {
    // 在Node.js环境中创建模拟Canvas
    if (typeof document === 'undefined') {
      // 模拟Canvas对象用于Node.js环境
      this.canvas = {
        width: this.width,
        height: this.height,
        getContext: (type) => {
          if (type === '2d') {
            return {
              fillStyle: '#000000',
              strokeStyle: '#000000',
              lineWidth: 1,
              globalAlpha: 1,
              globalCompositeOperation: 'source-over',
              font: '16px serif',
              textAlign: 'left',
              textBaseline: 'top',
              save: () => {},
              restore: () => {},
              clearRect: () => {},
              fillRect: () => {},
              strokeRect: () => {},
              fillText: () => {},
              strokeText: () => {},
              beginPath: () => {},
              moveTo: () => {},
              lineTo: () => {},
              stroke: () => {},
              transform: () => {},
              setTransform: () => {},
              getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
              putImageData: () => {},
              createImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) })
            };
          }
          return null;
        }
      };
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.context = this.canvas.getContext('2d');

    // 创建像素数据数组
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  /**
   * 清空缓冲区
   */
  clear() {
    if (this.context) {
      this.context.clearRect(0, 0, this.width, this.height);
    }
    if (this.data) {
      this.data.fill(0);
    }
  }

  /**
   * 从Canvas获取像素数据
   */
  updatePixelData() {
    if (this.context && this.data) {
      const imageData = this.context.getImageData(0, 0, this.width, this.height);
      this.data.set(imageData.data);
    }
  }

  /**
   * 获取Canvas元素
   * @returns {HTMLCanvasElement} Canvas元素
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * 获取2D上下文
   * @returns {CanvasRenderingContext2D} 2D上下文
   */
  getContext() {
    return this.context;
  }

  /**
   * 获取像素数据
   * @returns {Uint8ClampedArray} 像素数据
   */
  getPixelData() {
    this.updatePixelData();
    return this.data;
  }

  /**
   * 销毁缓冲区
   */
  dispose() {
    if (this.context) {
      this.context.clearRect(0, 0, this.width, this.height);
    }
    this.canvas = null;
    this.context = null;
    this.data = null;
  }
}

export class Rasterizer {
  constructor(options = {}) {
    // 配置选项
    this.enableCaching = options.enableCaching !== false;
    this.maxCacheSize = options.maxCacheSize || 100 * 1024 * 1024; // 100MB
    this.enableAntiAliasing = options.enableAntiAliasing !== false;
    this.enableSubpixelRendering = options.enableSubpixelRendering || false;

    // 缓存管理
    this.rasterCache = new Map(); // key: tile signature, value: RasterBuffer
    this.currentCacheSize = 0;

    // 光栅化队列
    this.rasterQueue = [];
    this.isRasterizing = false;

    // 统计信息
    this.stats = {
      totalRasterizations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
      totalRasterTime: 0,
      averageRasterTime: 0,
      pixelsRasterized: 0
    };

    // 性能优化
    this.workerPool = [];
    this.maxWorkers = options.maxWorkers || Math.min(4, navigator.hardwareConcurrency || 2);

    // 初始化Worker池
    this.initializeWorkerPool();
  }

  /**
   * 初始化Worker池
   */
  initializeWorkerPool() {
    // 简化实现：在实际应用中，这里会创建Web Workers
    // 由于我们是教学实现，使用主线程模拟
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workerPool.push({
        id: i,
        busy: false,
        rasterize: (tile, callback) => {
          // 模拟异步光栅化
          setTimeout(() => {
            const result = this.rasterizeSync(tile);
            callback(result);
          }, 0);
        }
      });
    }
  }

  /**
   * 光栅化分块
   * @param {Object} tile - 分块对象
   * @returns {Promise<RasterBuffer>} 光栅化结果
   */
  async rasterizeTile(tile) {
    const startTime = performance.now();

    try {
      // 检查缓存
      if (this.enableCaching) {
        const cachedBuffer = this.getCachedRasterBuffer(tile);
        if (cachedBuffer) {
          this.stats.cacheHits++;
          tile.rasterizedContent = cachedBuffer.getCanvas();
          tile.markClean();
          return cachedBuffer;
        }
      }

      this.stats.cacheMisses++;

      // 异步光栅化
      const rasterBuffer = await this.rasterizeAsync(tile);

      // 缓存结果
      if (this.enableCaching && rasterBuffer) {
        this.cacheRasterBuffer(tile, rasterBuffer);
      }

      // 更新分块
      tile.rasterizedContent = rasterBuffer.getCanvas();
      tile.markClean();

      // 更新统计信息
      this.updateRasterStats(startTime, tile);

      return rasterBuffer;

    } catch (error) {
      console.error('Rasterizer: 光栅化失败', error);
      return null;
    }
  }

  /**
   * 同步光栅化（用于主线程实现）
   * @param {Object} tile - 分块对象
   * @returns {RasterBuffer} 光栅化结果
   */
  rasterizeSync(tile) {
    const rasterBuffer = new RasterBuffer(tile.width, tile.height);
    const context = rasterBuffer.getContext();

    // 清空缓冲区
    context.clearRect(0, 0, tile.width, tile.height);

    // 设置抗锯齿
    context.imageSmoothingEnabled = this.enableAntiAliasing;
    context.imageSmoothingQuality = 'high';

    // 应用变换
    context.save();

    // 计算分块相对于层的位置
    const relativeBounds = tile.getRelativeBounds();
    context.translate(-relativeBounds.x, -relativeBounds.y);

    // 应用层的变换
    if (tile.layer.transform) {
      context.setTransform(...tile.layer.transform);
    }

    // 应用层的透明度
    context.globalAlpha *= tile.layer.opacity;

    // 应用裁剪
    if (tile.layer.clipRect) {
      context.beginPath();
      context.rect(
        tile.layer.clipRect.x - relativeBounds.x,
        tile.layer.clipRect.y - relativeBounds.y,
        tile.layer.clipRect.width,
        tile.layer.clipRect.height
      );
      context.clip();
    }

    // 绘制Paint Records
    this.rasterizePaintRecords(context, tile.layer, relativeBounds);

    // 恢复状态
    context.restore();

    return rasterBuffer;
  }

  /**
   * 异步光栅化
   * @param {Object} tile - 分块对象
   * @returns {Promise<RasterBuffer>} 光栅化结果
   */
  async rasterizeAsync(tile) {
    return new Promise((resolve) => {
      // 寻找空闲的Worker
      const availableWorker = this.workerPool.find(worker => !worker.busy);

      if (availableWorker) {
        availableWorker.busy = true;
        availableWorker.rasterize(tile, (result) => {
          availableWorker.busy = false;
          resolve(result);
        });
      } else {
        // 没有可用Worker，在主线程中执行
        const result = this.rasterizeSync(tile);
        resolve(result);
      }
    });
  }

  /**
   * 光栅化Paint Records
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {Layer} layer - 层
   * @param {Object} viewport - 视口
   */
  rasterizePaintRecords(context, layer, viewport) {
    for (const record of layer.paintRecords) {
      if (record.visible && this.isRecordInViewport(record, viewport)) {
        // 调整记录的坐标到分块坐标系
        const originalBounds = record.bounds;
        record.bounds = {
          x: originalBounds.x - viewport.x,
          y: originalBounds.y - viewport.y,
          width: originalBounds.width,
          height: originalBounds.height
        };

        // 执行绘制
        record.execute(context);

        // 恢复原始坐标
        record.bounds = originalBounds;
      }
    }
  }

  /**
   * 检查记录是否在视口内
   * @param {PaintRecord} record - 绘制记录
   * @param {Object} viewport - 视口
   * @returns {boolean} 是否在视口内
   */
  isRecordInViewport(record, viewport) {
    return !(record.bounds.x > viewport.x + viewport.width ||
             record.bounds.x + record.bounds.width < viewport.x ||
             record.bounds.y > viewport.y + viewport.height ||
             record.bounds.y + record.bounds.height < viewport.y);
  }

  /**
   * 生成分块的缓存签名
   * @param {Object} tile - 分块对象
   * @returns {string} 缓存签名
   */
  generateTileSignature(tile) {
    // 简化实现：使用层ID、分块坐标和内容哈希
    const contentHash = this.calculateLayerContentHash(tile.layer);
    return `${tile.layer.id}_${tile.tileX}_${tile.tileY}_${contentHash}`;
  }

  /**
   * 计算层内容哈希
   * @param {Layer} layer - 层
   * @returns {string} 内容哈希
   */
  calculateLayerContentHash(layer) {
    // 简化实现：基于Paint Records的数量和类型生成哈希
    let hash = layer.paintRecords.length.toString();
    for (const record of layer.paintRecords) {
      hash += `_${record.type}`;
    }
    return hash;
  }

  /**
   * 获取缓存的光栅化缓冲区
   * @param {Object} tile - 分块对象
   * @returns {RasterBuffer|null} 缓存的缓冲区
   */
  getCachedRasterBuffer(tile) {
    const signature = this.generateTileSignature(tile);
    return this.rasterCache.get(signature) || null;
  }

  /**
   * 缓存光栅化缓冲区
   * @param {Object} tile - 分块对象
   * @param {RasterBuffer} buffer - 光栅化缓冲区
   */
  cacheRasterBuffer(tile, buffer) {
    const signature = this.generateTileSignature(tile);
    const bufferSize = buffer.width * buffer.height * 4; // 4字节每像素

    // 检查缓存大小限制
    if (this.currentCacheSize + bufferSize > this.maxCacheSize) {
      this.evictLeastRecentlyUsed(bufferSize);
    }

    // 添加到缓存
    this.rasterCache.set(signature, buffer);
    this.currentCacheSize += bufferSize;
  }

  /**
   * 驱逐最近最少使用的缓存项
   * @param {number} requiredSize - 需要的空间大小
   */
  evictLeastRecentlyUsed(requiredSize) {
    // 简化的LRU实现
    const entries = Array.from(this.rasterCache.entries());
    let freedSpace = 0;

    for (const [signature, buffer] of entries) {
      if (freedSpace >= requiredSize) {
        break;
      }

      const bufferSize = buffer.width * buffer.height * 4;
      this.rasterCache.delete(signature);
      this.currentCacheSize -= bufferSize;
      freedSpace += bufferSize;
      this.stats.cacheEvictions++;
    }
  }

  /**
   * 批量光栅化分块
   * @param {Array<Object>} tiles - 分块数组
   * @returns {Promise<Array<RasterBuffer>>} 光栅化结果数组
   */
  async rasterizeTiles(tiles) {
    const startTime = performance.now();

    // 并行光栅化
    const promises = tiles.map(tile => this.rasterizeTile(tile));
    const results = await Promise.all(promises);

    // 更新统计信息
    this.stats.totalRasterizations += tiles.length;
    this.stats.pixelsRasterized += tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0);

    return results;
  }

  /**
   * 更新光栅化统计信息
   * @param {number} startTime - 开始时间
   * @param {Object} tile - 分块对象
   */
  updateRasterStats(startTime, tile) {
    const rasterTime = performance.now() - startTime;
    this.stats.totalRasterizations++;
    this.stats.totalRasterTime += rasterTime;
    this.stats.pixelsRasterized += tile.width * tile.height;

    // 计算平均光栅化时间
    this.stats.averageRasterTime = this.stats.totalRasterTime / this.stats.totalRasterizations;
  }

  /**
   * 预热缓存
   * @param {Array<Object>} tiles - 分块数组
   */
  async warmupCache(tiles) {
    // 按优先级排序
    tiles.sort((a, b) => b.priority - a.priority);

    // 光栅化高优先级的分块
    const highPriorityTiles = tiles.slice(0, Math.min(10, tiles.length));
    await this.rasterizeTiles(highPriorityTiles);
  }

  /**
   * 清空缓存
   */
  clearCache() {
    for (const buffer of this.rasterCache.values()) {
      buffer.dispose();
    }
    this.rasterCache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const cacheHitRate = this.stats.cacheHits + this.stats.cacheMisses > 0
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      cacheHitRate: `${cacheHitRate}%`,
      currentCacheSize: this.currentCacheSize,
      cacheUtilization: `${(this.currentCacheSize / this.maxCacheSize * 100).toFixed(2)}%`,
      cachedBuffers: this.rasterCache.size,
      availableWorkers: this.workerPool.filter(w => !w.busy).length,
      totalWorkers: this.workerPool.length
    };
  }

  /**
   * 获取光栅化队列状态
   * @returns {Object} 队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.rasterQueue.length,
      isRasterizing: this.isRasterizing,
      busyWorkers: this.workerPool.filter(w => w.busy).length
    };
  }

  /**
   * 设置抗锯齿
   * @param {boolean} enabled - 是否启用抗锯齿
   */
  setAntiAliasing(enabled) {
    this.enableAntiAliasing = enabled;
  }

  /**
   * 设置子像素渲染
   * @param {boolean} enabled - 是否启用子像素渲染
   */
  setSubpixelRendering(enabled) {
    this.enableSubpixelRendering = enabled;
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRasterizations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
      totalRasterTime: 0,
      averageRasterTime: 0,
      pixelsRasterized: 0
    };
  }

  /**
   * 销毁光栅化器
   */
  dispose() {
    this.clearCache();
    this.workerPool = [];
    this.rasterQueue = [];
    this.isRasterizing = false;
  }
}