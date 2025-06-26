/**
 * 虚拟机操作码定义
 */
const OpCodes = {
    // 栈操作
    PUSH: 0x01,         // 推入常量到栈顶
    POP: 0x02,          // 弹出栈顶元素
    DUP: 0x03,          // 复制栈顶元素

    // 算术运算
    ADD: 0x10,          // 加法
    SUB: 0x11,          // 减法  
    MUL: 0x12,          // 乘法
    DIV: 0x13,          // 除法
    MOD: 0x14,          // 取模
    NEG: 0x15,          // 取负

    // 位移运算
    SHL: 0x16,          // 左移 <<
    SHR: 0x17,          // 算术右移 >>
    USHR: 0x18,         // 逻辑右移（无符号） >>>

    // 位运算
    BIT_AND: 0x19,      // 按位与 &
    BIT_OR: 0x1A,       // 按位或 |
    BIT_XOR: 0x1B,      // 按位异或 ^
    BIT_NOT: 0x1C,      // 按位非 ~

    // 比较运算
    EQ: 0x20,           // 相等
    NE: 0x21,           // 不相等
    LT: 0x22,           // 小于
    LE: 0x23,           // 小于等于
    GT: 0x24,           // 大于
    GE: 0x25,           // 大于等于

    // 逻辑运算
    AND: 0x30,          // 逻辑与
    OR: 0x31,           // 逻辑或
    NOT: 0x32,          // 逻辑非
    TYPEOF: 0x33,       // typeof运算符

    // 变量操作
    LOAD: 0x40,         // 加载变量
    STORE: 0x41,        // 存储变量
    DECLARE: 0x42,      // 声明变量

    // 控制流
    JMP: 0x50,          // 无条件跳转
    JIF: 0x51,          // 条件跳转(true)
    JNF: 0x52,          // 条件跳转(false)

    // 函数操作
    CALL: 0x60,         // 函数调用
    CALL_METHOD: 0x64,  // 方法调用（带this）
    RET: 0x61,          // 函数返回
    ENTER: 0x62,        // 进入函数作用域
    LEAVE: 0x63,        // 离开函数作用域

    // 对象操作
    NEW_OBJ: 0x70,      // 创建新对象
    GET_PROP: 0x71,     // 获取属性
    SET_PROP: 0x72,     // 设置属性
    NEW: 0x73,          // 构造函数调用 (new operator)

    // 数组操作
    NEW_ARR: 0x80,      // 创建新数组
    GET_ELEM: 0x81,     // 获取数组元素
    SET_ELEM: 0x82,     // 设置数组元素

    // 异常处理
    THROW: 0x90,        // 抛出异常
    TRY: 0x91,          // 开始try块
    CATCH: 0x92,        // 开始catch块
    FINALLY: 0x93,      // 开始finally块
    END_TRY: 0x94,      // 结束try/catch/finally

    // 控制流扩展
    BREAK: 0x95,        // break语句
    CONTINUE: 0x96,     // continue语句

    // 特殊指令
    NOP: 0x00,          // 空操作
    HALT: 0xFF,         // 停机
};

/**
 * 操作码名称映射
 */
const OpCodeNames = {};
Object.keys(OpCodes).forEach(name => {
    OpCodeNames[OpCodes[name]] = name;
});

/**
 * 指令结构
 */
class Instruction {
    constructor(opcode, operand = null, debugInfo = null) {
        this.opcode = opcode;
        this.operand = operand;
        this.debugInfo = debugInfo; // 调试信息：{ line, column, sourceText }
    }

    toString() {
        const name = OpCodeNames[this.opcode] || `UNKNOWN(${this.opcode})`;
        const instruction = this.operand !== null ? `${name} ${this.operand}` : name;
        
        // 在调试模式下显示源码位置
        if (this.debugInfo && this.debugInfo.line !== undefined) {
            return `${instruction} // @${this.debugInfo.line}:${this.debugInfo.column || 0}`;
        }
        
        return instruction;
    }

    /**
     * 获取源码位置描述
     */
    getSourceLocation() {
        if (!this.debugInfo) return null;
        return {
            line: this.debugInfo.line,
            column: this.debugInfo.column || 0,
            sourceText: this.debugInfo.sourceText || ''
        };
    }
}

/**
 * 常量池
 */
class ConstantPool {
    constructor() {
        this.constants = [];
        this.indices = new Map(); // 用于去重
    }

    /**
     * 添加常量到常量池
     * @param {any} value - 常量值
     * @returns {number} 常量在池中的索引
     */
    add(value) {
        // 对于函数对象，不进行去重，每个函数对象都是唯一的
        if (typeof value === 'object' && value !== null && value.startAddress !== undefined) {
            const index = this.constants.length;
            this.constants.push(value);
            return index;
        }
        
        // 对于其他类型，仍然进行去重优化
        const key = typeof value === 'object' ? JSON.stringify(value) : value;
        
        if (this.indices.has(key)) {
            return this.indices.get(key);
        }

        const index = this.constants.length;
        this.constants.push(value);
        this.indices.set(key, index);
        return index;
    }

    /**
     * 获取常量
     * @param {number} index - 常量索引
     * @returns {any} 常量值
     */
    get(index) {
        if (index < 0 || index >= this.constants.length) {
            throw new Error(`常量池索引越界: ${index}`);
        }
        return this.constants[index];
    }

    /**
     * 获取常量池大小
     * @returns {number} 常量池大小
     */
    size() {
        return this.constants.length;
    }

    /**
     * 清空常量池
     */
    clear() {
        this.constants = [];
        this.indices.clear();
    }
}

/**
 * 字节码程序
 */
class ByteCode {
    constructor() {
        this.constantPool = new ConstantPool();
        this.instructions = [];
        this.sourceMap = new Map(); // PC -> 源码位置映射
        this.sourceCode = ''; // 原始源码
        this.sourceLines = []; // 按行分割的源码
    }

    /**
     * 设置源码信息
     * @param {string} sourceCode - 原始源码
     */
    setSourceCode(sourceCode) {
        this.sourceCode = sourceCode;
        this.sourceLines = sourceCode.split('\n');
    }

    /**
     * 添加指令
     * @param {number} opcode - 操作码
     * @param {any} operand - 操作数
     * @param {object} debugInfo - 调试信息
     */
    addInstruction(opcode, operand = null, debugInfo = null) {
        const pc = this.instructions.length;
        const instruction = new Instruction(opcode, operand, debugInfo);
        this.instructions.push(instruction);
        
        // 建立PC到源码位置的映射
        if (debugInfo && debugInfo.line !== undefined) {
            this.sourceMap.set(pc, debugInfo);
        }
    }

    /**
     * 获取指定PC位置的源码信息
     * @param {number} pc - 程序计数器
     * @returns {object} 源码信息
     */
    getSourceInfo(pc) {
        const debugInfo = this.sourceMap.get(pc);
        if (!debugInfo) return null;

        const line = debugInfo.line;
        const column = debugInfo.column || 0;
        
        return {
            line,
            column,
            lineText: this.sourceLines[line - 1] || '',
            sourceText: debugInfo.sourceText || ''
        };
    }

    /**
     * 添加常量并返回索引
     * @param {any} value - 常量值
     * @returns {number} 常量索引
     */
    addConstant(value) {
        return this.constantPool.add(value);
    }

    /**
     * 获取指令数量
     * @returns {number} 指令数量
     */
    getInstructionCount() {
        return this.instructions.length;
    }

    /**
     * 反汇编字节码
     * @returns {string} 反汇编文本
     */
    disassemble() {
        const output = [];
        output.push('=== 字节码反汇编 ===');
        output.push('常量池:');
        for (let i = 0; i < this.constantPool.size(); i++) {
            output.push(`  [${i}] ${JSON.stringify(this.constantPool.get(i))}`);
        }
        
        output.push('\n指令序列:');
        this.instructions.forEach((instruction, index) => {
            output.push(`  ${index.toString().padStart(4, '0')}: ${instruction.toString()}`);
        });
        
        return output.join('\n');
    }
}

module.exports = {
    OpCodes,
    OpCodeNames,
    Instruction,
    ConstantPool,
    ByteCode
}; 