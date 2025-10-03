import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/test/**/*.test.js', 'test/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'build'],
    setupFiles: [],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '**/*.test.js',
        '**/*.spec.js',
        '**/setup.js'
      ]
    }
  },
  // 使用新的projects配置替代废弃的workspace配置
  projects: [
    {
      name: 'html-parser',
      test: {
        include: ['packages/html-parser/test/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build']
      }
    },
    {
      name: 'css-parser',
      test: {
        include: ['packages/css-parser/test/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build']
      }
    },
    {
      name: 'layout-engine',
      test: {
        include: ['packages/layout-engine/test/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build']
      }
    },
    {
      name: 'render-engine',
      test: {
        include: ['packages/render-engine/test/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build']
      }
    },
    {
      name: 'browser-engine',
      test: {
        include: ['packages/browser-engine/test/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build']
      }
    }
  ]
});