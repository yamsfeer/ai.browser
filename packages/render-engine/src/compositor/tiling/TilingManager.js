/**
 * 分块管理器
 * 将层分割成固定大小的分块，用于增量渲染和内存优化
 */

export class Tile {
  constructor(x, y, width, height, layer, tileX, tileY) {
    // 分块位置和尺寸
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    // 所属层信息
    this.layer = layer;
    this.tileX = tileX; // 在层中的分块坐标
    this.tileY = tileY;

    // 光栅化相关
    this.rasterizedContent = null;
    this.needsRasterization = true;
    this.lastRasterizedTime = 0;

    // 优化属性
    this.priority = 0;
    this.isVisible = true;
    this.isDirty = true;

    // 统计信息
    this.accessCount = 0;
    this.lastAccessTime = 0;
  }

  /**
   * 标记分块为脏
   */
  markDirty() {
    this.isDirty = true;
    this.needsRasterization = true;
  }

  /**
   * 标记分块为干净
   */
  markClean() {
    this.isDirty = false;
    this.needsRasterization = false;
    this.lastRasterizedTime = performance.now();
  }

  /**
   * 检查分块是否与区域重叠
   * @param {Object} rect - 区域
   * @returns {boolean} 是否重叠
   */
  intersectsRect(rect) {
    return !(this.x > rect.x + rect.width ||
             rect.x > this.x + this.width ||
             this.y > rect.y + rect.height ||
             rect.y > this.y + this.height);
  }

  /**
   * 获取分块的相对坐标（相对于层）
   * @returns {Object} 相对坐标
   */
  getRelativeBounds() {
    return {
      x: this.x - this.layer.bounds.x,
      y: this.y - this.layer.bounds.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * 计算优先级
   * @param {Object} viewport - 视口
   */
  calculatePriority(viewport) {
    // 距离视口中心越近优先级越高
    const viewportCenterX = viewport.x + viewport.width / 2;
    const viewportCenterY = viewport.y + viewport.height / 2;
    const tileCenterX = this.x + this.width / 2;
    const tileCenterY = this.y + this.height / 2;

    const distance = Math.sqrt(
      Math.pow(tileCenterX - viewportCenterX, 2) +
      Math.pow(tileCenterY - viewportCenterY, 2)
    );

    this.priority = 1000 - distance; // 距离越近优先级越高
  }

  /**
   * 访问分块
   */
  access() {
    this.accessCount++;
    this.lastAccessTime = performance.now();
  }

  /**
   * 销毁分块
   */
  dispose() {
    if (this.rasterizedContent) {
      // 如果是Canvas元素，释放资源
      if (this.rasterizedContent.width) {
        const tempCanvas = this.rasterizedContent;
        const tempContext = tempCanvas.getContext('2d');
        tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      this.rasterizedContent = null;
    }
  }

  /**
   * 获取分块信息
   * @returns {Object} 分块信息
   */
  getInfo() {
    return {
      position: { x: this.x, y: this.y },
      size: { width: this.width, height: this.height },
      tileCoords: { x: this.tileX, y: this.tileY },
      layerId: this.layer.id,
      isDirty: this.isDirty,
      needsRasterization: this.needsRasterization,
      priority: this.priority,
      accessCount: this.accessCount
    };
  }
}

export class TilingManager {
  constructor(options = {}) {
    this.tileSize = options.tileSize || 256;
    this.maxTiles = options.maxTiles || 1000;

    // 分块存储
    this.tiles = new Map(); // key: "layerId_tileX_tileY"
    this.layerTiles = new Map(); // key: layerId, value: Set of tile keys

    // LRU缓存管理
    this.tileAccessOrder = [];
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB
    this.currentMemoryUsage = 0;

    // 统计信息
    this.stats = {
      totalTilesCreated: 0,
      totalTilesDestroyed: 0,
      tilesEvicted: 0,
      memoryUsage: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 为层生成分块
   * @param {Layer} layer - 层
   * @param {Object} viewport - 视口
   * @returns {Array<Tile>} 分块数组
   */
  generateTilesForLayer(layer, viewport) {
    const tiles = [];
    const bounds = layer.absoluteBounds || layer.bounds;

    // 计算分块范围
    const startX = Math.floor(bounds.x / this.tileSize) * this.tileSize;
    const startY = Math.floor(bounds.y / this.tileSize) * this.tileSize;
    const endX = Math.ceil((bounds.x + bounds.width) / this.tileSize) * this.tileSize;
    const endY = Math.ceil((bounds.y + bounds.height) / this.tileSize) * this.tileSize;

    // 生成分块
    for (let y = startY; y < endY; y += this.tileSize) {
      for (let x = startX; x < endX; x += this.tileSize) {
        const tile = this.getOrCreateTile(x, y, layer);

        // 计算优先级
        tile.calculatePriority(viewport);

        // 检查是否需要更新
        if (layer.needsRepaint || this.shouldUpdateTile(tile, layer)) {
          tile.markDirty();
        }

        tiles.push(tile);
      }
    }

    // 清理不再需要的分块
    this.cleanupUnusedTiles(layer);

    return tiles;
  }

  /**
   * 获取或创建分块
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {Layer} layer - 层
   * @returns {Tile} 分块
   */
  getOrCreateTile(x, y, layer) {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const key = `${layer.id}_${tileX}_${tileY}`;

    // 检查缓存
    if (this.tiles.has(key)) {
      const tile = this.tiles.get(key);
      tile.access();
      this.stats.cacheHits++;
      return tile;
    }

    // 创建新分块
    const tileWidth = Math.min(this.tileSize, layer.bounds.x + layer.bounds.width - x);
    const tileHeight = Math.min(this.tileSize, layer.bounds.y + layer.bounds.height - y);

    const tile = new Tile(x, y, tileWidth, tileHeight, layer, tileX, tileY);

    // 添加到缓存
    this.tiles.set(key, tile);

    // 更新层分块映射
    if (!this.layerTiles.has(layer.id)) {
      this.layerTiles.set(layer.id, new Set());
    }
    this.layerTiles.get(layer.id).add(key);

    // 更新访问顺序
    this.updateTileAccessOrder(tile);

    // 更新统计信息
    this.stats.totalTilesCreated++;
    this.stats.cacheMisses++;
    this.currentMemoryUsage += this.estimateTileMemoryUsage(tile);

    // 检查内存限制
    this.enforceMemoryLimit();

    return tile;
  }

  /**
   * 检查是否需要更新分块
   * @param {Tile} tile - 分块
   * @param {Layer} layer - 层
   * @returns {boolean} 是否需要更新
   */
  shouldUpdateTile(tile, layer) {
    if (tile.isDirty) {
      return true;
    }

    // 检查层的脏区域
    if (layer.dirtyRegion && tile.intersectsRect(layer.dirtyRegion)) {
      return true;
    }

    return false;
  }

  /**
   * 清理未使用的分块
   * @param {Layer} layer - 层
   */
  cleanupUnusedTiles(layer) {
    const layerTileKeys = this.layerTiles.get(layer.id);
    if (!layerTileKeys) {
      return;
    }

    const bounds = layer.absoluteBounds || layer.bounds;
    const startX = Math.floor(bounds.x / this.tileSize) * this.tileSize;
    const startY = Math.floor(bounds.y / this.tileSize) * this.tileSize;
    const endX = Math.ceil((bounds.x + bounds.width) / this.tileSize) * this.tileSize;
    const endY = Math.ceil((bounds.y + bounds.height) / this.tileSize) * this.tileSize;

    // 收集需要删除的分块
    const tilesToRemove = [];
    for (const key of layerTileKeys) {
      const tile = this.tiles.get(key);
      if (tile) {
        // 检查分块是否还在层范围内
        if (tile.x < startX || tile.x >= endX || tile.y < startY || tile.y >= endY) {
          tilesToRemove.push(key);
        }
      }
    }

    // 删除分块
    for (const key of tilesToRemove) {
      this.removeTile(key);
    }
  }

  /**
   * 移除分块
   * @param {string} key - 分块键
   */
  removeTile(key) {
    const tile = this.tiles.get(key);
    if (tile) {
      // 释放资源
      tile.dispose();

      // 从缓存中移除
      this.tiles.delete(key);

      // 从层映射中移除
      if (this.layerTiles.has(tile.layer.id)) {
        this.layerTiles.get(tile.layer.id).delete(key);
        if (this.layerTiles.get(tile.layer.id).size === 0) {
          this.layerTiles.delete(tile.layer.id);
        }
      }

      // 从访问顺序中移除
      const accessIndex = this.tileAccessOrder.indexOf(tile);
      if (accessIndex !== -1) {
        this.tileAccessOrder.splice(accessIndex, 1);
      }

      // 更新统计信息
      this.stats.totalTilesDestroyed++;
      this.currentMemoryUsage -= this.estimateTileMemoryUsage(tile);
    }
  }

  /**
   * 更新分块访问顺序
   * @param {Tile} tile - 分块
   */
  updateTileAccessOrder(tile) {
    // 移除旧位置
    const oldIndex = this.tileAccessOrder.indexOf(tile);
    if (oldIndex !== -1) {
      this.tileAccessOrder.splice(oldIndex, 1);
    }

    // 添加到末尾（最新访问）
    this.tileAccessOrder.push(tile);
  }

  /**
   * 强制执行内存限制
   */
  enforceMemoryLimit() {
    while (this.currentMemoryUsage > this.maxMemoryUsage && this.tileAccessOrder.length > 0) {
      // 移除最久未使用的分块（LRU）
      const oldestTile = this.tileAccessOrder.shift();
      const key = `${oldestTile.layer.id}_${oldestTile.tileX}_${oldestTile.tileY}`;

      if (this.tiles.has(key)) {
        this.removeTile(key);
        this.stats.tilesEvicted++;
      }
    }
  }

  /**
   * 估算分块内存使用量
   * @param {Tile} tile - 分块
   * @returns {number} 内存使用量（字节）
   */
  estimateTileMemoryUsage(tile) {
    // 简化计算：假设每个像素4字节（RGBA）
    return tile.width * tile.height * 4;
  }

  /**
   * 获取视口内的分块
   * @param {Object} viewport - 视口
   * @returns {Array<Tile>} 视口内的分块
   */
  getTilesInViewport(viewport) {
    const viewportTiles = [];

    for (const tile of this.tiles.values()) {
      if (tile.intersectsRect(viewport)) {
        tile.calculatePriority(viewport);
        viewportTiles.push(tile);
      }
    }

    // 按优先级排序
    viewportTiles.sort((a, b) => b.priority - a.priority);

    return viewportTiles;
  }

  /**
   * 标记层的所有分块为脏
   * @param {string} layerId - 层ID
   */
  markLayerTilesDirty(layerId) {
    const layerTileKeys = this.layerTiles.get(layerId);
    if (layerTileKeys) {
      for (const key of layerTileKeys) {
        const tile = this.tiles.get(key);
        if (tile) {
          tile.markDirty();
        }
      }
    }
  }

  /**
   * 清理层的所有分块
   * @param {string} layerId - 层ID
   */
  clearLayerTiles(layerId) {
    const layerTileKeys = this.layerTiles.get(layerId);
    if (layerTileKeys) {
      const keysToRemove = Array.from(layerTileKeys);
      for (const key of keysToRemove) {
        this.removeTile(key);
      }
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentTileCount: this.tiles.size,
      currentMemoryUsage: this.currentMemoryUsage,
      memoryUtilization: (this.currentMemoryUsage / this.maxMemoryUsage * 100).toFixed(2) + '%',
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 获取分块详情
   * @returns {Array<Object>} 分块详情数组
   */
  getTileDetails() {
    const details = [];

    for (const tile of this.tiles.values()) {
      details.push(tile.getInfo());
    }

    return details;
  }

  /**
   * 清理所有分块
   */
  clearAllTiles() {
    for (const key of Array.from(this.tiles.keys())) {
      this.removeTile(key);
    }

    this.tiles.clear();
    this.layerTiles.clear();
    this.tileAccessOrder = [];
    this.currentMemoryUsage = 0;
  }

  /**
   * 销毁分块管理器
   */
  dispose() {
    this.clearAllTiles();
  }
}