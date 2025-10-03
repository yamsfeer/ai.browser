# Browser Engine Package

浏览器引擎主模块，协调所有子系统完成网页渲染。

## 功能特性

- HTML 解析和 DOM 构建
- CSS 解析和样式计算
- 布局引擎处理盒模型
- Canvas 渲染输出
- JavaScript 引擎集成
- 事件系统支持

## 使用方法

```javascript
import { BrowserEngine } from '@ai-browser/browser-engine';

// 创建浏览器引擎实例
const engine = new BrowserEngine({
  viewportWidth: 800,
  viewportHeight: 600,
  enableDebug: true,
  enableJS: true
});

// 加载和渲染HTML
const result = await engine.loadHTML(html, css, canvas);

if (result.success) {
  console.log('页面加载成功', result.stats);
} else {
  console.error('页面加载失败', result.error);
}
```

## API 文档

### 构造函数

```javascript
new BrowserEngine(options)
```

参数：
- `options.viewportWidth`: 视口宽度，默认 800
- `options.viewportHeight`: 视口高度，默认 600
- `options.enableDebug`: 是否启用调试，默认 false
- `options.enableJS`: 是否启用JavaScript，默认 true

### 主要方法

#### loadHTML(html, css, canvas)

加载并渲染HTML内容。

#### resizeViewport(width, height)

调整视口大小。

#### rerender()

重新渲染当前页面。

#### getStats()

获取页面统计信息。

#### addEventListener(event, callback)

添加事件监听器。

#### removeEventListener(event, callback)

移除事件监听器。

## 事件

- `load`: 页面加载完成
- `error`: 加载错误
- `render`: 渲染完成
- `jserror`: JavaScript错误

## 依赖包

- @ai-browser/types: 类型定义
- @ai-browser/html-parser: HTML解析器
- @ai-browser/css-parser: CSS解析器
- @ai-browser/layout-engine: 布局引擎
- @ai-browser/render-engine: 渲染引擎
- @ai-browser/javascript-engine: JavaScript引擎