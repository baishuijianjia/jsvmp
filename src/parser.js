/**
 * 基于Babel的JavaScript语法分析器
 * 直接使用Babel解析，无需转换
 */

let babelParser;

// 导入Babel依赖
try {
    babelParser = require('@babel/parser');
} catch (error) {
    console.error('❌ Babel依赖未安装，请安装: npm install @babel/parser');
    throw new Error('请安装Babel依赖: npm install @babel/parser');
}

/**
 * 基于Babel的语法分析器
 */
class Parser {
    constructor() {
        this.options = {
            sourceType: 'script',
            allowImportExportEverywhere: false,
            allowAwaitOutsideFunction: false,
            allowReturnOutsideFunction: false,
            strictMode: false,
            ranges: false,
            tokens: false,
            plugins: [
                'doExpressions',
                'exportDefaultFrom',
                'functionBind',
                'decorators-legacy',
                'classProperties',
                'asyncGenerators',
                'functionSent',
                'dynamicImport'
            ]
        };
    }

    /**
     * 解析JavaScript代码为Babel AST
     * @param {string} input - 要解析的JavaScript代码
     * @returns {BabelAST} Babel AST节点
     */
    parse(input) {
        try {
            return babelParser.parse(input, this.options);
        } catch (error) {
            console.error('语法分析错误:', error.message);
            throw error;
        }
    }

    /**
     * 设置解析选项
     * @param {object} options - 解析选项
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    /**
     * 启用严格模式
     */
    enableStrictMode() {
        this.options.strictMode = true;
    }

    /**
     * 启用模块模式
     */
    enableModuleMode() {
        this.options.sourceType = 'module';
    }

    /**
     * 添加语法插件
     * @param {string} plugin - 插件名称
     */
    addPlugin(plugin) {
        if (!this.options.plugins.includes(plugin)) {
            this.options.plugins.push(plugin);
        }
    }

    /**
     * 移除语法插件
     * @param {string} plugin - 插件名称
     */
    removePlugin(plugin) {
        const index = this.options.plugins.indexOf(plugin);
        if (index > -1) {
            this.options.plugins.splice(index, 1);
        }
    }
}

module.exports = {
    Parser
}; 