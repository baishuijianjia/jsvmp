#!/usr/bin/env node

const { JSVMP } = require('../src/index');

console.log('🔥 JSVMP - 高级功能演示\n');

const vm = new JSVMP();

// 示例1：闭包和作用域
console.log('📌 示例1：闭包和作用域');
const closureCode = `
    function createCounter(initialValue) {
        var count = initialValue || 0;
        
        return function() {
            count++;
            return count;
        };
    }
    
    var counter1 = createCounter(10);
    var counter2 = createCounter(100);
    
    var results = [];
    results.push(counter1()); // 11
    results.push(counter1()); // 12
    results.push(counter2()); // 101
    results.push(counter1()); // 13
    results.push(counter2()); // 102
    
    results
`;
const closureResult = vm.run(closureCode);
console.log('闭包计数器结果:', closureResult);
console.log('');

// 示例2：对象原型和方法
console.log('📌 示例2：对象方法和this上下文');
const objectCode = `
    function Person(name, age) {
        this.name = name;
        this.age = age;
        
        this.greet = function() {
            return "你好，我是" + this.name + "，今年" + this.age + "岁";
        };
        
        this.celebrateBirthday = function() {
            this.age++;
            return this.name + "生日快乐！现在" + this.age + "岁了";
        };
    }
    
    var person = new Person("李四", 28);
    var greeting = person.greet();
    var birthday = person.celebrateBirthday();
    
    [greeting, birthday, person.age]
`;
const objectResult = vm.run(objectCode);
console.log('对象方法结果:', objectResult);
console.log('');

// 示例3：函数式编程
console.log('📌 示例3：函数式编程 - 高阶函数');
const functionalCode = `
    function map(array, fn) {
        var result = [];
        for (var i = 0; i < array.length; i++) {
            result.push(fn(array[i], i));
        }
        return result;
    }
    
    function filter(array, fn) {
        var result = [];
        for (var i = 0; i < array.length; i++) {
            if (fn(array[i], i)) {
                result.push(array[i]);
            }
        }
        return result;
    }
    
    function reduce(array, fn, initial) {
        var accumulator = initial;
        for (var i = 0; i < array.length; i++) {
            accumulator = fn(accumulator, array[i], i);
        }
        return accumulator;
    }
    
    var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    // 平方
    var squares = map(numbers, function(x) { return x * x; });
    
    // 过滤偶数
    var evens = filter(numbers, function(x) { return x % 2 === 0; });
    
    // 求和
    var sum = reduce(numbers, function(acc, x) { return acc + x; }, 0);
    
    ({
        original: numbers,
        squares: squares,
        evens: evens,
        sum: sum
    })
`;
const functionalResult = vm.run(functionalCode);
console.log('函数式编程结果:', functionalResult);
console.log('');

// 示例4：复杂的数据结构操作
console.log('📌 示例4：复杂数据结构 - 简单的数据库');
const dataStructureCode = `
    function Database() {
        this.tables = {};
        
        this.createTable = function(name, schema) {
            this.tables[name] = {
                schema: schema,
                data: []
            };
        };
        
        this.insert = function(tableName, record) {
            if (this.tables[tableName]) {
                var id = this.tables[tableName].data.length + 1;
                record.id = id;
                this.tables[tableName].data.push(record);
                return id;
            }
            return null;
        };
        
        this.select = function(tableName, condition) {
            if (!this.tables[tableName]) return [];
            
            var data = this.tables[tableName].data;
            if (!condition) return data;
            
            var result = [];
            for (var i = 0; i < data.length; i++) {
                if (condition(data[i])) {
                    result.push(data[i]);
                }
            }
            return result;
        };
    }
    
    var db = new Database();
    
    // 创建用户表
    db.createTable('users', { id: 'number', name: 'string', age: 'number' });
    
    // 插入数据
    db.insert('users', { name: '张三', age: 25 });
    db.insert('users', { name: '李四', age: 30 });
    db.insert('users', { name: '王五', age: 28 });
    
    // 查询数据
    var allUsers = db.select('users');
    var youngUsers = db.select('users', function(user) {
        return user.age < 30;
    });
    
    ({
        allUsers: allUsers,
        youngUsers: youngUsers
    })
`;
const dataResult = vm.run(dataStructureCode);
console.log('数据库操作结果:', dataResult);
console.log('');

// 示例5：异步模拟（使用回调）
console.log('📌 示例5：异步模拟 - 回调函数');
const asyncCode = `
    function AsyncManager() {
        this.tasks = [];
        this.results = [];
        
        this.setTimeout = function(callback, delay, data) {
            this.tasks.push({
                callback: callback,
                delay: delay,
                data: data,
                id: this.tasks.length + 1
            });
        };
        
        this.run = function() {
            // 模拟异步执行（实际上是同步的）
            for (var i = 0; i < this.tasks.length; i++) {
                var task = this.tasks[i];
                var result = task.callback(task.data);
                this.results.push({
                    taskId: task.id,
                    delay: task.delay,
                    result: result
                });
            }
        };
    }
    
    var asyncManager = new AsyncManager();
    
    // 添加异步任务
    asyncManager.setTimeout(function(data) {
        return "任务1完成: " + data;
    }, 1000, "数据A");
    
    asyncManager.setTimeout(function(data) {
        return "任务2完成: " + data;
    }, 500, "数据B");
    
    asyncManager.setTimeout(function(data) {
        return "任务3完成: " + data;
    }, 2000, "数据C");
    
    // 执行所有任务
    asyncManager.run();
    
    asyncManager.results
`;
const asyncResult = vm.run(asyncCode);
console.log('异步模拟结果:', asyncResult);
console.log('');

console.log('✅ 高级功能演示完成！');
console.log('💡 这些示例展示了JSVMP支持的高级JavaScript特性'); 