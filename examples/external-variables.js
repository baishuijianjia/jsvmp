#!/usr/bin/env node

const { JSVMP } = require('../src/index');

console.log('🔗 JSVMP - 外部变量传入演示\n');

const vm = new JSVMP();

// ========================================
// 方法1: 通过 context 参数传入外部变量
// ========================================

console.log('📌 方法1：通过 context 参数传入外部变量');

// 准备外部数据
const externalData = {
    // 基本类型变量
    userName: '张三',
    userAge: 25,
    isVip: true,
    
    // 数组数据
    scores: [85, 90, 78, 92, 88],
    
    // 对象数据
    config: {
        debug: true,
        theme: 'dark',
        maxRetries: 3
    },
    
    // 外部函数
    calculateTotal: function(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0);
    },
    
    // API 模拟函数
    fetchUserData: function(userId) {
        return {
            id: userId,
            name: `用户${userId}`,
            email: `user${userId}@example.com`
        };
    }
};

const code1 = `
    // 可以直接使用外部传入的变量
    var greeting = "你好，" + userName + "！你今年" + userAge + "岁。";
    
    // 使用外部数组
    var totalScore = calculateTotal(scores);
    var averageScore = totalScore / scores.length;
    
    // 使用外部对象
    var currentTheme = config.theme;
    
    // 调用外部API函数
    var userData = fetchUserData(123);
    
    // 返回结果对象
    ({
        greeting: greeting,
        totalScore: totalScore,
        averageScore: averageScore,
        theme: currentTheme,
        isVip: isVip,
        userData: userData
    })
`;

try {
    const result1 = vm.run(code1, externalData);
    console.log('执行结果:', JSON.stringify(result1, null, 2));
} catch (error) {
    console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// ========================================
// 方法2: 分步传入，状态保持
// ========================================

console.log('📌 方法2：分步传入外部变量，保持虚拟机状态');

// 创建新的虚拟机实例
const vm2 = new JSVMP();

// 第一步：传入基础配置
const step1Result = vm2.run(`
    var appName = name;
    var version = ver;
    "初始化完成: " + appName + " v" + version
`, {
    name: 'MyApp',
    ver: '1.0.0'
});

console.log('步骤1:', step1Result);

// 第二步：传入用户数据（虚拟机状态保持）
const step2Result = vm2.run(`
    var currentUser = user;
    var hasPermission = permissions.includes('admin');
    "当前用户: " + currentUser.name + "，管理员权限: " + hasPermission
`, {
    user: { name: '李四', id: 456 },
    permissions: ['read', 'write', 'admin']
});

console.log('步骤2:', step2Result);

// 第三步：使用之前传入的变量（展示状态保持）
const step3Result = vm2.run(`
    // 可以访问之前步骤中传入的变量
    appName + " v" + version + " - 用户: " + currentUser.name
`);

console.log('步骤3:', step3Result);

console.log('\n' + '='.repeat(50) + '\n');

// ========================================
// 方法3: 传入复杂对象和类实例
// ========================================

console.log('📌 方法3：传入复杂对象和类实例');

// 定义一个简单的类
class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = a + b;
        this.history.push(`${a} + ${b} = ${result}`);
        return result;
    }
    
    multiply(a, b) {
        const result = a * b;
        this.history.push(`${a} * ${b} = ${result}`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
}

// 创建类实例
const calc = new Calculator();

// 模拟外部API或数据源
const externalAPI = {
    getData: async function() {
        return { value: 42, status: 'success' };
    },
    
    processData: function(data, multiplier) {
        return data.map(item => item * multiplier);
    }
};

const code3 = `
    // 使用外部类实例
    var sum = calculator.add(10, 20);
    var product = calculator.multiply(sum, 2);
    
    // 使用外部API对象
    var processedNumbers = api.processData([1, 2, 3, 4, 5], 10);
    
    // 获取计算历史
    var history = calculator.getHistory();
    
    ({
        sum: sum,
        product: product,
        processedNumbers: processedNumbers,
        calculationHistory: history
    })
`;

try {
    const result3 = vm.run(code3, {
        calculator: calc,
        api: externalAPI
    });
    console.log('执行结果:', JSON.stringify(result3, null, 2));
} catch (error) {
    console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// ========================================
// 方法4: 动态传入和环境隔离
// ========================================

console.log('📌 方法4：动态传入和环境隔离');

// 创建两个不同的执行环境
const env1 = {
    environment: 'development',
    debug: true,
    apiUrl: 'http://localhost:3000'
};

const env2 = {
    environment: 'production',
    debug: false,
    apiUrl: 'https://api.example.com'
};

const envCode = `
    var message = "运行环境: " + environment;
    if (debug) {
        message += " (调试模式开启)";
    }
    message += " - API地址: " + apiUrl;
    message
`;

console.log('开发环境:', vm.run(envCode, env1));
console.log('生产环境:', vm.run(envCode, env2));

console.log('\n' + '='.repeat(50) + '\n');

// ========================================
// 方法5: 传入异步函数和回调
// ========================================

console.log('📌 方法5：传入异步函数和回调（同步执行）');

// 注意：JSVMP是同步执行的，但可以传入异步函数当作同步使用
const asyncUtils = {
    delay: function(ms) {
        // 模拟延迟（同步版本）
        const start = Date.now();
        while (Date.now() - start < ms) {
            // 忙等待（仅用于演示）
        }
        return `延迟了 ${ms}ms`;
    },
    
    formatTime: function() {
        return new Date().toLocaleString('zh-CN');
    },
    
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    }
};

const asyncCode = `
    var startTime = utils.formatTime();
    var delayResult = utils.delay(100);
    var endTime = utils.formatTime();
    var taskId = utils.generateId();
    
    ({
        taskId: taskId,
        startTime: startTime,
        endTime: endTime,
        delayResult: delayResult
    })
`;

try {
    const asyncResult = vm.run(asyncCode, { utils: asyncUtils });
    console.log('异步工具执行结果:', JSON.stringify(asyncResult, null, 2));
} catch (error) {
    console.error('错误:', error.message);
}

console.log('\n✅ 外部变量传入演示完成！');
console.log('\n📝 总结：');
console.log('1. 通过 vm.run(code, context) 的第二个参数传入外部变量');
console.log('2. context 对象的所有属性都会成为虚拟机的全局变量');
console.log('3. 支持传入基本类型、对象、数组、函数、类实例等');
console.log('4. 虚拟机状态可以保持，支持分步执行');
console.log('5. 不同的 context 可以创建隔离的执行环境'); 