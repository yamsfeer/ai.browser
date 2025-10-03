# AI Browser - 简单浏览器内核实现

这是一个基于 monorepo 架构的简单浏览器内核实现项目，包含JavaScript引擎、渲染引擎和浏览器主引擎。项目采用模块化设计，使用TypeScript和JavaScript实现，用于教学和演示用途。

## 🚀 功能特性

### 核心组件
- **JavaScript引擎** - 完整的JavaScript引擎实现，包含词法分析、语法分析、解释执行等
- **渲染引擎** - 基于Canvas的渲染引擎，支持HTML/CSS解析和绘制
- **浏览器引擎** - 协调所有子系统的主引擎
- **类型系统** - 共享的TypeScript类型定义

### 项目特性
- **Monorepo架构** - 使用pnpm workspace管理多个包
- **模块化设计** - 每个组件都可以独立使用和测试
- **TypeScript支持** - 完整的类型定义和类型安全
- **测试覆盖** - 使用Vitest进行单元测试和集成测试
- **现代化工具链** - Turbo、ESLint、Prettier等

## 📁 项目结构

```
ai.browser/
├── packages/
│   ├── types/                 # 共享TypeScript类型定义
│   ├── js-engine/            # JavaScript引擎
│   ├── render-engine/        # 渲染引擎
│   └── browser-engine/       # 浏览器主引擎
├── notes/                    # 技术文档和笔记
├── package.json              # 根package.json
├── pnpm-workspace.yaml       # pnpm workspace配置
├── turbo.json               # Turbo构建配置
└── vitest.config.js         # 测试配置
```

### 包结构说明

#### packages/js-engine
JavaScript引擎实现，包含：
- 词法分析器和语法分析器
- 执行上下文管理
- 解释器核心
- 垃圾回收机制
- 事件循环

#### packages/render-engine
渲染引擎实现，包含：
- HTML解析器
- CSS解析器
- 布局引擎
- 绘制上下文
- 合成器

#### packages/browser-engine
浏览器主引擎，负责：
- 协调各个子系统
- 管理页面生命周期
- 处理用户交互
- 提供浏览器API

## 🛠️ 安装和使用

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone git@github.com:yamsfeer/ai.browser.git
cd ai.browser

# 安装依赖
pnpm install
```

### 开发命令

```bash
# 构建所有包
pnpm build

# 运行测试
npm test

# 开发模式
npm run dev

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 使用JavaScript引擎

```javascript
import { JSEngine } from '@ai-browser/js-engine';

// 创建引擎实例
const engine = new JSEngine({
  enableDebug: true,
  enableJIT: true,
  memoryLimit: 50 * 1024 * 1024, // 50MB
  timeout: 10000 // 10秒
});

// 执行JavaScript代码
const result = await engine.execute(`
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  fibonacci(10);
`);

if (result.success) {
  console.log('执行结果:', result.result);
  console.log('统计信息:', result.stats);
} else {
  console.error('执行失败:', result.error);
}
```

### 使用渲染引擎

```javascript
import { RenderEngine } from '@ai-browser/render-engine';

// 创建渲染引擎实例
const renderEngine = new RenderEngine({
  canvas: document.getElementById('canvas'),
  width: 800,
  height: 600,
  enableDebug: true
});

// 渲染HTML内容
await renderEngine.render(`
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial; }
      h1 { color: #333; }
    </style>
  </head>
  <body>
    <h1>Hello, AI Browser!</h1>
    <p>这是一个简单的浏览器内核实现。</p>
  </body>
  </html>
`);
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定包的测试
cd packages/js-engine
npm run test

cd packages/render-engine
npm run test
```

## 🏗️ 架构设计

### 依赖关系
```
browser-engine
├── js-engine
├── render-engine
└── types (被所有包依赖)
```

### 构建系统
- 使用Turbo进行monorepo构建管理
- TypeScript编译为目标JavaScript
- Vitest作为测试框架
- ESLint + Prettier保证代码质量

## 🚨 限制和注意事项

1. **教学项目** - 这是教学实现，优先考虑代码清晰度而非性能
2. **功能限制** - 部分高级特性可能不完全支持
3. **性能限制** - 没有实现重绘、重排优化，每次渲染都是完整的重新计算
4. **兼容性** - 主要用于学习现代浏览器引擎的基本概念

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- ECMAScript 规范
- V8 引擎架构
- SpiderMonkey 引擎
- JavaScriptCore 引擎
- Node.js 项目

---

*这个项目是AI浏览器内核的JavaScript引擎实现，旨在展示现代JavaScript引擎的核心概念和架构。*