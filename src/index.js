const { Compiler } = require('./compiler');
const { VirtualMachine } = require('./vm');
const { Parser } = require('./parser');

/**
 * JavaScript虚拟机主类
 * 基于Babel AST的完整JavaScript执行环境
 */
class JSVMP {
    constructor() {
        this.parser = new Parser();
        this.compiler = new Compiler();
        this.vm = new VirtualMachine();
        this.initialized = false; // 标记虚拟机是否已初始化
    }

    /**
     * 编译并执行JavaScript代码
     * @param {string} code - JavaScript源代码
     * @param {object} context - 执行上下文
     * @returns {any} 执行结果
     */
    run(code, context = {}) {
        try {
            const ast = this.parser.parse(code);
            const bytecode = this.compiler.compile(ast, code); // 传递源码给编译器
            
            // 第一次调用时重置全局变量，后续调用保持状态
            const result = this.vm.execute(bytecode, context, !this.initialized);
            this.initialized = true;

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 仅编译代码，不执行
     * @param {string} code - JavaScript源代码
     * @returns {object} 字节码
     */
    compile(code) {
        const ast = this.parser.parse(code);
        return this.compiler.compile(ast, code);
    }

    /**
     * 执行已编译的字节码
     * @param {object} bytecode - 字节码
     * @param {object} context - 执行上下文
     * @returns {any} 执行结果
     */
    execute(bytecode, context = {}) {
        return this.vm.execute(bytecode, context);
    }

    /**
     * 启用调试模式
     * @param {string} level - 调试级别: 'basic', 'detail', 'verbose'
     */
    enableDebug(level = 'basic') {
        this.vm.enableDebug(level);
    }

    /**
     * 禁用调试模式
     */
    disableDebug() {
        this.vm.disableDebug();
    }

    /**
     * 设置调试符号开关
     * @param {boolean} enable - 是否启用调试符号
     */
    setDebugSymbols(enable) {
        this.compiler.setDebugSymbols(enable);
    }

    /**
     * 设置最大指令执行数量
     * @param {number} maxInstructions - 最大指令数
     */
    setMaxInstructions(maxInstructions) {
        this.vm.setMaxInstructions(maxInstructions);
    }

    /**
     * 重置虚拟机状态
     */
    reset() {
        this.vm = new VirtualMachine();
        this.initialized = false;
    }

    /**
     * 获取虚拟机状态信息
     * @returns {object} 状态信息
     */
    getState() {
        return {
            initialized: this.initialized,
            globalVariables: Array.from(this.vm.globals.keys()),
            callStackDepth: this.vm.callStack.length
        };
    }
}

// 测试函数
function demo() {
    const jsvmp = new JSVMP();

    console.log('=== JSVMP 虚拟机演示 ===');

    // 测试所有支持的语法结构
    const tests = [
        {
            name: '基础表达式',
            code: '2 + 3 * 4 - 1'
        },
        {
            name: '变量声明和赋值',
            code: 'var x = 10; var y = 20; x + y'
        },
        {
            name: '函数定义和调用',
            code: `
                function add(a, b) {
                    return a + b;
                }
                add(5, 3)
            `
        },
        {
            name: '条件语句',
            code: `
                var x = 10;
                if (x > 5) {
                    x = x * 2;
                } else {
                    x = x + 1;
                }
                x
            `
        },
        {
            name: '循环语句',
            code: `
                var sum = 0;
                for (var i = 1; i <= 5; i++) {
                    sum += i;
                }
                sum
            `
        },
        {
            name: '对象和数组',
            code: `
                var arr = [1, 2, 3];
                var obj = {name: "test", value: 42};
                arr.length + obj.value
            `
        },
        {
            name: '自增自减运算',
            code: `
                var a = 5;
                var b = ++a;
                var c = a++;
                a + b + c
            `
        },
        {
            name: '逻辑运算',
            code: `
                var x = true && false;
                var y = true || false;
                var z = !x;
                z
            `
        },
        {
            name: '三元运算符',
            code: `
                var x = 10;
                var result = x > 5 ? "big" : "small";
                result
            `
        },
        {
            name: 'typeof运算符',
            code: `
                var num = 42;
                var str = "hello";
                typeof num + " " + typeof str
            `
        }
    ];

    for (const test of tests) {
        try {
            console.log(`${test.name}: `, jsvmp.run(test.code));
        } catch (error) {
            console.log(`${test.name}: 错误 -`, error.message);
        }
    }

    console.log('=== 演示完成 ===');
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    demo();
}

// CommonJS导出
module.exports = { JSVMP };

// ES6模块导出
module.exports.default = JSVMP;
