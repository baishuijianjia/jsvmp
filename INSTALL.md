# JSVMP 安装指南

JSVMP是一个功能完整的JavaScript虚拟机，支持多种安装方式。

## 🎯 选择安装方式

### 📦 NPM包安装（推荐）

适用于在项目中使用JSVMP作为依赖：

```bash
# 使用npm
npm install jsvmp

# 使用pnpm
pnpm install jsvmp

# 使用yarn
yarn add jsvmp
```

### 🔧 源码开发安装

适用于开发、贡献代码或自定义构建：

```bash
# 1. 克隆项目
git clone 本项目
cd jsvmp

# 2. 安装依赖 (选择一种包管理器)
npm install
# 或
pnpm install
# 或
yarn install

# 3. 构建项目
npm run build
```

### 🌐 CDN直接使用

适用于快速在网页中使用：

```html
<!-- 开发版本 -->
<script src="https://unpkg.com/jsvmp/dist/jsvmp.js"></script>

<!-- 或使用本地文件 -->
<script src="dist/jsvmp.js"></script>
```

## 📋 系统要求

- **Node.js**: >= 14.0.0
- **内存**: 最少 512MB RAM
- **存储**: 约 50MB 磁盘空间（包含依赖）

## ⚡ 快速开始

### Node.js 环境

```javascript
// 1. NPM包使用
const { JSVMP } = require('jsvmp');

const vm = new JSVMP();
const result = vm.run('2 + 3 * 4'); // 14
console.log(result);

// 2. 外部变量传入
const result2 = vm.run('name + " - Age: " + age', {
    name: "张三",
    age: 25
});
console.log(result2); // "张三 - Age: 25"
```

### 浏览器环境

```html
<!DOCTYPE html>
<html>
<head>
    <title>JSVMP 示例</title>
</head>
<body>
    <script src="https://unpkg.com/jsvmp/dist/jsvmp.js"></script>
    <script>
        const vm = new JSVMP.JSVMP();
        
        const result = vm.run(`
            function fibonacci(n) {
                if (n <= 1) return n;
                return fibonacci(n - 1) + fibonacci(n - 2);
            }
            fibonacci(10)
        `);
        
        console.log('斐波那契数列第10项:', result); // 55
    </script>
</body>
</html>
```

### 开发环境使用

```bash
# 开发模式运行示例
npm run dev

# 运行基础功能测试
npm test

# 运行示例测试
npm run test:examples

# 构建开发版本
npm run build:dev
```

## 🧪 验证安装

### 1. 基础功能验证

```bash
# 创建测试文件 test-install.js
cat > test-install.js << 'EOF'
const { JSVMP } = require('jsvmp');

console.log('🚀 JSVMP 安装验证');

const vm = new JSVMP();

// 测试1：基础表达式
const result1 = vm.run('2 + 3 * 4');
console.log('基础表达式:', result1); // 应该输出: 14

// 测试2：函数调用
const result2 = vm.run(`
    function greet(name) {
        return "Hello, " + name + "!";
    }
    greet("JSVMP")
`);
console.log('函数调用:', result2); // 应该输出: "Hello, JSVMP!"

// 测试3：外部变量传入
const result3 = vm.run('x * y + z', { x: 3, y: 4, z: 5 });
console.log('外部变量:', result3); // 应该输出: 17

// 测试4：闭包功能
const result4 = vm.run(`
    function createCounter() {
        var count = 0;
        return function() {
            return ++count;
        };
    }
    var counter = createCounter();
    [counter(), counter(), counter()]
`);
console.log('闭包功能:', result4); // 应该输出: [1, 2, 3]

console.log('✅ 所有测试通过！JSVMP 安装成功！');
EOF

# 运行测试
node test-install.js

# 清理测试文件
rm test-install.js
```

### 2. 运行内置测试

```bash
# NPM包安装验证
npm test

# 示例代码验证
npm run test:examples

# 开发模式验证
npm run dev
```

### 3. Web环境验证

创建简单的HTML文件测试：

```html
<!-- test-web.html -->
<!DOCTYPE html>
<html>
<head>
    <title>JSVMP Web 测试</title>
</head>
<body>
    <h1>JSVMP Web 测试</h1>
    <div id="output"></div>
    
    <script src="dist/jsvmp.js"></script>
    <script>
        const vm = new JSVMP.JSVMP();
        
        try {
            const result = vm.run(`
                var message = "JSVMP Web环境运行正常！";
                var timestamp = Date.now();
                message + " (时间戳: " + timestamp + ")"
            `);
            
            document.getElementById('output').innerHTML = 
                '<p style="color: green;">✅ ' + result + '</p>';
            console.log('Web环境测试通过');
        } catch (error) {
            document.getElementById('output').innerHTML = 
                '<p style="color: red;">❌ 错误: ' + error.message + '</p>';
            console.error('Web环境测试失败:', error);
        }
    </script>
</body>
</html>
```

## 🔧 故障排除

### 问题1：NPM包安装失败

**症状：**
```
npm ERR! 404 Not Found - GET https://registry.npmjs.org/jsvmp
```

**解决方案：**
```bash
# 方法1：清理npm缓存后重试
npm cache clean --force
npm install jsvmp

# 方法2：指定镜像源
npm install jsvmp --registry https://registry.npmjs.org/

# 方法3：使用源码安装
git clone https://github.com/yourusername/jsvmp.git
cd jsvmp
npm install
npm run build
```

### 问题2：Node.js版本过低

**症状：**
```
engines: {"node":">=14.0.0"}
```

**解决方案：**
```bash
# 检查当前版本
node --version

# 升级Node.js (推荐使用nvm)
nvm install 18
nvm use 18

# 或直接从官网下载最新版本
# https://nodejs.org/
```

### 问题3：模块导入错误

**症状：**
```javascript
TypeError: JSVMP is not a constructor
```

**解决方案：**
```javascript
// ❌ 错误的导入方式
const JSVMP = require('jsvmp');

// ✅ 正确的导入方式
const { JSVMP } = require('jsvmp');

// 或者使用默认导入
const JSVMP = require('jsvmp').default;
```

### 问题4：Web环境加载失败

**症状：**
```
Uncaught ReferenceError: JSVMP is not defined
```

**解决方案：**
```html
<!-- ❌ 错误：脚本路径不正确 -->
<script src="jsvmp.js"></script>

<!-- ✅ 正确：使用正确的路径 -->
<script src="dist/jsvmp.js"></script>
<!-- 或使用CDN -->
<script src="https://unpkg.com/jsvmp/dist/jsvmp.js"></script>

<script>
    // Web环境中使用命名空间访问
    const vm = new JSVMP.JSVMP();
</script>
```

### 问题5：内存不足错误

**症状：**
```
Error: 执行指令数量超过限制 (200000)
```

**解决方案：**
```javascript
const vm = new JSVMP();

// 增加指令执行限制
vm.setMaxInstructions(1000000);

// 或分块执行大量代码
const chunks = largeCode.split('\n\n');
chunks.forEach(chunk => {
    vm.run(chunk);
});
```

### 问题6：调试信息过多

**症状：**
控制台输出大量调试信息

**解决方案：**
```javascript
const vm = new JSVMP();

// 关闭调试模式
vm.disableDebug();

// 或设置较低的调试级别
vm.enableDebug('basic'); // 'basic', 'detail', 'verbose'
```

### 问题7：外部变量无法访问

**症状：**
```
ReferenceError: myVariable is not defined
```

**解决方案：**
```javascript
// ❌ 错误：外部变量未传入
const result = vm.run('myVariable + 10');

// ✅ 正确：通过context传入
const result = vm.run('myVariable + 10', {
    myVariable: 5
});

// 检查变量是否正确传入
console.log(vm.getState().globalVariables);
```

## 📊 性能对比

| 安装方式 | 包大小 | 启动时间 | 适用场景 | 功能完整度 |
|---------|-------|---------|---------|-----------|
| NPM包 | ~5MB | 快 | 生产环境 | 完整 |
| 源码构建 | ~50MB | 中等 | 开发环境 | 完整+调试 |
| CDN引入 | ~344KB | 极快 | Web快速原型 | 完整 |

### 执行性能

- **基础运算**: 比原生JavaScript慢3-5倍
- **函数调用**: 比原生JavaScript慢4-6倍  
- **外部变量访问**: 接近原生性能
- **闭包操作**: 比原生JavaScript慢5-8倍
- **内存占用**: 基础~2MB，大型程序~10-50MB

## 🎯 推荐配置

### 生产环境

```bash
# NPM项目
npm install jsvmp --save

# 配置优化
const vm = new JSVMP();
vm.setMaxInstructions(500000); // 适中的限制
vm.setDebugSymbols(false);     // 关闭调试符号
```

### 开发环境

```bash
# 克隆源码进行开发
git clone 本项目
cd jsvmp
npm install
npm run build:dev

# 启用详细调试
const vm = new JSVMP();
vm.setDebugSymbols(true);
vm.enableDebug('detail');
```

### Web环境

```html
<!-- 生产环境：使用压缩版本 -->
<script src="https://unpkg.com/jsvmp/dist/jsvmp.js"></script>

<!-- 开发环境：使用开发版本 -->
<script src="dist/jsvmp.js"></script>
```

### 性能优化建议

1. **合理设置指令限制**
   ```javascript
   // 简单脚本
   vm.setMaxInstructions(10000);
   
   // 复杂算法
   vm.setMaxInstructions(1000000);
   ```

2. **分批执行大型代码**
   ```javascript
   const codeChunks = bigCode.split(';');
   codeChunks.forEach(chunk => vm.run(chunk + ';'));
   ```

3. **重用虚拟机实例**
   ```javascript
   // ✅ 好的做法：重用实例
   const vm = new JSVMP();
   results = codes.map(code => vm.run(code));
   
   // ❌ 避免：频繁创建实例
   codes.map(code => new JSVMP().run(code));
   ```

## ✅ 安装验证清单

### NPM包安装验证

- [ ] 成功安装JSVMP包: `npm list jsvmp`
- [ ] 基础功能测试通过: `node test-install.js`
- [ ] 可以正常导入: `const { JSVMP } = require('jsvmp')`
- [ ] 外部变量传入正常工作
- [ ] 闭包功能正确隔离

### 源码开发验证

- [ ] 项目克隆成功
- [ ] 依赖安装完成: `npm install`
- [ ] 构建成功: `npm run build`
- [ ] 测试套件通过: `npm test`
- [ ] 示例代码运行: `npm run dev`

### Web环境验证

- [ ] 脚本文件正确加载
- [ ] JSVMP对象可用: `typeof JSVMP !== 'undefined'`
- [ ] 基本代码执行正常
- [ ] 控制台无错误信息
- [ ] 外部变量传入功能正常

### 功能完整性验证

- [ ] **基础运算**: `vm.run('2 + 3 * 4')` === 14
- [ ] **变量声明**: `vm.run('var x = 10; x')` === 10
- [ ] **函数调用**: 函数定义和调用正常
- [ ] **闭包隔离**: 多个闭包实例相互独立
- [ ] **外部变量**: context参数正确传入
- [ ] **错误处理**: 语法错误有清晰提示
- [ ] **调试功能**: 调试模式可以开关

## 🚀 快速上手

安装验证完成后，你可以：

1. **查看示例代码**
   ```bash
   # 查看完整功能演示
   node examples/advanced-features.js
   
   # 查看外部变量传入演示
   node examples/external-variables.js
   
   # 在浏览器中打开Web示例
   open examples/web-usage.html
   ```

2. **阅读详细文档**
   - `README.md` - 完整功能介绍和API文档
   - `docs/external-variables.md` - 外部变量传入详细指南
   - `examples/` - 各种使用示例

3. **开始你的项目**
   ```javascript
   const { JSVMP } = require('jsvmp');
   
   const vm = new JSVMP();
   
   // 你的第一个JSVMP程序
   const result = vm.run(`
       function factorial(n) {
           if (n <= 1) return 1;
           return n * factorial(n - 1);
       }
       factorial(5)
   `);
   
   console.log('5的阶乘是:', result); // 120
   ```

恭喜！🎉 JSVMP已经成功安装并可以使用了！

---

💡 **小贴士**: 如果遇到任何问题，请参考故障排除部分或查看项目的GitHub Issues页面。 