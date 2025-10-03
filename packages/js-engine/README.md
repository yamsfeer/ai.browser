# AI Browser JavaScript Engine

这是一个完整的JavaScript引擎实现，作为AI Browser项目的核心组件。

## 功能特性

- **完整的词法分析器** - 支持ECMAScript标准
- **语法解析器** - 生成AST抽象语法树
- **解释器** - 执行JavaScript代码
- **JIT编译器** - 实时优化编译
- **垃圾回收器** - 自动内存管理
- **事件循环** - 异步执行支持
- **调用栈管理** - 函数调用跟踪
- **执行上下文** - 作用域管理

## 快速开始

### 安装

```bash
npm install @ai-browser/javascript-engine
```

### 基本使用

```typescript
import { JavaScriptEngine } from '@ai-browser/javascript-engine';

// 创建引擎实例
const engine = new JavaScriptEngine();

// 执行代码
const result = engine.evaluate('const x = 10; x + 20;');
console.log(result); // 30

// 异步执行
engine.evaluateAsync('Promise.resolve(42)').then(result => {
  console.log(result); // 42
});
```

### 快捷函数

```typescript
import { evaluate, createEngine } from '@ai-browser/javascript-engine';

// 使用快捷函数
const result = evaluate('2 + 2');
console.log(result); // 4

// 创建自定义引擎
const customEngine = createEngine({
  debugMode: true,
  strictMode: true
});
```

## API 文档

### JavaScriptEngine

主要的引擎类，提供完整的JavaScript执行环境。

#### 构造函数

```typescript
new JavaScriptEngine(config?: EngineConfig)
```

#### 主要方法

- `evaluate(code: string, filename?: string): any` - 执行JavaScript代码
- `evaluateAsync(code: string, filename?: string): Promise<any>` - 异步执行代码
- `compile(code: string): CompiledCode` - 编译代码
- `optimize(code: string): OptimizedCode` - 优化代码

### 核心组件

#### Lexer

词法分析器，将源代码转换为token流。

```typescript
import { Lexer } from '@ai-browser/javascript-engine';

const lexer = new Lexer('const x = 10;');
const tokens = lexer.tokenize();
```

#### Parser

语法解析器，将token流转换为AST。

```typescript
import { Parser } from '@ai-browser/javascript-engine';

const parser = new Parser(lexer);
const ast = parser.parse();
```

#### Interpreter

解释器，执行AST。

```typescript
import { Interpreter } from '@ai-browser/javascript-engine';

const interpreter = new Interpreter(contextManager);
const result = interpreter.interpret(ast);
```

## 配置选项

```typescript
interface EngineConfig {
  maxStackSize?: number;        // 最大调用栈大小
  gcThreshold?: number;         // 垃圾回收阈值
  jitEnabled?: boolean;         // 是否启用JIT编译
  debugMode?: boolean;          // 调试模式
  memoryLimit?: number;         // 内存限制
  enableSourceMaps?: boolean;   // 是否启用源码映射
  strictMode?: boolean;         // 严格模式
  enableWebAssembly?: boolean;  // WebAssembly支持
  maxExecutionTime?: number;    // 最大执行时间
}
```

## 示例

### 基本示例

```typescript
import { JavaScriptEngine } from '@ai-browser/javascript-engine';

const engine = new JavaScriptEngine({
  debugMode: true,
  strictMode: true
});

// 执行复杂代码
const code = `
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  fibonacci(10);
`;

const result = engine.evaluate(code);
console.log(`Fibonacci(10) = ${result}`);
```

### 异步示例

```typescript
import { JavaScriptEngine } from '@ai-browser/javascript-engine';

const engine = new JavaScriptEngine();

const asyncCode = `
  async function fetchData() {
    return new Promise(resolve => {
      setTimeout(() => resolve('数据已加载'), 1000);
    });
  }

  fetchData();
`;

engine.evaluateAsync(asyncCode).then(result => {
  console.log(result); // '数据已加载'
});
```

## 性能监控

```typescript
import { PerformanceMonitor, JavaScriptEngine } from '@ai-browser/javascript-engine';

const monitor = new PerformanceMonitor();
const engine = new JavaScriptEngine();

// 执行代码并监控性能
const startTime = performance.now();
const result = engine.evaluate('1 + 1');
const endTime = performance.now();

monitor.recordMetric('execution-time', endTime - startTime);
console.log(`执行时间: ${monitor.getAverage('execution-time')}ms`);
```

## 开发

### 构建项目

```bash
# 安装依赖
npm install

# 构建TypeScript
npm run build

# 运行测试
npm test

# 运行示例
npm run example
```

### 项目结构

```
packages/javascript-engine/
├── src/
│   ├── types/           # 类型定义
│   ├── lexer/           # 词法分析器
│   ├── parser/          # 语法解析器
│   ├── interpreter/     # 解释器
│   ├── execution/       # 执行上下文
│   ├── memory/          # 内存管理
│   ├── runtime/         # 运行时组件
│   ├── compiler/        # JIT编译器
│   ├── utils/           # 工具函数
│   ├── engine.ts        # 主引擎类
│   └── index.ts         # 主入口文件
├── examples/            # 示例代码
├── dist/                # 编译输出
└── package.json
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License