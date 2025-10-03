# HTML Parser Engine

HTML解析器引擎包，提供HTML词法分析、语法解析和DOM节点构建功能。

## 功能特性

- **HTML词法分析**: 将HTML字符串转换为标记流
- **HTML语法解析**: 构建DOM树结构
- **DOM节点操作**: 提供完整的DOM节点类和操作方法
- **属性处理**: 支持元素属性设置和获取
- **文本内容**: 支持文本节点和textContent属性

## 安装

```bash
npm install @browser-engine/html-parser
```

## 使用方法

### 基本解析

```javascript
import { HTMLParser } from '@browser-engine/html-parser';

const parser = new HTMLParser();
const document = parser.parse('<html><body><div id="test">Hello World</div></body></html>');

console.log(document.documentElement.tagName); // 'HTML'
console.log(document.getElementById('test').textContent); // 'Hello World'
```

### 使用DOM节点类

```javascript
import { Document, Element, Text, Node } from '@browser-engine/html-parser';

// 创建文档
const document = new Document();

// 创建元素
const div = document.createElement('div');
div.setAttribute('id', 'myDiv');
div.className = 'container';

// 创建文本节点
const text = document.createTextNode('Hello World');

// 构建DOM树
div.appendChild(text);
document.documentElement.appendChild(div);
```

### 使用词法分析器

```javascript
import { HTMLTokenizer } from '@browser-engine/html-parser';

const tokenizer = new HTMLTokenizer();
const tokens = tokenizer.tokenize('<div class="test">Content</div>');

// tokens将包含解析后的标记
// [
//   { type: 'startTag', tagName: 'div', attributes: { class: 'test' } },
//   { type: 'text', value: 'Content' },
//   { type: 'endTag', tagName: 'div' }
// ]
```

## API参考

### HTMLParser

主要的HTML解析类。

#### 方法

- `parse(html)`: 解析HTML字符串并返回Document对象
- `buildTree(tokens)`: 从标记数组构建DOM树

### HTMLTokenizer

HTML词法分析器，将HTML字符串转换为标记流。

#### 方法

- `tokenize(html)`: 将HTML字符串转换为标记数组

### DOM节点类

#### Node

DOM节点基类。

- `appendChild(child)`: 添加子节点
- `removeChild(child)`: 移除子节点
- `insertBefore(newChild, referenceChild)`: 在指定节点前插入子节点

#### Element

元素节点类，继承自Node。

- `setAttribute(name, value)`: 设置属性
- `getAttribute(name)`: 获取属性
- `hasAttribute(name)`: 检查属性是否存在
- `removeAttribute(name)`: 移除属性
- `id`: 获取/设置元素ID
- `className`: 获取/设置元素类名
- `classList`: 类名列表操作
- `textContent`: 获取/设置元素文本内容

#### Text

文本节点类，继承自Node。

- `data`: 文本内容
- `nodeValue`: 节点值
- `textContent`: 文本内容

#### Document

文档节点类，继承自Node。

- `createElement(tagName)`: 创建元素节点
- `createTextNode(data)`: 创建文本节点
- `getElementById(id)`: 通过ID获取元素
- `getElementsByTagName(tagName)`: 通过标签名获取元素数组

## 依赖

- `@browser-engine/core`: 核心功能包

## 许可证

MIT