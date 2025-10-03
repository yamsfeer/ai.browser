# 使用说明

## 快速开始

### 1. 基本用法

```javascript
import { BrowserEngine } from './src/index.js';

// 创建浏览器引擎实例
const browser = new BrowserEngine({
  viewportWidth: 800,
  viewportHeight: 600,
  enableDebug: true
});

// 准备HTML和CSS
const html = `
  <html>
    <head><title>测试页面</title></head>
    <body>
      <h1>欢迎使用浏览器内核</h1>
      <p>这是一个简单的浏览器内核实现。</p>
    </body>
  </html>
`;

const css = `
  body { font-family: Arial; margin: 20px; }
  h1 { color: blue; font-size: 24px; }
  p { color: black; line-height: 1.6; }
`;

// 创建Canvas元素
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

// 加载并渲染页面
browser.loadHTML(html, css, canvas)
  .then(result => {
    console.log('渲染完成:', result);
  });
```

### 2. 在浏览器中使用

将以下代码添加到HTML文件中：

```html
<!DOCTYPE html>
<html>
<head>
    <title>浏览器内核演示</title>
</head>
<body>
    <canvas id="canvas" width="800" height="600" style="border: 1px solid #ccc;"></canvas>

    <script type="module">
        import { BrowserEngine } from './src/index.js';

        const browser = new BrowserEngine();
        const canvas = document.getElementById('canvas');

        browser.loadHTML(html, css, canvas);
    </script>
</body>
</html>
```

### 3. 事件监听

```javascript
// 监听页面加载完成事件
browser.addEventListener('load', (event) => {
    console.log('页面加载完成:', event.data);
    console.log('统计信息:', event.data.stats);
});

// 监听错误事件
browser.addEventListener('error', (error) => {
    console.error('渲染错误:', error);
});

// 监听渲染事件
browser.addEventListener('render', (event) => {
    console.log('重新渲染完成:', event.data);
});
```

### 4. 重新渲染

```javascript
// 重新渲染当前页面
browser.rerender();

// 调整视口大小
browser.resizeViewport(1024, 768);
```

### 5. 查询元素

```javascript
// 查询所有匹配的元素
const elements = browser.querySelectorAll('div.content');
console.log('找到元素:', elements.length);

// 获取页面统计信息
const stats = browser.getStats();
console.log('页面统计:', stats);
```

## 支持的功能

### HTML支持
- 基本HTML标签（div, p, h1-h6, span, ul, ol, li等）
- 属性支持（id, class, src等）
- 自闭合标签（img, br等）
- 文本节点

### CSS支持
- 基本选择器（标签、类、ID、通用选择器）
- 基本属性（color, background-color, font-size, margin, padding等）
- 盒模型
- 样式继承

### 布局支持
- 块级元素布局
- 行内元素布局
- 基本的盒模型计算
- margin、padding、border

### 渲染支持
- Canvas渲染
- 文本渲染
- 背景色渲染
- 边框渲染
- 基本的图像渲染

## 项目结构

```
src/
├── html/          # HTML解析器
│   ├── Node.js           # DOM节点基类
│   ├── Element.js        # 元素节点
│   ├── Text.js          # 文本节点
│   ├── Document.js      # 文档节点
│   ├── HTMLTokenizer.js # HTML词法分析器
│   └── HTMLParser.js    # HTML解析器
├── css/           # CSS解析器
│   ├── CSSRule.js       # CSS规则
│   ├── CSSTokenizer.js  # CSS词法分析器
│   ├── CSSParser.js     # CSS解析器
│   └── StyleCalculator.js # 样式计算器
├── layout/        # 布局引擎
│   ├── BoxModel.js      # 盒模型
│   └── LayoutEngine.js  # 布局引擎
├── render/        # 渲染引擎
│   └── RenderEngine.js # 渲染引擎
├── browser/       # 浏览器引擎
│   └── BrowserEngine.js # 主引擎类
└── index.js       # 主入口
```

## 运行示例

### 1. 基础示例
```bash
# 在浏览器中打开
open examples/demo.html
```

### 2. 运行测试
```bash
npm test
```

## 性能考虑

这个浏览器内核是一个教学和演示用途的实现，性能方面：

1. **简化实现** - 为了清晰易懂，省略了很多优化
2. **内存管理** - 没有复杂的内存管理机制
3. **渲染优化** - 没有实现重绘、重排等优化
4. **JavaScript执行** - 没有JavaScript引擎支持

## 扩展功能

可以通过以下方式扩展功能：

1. **添加更多HTML标签支持**
2. **增强CSS选择器支持**
3. **实现Flexbox/Grid布局**
4. **添加JavaScript引擎**
5. **实现网络请求支持**
6. **添加更多渲染效果**

## 调试

启用调试模式：

```javascript
const browser = new BrowserEngine({
  enableDebug: true
});
```

调试信息会在控制台输出，帮助你了解渲染过程。