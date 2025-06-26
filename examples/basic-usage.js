#!/usr/bin/env node

const { JSVMP } = require('../src/index');

console.log('🚀 JSVMP - JavaScript Virtual Machine 基本使用示例\n');

// 创建虚拟机实例
const vm = new JSVMP();

// 示例1：基本表达式计算
console.log('📌 示例1：基本表达式计算');
const result1 = vm.run('2 + 3 * 4 - 1');
console.log('2 + 3 * 4 - 1 =', result1);
console.log('');

// 示例2：变量和函数
console.log('📌 示例2：变量和函数');
const code2 = `
    var x = 10;
    var y = 20;
    
    function add(a, b) {
        return a + b;
    }
    
    add(x, y)
`;
const result2 = vm.run(code2);
console.log('函数调用结果:', result2);
console.log('');

// 示例3：控制流
console.log('📌 示例3：条件语句和循环');
const code3 = `
    var sum = 0;
    for (var i = 1; i <= 5; i++) {
        if (i % 2 === 0) {
            sum += i;
        }
    }
    sum
`;
const result3 = vm.run(code3);
console.log('偶数求和 (1-5):', result3);
console.log('');

// 示例4：对象和数组
console.log('📌 示例4：对象和数组操作');
const code4 = `
    var person = {
        name: "张三",
        age: 25,
        hobbies: ["编程", "阅读", "音乐"]
    };
    
    var greeting = "你好，我是" + person.name + 
                   "，今年" + person.age + "岁，" +
                   "喜欢" + person.hobbies.length + "种爱好";
    
    greeting
`;
const result4 = vm.run(code4);
console.log('个人介绍:', result4);
console.log('');

// 示例5：复杂算法 - 斐波那契数列
console.log('📌 示例5：递归算法 - 斐波那契数列');
const code5 = `
    function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    var result = [];
    for (var i = 0; i < 10; i++) {
        result.push(fibonacci(i));
    }
    
    result
`;
const result5 = vm.run(code5);
console.log('斐波那契数列 (前10项):', result5);
console.log('');

// 示例6：模拟事件处理
console.log('📌 示例6：模拟事件处理');
const code6 = `
    var events = [];
    
    function addEventListener(type, handler) {
        events.push({ type: type, handler: handler });
    }
    
    function triggerEvent(type, data) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].type === type) {
                events[i].handler(data);
            }
        }
    }
    
    // 注册事件
    addEventListener('click', function(data) {
        console.log('点击事件触发:', data);
    });
    
    addEventListener('hover', function(data) {
        console.log('悬停事件触发:', data);
    });
    
    // 触发事件
    triggerEvent('click', { x: 100, y: 200 });
    triggerEvent('hover', { element: 'button' });
    
    'Event system demo completed'
`;
const result6 = vm.run(code6);
console.log('结果:', result6);
console.log('');

console.log('✅ 所有示例执行完成！');
console.log('💡 更多高级示例请查看 examples/ 目录中的其他文件'); 