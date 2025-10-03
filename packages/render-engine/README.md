# Render Engine Package

现代化的浏览器内核渲染引擎，模拟Chrome合成器渲染管线，提供完整的Canvas 2D渲染功能。

## 🎯 功能特性

### 核心渲染管线
- **Layer Tree计算** - 智能分层和合成优化
- **Paint Record生成** - 高效的绘制记录管理
- **GPU光栅化** - 硬件加速的光栅化处理
- **合成器渲染** - 现代化的层合成显示

### 渲染能力
- Canvas 2D完整API支持
- 文本渲染和智能换行
- 背景色、渐变和边框渲染
- 图片和纹理支持
- CSS变换和动画效果
- 增量渲染优化

### 性能特性
- 分块渲染优化
- DrawQuad批处理
- 视口裁剪
- 内存管理优化
- 性能统计和调试

## 🚀 快速开始

```javascript
import { RenderEngine } from '@ai-browser/render-engine';

// 创建渲染引擎实例
const canvas = document.getElementById('canvas');
const renderEngine = new RenderEngine(canvas, {
  debug: false,              // 调试模式
  enableBatching: true,      // GPU批处理优化
  enableTiling: true,        // 分块渲染
  enableCompositingOptimization: true  // 合成优化
});

// 渲染布局树
const renderTree = layoutEngine.layout(domTree, cssRules);
const stats = renderEngine.render(renderTree);

console.log('渲染统计:', stats);
```

## 📖 详细使用

### 基础用法

```javascript
// 创建渲染引擎
const engine = new RenderEngine(canvas);

// 渲染布局树
const stats = engine.render(renderTree, {
  debug: true  // 开启调试模式
});

// 获取性能统计
const renderStats = engine.getStats();
console.log(`渲染时间: ${renderStats.totalRenderTime}ms`);
console.log(`Paint Records: ${renderStats.paintRecordsGenerated}`);
console.log(`GPU Draw Calls: ${renderStats.totalDrawCalls}`);
```

### 高级配置

```javascript
const engine = new RenderEngine(canvas, {
  // 调试选项
  debug: false,

  // Layer Tree计算配置
  enableCompositingOptimization: true,
  maxLayerCount: 1000,

  // Paint Record优化
  enableOptimizations: true,
  mergeSimilarRecords: true,
  cullInvisibleRecords: true,

  // GPU配置
  enableBatching: true,
  enableInstancing: false,
  maxDrawQuads: 10000,
  maxTextureSize: 4096,
  vramSize: 512 * 1024 * 1024, // 512MB

  // 合成器配置
  enableTiling: true,
  tileSize: 256,
  enableRasterization: true
});
```

### 增量渲染

```javascript
// 首次渲染
const initialStats = engine.render(initialRenderTree);

// 检测变化后进行增量渲染
const changes = detectTreeChanges(oldTree, newTree);
const dirtyRegions = calculateDirtyRegions(changes);

const incrementalStats = engine.incrementalRender(newRenderTree, dirtyRegions);
```

### 调试和性能分析

```javascript
// 开启调试模式
engine.setDebugMode(true);

// 获取渲染管线信息
const pipelineInfo = engine.getPipelineInfo();
console.log('Layer Tree统计:', pipelineInfo.layerTreeCalculator);
console.log('Paint Record统计:', pipelineInfo.paintRecordGenerator);
console.log('GPU统计:', pipelineInfo.compositor);
console.log('合成原因:', pipelineInfo.compositingReasons);

// 获取GPU详细信息
const gpuInfo = engine.gpuSimulator.getGPUInfo();
const gpuPerf = engine.gpuSimulator.getPerformanceStats();
```

## 📊 API 参考

### RenderEngine

#### 构造函数
```javascript
new RenderEngine(canvas, options)
```
- `canvas: HTMLCanvasElement` - 目标画布
- `options: Object` - 配置选项（见上文）

#### 核心方法
- `render(renderTree, options?)` - 完整渲染
  - 返回: `Object` 渲染统计信息
- `incrementalRender(renderTree, dirtyRegions?)` - 增量渲染
  - 返回: `Object` 渲染统计信息

#### 配置和管理
- `resizeCanvas(width, height)` - 调整画布大小
- `setDebugMode(enabled)` - 设置调试模式
- `getStats()` - 获取渲染统计
- `getPipelineInfo()` - 获取管线信息
- `getCurrentLayerTree()` - 获取当前层树

#### 资源管理
- `dispose()` - 销毁引擎，释放资源

### 统计信息

```javascript
{
  // 基础统计
  totalNodes: number,              // 总节点数
  paintRecordsGenerated: number,   // 生成的Paint Record数
  layersCreated: number,           // 创建的层数
  drawQuadsCreated: number,        // 创建的Draw Quad数
  tilesCreated: number,            // 创建的分块数

  // 性能统计
  totalRenderTime: number,         // 总渲染时间(ms)
  compositorTime: number,          // 合成器时间(ms)
  gpuTime: number,                 // GPU处理时间(ms)

  // 帧统计
  frameCount: number,              // 帧计数
  averageFrameTime: number,        // 平均帧时间(ms)

  // GPU统计
  totalDrawCalls: number,          // 总绘制调用数
  totalTriangles: number,          // 总三角形数
  totalPixels: number              // 总像素数
}
```

## 🏗️ 架构设计

### 文件结构

本项目的文件结构按照现代浏览器的线程架构组织，清晰地区分了不同线程的职责：

```
packages/render-engine/
├── src/
│   ├── main/             # 渲染主线程
│   │   ├── layer/         # 层相关（Layer Tree计算）
│   │   │   ├── Layer.js
│   │   │   └── LayerTreeCalculator.js
│   │   ├── paint/         # 绘制相关（Paint Records）
│   │   │   ├── PaintRecord.js
│   │   │   ├── PaintRecordGenerator.js
│   │   │   └── PaintContext.js
│   │   └── index.js       # 主线程模块导出
│   ├── compositor/        # 合成器线程
│   │   ├── tiling/        # 分块管理
│   │   │   └── TilingManager.js
│   │   ├── raster/        # 光栅化处理
│   │   │   └── Rasterizer.js
│   │   └── Compositor.js
│   ├── gpu/               # GPU线程
│   │   └── GPUSimulator.js
│   ├── RenderEngine.js    # 主引擎类
│   └── index.js           # 主入口文件
├── test/                  # 测试文件
├── examples/              # 示例代码
└── README.md              # 本文档
```

### 渲染管线架构

```
RenderEngine (主引擎)
├── LayerTreeCalculator (层树计算)
│   ├── 合成优化
│   ├── 层创建
│   └── 合并原因分析
├── PaintRecordGenerator (绘制记录生成)
│   ├── 记录生成
│   ├── 优化合并
│   └── 视口裁剪
├── GPUSimulator (GPU模拟器)
│   ├── DrawQuad管理
│   ├── 批处理
│   └── 光栅化
└── Compositor (合成器)
    ├── 分块管理
    ├── 光栅化缓存
    └── 最终合成
```

### 线程职责分工

#### 🖥️ 渲染主线程 (main/)
负责浏览器渲染的主要计算工作：

- **Layer**: 计算哪些元素需要独立的compositing层
- **Paint**: 为每个层生成绘制指令(Paint Records)
- **性能监控**: 监控整个渲染过程的性能

#### 🎭 合成器线程 (compositor/)
负责层的合成和光栅化工作：

- **Tiling**: 将层分割成固定大小的分块
- **Raster**: 将分块光栅化为像素缓冲区
- **Compositing**: 合成所有层，生成最终图像

#### 🚀 GPU线程 (gpu/)
负责最终的GPU渲染：

- **GPU模拟**: 模拟现代GPU的渲染管线
- **Draw Calls**: 批处理优化绘制指令
- **Shader支持**: 顶点和片段着色器模拟

### 渲染管线流程

```
HTML/CSS输入
    ↓
Layout Engine (其他包)
    ↓
Layer Tree Calculator (main/layer/)
    ↓
Paint Record Generator (main/paint/)
    ↓
Compositor (compositor/)
    ├─ Tiling Manager (compositor/tiling/)
    └─ Rasterizer (compositor/raster/)
    ↓
GPUSimulator (gpu/)
    ↓
最终像素输出
```

### 架构优势

1. **线程分离**: 清晰地模拟了现代浏览器的多线程架构
2. **职责明确**: 每个目录对应特定的线程职责
3. **扩展性**: 预留了layout等扩展空间
4. **教育价值**: 准确展示了浏览器的实际工作方式

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行集成测试
npx vitest run test/integration/render-engine.test.js

# 运行特定测试
npx vitest run test/render-engine.test.js
```

## 🔧 开发

### 构建和开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 格式化代码
pnpm format

# 代码检查
pnpm lint
```

### 调试技巧

1. **启用调试模式**查看详细的渲染管线日志
2. **使用管线信息**分析各模块性能
3. **检查GPU统计**了解硬件使用情况
4. **监控内存使用**防止资源泄漏

## 📈 性能优化建议

1. **启用批处理** - 减少GPU绘制调用
2. **使用分块渲染** - 处理大型页面
3. **启用合成优化** - 自动分层优化
4. **合理设置VRAM** - 根据设备配置
5. **监控帧率** - 保持60FPS目标

## 🐛 故障排除

### 常见问题

**Q: 渲染性能差**
A: 检查是否启用了GPU批处理和分块渲染，考虑优化层的创建策略

**Q: 内存占用高**
A: 定期调用dispose()清理资源，检查是否有内存泄漏

**Q: Node.js环境中报错**
A: 这是正常的，渲染引擎需要浏览器环境的Canvas API

## 🤝 贡献

欢迎提交Issue和Pull Request来改进渲染引擎！

## 📄 许可证

MIT License

## 🔗 相关模块

- `@ai-browser/layout-engine` - 布局计算
- `@ai-browser/html-parser` - HTML解析
- `@ai-browser/css-parser` - CSS解析
- `@ai-browser/javascript-engine` - JavaScript执行

---

**注意**: 这是一个教学性质的渲染引擎实现，用于演示现代浏览器的渲染原理。性能优化优先考虑代码清晰度而非极致性能。