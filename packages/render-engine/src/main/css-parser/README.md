# CSS Parser Engine

CSS解析器引擎包，提供CSS规则解析、词法分析和样式计算功能。

## 功能特性

- **CSS词法分析** - 将CSS文本转换为token流
- **CSS规则解析** - 解析CSS规则和选择器
- **样式计算** - 计算元素的最终样式，包括继承和默认值
- **选择器匹配** - 支持标签、类、ID、属性和通用选择器

## 安装

```bash
npm install @browser-engine/css-parser
```

## 使用方法

### 基本用法

```javascript
import { CSSParser, StyleCalculator } from '@browser-engine/css-parser';

// 解析CSS
const parser = new CSSParser();
const cssText = `
  body { margin: 0; padding: 0; }
  .container { width: 100%; }
  #header { background: #f0f0f0; }
`;
const rules = parser.parse(cssText);

// 计算样式
const calculator = new StyleCalculator();
const element = { tagName: 'DIV', classList: ['container'] };
const styles = calculator.calculateStyles(element, rules);
console.log(styles); // { display: 'block', width: '100%', ... }
```

### API文档

#### CSSParser

```javascript
const parser = new CSSParser();
const rules = parser.parse(cssText);
```

**方法:**
- `parse(cssText)` - 解析CSS文本，返回CSSRule数组

#### StyleCalculator

```javascript
const calculator = new StyleCalculator();
const styles = calculator.calculateStyles(element, cssRules);
```

**方法:**
- `calculateStyles(element, cssRules)` - 计算元素的最终样式

#### CSSRule

```javascript
const rule = new CSSRule(selectors, declarations);
const matches = rule.matches(element);
```

**方法:**
- `matches(element)` - 检查规则是否匹配指定元素

#### CSSTokenizer

```javascript
const tokenizer = new CSSTokenizer();
const tokens = tokenizer.tokenize(cssText);
```

**方法:**
- `tokenize(css)` - 将CSS文本转换为token数组

## 支持的选择器

- 标签选择器: `div`, `p`, `span`
- 类选择器: `.container`, `.active`
- ID选择器: `#header`, `#main`
- 属性选择器: `[disabled]`, `[type="text"]`
- 通用选择器: `*`

## 样式计算优先级

1. User Agent样式（浏览器默认样式）
2. 作者样式（CSS文件中的样式）
3. 内联样式（元素style属性）
4. 继承样式（从父元素继承）
5. 默认值

## 开发

```bash
# 运行测试
npm test

# 构建包
npm run build
```

## 许可证

MIT