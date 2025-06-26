const { OpCodes, OpCodeNames } = require('./opcodes');

/**
 * 调用栈帧
 */
class CallFrame {
    constructor(returnAddress, locals = new Map(), isConstructorCall = false, newInstance = null, currentFunction = null) {
        this.returnAddress = returnAddress;
        this.locals = locals; // 局部变量
        this.isConstructorCall = isConstructorCall; // 是否为构造函数调用
        this.newInstance = newInstance; // 构造函数调用时创建的新实例
        this.currentFunction = currentFunction; // 当前正在执行的函数对象
    }
}

/**
 * 栈式虚拟机
 * 执行字节码指令
 */
class VirtualMachine {
    constructor() {
        this.stack = []; // 操作数栈
        this.callStack = []; // 调用栈
        this.globals = new Map(); // 全局变量
        this.pc = 0; // 程序计数器
        this.bytecode = null;
        this.debug = false;
        this.debugLevel = 'none';
        this.instructionCount = 0;
        this.maxInstructions = 200000;
        this.debugProgressInterval = 1000;
        this.executionHotspots = new Map();
        this.builtins = this.setupBuiltins();
        this.closureIdCounter = 0; // 闭包ID计数器
    }

    /**
     * 创建Buffer类的模拟实现
     * @returns {Function} Buffer构造函数
     */
    createBufferMock() {
        class BufferMock extends Array {
            constructor(data) {
                if (Array.isArray(data)) {
                    super(...data);
                } else if (typeof data === 'number') {
                    super(data);
                    this.fill(0);
                } else if (typeof data === 'string') {
                    const bytes = Array.from(data).map(char => char.charCodeAt(0));
                    super(...bytes);
                } else {
                    super();
                }
            }

            static allocUnsafe(size) {
                return new BufferMock(size);
            }

            static concat(list) {
                const totalLength = list.reduce((sum, buf) => sum + buf.length, 0);
                const result = new BufferMock(totalLength);
                let offset = 0;
                for (const buf of list) {
                    for (let i = 0; i < buf.length; i++) {
                        result[offset + i] = buf[i];
                    }
                    offset += buf.length;
                }
                return result;
            }

            readUInt32BE(offset) {
                if (offset + 4 > this.length) {
                    throw new Error(`Index out of range: ${offset + 4} > ${this.length}`);
                }
                return (
                    (this[offset] << 24) |
                    (this[offset + 1] << 16) |
                    (this[offset + 2] << 8) |
                    this[offset + 3]
                ) >>> 0; // 无符号右移确保结果为正数
            }

            writeUInt32BE(value, offset) {
                if (offset + 4 > this.length) {
                    throw new Error(`Index out of range: ${offset + 4} > ${this.length}`);
                }
                value = value >>> 0; // 转换为32位无符号整数
                this[offset] = (value >>> 24) & 0xFF;
                this[offset + 1] = (value >>> 16) & 0xFF;
                this[offset + 2] = (value >>> 8) & 0xFF;
                this[offset + 3] = value & 0xFF;
                return offset + 4;
            }

            slice(start, end) {
                const sliced = Array.prototype.slice.call(this, start, end);
                return new BufferMock(sliced);
            }

            fill(value) {
                for (let i = 0; i < this.length; i++) {
                    this[i] = value & 0xFF;
                }
                return this;
            }

            toString(encoding = 'utf8') {
                if (encoding === 'hex') {
                    return Array.from(this).map(byte => byte.toString(16).padStart(2, '0')).join('');
                }
                return String.fromCharCode(...this);
            }
        }

        return BufferMock;
    }

    /**
     * 创建Uint32Array的模拟实现
     * @returns {Function} Uint32Array构造函数
     */
    createUint32ArrayMock() {
        class Uint32ArrayMock extends Array {
            constructor(...args) {
                if (args.length === 0) {
                    super();
                } else if (args.length === 1 && typeof args[0] === 'number') {
                    // new Uint32Array(length)
                    super(args[0]);
                    this.fill(0);
                } else if (args.length === 1 && typeof args[0] === 'object') {
                    // new Uint32Array(array)
                    super(...args[0]);
                } else {
                    // new Uint32Array(element0, element1, ...)
                    super(...args);
                }
                
                // 添加Uint32Array特有的属性
                this.BYTES_PER_ELEMENT = 4;
                this.name = 'Uint32Array';
                
                // 确保所有值都是32位无符号整数
                for (let i = 0; i < this.length; i++) {
                    this[i] = (this[i] >>> 0); // 转换为32位无符号整数
                }
            }

            // 重写set方法确保值的正确性
            set(index, value) {
                this[index] = (value >>> 0); // 转换为32位无符号整数
                return this;
            }

            // 添加subarray方法
            subarray(begin, end) {
                const result = new Uint32ArrayMock();
                const slice = Array.prototype.slice.call(this, begin, end);
                result.push(...slice);
                return result;
            }
        }
        
        return Uint32ArrayMock;
    }

    /**
     * 创建require函数的模拟实现
     * @returns {Function} require函数
     */
    createRequireMock() {
        const BufferClass = this.createBufferMock();
        const bufferModule = {
            Buffer: BufferClass
        };

        return function require(moduleName) {
            switch (moduleName) {
                case 'buffer':
                    return bufferModule;
                case 'crypto':
                    // 简单的crypto模块模拟
                    return {
                        createHash: function(algorithm) {
                            return {
                                update: function(data) { return this; },
                                digest: function(encoding) { 
                                    return encoding === 'hex' ? '0123456789abcdef' : new Uint8Array(16);
                                }
                            };
                        }
                    };
                default:
                    throw new Error(`Module not found: ${moduleName}`);
            }
        };
    }

    /**
     * 设置内置函数
     * @returns {Map} 内置函数映射
     */
    setupBuiltins() {
        const builtins = new Map();
        
        // console.log
        builtins.set('console', {
            log: (...args) => {
                console.log(...args);
                return undefined;
            }
        });
        
        // Math对象 - 提供常用的数学函数和常量
        builtins.set('Math', {
            PI: Math.PI,
            E: Math.E,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            max: Math.max,
            min: Math.min,
            pow: Math.pow,
            sqrt: Math.sqrt,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            random: Math.random
        });
        
        // 添加一些常用的全局函数
        builtins.set('parseInt', parseInt);
        builtins.set('parseFloat', parseFloat);
        builtins.set('isNaN', isNaN);
        builtins.set('isFinite', isFinite);
        
        // 添加JavaScript内置的编码函数
        builtins.set('encodeURIComponent', encodeURIComponent);
        builtins.set('decodeURIComponent', decodeURIComponent);
        builtins.set('encodeURI', encodeURI);
        builtins.set('decodeURI', decodeURI);
        builtins.set('escape', escape);
        builtins.set('unescape', unescape);
        
        // 添加JavaScript内置对象
        builtins.set('String', String);
        builtins.set('Number', Number);
        builtins.set('Boolean', Boolean);
        builtins.set('Object', Object);
        
        // 添加类型化数组支持
        builtins.set('Uint32Array', this.createUint32ArrayMock());
        builtins.set('Uint8Array', Uint8Array);
        builtins.set('Int32Array', Int32Array);
        
        // 添加JavaScript全局常量
        builtins.set('undefined', undefined);
        builtins.set('NaN', NaN);
        builtins.set('Infinity', Infinity);
        
        // 添加Buffer类模拟
        builtins.set('Buffer', this.createBufferMock());
        
        // 添加require函数模拟
        builtins.set('require', this.createRequireMock());
        
        // 添加简单的模块系统支持
        builtins.set('define', function(id, deps, factory) {
            // 简单的define实现，直接执行factory函数
            if (typeof id === 'function') {
                // define(factory)
                return id();
            } else if (typeof deps === 'function') {
                // define(id, factory)
                return deps();
            } else if (typeof factory === 'function') {
                // define(id, deps, factory)
                return factory();
            }
            return undefined;
        });
        
        // 创建module和exports对象
        const exportsObject = {};
        builtins.set('module', {
            exports: exportsObject
        });
        builtins.set('exports', exportsObject);
        
        // Array对象 - 提供数组构造函数和常用方法
        builtins.set('Array', function(...args) {
            if (args.length === 0) {
                return [];
            } else if (args.length === 1 && typeof args[0] === 'number') {
                // new Array(length)
                const length = args[0];
                if (length < 0 || !Number.isInteger(length)) {
                    throw new RangeError('Invalid array length');
                }
                return new Array(length);
            } else {
                // new Array(element0, element1, ..., elementN)
                return Array.from(args);
            }
        });
        
        // 添加 Array 的静态方法
        const ArrayConstructor = builtins.get('Array');
        ArrayConstructor.isArray = Array.isArray;
        ArrayConstructor.from = Array.from;
        ArrayConstructor.of = Array.of;
        
        return builtins;
    }



    /**
     * 执行字节码
     * @param {ByteCode} bytecode - 字节码
     * @param {object} context - 执行上下文
     * @param {boolean} resetGlobals - 是否重置全局变量，默认true
     * @returns {any} 执行结果
     */
    execute(bytecode, context = {}, resetGlobals = true) {
        this.bytecode = bytecode;
        this.pc = 0;
        this.stack = [];
        this.callStack = [];
        this.instructionCount = 0; // 指令执行计数器
        this.maxInstructions = 200000; // 最大指令执行数量，防止死循环
        
        // 只有在需要时才重置全局变量
        if (resetGlobals) {
            this.globals = new Map();
            
            // 注入内置函数
            for (const [key, value] of this.builtins) {
                this.globals.set(key, value);
            }
            
            // 设置全局this（创建一个代理对象，使其属性能够同步到全局变量）
            const vm = this; // 保存VM实例的引用
            const globalThis = new Proxy({}, {
                set: (target, property, value) => {
                    target[property] = value;
                    vm.globals.set(property, value); // 使用保存的VM实例引用
                    return true;
                },
                get: (target, property) => {
                    if (property in target) {
                        return target[property];
                    }
                    return vm.globals.get(property); // 使用保存的VM实例引用
                }
            });
            this.globals.set('this', globalThis);
        }
        
        // 注入上下文变量
        for (const [key, value] of Object.entries(context)) {
            this.globals.set(key, value);
        }

        
        let result = undefined;
        
        try {
            while (this.pc < this.bytecode.instructions.length) {
                const instruction = this.bytecode.instructions[this.pc];
                
                // 检查死循环保护
                this.instructionCount++;
                if (this.instructionCount > this.maxInstructions) {
                    throw new Error(`执行指令数量超过限制 (${this.maxInstructions})，可能存在死循环`);
                }
                
                // 执行热点跟踪（用于检测循环）
                if (this.debug || this.instructionCount % 100 === 0) {
                    this.trackExecutionHotspots();
                }
                
                if (this.debug) {
                    this.debugInstruction(instruction);
                }
                
                result = this.executeInstruction(instruction);
                this.pc++;
                
                // 如果遇到HALT指令，停止执行
                if (instruction.opcode === OpCodes.HALT) {
                    break;
                }
            }
        } catch (error) {
            // 获取错误位置的源码信息
            const sourceInfo = this.bytecode.getSourceInfo(this.pc);
            let errorMsg = `虚拟机执行错误 (PC: ${this.pc}, 指令计数: ${this.instructionCount})`;
            
            if (sourceInfo) {
                errorMsg += ` at line ${sourceInfo.line}:${sourceInfo.column}`;
                if (sourceInfo.sourceText) {
                    errorMsg += ` "${sourceInfo.sourceText}"`;
                }
                if (sourceInfo.lineText) {
                    errorMsg += `\n  源码: ${sourceInfo.lineText.trim()}`;
                }
            }
            
            errorMsg += `: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            throw error;
        }
        
        // 返回栈顶的值作为结果，如果栈为空返回undefined
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : result;
    }

    /**
     * 执行单条指令
     * @param {Instruction} instruction - 指令
     * @returns {any} 执行结果
     */
    executeInstruction(instruction) {
        const { opcode, operand } = instruction;
        
        switch (opcode) {
            case OpCodes.PUSH:
                return this.executePush(operand);
            case OpCodes.POP:
                return this.executePop();
            case OpCodes.DUP:
                return this.executeDup();
            case OpCodes.ADD:
                return this.executeAdd();
            case OpCodes.SUB:
                return this.executeSub();
            case OpCodes.MUL:
                return this.executeMul();
            case OpCodes.DIV:
                return this.executeDiv();
            case OpCodes.MOD:
                return this.executeMod();
            case OpCodes.NEG:
                return this.executeNeg();
            case OpCodes.SHL:
                return this.executeShl();
            case OpCodes.SHR:
                return this.executeShr();
            case OpCodes.USHR:
                return this.executeUshr();
            case OpCodes.BIT_AND:
                return this.executeBitAnd();
            case OpCodes.BIT_OR:
                return this.executeBitOr();
            case OpCodes.BIT_XOR:
                return this.executeBitXor();
            case OpCodes.BIT_NOT:
                return this.executeBitNot();
            case OpCodes.EQ:
                return this.executeEq();
            case OpCodes.NE:
                return this.executeNe();
            case OpCodes.LT:
                return this.executeLt();
            case OpCodes.LE:
                return this.executeLe();
            case OpCodes.GT:
                return this.executeGt();
            case OpCodes.GE:
                return this.executeGe();
            case OpCodes.AND:
                return this.executeAnd();
            case OpCodes.OR:
                return this.executeOr();
            case OpCodes.NOT:
                return this.executeNot();
            case OpCodes.TYPEOF:
                return this.executeTypeof();
            case OpCodes.LOAD:
                return this.executeLoad(operand);
            case OpCodes.STORE:
                return this.executeStore(operand);
            case OpCodes.DECLARE:
                return this.executeDeclare(operand);
            case OpCodes.JMP:
                return this.executeJmp(operand);
            case OpCodes.JIF:
                return this.executeJif(operand);
            case OpCodes.JNF:
                return this.executeJnf(operand);
            case OpCodes.CALL:
                return this.executeCall(operand);
            case OpCodes.CALL_METHOD:
                return this.executeCallMethod(operand);
            case OpCodes.RET:
                return this.executeRet();
            case OpCodes.GET_PROP:
                return this.executeGetProp();
            case OpCodes.NEW_ARR:
                return this.executeNewArr();
            case OpCodes.NEW_OBJ:
                return this.executeNewObj();
            case OpCodes.GET_ELEM:
                return this.executeGetElem();
            case OpCodes.SET_ELEM:
                return this.executeSetElem();
            case OpCodes.SET_PROP:
                return this.executeSetProp();
            case OpCodes.NEW:
                return this.executeNew(operand);
            case OpCodes.THROW:
                return this.executeThrow();
            case OpCodes.TRY:
                return this.executeTry();
            case OpCodes.CATCH:
                return this.executeCatch();
            case OpCodes.FINALLY:
                return this.executeFinally();
            case OpCodes.END_TRY:
                return this.executeEndTry();
            case OpCodes.BREAK:
                return this.executeBreak();
            case OpCodes.CONTINUE:
                return this.executeContinue();
            case OpCodes.HALT:
                return this.executeHalt();
            default:
                throw new Error(`未实现的操作码: ${OpCodeNames[opcode] || opcode}`);
        }
    }

    /**
     * PUSH指令：推入常量到栈顶
     */
    executePush(operand) {
        const value = this.bytecode.constantPool.get(operand);
        this.stack.push(value);
        return value;
    }

    /**
     * POP指令：弹出栈顶元素
     */
    executePop() {
        if (this.stack.length === 0) {
            throw new Error('栈为空，无法弹出');
        }
        return this.stack.pop();
    }

    /**
     * DUP指令：复制栈顶元素
     */
    executeDup() {
        if (this.stack.length === 0) {
            throw new Error('栈为空，无法复制');
        }
        const value = this.stack[this.stack.length - 1];
        this.stack.push(value);
        return value;
    }

    /**
     * ADD指令：加法运算
     */
    executeAdd() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a + b;
        this.stack.push(result);
        return result;
    }

    /**
     * SUB指令：减法运算
     */
    executeSub() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a - b;
        this.stack.push(result);
        return result;
    }

    /**
     * MUL指令：乘法运算
     */
    executeMul() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a * b;
        this.stack.push(result);
        return result;
    }

    /**
     * DIV指令：除法运算
     */
    executeDiv() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        if (b === 0) {
            throw new Error('除零错误');
        }
        const result = a / b;
        this.stack.push(result);
        return result;
    }

    /**
     * MOD指令：取模运算
     */
    executeMod() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a % b;
        this.stack.push(result);
        return result;
    }

    /**
     * NEG指令：取负运算
     */
    executeNeg() {
        const a = this.stack.pop();
        const result = -a;
        this.stack.push(result);
        return result;
    }

    /**
     * SHL指令：左移运算
     */
    executeShl() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a << b;
        this.stack.push(result);
        return result;
    }

    /**
     * SHR指令：算术右移运算
     */
    executeShr() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a >> b;
        this.stack.push(result);
        return result;
    }

    /**
     * USHR指令：逻辑右移运算（无符号）
     */
    executeUshr() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a >>> b;
        this.stack.push(result);
        return result;
    }

    /**
     * BIT_AND指令：按位与运算
     */
    executeBitAnd() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a & b;
        this.stack.push(result);
        return result;
    }

    /**
     * BIT_OR指令：按位或运算
     */
    executeBitOr() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a | b;
        this.stack.push(result);
        return result;
    }

    /**
     * BIT_XOR指令：按位异或运算
     */
    executeBitXor() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a ^ b;
        this.stack.push(result);
        return result;
    }

    /**
     * BIT_NOT指令：按位非运算
     */
    executeBitNot() {
        const a = this.stack.pop();
        const result = ~a;
        this.stack.push(result);
        return result;
    }

    /**
     * EQ指令：相等比较
     */
    executeEq() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a === b;
        this.stack.push(result);
        return result;
    }

    /**
     * NE指令：不等比较
     */
    executeNe() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a !== b;
        this.stack.push(result);
        return result;
    }

    /**
     * LT指令：小于比较
     */
    executeLt() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a < b;
        this.stack.push(result);
        return result;
    }

    /**
     * LE指令：小于等于比较
     */
    executeLe() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a <= b;
        this.stack.push(result);
        return result;
    }

    /**
     * GT指令：大于比较
     */
    executeGt() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a > b;
        this.stack.push(result);
        return result;
    }

    /**
     * GE指令：大于等于比较
     */
    executeGe() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a >= b;
        this.stack.push(result);
        return result;
    }

    /**
     * AND指令：逻辑与
     */
    executeAnd() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a && b;
        this.stack.push(result);
        return result;
    }

    /**
     * OR指令：逻辑或
     */
    executeOr() {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const result = a || b;
        this.stack.push(result);
        return result;
    }

    /**
     * NOT指令：逻辑非
     */
    executeNot() {
        const a = this.stack.pop();
        const result = !a;
        this.stack.push(result);
        return result;
    }

    /**
     * TYPEOF指令：typeof运算符
     */
    executeTypeof() {
        const value = this.stack.pop();
        let typeString;
        
        if (value === null) {
            typeString = 'object'; // JavaScript的特殊情况
        } else if (Array.isArray(value)) {
            typeString = 'object';
        } else if (typeof value === 'function') {
            typeString = 'function';
        } else if (typeof value === 'object' && value !== null && value.startAddress !== undefined) {
            // 用户定义函数对象
            typeString = 'function';
        } else {
            typeString = typeof value;
        }
        
        this.stack.push(typeString);
        return typeString;
    }

    /**
     * LOAD指令：加载变量（重新设计的闭包优先查找机制 + 调试版本）
     */
    executeLoad(operand) {
        const varName = this.bytecode.constantPool.get(operand);
        
        if (this.callStack.length > 0) {
            // 1. 优先级最高：当前函数的闭包环境
            const currentFrame = this.callStack[this.callStack.length - 1];
            if (currentFrame.currentFunction && 
                currentFrame.currentFunction._closureEnv && 
                currentFrame.currentFunction._closureEnv.has(varName)) {
                const value = currentFrame.currentFunction._closureEnv.get(varName);
                
                // 调试信息：记录闭包变量访问
                if (this.debug && this.debugLevel === 'verbose') {
                    console.log(`🔍 LOAD闭包变量 ${varName}: ${value}`);
                }
                
                this.stack.push(value);
                return value;
            }
            
            // 2. 然后查找调用栈的所有层级的局部变量
            for (let i = this.callStack.length - 1; i >= 0; i--) {
                const frame = this.callStack[i];
                if (frame.locals.has(varName)) {
                    const value = frame.locals.get(varName);
                    
                    // 调试信息：记录局部变量访问
                    if (this.debug && this.debugLevel === 'verbose') {
                        console.log(`🔍 LOAD局部变量 ${varName}: ${value}`);
                    }
                    
                    this.stack.push(value);
                    return value;
                }
            }
        }
        
        // 3. 查找全局变量
        if (this.globals.has(varName)) {
            const value = this.globals.get(varName);
            
            // 调试信息：记录函数对象的加载
            if (this.debug && this.debugLevel === 'verbose') {
                console.log(`🔍 LOAD全局函数 ${varName}`);
            }
            
            this.stack.push(value);
            return value;
        }
        
        // 4. 最后尝试从全局this对象中查找
        const globalThis = this.globals.get('this');
        if (globalThis && typeof globalThis === 'object') {
            if (varName in globalThis) {
                const value = globalThis[varName];
                this.stack.push(value);
                return value;
            }
        }
        
        // 变量未找到，生成详细的调试信息
        this.generateVariableDebugInfo(varName);
        throw new Error(`未定义的变量: ${varName}`);
    }

    /**
     * 生成变量查找失败的调试信息
     * @param {string} varName - 变量名
     */
    generateVariableDebugInfo(varName) {
        // 获取源码位置信息
        const sourceInfo = this.bytecode.getSourceInfo(this.pc);
        let locationStr = '';
        
        if (sourceInfo) {
            locationStr = ` at line ${sourceInfo.line}:${sourceInfo.column}`;
            if (sourceInfo.sourceText) {
                locationStr += ` "${sourceInfo.sourceText}"`;
            }
        }
        
        // 只在调试模式下显示详细信息
        if (this.debug) {
            console.log(`未找到变量: "${varName}" (PC: ${this.pc})${locationStr}`);
            
            if (sourceInfo && sourceInfo.lineText) {
                console.log(`源码: ${sourceInfo.lineText.trim()}`);
            }
            
            // 显示当前局部变量和全局变量
            if (this.callStack.length > 0) {
                const frame = this.callStack[this.callStack.length - 1];
                const localVars = Array.from(frame.locals.keys());
                console.log(`局部变量: [${localVars.join(', ')}]`);
            }
            
            const globalVars = Array.from(this.globals.keys()).filter(key => key !== 'this');
            console.log(`全局变量: [${globalVars.slice(0, 10).join(', ')}]${globalVars.length > 10 ? '...' : ''}`);
        }
    }

    /**
     * 分析变量使用的语法结构上下文
     * @param {string} varName - 变量名
     * @returns {string} 语法结构描述
     */
    analyzeSyntaxContext(varName) {
        if (!this.bytecode || this.pc >= this.bytecode.instructions.length) {
            return null;
        }

        const instructions = this.bytecode.instructions;
        const currentPC = this.pc;
        
        // 分析当前指令后面的指令模式
        const nextInstruction = currentPC + 1 < instructions.length ? instructions[currentPC + 1] : null;
        const nextNextInstruction = currentPC + 2 < instructions.length ? instructions[currentPC + 2] : null;
        
        // 分析前面的指令模式
        const prevInstruction = currentPC > 0 ? instructions[currentPC - 1] : null;
        const prevPrevInstruction = currentPC > 1 ? instructions[currentPC - 2] : null;

        // 1. 函数调用参数：扫描后续指令寻找CALL
        for (let i = 1; i <= 5 && currentPC + i < instructions.length; i++) {
            const futureInstr = instructions[currentPC + i];
            if (futureInstr.opcode === 0x60) { // CALL
                return `函数调用的参数 - "${varName}" 被用作函数调用的参数`;
            }
            if (futureInstr.opcode === 0x64) { // CALL_METHOD
                return `方法调用的参数 - "${varName}" 被用作方法调用的参数`;
            }
        }

        // 3. 算术运算：扫描后续指令寻找算术运算符
        for (let i = 1; i <= 3 && currentPC + i < instructions.length; i++) {
            const futureInstr = instructions[currentPC + i];
            const arithOpcodes = [0x10, 0x11, 0x12, 0x13, 0x14]; // ADD, SUB, MUL, DIV, MOD
            if (arithOpcodes.includes(futureInstr.opcode)) {
                const opNames = {0x10: '加法', 0x11: '减法', 0x12: '乘法', 0x13: '除法', 0x14: '取模'};
                return `算术运算 - "${varName}" 被用在${opNames[futureInstr.opcode]}表达式中`;
            }
        }

        // 4. 位运算：扫描后续指令寻找位运算符
        for (let i = 1; i <= 3 && currentPC + i < instructions.length; i++) {
            const futureInstr = instructions[currentPC + i];
            const bitOpcodes = [0x19, 0x1A, 0x1B, 0x16, 0x17, 0x18]; // BIT_AND, BIT_OR, BIT_XOR, SHL, SHR, USHR
            if (bitOpcodes.includes(futureInstr.opcode)) {
                const opNames = {0x19: '按位与', 0x1A: '按位或', 0x1B: '按位异或', 0x16: '左移', 0x17: '右移', 0x18: '无符号右移'};
                return `位运算 - "${varName}" 被用在${opNames[futureInstr.opcode]}运算中`;
            }
        }

        // 5. 比较运算：扫描后续指令寻找比较运算符
        for (let i = 1; i <= 3 && currentPC + i < instructions.length; i++) {
            const futureInstr = instructions[currentPC + i];
            const compOpcodes = [0x20, 0x21, 0x22, 0x23, 0x24, 0x25]; // EQ, NE, LT, LE, GT, GE
            if (compOpcodes.includes(futureInstr.opcode)) {
                const opNames = {0x20: '相等', 0x21: '不相等', 0x22: '小于', 0x23: '小于等于', 0x24: '大于', 0x25: '大于等于'};
                return `比较运算 - "${varName}" 被用在${opNames[futureInstr.opcode]}比较中`;
            }
        }

        // 6. 逻辑运算：扫描后续指令寻找逻辑运算符
        for (let i = 1; i <= 3 && currentPC + i < instructions.length; i++) {
            const futureInstr = instructions[currentPC + i];
            const logicOpcodes = [0x30, 0x31]; // AND, OR
            if (logicOpcodes.includes(futureInstr.opcode)) {
                const opNames = {0x30: '逻辑与', 0x31: '逻辑或'};
                return `逻辑运算 - "${varName}" 被用在${opNames[futureInstr.opcode]}表达式中`;
            }
        }

        // 7. 条件判断：LOAD varName -> JIF/JNF
        if (nextInstruction) {
            const jumpOpcodes = [0x51, 0x52]; // JIF, JNF
            if (jumpOpcodes.includes(nextInstruction.opcode)) {
                return `条件判断 - "${varName}" 被用作if语句或三元运算符的条件`;
            }
        }

        // 8. 对象属性访问：LOAD varName -> GET_PROP
        if (nextInstruction && nextInstruction.opcode === 0x71) { // GET_PROP = 0x71
            return `对象属性访问 - "${varName}.property" 访问对象属性`;
        }

        // 9. 数组元素访问：前面有LOAD，当前LOAD，后面GET_ELEM
        if (prevInstruction && prevInstruction.opcode === 0x40 && 
            nextInstruction && nextInstruction.opcode === 0x81) { // LOAD=0x40, GET_ELEM=0x81
            return `数组索引访问 - "array[${varName}]" 作为数组索引`;
        }

        // 10. 作为数组对象：LOAD varName -> LOAD index -> GET_ELEM
        if (nextInstruction && nextInstruction.opcode === 0x40 &&
            nextNextInstruction && nextNextInstruction.opcode === 0x81) {
            return `数组对象访问 - "${varName}[index]" 作为被访问的数组对象`;
        }

        // 11. 赋值操作：LOAD varName -> STORE
        if (nextInstruction && nextInstruction.opcode === 0x41) { // STORE = 0x41
            return `变量赋值 - "${varName}" 被用在赋值表达式的右侧`;
        }

        // 12. 属性设置：复杂模式分析 SET_PROP
        if (this.isInPropertySetContext(currentPC)) {
            return `对象属性设置 - "${varName}" 被用在属性赋值表达式中`;
        }

        // 13. 返回语句：LOAD varName -> RET
        if (nextInstruction && nextInstruction.opcode === 0x61) { // RET = 0x61
            return `函数返回值 - "${varName}" 被用作函数的返回值`;
        }

        // 14. typeof运算：LOAD varName -> TYPEOF
        if (nextInstruction && nextInstruction.opcode === 0x33) { // TYPEOF = 0x33
            return `typeof运算 - "typeof ${varName}" 检查变量类型`;
        }

        // 15. 一元运算：LOAD varName -> NEG/NOT/BIT_NOT
        if (nextInstruction) {
            const unaryOpcodes = [0x15, 0x32, 0x1C]; // NEG, NOT, BIT_NOT
            if (unaryOpcodes.includes(nextInstruction.opcode)) {
                const opNames = {0x15: '取负', 0x32: '逻辑非', 0x1C: '按位非'};
                return `一元运算 - "${opNames[nextInstruction.opcode]}${varName}" 一元运算表达式`;
            }
        }

        // 16. 简单的变量引用
        return `变量引用 - "${varName}" 被作为变量直接引用`;
    }

    /**
     * 检查是否在属性设置上下文中
     * @param {number} pc - 程序计数器位置
     * @returns {boolean} 是否在属性设置上下文
     */
    isInPropertySetContext(pc) {
        const instructions = this.bytecode.instructions;
        // 查找接下来几条指令中是否有SET_PROP
        for (let i = pc + 1; i < Math.min(pc + 5, instructions.length); i++) {
            if (instructions[i].opcode === 0x72) { // SET_PROP = 0x72
                return true;
            }
        }
        return false;
    }

    /**
     * 格式化值用于调试显示
     * @param {any} value - 要格式化的值
     * @returns {string} 格式化后的字符串
     */
    formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'object' && value.startAddress !== undefined) {
            return `[UserFunction:${value.name || 'anonymous'}]`;
        }
        if (typeof value === 'object') return '[Object]';
        return String(value);
    }

    /**
     * STORE指令：存储变量（重新设计的闭包优先存储机制 + 调试版本）
     */
    executeStore(operand) {
        const varName = this.bytecode.constantPool.get(operand);
        const value = this.stack.pop();
        
        if (this.callStack.length > 0) {
            // 1. 优先级最高：如果当前函数的闭包环境中有该变量，直接更新闭包环境
            const currentFrame = this.callStack[this.callStack.length - 1];
            if (currentFrame.currentFunction && 
                currentFrame.currentFunction._closureEnv && 
                currentFrame.currentFunction._closureEnv.has(varName)) {
                // 直接更新闭包环境，确保闭包变量的独立性
                currentFrame.currentFunction._closureEnv.set(varName, value);
                
                // 调试信息：记录闭包变量更新
                if (this.debug && this.debugLevel === 'verbose') {
                    console.log(`🔍 STORE闭包变量 ${varName}: ${value}`);
                }
                
                return value;
            }
            
            // 2. 然后在调用栈的所有层级中查找已存在的局部变量
            for (let i = this.callStack.length - 1; i >= 0; i--) {
                const frame = this.callStack[i];
                if (frame.locals.has(varName)) {
                    frame.locals.set(varName, value);
                    
                    // 调试信息：记录局部变量更新
                    if (this.debug && this.debugLevel === 'verbose') {
                        console.log(`🔍 STORE局部变量 ${varName}: ${value}`);
                    }
                    
                    return value;
                }
            }
        }
        
        // 3. 如果在任何局部作用域中都没找到，存储到全局变量
        this.globals.set(varName, value);
        return value;
    }

    /**
     * DECLARE指令：声明变量
     */
    executeDeclare(operand) {
        const varName = this.bytecode.constantPool.get(operand);
        const value = this.stack.pop();
        
        // 调试信息：记录变量声明
        if (this.debug && this.debugLevel === 'verbose') {
            console.log(`🔧 声明变量 ${varName}`);
        }
        
        // 如果在函数内，声明为局部变量
        if (this.callStack.length > 0) {
            const currentFrame = this.callStack[this.callStack.length - 1];
            currentFrame.locals.set(varName, value);
            
            // 重要修复：如果函数对象已经有独立的闭包环境，不要重新创建
            if (typeof value === 'object' && value.startAddress !== undefined && !value._closureEnv) {
                this.createClosureEnvironment(value, currentFrame);
            }
        } else {
            // 否则声明为全局变量
            this.globals.set(varName, value);
            
            // 重要修复：如果函数对象已经有独立的闭包环境，不要重新创建
            if (typeof value === 'object' && value.startAddress !== undefined && !value._closureEnv) {
                this.createClosureEnvironmentFromGlobal(value);
            }
        }
        
        return value;
    }

    /**
     * 为函数创建闭包环境，捕获当前作用域中的所有变量
     * @param {object} func - 函数对象
     * @param {CallFrame} frame - 当前调用帧
     */
    createClosureEnvironment(func, frame) {
        if (!func._closureEnv) {
            func._closureEnv = new Map();
        }
        
        // 捕获当前调用帧中的所有变量（包括函数和普通变量）
        for (const [varName, varValue] of frame.locals) {
            // 跳过this和一些内置变量，避免循环引用
            if (varName !== 'this' && varName !== 'arguments') {
                func._closureEnv.set(varName, varValue);
            }
        }
        
        // 同时需要捕获外层调用栈中的变量（支持嵌套闭包）
        for (let i = this.callStack.length - 2; i >= 0; i--) {
            const outerFrame = this.callStack[i];
            for (const [varName, varValue] of outerFrame.locals) {
                if (!func._closureEnv.has(varName) && varName !== 'this' && varName !== 'arguments') {
                    func._closureEnv.set(varName, varValue);
                }
            }
        }
        
        // 捕获全局变量（但排除内置函数）
        for (const [varName, varValue] of this.globals) {
            if (!func._closureEnv.has(varName) && !this.builtins.has(varName)) {
                func._closureEnv.set(varName, varValue);
            }
        }
    }

    /**
     * 为全局作用域中的函数创建闭包环境
     * @param {object} func - 函数对象
     */
    createClosureEnvironmentFromGlobal(func) {
        if (!func._closureEnv) {
            func._closureEnv = new Map();
        }
        
        // 在全局作用域中，只捕获用户定义的全局变量
        for (const [varName, varValue] of this.globals) {
            if (!this.builtins.has(varName) && varName !== 'this') {
                func._closureEnv.set(varName, varValue);
            }
        }
    }

    /**
     * 为被返回的函数创建独立的闭包环境（确保闭包隔离）
     * @param {object} func - 被返回的函数对象
     * @param {CallFrame} returningFrame - 返回该函数的调用帧
     */
    createIndependentClosureEnvironment(func, returningFrame) {
        // 创建全新的闭包环境，每个闭包实例完全独立
        func._closureEnv = new Map();
        func._closureId = this.generateUniqueClosureId();
        
        // 调试信息：记录闭包环境创建
        if (this.debug) {
            console.log(`🏗️ 创建闭包环境，函数ID: ${func._closureId}`);
            console.log(`  返回帧局部变量:`, Array.from(returningFrame.locals.entries()));
        }
        
        // 关键修复：只捕获真正的闭包变量（非函数的局部变量）
        for (const [varName, varValue] of returningFrame.locals) {
            // 跳过不需要的变量
            if (varName === 'this' || 
                varName === 'arguments' || 
                this.isFunctionParameter(func, varName) ||
                this.isBuiltinOrGlobalFunction(varName) ||
                this.isFunctionObject(varValue)) {  // 新增：跳过函数对象
                
                if (this.debug) {
                    console.log(`  ❌ 跳过变量 ${varName}: ${this.formatDebugValue(varValue)} (${this.getSkipReason(func, varName)})`);
                }
                continue;
            }
            
            // 只捕获基本类型和简单对象，确保真正的局部变量独立性
            const copiedValue = this.deepCopyValue(varValue);
            func._closureEnv.set(varName, copiedValue);
            
            // 调试信息：记录捕获的变量
            if (this.debug) {
                console.log(`  ✅ 捕获变量 ${varName}: ${varValue} -> ${copiedValue}`);
            }
        }
        
        // 调试信息：显示最终的闭包环境
        if (this.debug) {
            console.log(`  最终闭包环境:`, Array.from(func._closureEnv.entries()));
        }
    }

    /**
     * 检查变量名是否是函数的参数
     * @param {object} func - 函数对象
     * @param {string} varName - 变量名
     * @returns {boolean} 是否是函数参数
     */
    isFunctionParameter(func, varName) {
        return func.params && func.params.includes(varName);
    }

    /**
     * 检查变量名是否是内置函数或全局函数
     * @param {string} varName - 变量名
     * @returns {boolean} 是否是内置函数或全局函数
     */
    isBuiltinOrGlobalFunction(varName) {
        return this.builtins.has(varName) || 
               (typeof this.globals.get(varName) === 'function');
    }

    /**
     * 检查值是否是函数对象
     * @param {any} value - 要检查的值
     * @returns {boolean} 是否是函数对象
     */
    isFunctionObject(value) {
        return typeof value === 'object' && 
               value !== null && 
               value.startAddress !== undefined &&
               Array.isArray(value.params);
    }

    /**
     * 获取变量被跳过的原因（用于调试）
     * @param {object} func - 函数对象
     * @param {string} varName - 变量名
     * @returns {string} 跳过原因
     */
    getSkipReason(func, varName) {
        if (varName === 'this') return '是this';
        if (varName === 'arguments') return '是arguments';
        if (this.isFunctionParameter(func, varName)) return '是函数参数';
        if (this.isBuiltinOrGlobalFunction(varName)) return '是内置/全局函数';
        // 需要通过返回帧查找这个变量的值来检查是否是函数对象
        return '其他原因';
    }

    /**
     * 深拷贝值，确保闭包变量的独立性
     * @param {any} value - 要拷贝的值
     * @returns {any} 拷贝后的值
     */
    deepCopyValue(value) {
        // 对于基本类型，直接返回
        if (value === null || value === undefined || 
            typeof value === 'number' || typeof value === 'string' || 
            typeof value === 'boolean') {
            return value;
        }
        
        // 对于函数对象，不进行拷贝（避免循环引用）
        if (typeof value === 'object' && value.startAddress !== undefined) {
            return value;
        }
        
        // 对于普通对象和数组，进行浅拷贝即可
        // （在当前的虚拟机实现中，深拷贝可能导致性能问题）
        if (Array.isArray(value)) {
            return [...value];
        }
        
        if (typeof value === 'object') {
            return { ...value };
        }
        
        return value;
    }

    /**
     * 生成唯一的闭包ID
     * @returns {string} 唯一的闭包ID
     */
    generateUniqueClosureId() {
        return `closure_${++this.closureIdCounter}`;
    }



    /**
     * JMP指令：无条件跳转
     */
    executeJmp(operand) {
        this.pc = operand - 1; // -1因为主循环会自增
        return undefined;
    }

    /**
     * JIF指令：条件跳转(true)
     */
    executeJif(operand) {
        const condition = this.stack.pop();
        if (condition) {
            this.pc = operand - 1;
        }
        return undefined;
    }

    /**
     * JNF指令：条件跳转(false)
     */
    executeJnf(operand) {
        const condition = this.stack.pop();
        if (!condition) {
            this.pc = operand - 1;
        }
        return undefined;
    }

    /**
     * CALL指令：函数调用
     */
    executeCall(operand) {
        const argCount = this.bytecode.constantPool.get(operand);
        const func = this.stack.pop();
        
        // 获取参数
        const args = [];
        for (let i = 0; i < argCount; i++) {
            args.push(this.stack.pop()); 
        }
        
        if (typeof func === 'function') {
            // 内置JavaScript函数，使用全局this作为上下文
            const globalThis = this.globals.get('this');
            const result = func.apply(globalThis, args);
            this.stack.push(result);
            return result;
        } else if (typeof func === 'object' && func.startAddress !== undefined) {
            // 用户定义函数
            const currentFrame = new CallFrame(this.pc, new Map(), false, null, func);
            
            // 设置参数为局部变量
            for (let i = 0; i < func.params.length; i++) {
                const paramName = func.params[i];
                const argValue = i < args.length ? args[i] : undefined;
                currentFrame.locals.set(paramName, argValue);
            }
            
            // 设置this为局部变量（普通函数调用时使用全局this）
            // 在方法调用时，this会被正确设置
            const globalThis = this.globals.get('this');
            currentFrame.locals.set('this', globalThis);
            
            // 重要修复：不再将闭包变量复制到locals，保持闭包变量在独立的闭包环境中
            // 闭包变量通过新的executeLoad/executeStore机制直接访问闭包环境
            
            // 简单的同级函数提升：扫描外层作用域中的函数
            this.hoistSiblingFunctionsForIIFE(currentFrame);
            
            this.callStack.push(currentFrame);
            this.pc = func.startAddress - 1; // -1因为主循环会自增
            return undefined;
        } else {
            throw new Error(`无法调用非函数对象: ${typeof func}`);
        }
    }

    /**
     * 为IIFE模式提升同级函数（修复版本：不污染闭包变量）
     * @param {CallFrame} frame - 当前调用帧
     */
    hoistSiblingFunctionsForIIFE(frame) {
        // 1. 从全局this对象中导入JavaScript函数
        const globalThis = this.globals.get('this');
        if (globalThis && typeof globalThis === 'object') {
            for (const [key, value] of Object.entries(globalThis)) {
                if (typeof value === 'function' && !frame.locals.has(key)) {
                    frame.locals.set(key, value);
                }
            }
        }
        
        // 2. 重要修复：不再将闭包环境的变量复制到locals中
        // 闭包变量现在通过executeLoad/executeStore直接访问闭包环境
        // 这样可以确保每个闭包实例的变量完全独立
    }



    /**
     * CALL_METHOD指令：方法调用（带this）
     */
    executeCallMethod(operand) {
        const argCount = this.bytecode.constantPool.get(operand);
        const method = this.stack.pop();
        const thisObject = this.stack.pop();
        
        // 获取参数
        const args = [];
        for (let i = 0; i < argCount; i++) {
            args.push(this.stack.pop()); 
        }
        
        if (typeof method === 'function') {
            // 内置JavaScript函数，使用thisObject作为this
            const result = method.apply(thisObject, args);
            this.stack.push(result);
            return result;
        } else if (typeof method === 'object' && method.startAddress !== undefined) {
            // 用户定义函数
            const currentFrame = new CallFrame(this.pc, new Map(), false, null, method);
            
            // 设置参数为局部变量
            for (let i = 0; i < method.params.length; i++) {
                const paramName = method.params[i];
                const argValue = i < args.length ? args[i] : undefined;
                currentFrame.locals.set(paramName, argValue);
            }
            
            // 设置this为局部变量
            currentFrame.locals.set('this', thisObject);
            
            // 重要修复：不再将闭包变量复制到locals，保持闭包变量在独立的闭包环境中
            // 闭包变量通过新的executeLoad/executeStore机制直接访问闭包环境
            
            // 简单的同级函数提升：扫描外层作用域中的函数
            this.hoistSiblingFunctionsForIIFE(currentFrame);
            
            this.callStack.push(currentFrame);
            this.pc = method.startAddress - 1; // -1因为主循环会自增
            return undefined;
        } else {
            throw new Error(`无法调用非函数对象: ${typeof method}`);
        }
    }

    /**
     * RET指令：函数返回
     */
    executeRet() {
        const returnValue = this.stack.pop();
        
        if (this.callStack.length === 0) {
            throw new Error('没有可返回的函数调用');
        }
        
        const frame = this.callStack.pop();
        this.pc = frame.returnAddress;
        
        // 如果返回值是函数对象，需要创建函数对象的副本并为其创建正确的闭包环境
        if (typeof returnValue === 'object' && returnValue.startAddress !== undefined) {
            // 创建函数对象的副本，确保每个闭包实例都是独立的
            const functionCopy = {
                name: returnValue.name,
                params: [...returnValue.params],
                startAddress: returnValue.startAddress,
                closureScope: returnValue.closureScope
            };
            
            this.createIndependentClosureEnvironment(functionCopy, frame);
            
            // 返回函数副本而不是原始函数对象
            this.stack.push(functionCopy);
            return functionCopy;
        }
        
        // 处理构造函数调用的特殊返回逻辑
        if (frame.isConstructorCall) {
            // 构造函数调用：如果返回值是对象（且不为null），使用返回值；否则使用新实例
            let finalResult;
            if (returnValue !== null && typeof returnValue === 'object') {
                finalResult = returnValue;
            } else {
                finalResult = frame.newInstance;
            }
            this.stack.push(finalResult);
            return finalResult;
        } else {
            // 普通函数调用：直接使用返回值（函数对象已经在上面处理了）
            if (!(typeof returnValue === 'object' && returnValue.startAddress !== undefined)) {
                this.stack.push(returnValue);
            }
            return returnValue;
        }
    }

    /**
     * GET_PROP指令：获取对象属性（支持原型链查找）
     */
    executeGetProp() {
        const propertyName = this.stack.pop();
        const object = this.stack.pop();
        
        if (object === null || object === undefined) {
            throw new Error(`无法读取 ${object} 的属性 '${propertyName}'`);
        }
        
        // 支持原型链查找
        const value = this.getPropertyWithPrototype(object, propertyName);
        this.stack.push(value);
        
        return value;
    }

    /**
     * 支持原型链的属性查找
     * @param {any} object - 目标对象
     * @param {string} propertyName - 属性名
     * @returns {any} 属性值
     */
    getPropertyWithPrototype(object, propertyName) {
        // 首先检查对象自身的属性
        if (object.hasOwnProperty && object.hasOwnProperty(propertyName)) {
            return object[propertyName];
        }

        // 如果对象自身没有该属性，检查原型链
        let value = object[propertyName];
        
        // 如果找到了属性，且是函数，需要绑定正确的this上下文
        if (typeof value === 'function') {
            // 为原型方法绑定正确的this上下文
            return value.bind(object);
        }
        
        // 对于基本类型，手动查找原型
        if (value === undefined) {
            value = this.lookupPrototypeProperty(object, propertyName);
        }
        
        return value;
    }

    /**
     * 查找基本类型的原型属性
     * @param {any} object - 目标对象
     * @param {string} propertyName - 属性名
     * @returns {any} 属性值
     */
    lookupPrototypeProperty(object, propertyName) {
        // 字符串类型
        if (typeof object === 'string') {
            const stringMethod = String.prototype[propertyName];
            if (typeof stringMethod === 'function') {
                return stringMethod.bind(object);
            }
        }
        
        // 数组类型
        if (Array.isArray(object)) {
            const arrayMethod = Array.prototype[propertyName];
            if (typeof arrayMethod === 'function') {
                return arrayMethod.bind(object);
            }
        }
        
        // 数字类型
        if (typeof object === 'number') {
            const numberMethod = Number.prototype[propertyName];
            if (typeof numberMethod === 'function') {
                return numberMethod.bind(object);
            }
        }
        
        // 布尔类型
        if (typeof object === 'boolean') {
            const booleanMethod = Boolean.prototype[propertyName];
            if (typeof booleanMethod === 'function') {
                return booleanMethod.bind(object);
            }
        }
        
        // 对象类型（包括普通对象）
        if (typeof object === 'object' && object !== null) {
            const objectMethod = Object.prototype[propertyName];
            if (typeof objectMethod === 'function') {
                return objectMethod.bind(object);
            }
        }
        
        return undefined;
    }

    /**
     * HALT指令：停机
     */
    executeHalt() {
        return undefined;
    }

    /**
     * NEW_ARR指令：创建新数组
     */
    executeNewArr() {
        const length = this.stack.pop();
        const array = new Array(length);
        
        // 从栈中弹出元素并填充数组（注意顺序）
        for (let i = length - 1; i >= 0; i--) {
            array[i] = this.stack.pop();
        }
        
        this.stack.push(array);
        return array;
    }

    /**
     * NEW_OBJ指令：创建新对象
     */
    executeNewObj() {
        const propCount = this.stack.pop();
        const object = {};
        
        // 从栈中弹出键值对并设置到对象（注意顺序）
        for (let i = 0; i < propCount; i++) {
            const key = this.stack.pop();    // 属性键
            const value = this.stack.pop();  // 属性值
            object[key] = value;
        }
        
        this.stack.push(object);
        return object;
    }

    /**
     * GET_ELEM指令：获取数组元素
     */
    executeGetElem() {
        const index = this.stack.pop();
        const array = this.stack.pop();
        
        if (!Array.isArray(array)) {
            throw new Error(`尝试从非数组对象获取元素: ${typeof array}`);
        }
        
        const value = array[index];
        this.stack.push(value);
        return value;
    }

    /**
     * SET_ELEM指令：设置数组元素
     * 编译器生成的栈布局：[value, array, index]（从栈底到栈顶）
     */
    executeSetElem() {
        if (this.stack.length < 3) {
            throw new Error(`SET_ELEM指令需要3个栈元素，但栈中只有${this.stack.length}个元素`);
        }
        
        // 按照编译器的栈布局弹出元素：[value, array, index]
        const index = this.stack.pop();   // 栈顶：index
        const array = this.stack.pop();   // 中间：array
        const value = this.stack.pop();   // 栈底：value
        
        // 检查array是否为数组
        if (!Array.isArray(array)) {
            throw new Error(`尝试设置非数组对象的元素: ${typeof array}, 收到的值: ${array}`);
        }
        
        // 执行数组元素设置
        array[index] = value;
        this.stack.push(value); // 返回设置的值
        return value;
    }

    /**
     * SET_PROP指令：设置对象属性
     * 栈顶到栈底的顺序：[value, object, property]
     */
    executeSetProp() {
        const property = this.stack.pop();  // 栈顶：property
        const object = this.stack.pop();    // 中间：object
        const value = this.stack.pop();     // 栈底：value
        
        if (object === null || object === undefined) {
            throw new Error(`无法设置 ${object} 的属性 '${property}'`);
        }
        
        object[property] = value;
        this.stack.push(value); // 返回设置的值
        return value;
    }

    /**
     * 调试指令执行
     */
    debugInstruction(instruction) {
        // 获取源码位置信息
        const sourceInfo = this.bytecode.getSourceInfo(this.pc);
        let locationStr = '';
        
        if (sourceInfo) {
            locationStr = ` @${sourceInfo.line}:${sourceInfo.column}`;
            if (sourceInfo.sourceText) {
                locationStr += ` "${sourceInfo.sourceText}"`;
            }
        }
        
        // 简化的调试输出，包含源码位置
        console.log(`[${this.instructionCount}] PC:${this.pc}${locationStr} | ${instruction.toString()}`);
        
        // 在detail级别显示源码行
        if (this.debugLevel === 'detail' && sourceInfo && sourceInfo.lineText) {
            console.log(`  源码: ${sourceInfo.lineText.trim()}`);
        }
        
        // 只在verbose模式下显示详细信息
        if (this.debugLevel === 'verbose') {
            const stackContent = this.stack.map(v => this.formatDebugValue(v)).join(', ');
            console.log(`  栈: [${stackContent}]`);
            
            if (this.callStack.length > 0) {
                const currentFrame = this.callStack[this.callStack.length - 1];
                const localVars = Array.from(currentFrame.locals.keys()).slice(0, 3);
                console.log(`  局部变量: [${localVars.join(', ')}]${currentFrame.locals.size > 3 ? '...' : ''}`);
            }
            
            if (sourceInfo && sourceInfo.lineText) {
                console.log(`  源码: ${sourceInfo.lineText.trim()}`);
            }
        }
    }

    /**
     * 格式化调试值的显示
     * @param {any} value - 要格式化的值
     * @returns {string} 格式化后的字符串
     */
    formatDebugValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') {
            // 限制字符串长度
            const str = value.length > 30 ? value.substring(0, 30) + '...' : value;
            return `"${str}"`;
        }
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'object' && value.startAddress !== undefined) {
            return `[UserFunction:${value.name || 'anonymous'}@${value.startAddress}]`;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                const elements = value.slice(0, 3).map(v => this.formatDebugValue(v));
                return `[${elements.join(', ')}${value.length > 3 ? '...' : ''}]`;
            }
            return '[Object]';
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'boolean') {
            return value.toString();
        }
        return String(value);
    }

    /**
     * 启用调试模式
     * @param {string} level - 调试级别: 'basic', 'detail', 'verbose'
     */
    enableDebug(level = 'basic') {
        this.debug = true;
        this.debugLevel = level;
        
        // 根据调试级别设置不同的参数
        switch (level) {
            case 'basic':
                this.maxInstructions = 100000;
                this.debugProgressInterval = 5000;
                break;
            case 'detail':
                this.maxInstructions = 50000;
                this.debugProgressInterval = 1000;
                break;
            case 'verbose':
                this.maxInstructions = 10000;
                this.debugProgressInterval = 100;
                break;
            default:
                this.debugLevel = 'basic';
                this.maxInstructions = 100000;
                this.debugProgressInterval = 5000;
        }
    }

    /**
     * 禁用调试模式
     */
    disableDebug() {
        this.debug = false;
        this.debugLevel = 'none';
    }

    /**
     * 设置最大指令执行数量
     * @param {number} maxInstructions - 最大指令数
     */
    setMaxInstructions(maxInstructions) {
        this.maxInstructions = maxInstructions;
    }

    /**
     * 打印当前虚拟机状态
     */
    printVMState() {
        // 只在调试模式下打印详细状态
        if (this.debug) {
            console.log('虚拟机状态:');
            console.log(`  PC: ${this.pc}, 指令数: ${this.instructionCount || 0}`);
            console.log(`  栈: ${this.stack.length}, 调用栈: ${this.callStack.length}, 全局变量: ${this.globals.size}`);
        }
    }

    /**
     * 打印指令执行的热点区域（最近执行的PC位置）
     */
    trackExecutionHotspots() {
        if (!this.executionHotspots) {
            this.executionHotspots = new Map();
        }
        
        const pc = this.pc;
        const count = this.executionHotspots.get(pc) || 0;
        this.executionHotspots.set(pc, count + 1);
        
        // 如果某个PC位置执行次数过多，可能存在循环
        if (count > 1000) {
            console.warn(`🔥 热点警告: PC ${pc} 已执行 ${count + 1} 次，可能存在循环`);
            
            // 显示该位置附近的指令
            this.printInstructionContext(pc, 5);
        }
    }

    /**
     * 打印指定PC位置附近的指令上下文
     * @param {number} pc - 程序计数器位置
     * @param {number} range - 上下文范围
     */
    printInstructionContext(pc, range = 3) {
        // 只在调试模式下打印指令上下文
        if (!this.debug || !this.bytecode) return;
        
        console.log(`PC ${pc} 指令上下文:`);
        const start = Math.max(0, pc - range);
        const end = Math.min(this.bytecode.instructions.length, pc + range + 1);
        
        for (let i = start; i < end; i++) {
            const instruction = this.bytecode.instructions[i];
            const marker = i === pc ? '>>> ' : '    ';
            console.log(`${marker}${i}: ${instruction.toString()}`);
        }
    }

    /**
     * NEW指令：构造函数调用
     */
    executeNew(operand) {
        const argCount = this.bytecode.constantPool.get(operand);
        
        // 弹出构造函数
        const constructor = this.stack.pop();
        
        // 弹出参数
        const args = [];
        for (let i = 0; i < argCount; i++) {
            args.push(this.stack.pop());
        }
        
        try {
            let result;
            
            // 对于常见的内置类型，直接创建
            if (constructor === this.builtins.get('Array') || constructor === Array) {
                result = new Array(...args);
            } else if (constructor === this.builtins.get('Object') || constructor === Object) {
                result = new Object(...args);
            } else if (constructor === this.builtins.get('String') || constructor === String) {
                result = new String(...args);
            } else if (constructor === this.builtins.get('Number') || constructor === Number) {
                result = new Number(...args);
            } else if (constructor === this.builtins.get('Boolean') || constructor === Boolean) {
                result = new Boolean(...args);
            } else if (typeof constructor === 'function') {
                // 对于其他函数，尝试作为构造函数调用
                result = new constructor(...args);
            } else if (constructor === this.builtins.get('Uint32Array')) {
                // 使用我们的Uint32Array模拟
                result = new constructor(...args);
            } else if (typeof constructor === 'object' && constructor.startAddress !== undefined) {
                // 用户定义的函数作为构造函数
                // 1. 创建新对象作为this
                const newInstance = {};
                
                // 2. 创建新的调用帧，标记为构造函数调用
                const currentFrame = new CallFrame(this.pc, new Map(), true, newInstance, constructor);
                
                // 3. 设置参数为局部变量
                for (let i = 0; i < constructor.params.length; i++) {
                    const paramName = constructor.params[i];
                    const argValue = i < args.length ? args[i] : undefined;
                    currentFrame.locals.set(paramName, argValue);
                }
                
                // 4. 设置this为新创建的对象
                currentFrame.locals.set('this', newInstance);
                
                // 5. 恢复函数的闭包环境
                if (constructor._closureEnv) {
                    for (const [closureVarName, closureVarValue] of constructor._closureEnv) {
                        if (!currentFrame.locals.has(closureVarName)) {
                            currentFrame.locals.set(closureVarName, closureVarValue);
                        }
                    }
                }
                
                // 6. 简单的同级函数提升
                this.hoistSiblingFunctionsForIIFE(currentFrame);
                
                // 7. 执行构造函数
                this.callStack.push(currentFrame);
                this.pc = constructor.startAddress - 1; // -1因为主循环会自增
                
                // 构造函数的返回值将在RET指令中处理
                return undefined; // 这里不推入栈，等待函数执行完毕
            } else {
                // 对于特殊情况，尝试模拟构造函数调用
                if (constructor && constructor.name === 'Error') {
                    // 模拟Error构造函数
                    result = new Error(args[0] || '');
                } else {
                    throw new Error(`无法构造对象，构造函数类型: ${typeof constructor}，构造函数: ${JSON.stringify(constructor)}`);
                }
            }
            
            this.stack.push(result);
            return result;
        } catch (error) {
            throw new Error(`构造函数调用失败: ${error.message}`);
        }
    }

    /**
     * THROW指令：抛出异常
     */
    executeThrow() {
        const value = this.stack.pop();
        
        // 简化实现：直接抛出JavaScript异常
        // 实际应该实现VM级别的异常处理机制
        throw value instanceof Error ? value : new Error(String(value));
    }

    /**
     * TRY指令：开始try块
     */
    executeTry() {
        // 简化实现：标记try块开始
        // 实际应该建立异常处理栈帧
        return undefined;
    }

    /**
     * CATCH指令：开始catch块
     */
    executeCatch() {
        // 简化实现：标记catch块开始
        // 实际应该处理异常并设置异常变量
        return undefined;
    }

    /**
     * FINALLY指令：开始finally块
     */
    executeFinally() {
        // 简化实现：标记finally块开始
        return undefined;
    }

    /**
     * END_TRY指令：结束try/catch/finally
     */
    executeEndTry() {
        // 简化实现：标记try语句结束
        return undefined;
    }

    /**
     * BREAK指令：break语句
     */
    executeBreak() {
        // 简化实现：抛出特殊异常来模拟break
        // 实际应该跳转到循环结束位置
        throw new Error('BREAK_STATEMENT');
    }

    /**
     * CONTINUE指令：continue语句
     */
    executeContinue() {
        // 简化实现：抛出特殊异常来模拟continue
        // 实际应该跳转到循环开始位置
        throw new Error('CONTINUE_STATEMENT');
    }
}

module.exports = { VirtualMachine, CallFrame }; 

