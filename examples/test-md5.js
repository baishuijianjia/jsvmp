const { JSVMP } = require('../src/index');
const { md5Code } = require('./md5-algorithm');

console.log('🚀 JSVMP 快速测试\n');

const jsvmp = new JSVMP();
jsvmp.setMaxInstructions(1000000);
// jsvmp.setDebugSymbols(true);
// jsvmp.enableDebug();


// 方案1：直接运行源代码
// const result = jsvmp.run(demoCode);
// console.log('执行结果:', result);

// 方案2：分别编译和执行  
const bytecode = jsvmp.compile(md5Code);
const result = jsvmp.execute(bytecode);
console.log('执行结果:', result);