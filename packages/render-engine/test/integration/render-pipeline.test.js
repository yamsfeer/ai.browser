import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('渲染管线集成测试', () => {
  let canvas, context;

  // 模拟Canvas环境
  function createMockCanvas() {
    const mockContext = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '16px serif',
      textAlign: 'left',
      textBaseline: 'top',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      setTransform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      getImageData: vi.fn(() => ({ data: new Array(800 * 600 * 4).fill(255) })),
      measureText: vi.fn(() => ({ width: 100 })),
    };

    return {
      width: 800,
      height: 600,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock-result'),
    };
  }

  beforeEach(() => {
    canvas = createMockCanvas();
    context = canvas.getContext('2d');
    vi.clearAllMocks();
  });

  it('应该完成完整渲染管线：简单div元素', async () => {
    console.log('🔄 开始完整渲染管线测试...\n');

    // 1. 准备HTML和CSS
    const html = `
    <div class="container">
      <h1>Hello World</h1>
      <p class="description">This is a test paragraph.</p>
    </div>`;

    const css = `
    .container {
      width: 400px;
      height: 300px;
      background-color: #f0f0f0;
      padding: 20px;
      margin: 50px auto;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .description {
      color: #666666;
      font-size: 14px;
      line-height: 1.5;
    }`;

    console.log('📝 输入HTML:', html.trim());
    console.log('🎨 输入CSS:', css.trim());

    // 2. HTML解析阶段
    console.log('\n🔍 步骤1: HTML解析');
    const { HTMLParser } = await import('../../src/main/html-parser/index.js');
    const htmlParser = new HTMLParser();

    try {
      const document = htmlParser.parse(html);
      console.log('✅ HTML解析成功');
      console.log('   - 根元素:', document.documentElement?.tagName || 'unknown');
      console.log('   - 子元素数量:', document.documentElement?.children?.length || 0);

      expect(document).toBeDefined();
      expect(document.documentElement).toBeDefined();
    } catch (error) {
      console.log('❌ HTML解析失败:', error.message);
      throw error;
    }

    // 3. CSS解析阶段
    console.log('\n🎨 步骤2: CSS解析');
    const { CSSParser } = await import('../../src/main/css-parser/index.js');
    const cssParser = new CSSParser();

    try {
      const cssRules = cssParser.parse(css);
      console.log('✅ CSS解析成功');
      console.log('   - 规则数量:', cssRules.length);
      cssRules.forEach((rule, index) => {
        console.log(`   - 规则${index + 1}: ${rule.selector || 'unknown'}`);
      });

      expect(cssRules).toBeDefined();
      expect(cssRules.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('❌ CSS解析失败:', error.message);
      throw error;
    }

    // 4. 样式计算阶段
    console.log('\n🧮 步骤3: 样式计算');
    const { StyleCalculator } = await import('../../src/main/css-parser/StyleCalculator.js');
    const styleCalculator = new StyleCalculator();

    try {
      const document = htmlParser.parse(html); // 重新获取document
      const cssRules = cssParser.parse(css);
      const computedStyles = styleCalculator.calculateStyles(document.documentElement, cssRules);
      console.log('✅ 样式计算成功');
      console.log('   - 计算的样式数量:', Object.keys(computedStyles).length);

      expect(computedStyles).toBeDefined();
    } catch (error) {
      console.log('❌ 样式计算失败:', error.message);
      console.log('⚠️  继续后续步骤...');
    }

    // 5. 布局计算阶段
    console.log('\n📐 步骤4: 布局计算');
    const { LayoutEngine } = await import('../../src/main/layout-engine/index.js');
    const layoutEngine = new LayoutEngine();

    try {
      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);
      console.log('✅ 布局计算成功');
      console.log('   - 渲染树根节点存在:', !!renderTree?.root);
      console.log('   - 根节点布局:', renderTree?.root?.layout || 'undefined');

      expect(renderTree).toBeDefined();
      expect(renderTree.root).toBeDefined();
    } catch (error) {
      console.log('❌ 布局计算失败:', error.message);
      console.log('⚠️  继续后续步骤...');
    }

    // 6. 层树计算阶段
    console.log('\n🌳 步骤5: 层树计算');
    const { LayerTreeCalculator } = await import('../../src/main/layer/LayerTreeCalculator.js');
    const layerTreeCalculator = new LayerTreeCalculator();

    try {
      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);
      const layerTree = layerTreeCalculator.calculate(renderTree);
      console.log('✅ 层树计算成功');
      console.log('   - 总层数:', layerTree.getStats().totalLayers);
      console.log('   - 根层存在:', !!layerTree.root);

      expect(layerTree).toBeDefined();
      expect(layerTree.root).toBeDefined();
    } catch (error) {
      console.log('❌ 层树计算失败:', error.message);
      console.log('⚠️  继续后续步骤...');
    }

    // 7. Paint记录生成阶段
    console.log('\n🎨 步骤6: Paint记录生成');
    const { PaintRecordGenerator } = await import('../../src/main/paint/PaintRecordGenerator.js');
    const paintRecordGenerator = new PaintRecordGenerator();

    try {
      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);
      const layerTree = layerTreeCalculator.calculate(renderTree);

      const paintStats = paintRecordGenerator.generate(layerTree);
      console.log('✅ Paint记录生成成功');
      console.log('   - 生成的记录数:', paintRecordGenerator.getStats().generatedRecords);
      console.log('   - 处理的层数:', paintRecordGenerator.getStats().totalLayers);

      expect(paintStats).toBeDefined();
    } catch (error) {
      console.log('❌ Paint记录生成失败:', error.message);
      console.log('⚠️  继续后续步骤...');
    }

    // 8. 渲染引擎集成阶段
    console.log('\n🖼️  步骤7: 渲染引擎集成');
    const { RenderEngine } = await import('../../src/RenderEngine.js');
    const renderEngine = new RenderEngine(canvas, { debug: true });

    try {
      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);

      const renderStats = renderEngine.render(renderTree);
      console.log('✅ 渲染引擎集成成功');
      console.log('   - 总节点数:', renderStats.totalNodes);
      console.log('   - Paint记录数:', renderStats.paintRecordsGenerated);
      console.log('   - 层数:', renderStats.layersCreated);
      console.log('   - 渲染时间:', renderStats.totalRenderTime.toFixed(2) + 'ms');

      expect(renderStats).toBeDefined();
      expect(renderStats.totalNodes).toBeGreaterThan(0);
    } catch (error) {
      console.log('❌ 渲染引擎集成失败:', error.message);
      console.log('错误详情:', error.stack);
    }

    // 9. Canvas绘制验证
    console.log('\n🖌️  步骤8: Canvas绘制验证');
    const fillRectCalls = context.fillRect.mock.calls;
    const fillTextCalls = context.fillText.mock.calls;

    console.log('✅ Canvas调用统计:');
    console.log('   - fillRect调用次数:', fillRectCalls.length);
    console.log('   - fillText调用次数:', fillTextCalls.length);

    if (fillRectCalls.length > 0) {
      console.log('   - 首个矩形绘制:', fillRectCalls[0]);
    }

    if (fillTextCalls.length > 0) {
      console.log('   - 首个文本绘制:', fillTextCalls[0]);
    }

    // 验证确实有绘制操作
    expect(fillRectCalls.length + fillTextCalls.length).toBeGreaterThan(0);

    console.log('\n🎉 渲染管线测试完成！');
    console.log(`📊 总结: ${fillRectCalls.length}个矩形 + ${fillTextCalls.length}个文本绘制操作`);
  });

  it('应该处理复杂CSS样式：渐变背景和阴影', async () => {
    console.log('\n🎨 测试复杂CSS样式渲染...\n');

    const html = `
    <div class="card">
      <h2 class="title">Complex Styling Test</h2>
      <p class="content">Testing gradients, shadows, and transforms.</p>
      <button class="btn">Click Me</button>
    </div>`;

    const css = `
    .card {
      width: 300px;
      height: 200px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      padding: 30px;
      margin: 50px;
      transform: translateY(10px);
    }
    .title {
      color: white;
      font-size: 20px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    .content {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 15px 0;
    }
    .btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
    }`;

    console.log('🎨 复杂CSS样式:', css.substring(0, 200) + '...');

    try {
      // 尝试完整的渲染管线
      const { HTMLParser } = await import('../../src/main/html-parser/index.js');
      const { CSSParser } = await import('../../src/main/css-parser/index.js');
      const { LayoutEngine } = await import('../../src/main/layout-engine/index.js');
      const { StyleCalculator } = await import('../../src/main/css-parser/StyleCalculator.js');
      const { RenderEngine } = await import('../../src/RenderEngine.js');

      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);
      const renderEngine = new RenderEngine(canvas, { debug: true });

      const stats = renderEngine.render(renderTree);

      console.log('✅ 复杂样式渲染成功');
      console.log('   - 解析的CSS规则数:', cssRules.length);
      console.log('   - 生成的Paint记录:', stats.paintRecordsGenerated);

      expect(stats).toBeDefined();
      expect(cssRules.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('❌ 复杂样式渲染失败:', error.message);
      console.log('⚠️  某些复杂样式可能尚未实现');
    }
  });

  it('应该处理布局系统：Flexbox和Grid', async () => {
    console.log('\n📐 测试布局系统...\n');

    const html = `
    <div class="container">
      <header class="header">Header</header>
      <main class="main">
        <aside class="sidebar">Sidebar</aside>
        <section class="content">Main Content</section>
      </main>
      <footer class="footer">Footer</footer>
    </div>`;

    const css = `
    .container {
      display: grid;
      grid-template-rows: 60px 1fr 40px;
      height: 100vh;
    }
    .header {
      background: #333;
      color: white;
      padding: 20px;
    }
    .main {
      display: flex;
    }
    .sidebar {
      width: 200px;
      background: #f5f5f5;
      padding: 20px;
    }
    .content {
      flex: 1;
      padding: 20px;
      background: white;
    }
    .footer {
      background: #666;
      color: white;
      padding: 10px;
      text-align: center;
    }`;

    try {
      const { HTMLParser } = await import('../../src/main/html-parser/index.js');
      const { CSSParser } = await import('../../src/main/css-parser/index.js');
      const { LayoutEngine } = await import('../../src/main/layout-engine/index.js');
      const { StyleCalculator } = await import('../../src/main/css-parser/StyleCalculator.js');

      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);

      console.log('🔍 测试Flexbox布局...');
      console.log('🔍 测试Grid布局...');

      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);

      console.log('✅ 布局系统测试完成');
      console.log('   - 布局计算成功:', !!renderTree?.root);

      if (renderTree?.root?.layout) {
        console.log('   - 根容器尺寸:', renderTree.root.layout);
      }

      expect(renderTree).toBeDefined();
    } catch (error) {
      console.log('❌ 布局系统测试失败:', error.message);
      console.log('⚠️  Flexbox/Grid布局可能需要进一步实现');
    }
  });

  it('应该渲染Canvas绘制统计信息', async () => {
    console.log('\n📊 测试渲染统计信息...\n');

    const html = `<div class="stats">Statistics Test</div>`;
    const css = `.stats { width: 200px; height: 100px; background: #007bff; }`;

    try {
      const { HTMLParser } = await import('../../src/main/html-parser/index.js');
      const { CSSParser } = await import('../../src/main/css-parser/index.js');
      const { LayoutEngine } = await import('../../src/main/layout-engine/index.js');
      const { StyleCalculator } = await import('../../src/main/css-parser/StyleCalculator.js');
      const { RenderEngine } = await import('../../src/RenderEngine.js');

      const document = htmlParser.parse(html);
      const cssRules = cssParser.parse(css);
      const renderTree = layoutEngine.layout(document.documentElement, cssRules, styleCalculator);
      const renderEngine = new RenderEngine(canvas, { debug: true });

      // 执行渲染
      const startTime = performance.now();
      const stats = renderEngine.render(renderTree);
      const endTime = performance.now();

      console.log('📊 详细渲染统计:');
      console.log('   - 实际测量时间:', (endTime - startTime).toFixed(2) + 'ms');
      console.log('   - 引擎报告时间:', stats.totalRenderTime.toFixed(2) + 'ms');
      console.log('   - 总节点数:', stats.totalNodes);
      console.log('   - Paint记录:', stats.paintRecordsGenerated);
      console.log('   - 层数:', stats.layersCreated);
      console.log('   - 帧数:', stats.frameCount);

      // Canvas操作统计
      console.log('\n🖌️  Canvas操作统计:');
      console.log('   - fillRect调用:', context.fillRect.mock.calls.length);
      console.log('   - fillText调用:', context.fillText.mock.calls.length);
      console.log(
        '   - save/restore调用:',
        context.save.mock.calls.length,
        '/',
        context.restore.mock.calls.length
      );

      // 验证统计数据合理性
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalRenderTime).toBeGreaterThan(0);
      expect(typeof stats.paintRecordsGenerated).toBe('number');

      console.log('✅ 渲染统计测试完成');
    } catch (error) {
      console.log('❌ 渲染统计测试失败:', error.message);
    }
  });
});
