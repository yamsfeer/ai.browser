# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 monorepo 架构的简单浏览器内核实现项目，包含JavaScript引擎、渲染引擎和浏览器主引擎。项目采用模块化设计，使用TypeScript和JavaScript实现，用于教学和演示用途。

## 常用开发命令

### 包管理和构建
```bash
pnpm install                 # 安装所有依赖
pnpm build                  # 构建所有包
turbo run build             # 使用turbo构建所有包
pnpm clean                  # 清理所有构建产物
```

### 测试相关
```bash
npm test                    # 运行Vitest测试套件
npm run test:run           # 运行自定义测试脚本
npm run test:js            # 仅运行JavaScript引擎测试
npm run test:all           # 运行所有包的测试
```

### 开发和示例
```bash
npm run dev                 # 开发模式
```

### 代码质量
```bash
npm run lint                # 运行ESLint检查
npm run format              # 使用Prettier格式化代码
```

### 单独包命令
```bash
# 在特定包目录下
cd packages/js-engine
npm run test                # 运行该包的测试
npm run build               # 构建该包
npm run example             # 运行该包的示例
```

## 项目架构

### Monorepo结构
项目采用pnpm workspace管理monorepo，包含以下核心包：

- **packages/types** - 共享TypeScript类型定义
- **packages/js-engine** - JavaScript引擎，包含词法分析、语法分析、解释执行等
- **packages/render-engine** - 渲染引擎，负责Canvas绘制
- **packages/browser-engine** - 浏览器主引擎，协调所有子系统

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

### 测试架构
- 每个包都有独立的测试目录
- 使用Vitest的projects配置管理多包测试
- 测试文件命名规范：`*.test.js`
- 支持单元测试和集成测试
- 主要测试文件位于 `packages/*/test/` 目录

## 开发工作流

### 添加新功能
1. 确定功能属于哪个包
2. 在对应包的src目录下开发
3. 添加相应的测试用例
4. 运行 `pnpm build` 和 `npm test` 验证
5. 更新相关文档

### 调试技巧
- 使用BrowserEngine的enableDebug选项获取详细日志
- 各个解析器支持调试模式输出中间结果
- 浏览器控制台可查看渲染过程信息

### 性能考虑
- 这是教学实现，优先考虑代码清晰度而非性能
- 没有实现重绘、重排优化
- 每次渲染都是完整的重新计算

## 文件组织约定

### 源代码组织
- 每个包独立目录结构：src/, test/, examples/
- 主入口文件命名为index.js
- TypeScript源文件使用.ts扩展名
- 模块导出使用ES6语法

### 测试文件组织
- 测试文件放在各包的test/目录
- 测试文件命名规范：`[功能名].test.js`
- 示例文件放在examples/目录

### 配置文件
- 根目录包含全局配置：package.json, turbo.json, vitest.config.js
- 各包可有独立的package.json和tsconfig.json
- pnpm-workspace.yaml管理workspace配置

## 运行环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 现代浏览器支持ES6模块

## 常见问题

### 构建问题
- 确保使用 `pnpm install` 而非npm安装依赖
- 构建前运行 `pnpm clean` 清理缓存
- TypeScript错误请检查tsconfig.json配置

### 测试问题
- 使用Vitest而非Jest
- 测试环境配置为node
- 确保import路径正确使用workspace协议

### 运行示例
- JavaScript引擎示例可在Node.js中直接运行
- 各包的示例文件位于各自的 `examples/` 目录
- 注意CORS问题，使用本地服务器