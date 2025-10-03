import { HTMLParser } from '@ai-browser/html-parser';
import { CSSParser, StyleCalculator } from '@ai-browser/css-parser';
import { LayoutEngine } from '@ai-browser/layout-engine';
import { RenderEngine } from '@ai-browser/render-engine';
import { JSEngine } from '@ai-browser/javascript-engine';

// 浏览器引擎主类
export class BrowserEngine {
  constructor(options = {}) {
    this.options = {
      viewportWidth: options.viewportWidth || 800,
      viewportHeight: options.viewportHeight || 600,
      enableDebug: options.enableDebug || false,
      enableJS: options.enableJS || true // 默认启用JavaScript
    };

    // 初始化各个组件
    this.htmlParser = new HTMLParser();
    this.cssParser = new CSSParser();
    this.styleCalculator = new StyleCalculator();
    this.layoutEngine = new LayoutEngine(
      this.options.viewportWidth,
      this.options.viewportHeight
    );
    this.renderEngine = null;
    this.currentDocument = null;
    this.currentRenderTree = null;

    // 初始化JavaScript引擎
    this.jsEngine = null;
    if (this.options.enableJS) {
      this.jsEngine = new JSEngine({
        enableDebug: this.options.enableDebug
      });
      this.setupJSEngine();
    }

    // 事件系统
    this.eventListeners = {
      load: [],
      error: [],
      render: [],
      jserror: []
    };
  }

  /**
   * 设置JavaScript引擎
   */
  setupJSEngine() {
    if (!this.jsEngine) return;

    // 设置错误处理器
    this.jsEngine.setErrorHandler((error) => {
      this.error('JavaScript执行错误:', error);
      this.emit('jserror', error);
    });

    // 启动事件循环
    this.jsEngine.startEventLoop();

    this.log('JavaScript引擎设置完成');
  }

  /**
   * 设置JavaScript引擎的DOM对象
   */
  setJSDOMObjects() {
    if (!this.jsEngine || !this.currentDocument) return;

    // 创建简化的DOM API
    const documentAPI = this.createDocumentAPI();
    const windowAPI = this.createWindowAPI();

    this.jsEngine.setDOMObjects(documentAPI, windowAPI);
  }

  /**
   * 创建文档API
   * @returns {Object} - 文档API对象
   */
  createDocumentAPI() {
    const engine = this;

    return {
      // 获取元素
      getElementById: (id) => {
        return this.findElementById(id);
      },

      querySelector: (selector) => {
        const elements = this.querySelectorAll(selector);
        return elements[0] || null;
      },

      querySelectorAll: (selector) => {
        return this.querySelectorAll(selector);
      },

      // 创建元素
      createElement: (tagName) => {
        return {
          tagName: tagName.toUpperCase(),
          nodeType: 1,
          childNodes: [],
          attributes: {},
          style: {},
          classList: [],
          id: '',
          innerHTML: '',
          textContent: '',

          // DOM方法
          setAttribute: function(name, value) {
            this.attributes[name] = value;
            if (name === 'id') this.id = value;
            if (name === 'class') {
              this.classList = value.split(' ').filter(c => c);
            }
          },

          getAttribute: function(name) {
            return this.attributes[name];
          },

          appendChild: function(child) {
            this.childNodes.push(child);
          },

          addEventListener: function(event, handler) {
            // 简化的事件监听
            this._events = this._events || {};
            this._events[event] = this._events[event] || [];
            this._events[event].push(handler);
          },

          removeEventListener: function(event, handler) {
            if (this._events && this._events[event]) {
              const index = this._events[event].indexOf(handler);
              if (index > -1) {
                this._events[event].splice(index, 1);
              }
            }
          },

          click: function() {
            // 简化的点击事件
            if (this._events && this._events.click) {
              this._events.click.forEach(handler => {
                try {
                  handler({ type: 'click', target: this });
                } catch (error) {
                  engine.error('点击事件处理失败:', error);
                }
              });
            }
          }
        };
      },

      // 文档属性
      body: this.currentDocument ? this.currentDocument.body : null,
      head: this.currentDocument ? this.currentDocument.head : null,
      title: ''
    };
  }

  /**
   * 创建窗口API
   * @returns {Object} - 窗口API对象
   */
  createWindowAPI() {
    const engine = this;

    return {
      // 视口信息
      innerWidth: this.options.viewportWidth,
      innerHeight: this.options.viewportHeight,
      outerWidth: this.options.viewportWidth,
      outerHeight: this.options.viewportHeight,

      // 窗口方法
      alert: (message) => {
        console.log('[Alert]', message);
      },

      confirm: (message) => {
        console.log('[Confirm]', message);
        return true; // 简化实现，总是返回true
      },

      setTimeout: (callback, delay, ...args) => {
        return this.jsEngine.setTimeout(callback, delay, ...args);
      },

      setInterval: (callback, delay, ...args) => {
        return this.jsEngine.setInterval(callback, delay, ...args);
      },

      clearTimeout: (timerId) => {
        return this.jsEngine.clearTimeout(timerId);
      },

      clearInterval: (intervalId) => {
        return this.jsEngine.clearInterval(intervalId);
      },

      // 添加事件监听
      addEventListener: (event, handler) => {
        this.addEventListener(event, handler);
      },

      removeEventListener: (event, handler) => {
        this.removeEventListener(event, handler);
      },

      // 浏览器API
      location: {
        href: 'about:blank',
        reload: () => {
          engine.log('页面重新加载');
          if (engine.currentDocument) {
            engine.rerender();
          }
        }
      },

      // 导航
      history: {
        length: 1,
        back: () => engine.log('历史记录后退'),
        forward: () => engine.log('历史记录前进'),
        go: (delta) => engine.log(`历史记录跳转: ${delta}`)
      }
    };
  }

  /**
   * 查找元素ByID
   * @param {string} id - 元素ID
   * @returns {Object|null} - 找到的元素
   */
  findElementById(id) {
    if (!this.currentDocument) return null;

    const traverse = (element) => {
      if (element.nodeType === 1 && element.id === id) {
        return element;
      }

      for (const child of element.childNodes) {
        const result = traverse(child);
        if (result) return result;
      }

      return null;
    };

    return traverse(this.currentDocument);
  }

  /**
   * 执行JavaScript代码
   * @param {string} code - JavaScript代码
   * @param {Object} context - 执行上下文
   * @returns {*} - 执行结果
   */
  executeJavaScript(code, context = {}) {
    if (!this.jsEngine) {
      this.warn('JavaScript引擎未启用');
      return null;
    }

    this.log('执行JavaScript代码:', code.substring(0, 100) + '...');

    try {
      return this.jsEngine.execute(code, context);
    } catch (error) {
      this.error('JavaScript执行失败:', error);
      this.emit('jserror', error);
      throw error;
    }
  }

  /**
   * 加载并渲染HTML内容
   * @param {string} html - HTML内容
   * @param {string} css - CSS样式内容
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @returns {Promise<Object>} - 渲染结果
   */
  async loadHTML(html, css = '', canvas) {
    try {
      // 1. 解析HTML
      this.log('开始解析HTML...');
      const document = this.htmlParser.parse(html);
      this.currentDocument = document;
      this.log('HTML解析完成');

      // 2. 解析CSS
      this.log('开始解析CSS...');
      const cssRules = css ? this.cssParser.parse(css) : [];
      this.log('CSS解析完成，找到', cssRules.length, '条规则');

      // 3. 计算样式
      this.log('开始计算样式...');
      this.calculateStyles(document, cssRules);
      this.log('样式计算完成');

      // 4. 构建渲染树并进行布局
      this.log('开始布局...');
      this.currentRenderTree = this.layoutEngine.layout(document);
      this.log('布局完成');

      // 5. 渲染到Canvas
      if (canvas) {
        this.log('开始渲染...');
        this.renderEngine = new RenderEngine(canvas);
        this.renderEngine.render(this.currentRenderTree);
        this.log('渲染完成');
      }

      // 6. 执行JavaScript
      if (this.jsEngine) {
        this.log('设置JavaScript DOM对象...');
        this.setJSDOMObjects();

        this.log('执行页面JavaScript...');
        await this.executePageJavaScript(document);
      }

      // 触发加载完成事件
      this.emit('load', {
        document: document,
        renderTree: this.currentRenderTree,
        stats: this.getStats()
      });

      return {
        success: true,
        document: document,
        renderTree: this.currentRenderTree,
        stats: this.getStats()
      };

    } catch (error) {
      this.error('加载失败:', error);
      this.emit('error', error);
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * 计算所有元素的样式
   * @param {Object} document - 文档对象
   * @param {Array} cssRules - CSS规则数组
   */
  calculateStyles(document, cssRules) {
    const traverse = (element) => {
      if (element.nodeType === 1) { // 元素节点
        element.computedStyle = this.styleCalculator.calculateStyles(element, cssRules);
      }

      // 递归处理子节点
      for (const child of element.childNodes) {
        traverse(child);
      }
    };

    traverse(document);
  }

  /**
   * 重新渲染当前页面
   */
  rerender() {
    if (this.currentRenderTree && this.renderEngine) {
      this.log('重新渲染...');
      this.renderEngine.render(this.currentRenderTree);
      this.emit('render', {
        renderTree: this.currentRenderTree,
        stats: this.getStats()
      });
    }
  }

  /**
   * 获取页面统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    if (!this.currentDocument) {
      return {};
    }

    const stats = {
      elements: 0,
      textNodes: 0,
      totalNodes: 0,
      renderNodes: 0
    };

    const countNodes = (node) => {
      stats.totalNodes++;
      if (node.nodeType === 1) {
        stats.elements++;
      } else if (node.nodeType === 3) {
        stats.textNodes++;
      }

      for (const child of node.childNodes) {
        countNodes(child);
      }
    };

    countNodes(this.currentDocument);

    if (this.currentRenderTree) {
      const countRenderNodes = (renderNode) => {
        stats.renderNodes++;
        for (const child of renderNode.children) {
          countRenderNodes(child);
        }
      };
      countRenderNodes(this.currentRenderTree.root);
    }

    if (this.renderEngine) {
      stats.renderStats = this.renderEngine.getStats();
    }

    return stats;
  }

  /**
   * 调整视口大小
   * @param {number} width - 新的宽度
   * @param {number} height - 新的高度
   */
  resizeViewport(width, height) {
    this.options.viewportWidth = width;
    this.options.viewportHeight = height;
    this.layoutEngine.viewportWidth = width;
    this.layoutEngine.viewportHeight = height;

    // 重新布局和渲染
    if (this.currentDocument) {
      this.currentRenderTree = this.layoutEngine.layout(this.currentDocument);
      this.rerender();
    }
  }

  /**
   * 查找元素
   * @param {string} selector - 选择器
   * @returns {Array} - 匹配的元素数组
   */
  querySelectorAll(selector) {
    if (!this.currentDocument) {
      return [];
    }

    // 简化的选择器查询
    const results = [];
    const traverse = (element) => {
      if (element.nodeType === 1) {
        if (this.matchesSelector(element, selector)) {
          results.push(element);
        }
      }

      for (const child of element.childNodes) {
        traverse(child);
      }
    };

    traverse(this.currentDocument);
    return results;
  }

  /**
   * 检查元素是否匹配选择器
   * @param {Object} element - 元素对象
   * @param {string} selector - 选择器
   * @returns {boolean} - 是否匹配
   */
  matchesSelector(element, selector) {
    selector = selector.trim();

    // 标签选择器
    if (selector === element.tagName.toLowerCase()) {
      return true;
    }

    // 类选择器
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return element.classList.contains(className);
    }

    // ID选择器
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return element.id === id;
    }

    return false;
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        try {
          callback(data);
        } catch (error) {
          this.error('事件回调执行失败:', error);
        }
      }
    }
  }

  /**
   * 日志记录
   */
  log(...args) {
    if (this.options.enableDebug) {
      console.log('[BrowserEngine]', ...args);
    }
  }

  /**
   * 错误日志
   */
  error(...args) {
    console.error('[BrowserEngine]', ...args);
  }

  /**
   * 执行页面JavaScript
   * @param {Object} document - 文档对象
   */
  async executePageJavaScript(document) {
    if (!this.jsEngine) return;

    // 查找所有script标签
    const scriptTags = this.findScriptTags(document);

    for (const script of scriptTags) {
      if (script.src) {
        this.log('发现外部脚本:', script.src);
        // 外部脚本加载（简化实现）
        await this.loadExternalScript(script.src);
      } else if (script.textContent) {
        this.log('执行内联脚本...');
        this.executeInlineScript(script.textContent);
      }
    }
  }

  /**
   * 查找所有script标签
   * @param {Object} document - 文档对象
   * @returns {Array} - script标签数组
   */
  findScriptTags(document) {
    const scripts = [];

    const traverse = (element) => {
      if (element.nodeType === 1 && element.tagName === 'SCRIPT') {
        scripts.push(element);
      }

      for (const child of element.childNodes) {
        traverse(child);
      }
    };

    traverse(document);
    return scripts;
  }

  /**
   * 执行内联脚本
   * @param {string} code - JavaScript代码
   */
  executeInlineScript(code) {
    try {
      this.executeJavaScript(code);
    } catch (error) {
      this.error('内联脚本执行失败:', error);
    }
  }

  /**
   * 加载外部脚本
   * @param {string} src - 脚本URL
   * @returns {Promise<void>} - 加载完成的Promise
   */
  async loadExternalScript(src) {
    // 简化实现，实际应该进行网络请求
    this.log('外部脚本加载功能尚未实现:', src);

    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * 处理DOM事件
   * @param {string} eventType - 事件类型
   * @param {Object} target - 目标元素
   * @param {Object} event - 事件对象
   */
  handleDOMEvent(eventType, target, event) {
    if (!this.jsEngine) return;

    // 创建事件对象
    const eventObject = {
      type: eventType,
      target: target,
      currentTarget: target,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {},
      stopPropagation: () => {},
      timestamp: Date.now()
    };

    // 触发事件
    if (target._events && target._events[eventType]) {
      target._events[eventType].forEach(handler => {
        try {
          handler.call(target, eventObject);
        } catch (error) {
          this.error(`事件处理器执行失败 (${eventType}):`, error);
        }
      });
    }
  }

  /**
   * 获取JavaScript引擎状态
   * @returns {Object} - 引擎状态
   */
  getJSEngineStatus() {
    if (!this.jsEngine) {
      return { enabled: false };
    }

    return {
      enabled: true,
      running: this.jsEngine.isRunning,
      taskQueue: {
        microtasks: this.jsEngine.taskQueue.microtasks.length,
        macrotasks: this.jsEngine.taskQueue.macrotasks.length
      }
    };
  }

  /**
   * 警告日志
   */
  warn(...args) {
    console.warn('[BrowserEngine]', ...args);
  }

  /**
   * 销毁引擎，释放资源
   */
  destroy() {
    if (this.jsEngine) {
      this.jsEngine.destroy();
      this.jsEngine = null;
    }

    this.currentDocument = null;
    this.currentRenderTree = null;
    this.renderEngine = null;
    this.eventListeners = {};
  }
}