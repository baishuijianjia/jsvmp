# JSVMP 外部变量传入指南

本文档详细介绍如何在JSVMP虚拟机中传入和使用外部变量。

## 基本用法

### 语法

```javascript
const vm = new JSVMP();
const result = vm.run(code, context);
```

- `code`: 要执行的JavaScript代码字符串
- `context`: 包含外部变量的对象，所有属性都会成为虚拟机的全局变量

### 简单示例

```javascript
const { JSVMP } = require('jsvmp');
const vm = new JSVMP();

const result = vm.run(`
    var greeting = "Hello, " + name + "!";
    var total = price * quantity;
    greeting + " Total: $" + total
`, {
    name: "Alice",
    price: 10.99,
    quantity: 3
});

console.log(result); // "Hello, Alice! Total: $32.97"
```

## 支持的数据类型

### 1. 基本类型

```javascript
vm.run(`
    var info = name + " is " + age + " years old";
    var hasAccess = isAdmin ? "Yes" : "No";
    info + " (Admin: " + hasAccess + ")"
`, {
    name: "张三",
    age: 25,
    isAdmin: true
});
```

### 2. 对象

```javascript
vm.run(`
    var userInfo = user.name + " (" + user.email + ")";
    var themeColor = settings.theme;
    userInfo + " - Theme: " + themeColor
`, {
    user: {
        name: "李四",
        email: "lisi@example.com"
    },
    settings: {
        theme: "dark",
        language: "zh-CN"
    }
});
```

### 3. 数组

```javascript
vm.run(`
    var total = 0;
    for (var i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    
    var firstColor = colors[0];
    var colorCount = colors.length;
    
    ({
        sum: total,
        firstColor: firstColor,
        totalColors: colorCount
    })
`, {
    numbers: [1, 2, 3, 4, 5],
    colors: ["red", "green", "blue"]
});
```

### 4. 函数

```javascript
vm.run(`
    var doubled = doubleNumber(10);
    var processed = processData([1, 2, 3]);
    
    ({
        doubled: doubled,
        processed: processed
    })
`, {
    doubleNumber: function(x) {
        return x * 2;
    },
    processData: function(arr) {
        return arr.map(x => x * 10);
    }
});
```

### 5. 类实例

```javascript
class Calculator {
    constructor() {
        this.history = [];
    }
    
    add(a, b) {
        const result = a + b;
        this.history.push(`${a} + ${b} = ${result}`);
        return result;
    }
    
    getHistory() {
        return this.history;
    }
}

const calc = new Calculator();

vm.run(`
    var sum1 = calculator.add(5, 3);
    var sum2 = calculator.add(10, 20);
    var history = calculator.getHistory();
    
    ({
        sum1: sum1,
        sum2: sum2,
        history: history
    })
`, {
    calculator: calc
});
```

## 高级用法

### 1. 状态保持

JSVMP支持在多次调用之间保持状态：

```javascript
const vm = new JSVMP();

// 第一次调用
vm.run(`
    var counter = initialValue;
    counter++
`, {
    initialValue: 10
});

// 第二次调用 - 可以访问之前的变量
const result = vm.run(`
    counter++; // counter 仍然可访问
    counter
`);

console.log(result); // 12
```

### 2. 环境隔离

不同的context创建隔离的执行环境：

```javascript
const devConfig = {
    environment: 'development',
    apiUrl: 'http://localhost:3000',
    debug: true
};

const prodConfig = {
    environment: 'production',
    apiUrl: 'https://api.example.com',
    debug: false
};

const code = `
    var message = "Running in " + environment;
    if (debug) {
        message += " with debug enabled";
    }
    message + " - API: " + apiUrl
`;

const devResult = vm.run(code, devConfig);
const prodResult = vm.run(code, prodConfig);
```

### 3. 传入复杂API

```javascript
const externalAPI = {
    database: {
        users: [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" }
        ],
        
        findUser: function(id) {
            return this.users.find(user => user.id === id);
        }
    },
    
    utils: {
        formatDate: function(date) {
            return date.toLocaleDateString('zh-CN');
        },
        
        generateId: function() {
            return Math.random().toString(36).substr(2, 9);
        }
    }
};

vm.run(`
    var user = api.database.findUser(1);
    var today = api.utils.formatDate(new Date());
    var taskId = api.utils.generateId();
    
    ({
        user: user,
        date: today,
        taskId: taskId
    })
`, {
    api: externalAPI
});
```

## 最佳实践

### 1. 命名约定

- 使用清晰的变量名
- 避免与JavaScript内置对象冲突
- 使用驼峰命名法

```javascript
// ✅ 推荐
{
    userData: {...},
    apiClient: {...},
    configSettings: {...}
}

// ❌ 避免
{
    data: {...},        // 太通用
    Object: {...},      // 与内置对象冲突
    user_data: {...}    // 不符合JavaScript命名习惯
}
```

### 2. 函数封装

将复杂逻辑封装在外部函数中：

```javascript
const helpers = {
    math: {
        sum: (arr) => arr.reduce((a, b) => a + b, 0),
        average: (arr) => helpers.math.sum(arr) / arr.length,
        max: (arr) => Math.max(...arr)
    },
    
    string: {
        capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
        truncate: (str, len) => str.length > len ? str.substr(0, len) + '...' : str
    }
};

vm.run(`
    var numbers = [1, 2, 3, 4, 5];
    var total = helpers.math.sum(numbers);
    var avg = helpers.math.average(numbers);
    var maxVal = helpers.math.max(numbers);
    
    var title = helpers.string.capitalize("hello world");
    var shortText = helpers.string.truncate("This is a long text", 10);
    
    ({
        total: total,
        average: avg,
        maximum: maxVal,
        title: title,
        shortText: shortText
    })
`, { helpers });
```

### 3. 错误处理

为外部函数添加错误处理：

```javascript
const safeAPI = {
    divide: function(a, b) {
        if (b === 0) {
            throw new Error("Division by zero");
        }
        return a / b;
    },
    
    parseNumber: function(str) {
        const num = parseInt(str);
        if (isNaN(num)) {
            throw new Error("Invalid number: " + str);
        }
        return num;
    }
};

try {
    const result = vm.run(`
        var num1 = api.parseNumber("10");
        var num2 = api.parseNumber("5");
        var result = api.divide(num1, num2);
        result
    `, { api: safeAPI });
} catch (error) {
    console.error("Execution error:", error.message);
}
```

## 注意事项

### 1. 性能考虑

- 避免传入过大的对象
- 复杂计算应在外部完成，只传入结果
- 使用函数封装重复逻辑

### 2. 安全性

- 验证传入的数据
- 避免传入敏感信息
- 限制外部函数的权限

### 3. 兼容性

- 外部函数应使用ES5语法（虚拟机内部）
- 避免使用Node.js特定API
- 确保所有依赖都已传入

## Web环境示例

在浏览器中使用：

```html
<script src="dist/jsvmp.js"></script>
<script>
    const vm = new JSVMP.JSVMP();
    
    const browserAPI = {
        dom: {
            getElementById: function(id) {
                return { 
                    id: id, 
                    exists: !!document.getElementById(id) 
                };
            }
        },
        
        storage: {
            get: function(key) {
                return localStorage.getItem(key);
            },
            set: function(key, value) {
                localStorage.setItem(key, value);
                return true;
            }
        }
    };
    
    const result = vm.run(`
        var element = api.dom.getElementById("myButton");
        var saved = api.storage.get("userPreference") || "default";
        
        ({
            elementExists: element.exists,
            preference: saved
        })
    `, { api: browserAPI });
    
    console.log(result);
</script>
```

## 常见问题

### Q: 外部变量会污染虚拟机环境吗？

A: 每次调用`vm.run()`时，context中的变量会被添加到全局环境。如果需要隔离，请创建新的虚拟机实例。

### Q: 可以传入异步函数吗？

A: 可以传入异步函数，但JSVMP是同步执行的，无法等待Promise。建议将异步操作在外部完成后传入结果。

### Q: 传入的对象会被修改吗？

A: 是的，虚拟机内的操作可能会修改传入的对象。如需保护原对象，请传入深拷贝。

### Q: 支持传入Node.js模块吗？

A: 支持传入任何JavaScript对象，包括Node.js模块，但虚拟机内无法使用require()。

通过以上方法，你可以灵活地在JSVMP虚拟机中使用外部变量和函数，实现强大的代码执行和数据处理功能。 