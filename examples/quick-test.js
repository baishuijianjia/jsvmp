const { JSVMP } = require('../src/index');

console.log('🚀 JSVMP 快速测试\n');

const jsvmp = new JSVMP();

// 测试1: 基本算术
console.log('=== 测试1: 基本算术 ===');
try {
    const result1 = jsvmp.run('2 + 3 * 4');
    console.log('✅ 2 + 3 * 4 =', result1);
} catch (error) {
    console.error('❌ 错误:', error.message);
}

// 测试2: 成员表达式
console.log('\n=== 测试2: 成员表达式 ===');
try {
    jsvmp.run('console.log("Hello, JSVMP!")');
    console.log('✅ console.log 调用成功');
} catch (error) {
    console.error('❌ 错误:', error.message);
}

// 测试3: 变量和函数
console.log('\n=== 测试3: 变量和函数 ===');
try {
    const result3 = jsvmp.run(`
        var x = 10
        var y = 20
        x + y
    `);
    console.log('✅ 变量计算结果:', result3);
} catch (error) {
    console.error('❌ 错误:', error.message);
}

// 测试4: 简单循环
console.log('\n=== 测试4: 简单循环 ===');
try {
    const result4 = jsvmp.run(`
        var sum = 0
        var i = 1
        while (i <= 3) {
            sum = sum + i
            i = i + 1
        }
        sum
    `);
    console.log('✅ while循环结果:', result4);
} catch (error) {
    console.error('❌ 循环错误:', error.message);
}

// 测试5: 简单函数定义
console.log('\n=== 测试5: 简单函数 ===');
try {
    const result5 = jsvmp.run(`
        function multiply(a, b) {
            return a * b
        }
        multiply(6, 7)
    `);
    console.log('✅ 函数调用结果:', result5);
} catch (error) {
    console.error('❌ 函数错误:', error.message);
}

console.log('\n🎉 快速测试完成！'); 