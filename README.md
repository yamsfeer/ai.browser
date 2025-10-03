# AI浏览器内核 - JavaScript引擎

这是一个完整的JavaScript引擎实现，包含了现代JavaScript引擎的所有核心组件。

## 🚀 功能特性

### 核心组件
- **词法分析器 (Lexer)** - 支持完整的ECMAScript语法，包括ES6+特性
- **语法分析器 (Parser)** - 递归下降解析算法，生成抽象语法树(AST)
- **执行上下文管理** - 完整的词法环境和变量环境管理
- **函数调用栈管理** - 调用帧管理和性能分析
- **解释器核心** - AST执行引擎，支持所有JavaScript语法
- **垃圾回收机制** - 标记-清除算法，自动内存管理
- **事件循环** - 微任务和宏任务队列管理
- **JIT编译器** - 热点检测和代码优化(简化实现)

### 高级特性
- **完整的事件系统** - 支持异步编程和回调
- **插件系统** - 可扩展的模块化架构
- **性能监控** - 详细的执行统计和内存分析
- **错误处理** - 完整的异常捕获和堆栈跟踪
- **配置管理** - 灵活的引擎参数设置

### 支持的语法特性
- ✅ 变量声明 (var, let, const)
- ✅ 函数声明和表达式
- ✅ 箭头函数
- ✅ 类和继承
- ✅ 模板字符串
- ✅ 解构赋值
- ✅ 扩展操作符
- ✅ Promise和异步函数
- ✅ 生成器函数
- ✅ 严格模式
- ✅ 条件语句 (if/else, switch)
- ✅ 循环语句 (for, while, do/while)
- ✅ 异常处理 (try/catch/finally)
- ✅ 对象和数组操作
- ✅ 内置对象和函数

## 📁 项目结构

```
src/js/
├── types/                     # 类型系统
│   ├── ValueType.js           # JavaScript值类型
│   ├── TokenType.js           # 词法单元类型
│   ├── ASTNodeType.js        # AST节点类型
│   ├── ExecutionContext.js    # 执行上下文类型
│   └── index.js              # 类型系统导出
├── lexer/                    # 词法分析器
│   ├── Lexer.js              # 主词法分析器
│   ├── TokenStream.js        # Token流处理
│   └── index.js              # 词法分析器导出
├── parser/                   # 语法分析器
│   ├── Parser.js              # 主语法分析器
│   ├── ASTBuilder.js         # AST构建工具
│   └── index.js              # 语法分析器导出
├── execution/               # 执行环境
│   ├── ExecutionContextManager.js # 执行上下文管理
│   ├── CallStack.js          # 函数调用栈管理
│   └── index.js              # 执行环境导出
├── interpreter/             # 解释器
│   ├── Interpreter.js        # 主解释器
│   └── index.js              # 解释器导出
└── JSEngine.js              # 主引擎类
```

## 🛠️ 安装和使用

### 基本使用

```javascript
import { JSEngine } from './src/js/JSEngine.js';

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

### 高级配置

```javascript
const engine = new JSEngine({
  // 基础配置
  enableDebug: true,
  strictMode: false,

  // 性能配置
  enableJIT: true,
  enableGarbageCollection: true,
  enableEventLoop: true,
  memoryLimit: 100 * 1024 * 1024, // 100MB
  gcThreshold: 10 * 1024 * 1024, // 10MB
  timeout: 30000, // 30秒

  // 功能配置
  enablePromise: true,
  enableAsyncAwait: true,
  maxCallStackSize: 1000
});
```

### 事件监听

```javascript
// 添加事件监听器
engine.addEventListener('start', (data) => {
  console.log('引擎启动:', data);
});

engine.addEventListener('complete', (data) => {
  console.log('执行完成:', data);
});

engine.addEventListener('error', (data) => {
  console.error('引擎错误:', data);
});
```

## 📊 性能监控

引擎提供了详细的性能监控功能：

```javascript
// 获取引擎状态
const state = engine.getState();
console.log('引擎状态:', state);

// 获取统计信息
const stats = engine.getStats();
console.log('统计信息:', {
  执行时间: stats.runningTime + 'ms',
  内存使用: stats.memoryUsed + 'bytes',
  函数执行次数: stats.functionsExecuted,
  垃圾回收次数: stats.garbageCollections,
  调用栈深度: stats.callStack.currentDepth,
  错误数量: stats.errors
});
```

## 🧪 测试

运行测试套件：

```bash
# 运行JavaScript引擎测试
npm run test:js

# 运行所有测试
npm test
```

## 🎯 演示

查看演示页面：

```bash
# 打开高级演示页面
npm run example:js

# 或直接在浏览器中打开
open examples/advanced-js-demo.html
```

## 🔧 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `enableDebug` | boolean | false | 启用调试模式 |
| `strictMode` | boolean | false | 启用严格模式 |
| `enableJIT` | boolean | false | 启用JIT编译 |
| `enableGarbageCollection` | boolean | true | 启用垃圾回收 |
| `enableEventLoop` | boolean | true | 启用事件循环 |
| `enablePromise` | boolean | true | 启用Promise支持 |
| `enableAsyncAwait` | boolean | false | 启用Async/Await |
| `memoryLimit` | number | 50MB | 内存限制 |
| `gcThreshold` | number | 10MB | 垃圾回收阈值 |
| `timeout` | number | 5000 | 执行超时(ms) |
| `maxCallStackSize` | number | 1000 | 最大调用栈深度 |

## 🏗️ 架构设计

### 执行流程
1. **词法分析** - 将源代码转换为Token流
2. **语法分析** - 将Token流转换为AST
3. **AST验证** - 验证AST的正确性
4. **执行准备** - 设置执行上下文
5. **解释执行** - 执行AST节点
6. **异步处理** - 处理异步任务和事件循环
7. **垃圾回收** - 自动内存管理

### 组件关系
```
JSEngine (主引擎)
├── Lexer (词法分析器)
├── Parser (语法分析器)
├── ExecutionContextManager (执行上下文管理)
├── CallStackManager (调用栈管理)
├── Interpreter (解释器)
├── GarbageCollector (垃圾回收)
├── EventLoop (事件循环)
└── JITCompiler (JIT编译器)
```

## 🚨 限制和注意事项

1. **性能限制** - 作为教学实现，性能不如生产引擎
2. **功能限制** - 部分高级特性可能不完全支持
3. **内存限制** - 需要合理设置内存限制
4. **超时限制** - 长时间运行代码可能被终止
5. **兼容性限制** - 可能不支持所有ES6+特性

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