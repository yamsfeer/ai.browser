/**
 * GPU模拟器
 * 模拟现代GPU的渲染管线，包括顶点处理、光栅化和像素处理
 */

export class DrawQuad {
  constructor(options = {}) {
    // 几何信息
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.size = options.size || { width: 100, height: 100 };
    this.transform = options.transform || [1, 0, 0, 1, 0, 0]; // 2D变换矩阵

    // 材质属性
    this.texture = options.texture || null;
    this.color = options.color || 'rgba(255, 255, 255, 1)';
    this.opacity = options.opacity || 1.0;

    // 渲染状态
    this.blendMode = options.blendMode || 'source-over';
    this.shader = options.shader || 'default';
    this.clipRect = options.clipRect || null;

    // 性能标记
    this.visible = options.visible !== false;
    this.needsUpdate = true;
    this.gpuHandle = null;

    // 统计信息
    this.drawCallCount = 0;
    this.lastDrawTime = 0;
  }

  /**
   * 检查Quad是否与视口相交
   * @param {Object} viewport - 视口
   * @returns {boolean} 是否相交
   */
  intersectsViewport(viewport) {
    const bounds = this.getBounds();
    return !(bounds.x > viewport.x + viewport.width ||
             bounds.x + bounds.width < viewport.x ||
             bounds.y > viewport.y + viewport.height ||
             bounds.y + bounds.height < viewport.y);
  }

  /**
   * 获取Quad的边界框
   * @returns {Object} 边界框
   */
  getBounds() {
    const [a, b, c, d, e, f] = this.transform;
    const x = this.position.x;
    const y = this.position.y;
    const w = this.size.width;
    const h = this.size.height;

    // 计算四个角的变换后位置
    const corners = [
      { x: x * a + y * c + e, y: x * b + y * d + f },
      { x: (x + w) * a + y * c + e, y: (x + w) * b + y * d + f },
      { x: (x + w) * a + (y + h) * c + e, y: (x + w) * b + (y + h) * d + f },
      { x: x * a + (y + h) * c + e, y: x * b + (y + h) * d + f }
    ];

    // 计算包围盒
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 计算屏幕空间坐标
   * @param {Object} viewport - 视口
   * @returns {Array<number>} 屏幕坐标数组
   */
  getScreenCoordinates(viewport) {
    const bounds = this.getBounds();
    const [a, b, c, d, e, f] = this.transform;

    // 生成两个三角形的顶点（构成一个矩形）
    return [
      // 第一个三角形
      bounds.x, bounds.y,
      bounds.x + bounds.width, bounds.y,
      bounds.x, bounds.y + bounds.height,
      // 第二个三角形
      bounds.x + bounds.width, bounds.y,
      bounds.x + bounds.width, bounds.y + bounds.height,
      bounds.x, bounds.y + bounds.height
    ];
  }

  /**
   * 获取纹理坐标
   * @returns {Array<number>} 纹理坐标数组
   */
  getTextureCoordinates() {
    return [
      // 第一个三角形
      0, 0, 1, 0, 0, 1,
      // 第二个三角形
      1, 0, 1, 1, 0, 1
    ];
  }

  /**
   * 标记需要更新
   */
  markDirty() {
    this.needsUpdate = true;
  }

  /**
   * 获取DrawQuad信息
   * @returns {Object} DrawQuad信息
   */
  getInfo() {
    return {
      position: this.position,
      size: this.size,
      opacity: this.opacity,
      blendMode: this.blendMode,
      visible: this.visible,
      hasTexture: !!this.texture,
      drawCallCount: this.drawCallCount
    };
  }
}

export class GPUSimulator {
  constructor(options = {}) {
    // 模拟GPU配置
    this.maxDrawQuads = options.maxDrawQuads || 10000;
    this.maxTextureSize = options.maxTextureSize || 4096;
    this.enableBatching = options.enableBatching !== false;
    this.enableInstancing = options.enableInstancing || false;

    // 渲染状态
    this.drawQuads = [];
    this.textures = new Map();
    this.shaders = new Map();
    this.renderTargets = [];

    // 模拟GPU内存
    this.vramSize = options.vramSize || 512 * 1024 * 1024; // 512MB
    this.usedVRAM = 0;

    // 命令缓冲区
    this.commandBuffer = [];
    this.isProcessing = false;

    // 统计信息
    this.stats = {
      totalDrawCalls: 0,
      totalQuads: 0,
      totalTriangles: 0,
      totalPixels: 0,
      frameTime: 0,
      gpuTime: 0,
      memoryUsage: 0,
      textureSwaps: 0,
      shaderSwitches: 0,
      batchCount: 0
    };

    // 性能优化
    this.currentBatch = {
      quads: [],
      shader: 'default',
      texture: null,
      blendMode: 'source-over'
    };

    // 初始化默认着色器
    this.initializeDefaultShaders();
  }

  /**
   * 初始化默认着色器
   */
  initializeDefaultShaders() {
    // 顶点着色器
    this.shaders.set('vertex', {
      type: 'vertex',
      source: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        uniform mat3 u_transform;
        varying vec2 v_texCoord;

        void main() {
          vec3 transformed = u_transform * vec3(a_position, 1.0);
          gl_Position = vec4(transformed.xy, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `
    });

    // 片段着色器
    this.shaders.set('default', {
      type: 'fragment',
      source: `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        uniform float u_opacity;
        varying vec2 v_texCoord;

        void main() {
          vec4 texel = texture2D(u_texture, v_texCoord);
          gl_FragColor = texel * u_color * u_opacity;
        }
      `
    });

    // 纯色着色器
    this.shaders.set('solid', {
      type: 'fragment',
      source: `
        precision mediump float;
        uniform vec4 u_color;
        uniform float u_opacity;

        void main() {
          gl_FragColor = u_color * u_opacity;
        }
      `
    });
  }

  /**
   * 创建DrawQuad
   * @param {Object} options - Quad选项
   * @returns {DrawQuad} DrawQuad对象
   */
  createDrawQuad(options = {}) {
    const quad = new DrawQuad(options);
    this.drawQuads.push(quad);
    return quad;
  }

  /**
   * 提交绘制命令到GPU
   * @param {DrawQuad} quad - DrawQuad对象
   */
  submitDrawQuad(quad) {
    if (!quad.visible) {
      return;
    }

    // 检查是否需要批处理
    if (this.enableBatching && this.canBatchWithCurrent(quad)) {
      this.currentBatch.quads.push(quad);
    } else {
      // 提交当前批次
      this.flushCurrentBatch();

      // 开始新批次
      this.currentBatch = {
        quads: [quad],
        shader: quad.shader,
        texture: quad.texture,
        blendMode: quad.blendMode
      };
    }
  }

  /**
   * 检查是否可以与当前批次一起处理
   * @param {DrawQuad} quad - DrawQuad对象
   * @returns {boolean} 是否可以批处理
   */
  canBatchWithCurrent(quad) {
    if (this.currentBatch.quads.length === 0) {
      return false;
    }

    return this.currentBatch.shader === quad.shader &&
           this.currentBatch.texture === quad.texture &&
           this.currentBatch.blendMode === quad.blendMode;
  }

  /**
   * 提交当前批次
   */
  flushCurrentBatch() {
    if (this.currentBatch.quads.length === 0) {
      return;
    }

    // 生成绘制命令
    const drawCommand = {
      type: 'batch',
      quads: [...this.currentBatch.quads],
      shader: this.currentBatch.shader,
      texture: this.currentBatch.texture,
      blendMode: this.currentBatch.blendMode
    };

    this.commandBuffer.push(drawCommand);
    this.stats.batchCount++;

    // 清空当前批次
    this.currentBatch.quads = [];
  }

  /**
   * 渲染帧
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {Object} viewport - 视口
   * @returns {Object} 渲染统计信息
   */
  renderFrame(context, viewport) {
    const startTime = performance.now();
    this.resetFrameStats();

    // 提交所有需要更新的DrawQuad
    for (const quad of this.drawQuads) {
      if (quad.needsUpdate && quad.intersectsViewport(viewport)) {
        this.submitDrawQuad(quad);
      }
    }

    // 提交最后的批次
    this.flushCurrentBatch();

    // 处理命令缓冲区
    this.processCommandBuffer(context, viewport);

    // 更新统计信息
    this.stats.frameTime = performance.now() - startTime;
    this.stats.gpuTime = this.stats.frameTime * 0.7; // 假设GPU占总时间的70%
    this.stats.memoryUsage = this.usedVRAM;

    return this.stats;
  }

  /**
   * 处理命令缓冲区
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {Object} viewport - 视口
   */
  processCommandBuffer(context, viewport) {
    this.isProcessing = true;

    try {
      for (const command of this.commandBuffer) {
        this.executeDrawCommand(context, command, viewport);
      }
    } finally {
      this.commandBuffer = [];
      this.isProcessing = false;
    }
  }

  /**
   * 执行绘制命令
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {Object} command - 绘制命令
   * @param {Object} viewport - 视口
   */
  executeDrawCommand(context, command, viewport) {
    switch (command.type) {
      case 'batch':
        this.executeBatchDraw(context, command, viewport);
        break;
      default:
        console.warn('Unknown command type:', command.type);
    }
  }

  /**
   * 执行批处理绘制
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {Object} command - 批处理命令
   * @param {Object} viewport - 视口
   */
  executeBatchDraw(context, command, viewport) {
    if (command.quads.length === 0) {
      return;
    }

    // 设置混合模式
    context.globalCompositeOperation = command.blendMode;

    // 绑定着色器（模拟）
    this.bindShader(command.shader);

    // 绑定纹理（模拟）
    if (command.texture) {
      this.bindTexture(command.texture);
    }

    // 绘制所有Quad
    for (const quad of command.quads) {
      this.drawSingleQuad(context, quad, viewport);
    }

    // 更新统计信息
    this.stats.totalDrawCalls++;
    this.stats.totalQuads += command.quads.length;
    this.stats.totalTriangles += command.quads.length * 2; // 每个Quad = 2个三角形

    // 计算像素数（简化）
    const totalPixels = command.quads.reduce((sum, quad) => {
      const bounds = quad.getBounds();
      const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, viewport.x + viewport.width) - Math.max(bounds.x, viewport.x));
      const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, viewport.y + viewport.height) - Math.max(bounds.y, viewport.y));
      return sum + visibleWidth * visibleHeight;
    }, 0);
    this.stats.totalPixels += totalPixels;
  }

  /**
   * 绘制单个Quad
   * @param {CanvasRenderingContext2D} context - Canvas上下文
   * @param {DrawQuad} quad - DrawQuad对象
   * @param {Object} viewport - 视口
   */
  drawSingleQuad(context, quad, viewport) {
    context.save();

    // 应用变换
    const [a, b, c, d, e, f] = quad.transform;
    context.transform(a, b, c, d, e, f);

    // 设置透明度
    context.globalAlpha *= quad.opacity;

    // 应用裁剪
    if (quad.clipRect) {
      context.beginPath();
      context.rect(quad.clipRect.x, quad.clipRect.y, quad.clipRect.width, quad.clipRect.height);
      context.clip();
    }

    // 绘制
    if (quad.texture) {
      // 绘制纹理
      context.drawImage(quad.texture, 0, 0, quad.size.width, quad.size.height);
    } else {
      // 绘制纯色
      context.fillStyle = quad.color;
      context.fillRect(0, 0, quad.size.width, quad.size.height);
    }

    context.restore();

    // 更新Quad统计
    quad.drawCallCount++;
    quad.lastDrawTime = performance.now();
    quad.needsUpdate = false;
  }

  /**
   * 绑定着色器（模拟）
   * @param {string} shaderName - 着色器名称
   */
  bindShader(shaderName) {
    if (this.currentShader !== shaderName) {
      this.currentShader = shaderName;
      this.stats.shaderSwitches++;
    }
  }

  /**
   * 绑定纹理（模拟）
   * @param {*} texture - 纹理对象
   */
  bindTexture(texture) {
    if (this.currentTexture !== texture) {
      this.currentTexture = texture;
      this.stats.textureSwaps++;
    }
  }

  /**
   * 创建纹理
   * @param {*} imageData - 图像数据
   * @returns {*} 纹理对象
   */
  createTexture(imageData) {
    const textureId = `texture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 估算纹理内存使用
    const textureSize = imageData.width * imageData.height * 4; // RGBA
    this.usedVRAM += textureSize;

    const texture = {
      id: textureId,
      width: imageData.width,
      height: imageData.height,
      data: imageData,
      size: textureSize
    };

    this.textures.set(textureId, texture);
    return texture;
  }

  /**
   * 删除纹理
   * @param {*} texture - 纹理对象
   */
  deleteTexture(texture) {
    if (texture && this.textures.has(texture.id)) {
      this.usedVRAM -= texture.size;
      this.textures.delete(texture.id);
    }
  }

  /**
   * 创建渲染目标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {*} 渲染目标对象
   */
  createRenderTarget(width, height) {
    const renderTarget = {
      id: `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      width,
      height,
      framebuffer: this.createOffscreenCanvas(width, height)
    };

    this.renderTargets.push(renderTarget);
    return renderTarget;
  }

  /**
   * 创建离屏Canvas
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {HTMLCanvasElement} 离屏Canvas
   */
  createOffscreenCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * 获取GPU信息
   * @returns {Object} GPU信息
   */
  getGPUInfo() {
    return {
      maxDrawQuads: this.maxDrawQuads,
      maxTextureSize: this.maxTextureSize,
      vramSize: this.vramSize,
      usedVRAM: this.usedVRAM,
      availableVRAM: this.vramSize - this.usedVRAM,
      textureCount: this.textures.size,
      shaderCount: this.shaders.size,
      renderTargetCount: this.renderTargets.length,
      enableBatching: this.enableBatching,
      enableInstancing: this.enableInstancing
    };
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    const avgTrianglesPerDraw = this.stats.totalDrawCalls > 0
      ? (this.stats.totalTriangles / this.stats.totalDrawCalls).toFixed(2)
      : 0;

    const avgPixelsPerTriangle = this.stats.totalTriangles > 0
      ? (this.stats.totalPixels / this.stats.totalTriangles).toFixed(2)
      : 0;

    return {
      ...this.stats,
      avgTrianglesPerDraw,
      avgPixelsPerTriangle,
      batchEfficiency: this.stats.totalQuads > 0
        ? (this.stats.batchCount / this.stats.totalQuads * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 重置帧统计信息
   */
  resetFrameStats() {
    this.stats = {
      totalDrawCalls: 0,
      totalQuads: 0,
      totalTriangles: 0,
      totalPixels: 0,
      frameTime: 0,
      gpuTime: 0,
      memoryUsage: this.usedVRAM,
      textureSwaps: 0,
      shaderSwitches: 0,
      batchCount: 0
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 删除所有纹理
    for (const texture of this.textures.values()) {
      this.deleteTexture(texture);
    }

    // 清空DrawQuad
    this.drawQuads = [];

    // 清空渲染目标
    this.renderTargets = [];

    // 重置状态
    this.commandBuffer = [];
    this.currentBatch.quads = [];
    this.usedVRAM = 0;
  }

  /**
   * 销毁GPU模拟器
   */
  dispose() {
    this.cleanup();
    this.shaders.clear();
  }
}