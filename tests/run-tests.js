#!/usr/bin/env node

const { JSVMP } = require('../src/index');

console.log('🧪 JSVMP 测试套件\n');

let passed = 0;
let failed = 0;

function test(name, code, expected) {
    try {
        const vm = new JSVMP();
        const result = vm.run(code);
        
        if (JSON.stringify(result) === JSON.stringify(expected)) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
            console.log(`   期望: ${JSON.stringify(expected)}`);
            console.log(`   实际: ${JSON.stringify(result)}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ ${name} - 错误: ${error.message}`);
        failed++;
    }
}

// 基础运算测试
test('基础算术运算', '2 + 3 * 4', 14);
test('括号优先级', '(2 + 3) * 4', 20);
test('位运算', '5 | 3', 7);
test('位移运算', '8 >> 2', 2);

// 变量和函数测试
test('变量声明', 'var x = 10; x', 10);
test('函数定义和调用', 'function add(a, b) { return a + b; } add(3, 4)', 7);

// 控制流测试
test('if语句', 'var x = 5; if (x > 3) { x = 10; } x', 10);
test('for循环', 'var sum = 0; for (var i = 1; i <= 3; i++) { sum += i; } sum', 6);

// 对象和数组测试
test('数组操作', 'var arr = [1, 2, 3]; arr.length', 3);
test('对象属性', 'var obj = {name: "test"}; obj.name', "test");

// 复杂功能测试
test('递归函数', `
    function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    factorial(5)
`, 120);

test('简单闭包', `
    function outer() {
        var x = 5;
        function inner() {
            return x;
        }
        return inner();
    }
    outer()
`, 5);

test('复合赋值', `
    var arr = [5];
    arr[0] |= 3;
    arr[0]
`, 7);

console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);

if (failed === 0) {
    console.log('🎉 所有测试通过！');
    process.exit(0);
} else {
    console.log('💥 有测试失败！');
    process.exit(1);
} 