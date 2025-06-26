declare module 'jsvmp' {
  // ========== 基础类型定义 ==========

  /**
   * 调试级别类型
   */
  export type DebugLevel = 'basic' | 'detail' | 'verbose';

  /**
   * 外部变量上下文类型
   */
  export interface ExecutionContext {
    [key: string]: any;
  }

  /**
   * 虚拟机状态信息
   */
  export interface VMState {
    /** 虚拟机是否已初始化 */
    initialized: boolean;
    /** 全局变量名称列表 */
    globalVariables: string[];
    /** 当前调用栈深度 */
    callStackDepth: number;
  }

  /**
   * 调试信息
   */
  export interface DebugInfo {
    line: number;
    column: number;
    sourceText?: string;
    lineText?: string;
  }

  /**
   * 字节码指令
   */
  export interface Instruction {
    opcode: number;
    operand?: any;
    debugInfo?: DebugInfo;
  }

  /**
   * 字节码对象
   */
  export interface ByteCode {
    instructions: Instruction[];
    constantPool: any;
    sourceMap?: Map<number, DebugInfo>;
    getSourceInfo(pc: number): DebugInfo | null;
  }

  /**
   * 编译选项
   */
  export interface CompileOptions {
    /** 是否启用调试符号 */
    debugSymbols?: boolean;
    /** 是否生成源码映射 */
    sourceMap?: boolean;
  }

  /**
   * 执行选项
   */
  export interface ExecuteOptions {
    /** 是否重置全局变量 */
    resetGlobals?: boolean;
    /** 最大指令执行数量 */
    maxInstructions?: number;
    /** 调试级别 */
    debugLevel?: DebugLevel;
  }

  // ========== 错误类型 ==========

  /**
   * JSVMP基础错误类型
   */
  export class JSVMPError extends Error {
    constructor(message: string, pc?: number, instruction?: Instruction);
    /** 程序计数器位置 */
    pc?: number;
    /** 当前指令 */
    instruction?: Instruction;
    /** 源码位置信息 */
    sourceInfo?: DebugInfo;
  }

  /**
   * 编译错误
   */
  export class CompileError extends JSVMPError {
    constructor(message: string, line?: number, column?: number);
    line?: number;
    column?: number;
  }

  /**
   * 运行时错误
   */
  export class RuntimeError extends JSVMPError {
    constructor(message: string, pc: number, instruction?: Instruction);
  }

  // ========== 主类定义 ==========

  /**
   * JSVMP虚拟机主类
   */
  export class JSVMP {
    /**
     * 创建JSVMP虚拟机实例
     */
    constructor();

    // ========== 核心执行方法 ==========

    /**
     * 编译并执行JavaScript代码
     * @param code JavaScript源代码字符串
     * @param context 外部变量上下文，所有属性会成为虚拟机的全局变量
     * @returns 代码执行结果
     * @throws {JSVMPError} 当编译或执行失败时抛出
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * 
     * // 基础使用
     * const result1 = vm.run('2 + 3 * 4'); // 14
     * 
     * // 外部变量传入
     * const result2 = vm.run('name + " - Age: " + age', {
     *   name: "张三",
     *   age: 25
     * }); // "张三 - Age: 25"
     * 
     * // 传入函数
     * const result3 = vm.run('multiply(5, 3)', {
     *   multiply: (a: number, b: number) => a * b
     * }); // 15
     * ```
     */
    run(code: string, context?: ExecutionContext): any;

    /**
     * 仅编译代码，不执行
     * @param code JavaScript源代码字符串
     * @param options 编译选项
     * @returns 编译后的字节码对象
     * @throws {JSVMPError} 当编译失败时抛出
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * const bytecode = vm.compile('function add(a, b) { return a + b; }');
     * const result = vm.execute(bytecode);
     * ```
     */
    compile(code: string, options?: CompileOptions): ByteCode;

    /**
     * 执行已编译的字节码
     * @param bytecode 编译后的字节码对象
     * @param context 外部变量上下文
     * @param options 执行选项
     * @returns 执行结果
     * @throws {JSVMPError} 当执行失败时抛出
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * const bytecode = vm.compile('x * y + z');
     * const result = vm.execute(bytecode, { x: 2, y: 3, z: 4 }); // 10
     * ```
     */
    execute(bytecode: ByteCode, context?: ExecutionContext, options?: ExecuteOptions): any;

    // ========== 调试控制方法 ==========

    /**
     * 启用调试模式
     * @param level 调试级别
     * - 'basic': 基本调试信息
     * - 'detail': 详细调试信息
     * - 'verbose': 最详细的调试信息
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.enableDebug('detail');
     * vm.run('var x = 5; x + 10'); // 输出详细执行过程
     * ```
     */
    enableDebug(level?: DebugLevel): void;

    /**
     * 禁用调试模式
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.disableDebug();
     * ```
     */
    disableDebug(): void;

    /**
     * 设置调试符号开关
     * @param enable 是否启用调试符号，启用后可提供源码位置信息
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.setDebugSymbols(true);  // 启用源码位置追踪
     * vm.setDebugSymbols(false); // 禁用以提高性能
     * ```
     */
    setDebugSymbols(enable: boolean): void;

    // ========== 配置管理方法 ==========

    /**
     * 设置最大指令执行数量（防止死循环）
     * @param maxInstructions 最大指令数，默认200,000
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.setMaxInstructions(1000000); // 允许执行更多指令
     * ```
     */
    setMaxInstructions(maxInstructions: number): void;

    /**
     * 重置虚拟机状态，清空所有变量和状态
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.run('var x = 10;');
     * vm.reset(); // 清空状态
     * // 现在 x 变量不再存在
     * ```
     */
    reset(): void;

    /**
     * 获取虚拟机当前状态信息
     * @returns 包含初始化状态、全局变量、调用栈深度的状态对象
     * 
     * @example
     * ```typescript
     * const vm = new JSVMP();
     * vm.run('var a = 1; var b = 2;');
     * const state = vm.getState();
     * console.log(state.globalVariables); // ['a', 'b']
     * console.log(state.initialized);     // true
     * console.log(state.callStackDepth);  // 0
     * ```
     */
    getState(): VMState;

    // ========== 兼容性方法（已废弃，建议使用新方法） ==========

    /**
     * @deprecated 使用 enableDebug() 和 disableDebug() 替代
     * 设置虚拟机调试模式
     * @param enable 是否启用调试
     * @param level 调试级别
     */
    setDebugMode(enable: boolean, level?: DebugLevel): void;
  }

  // ========== 实用工具类型 ==========

  /**
   * 外部函数类型定义
   */
  export type ExternalFunction = (...args: any[]) => any;

  /**
   * 支持的外部变量值类型
   */
  export type ExternalValue = 
    | string 
    | number 
    | boolean 
    | null 
    | undefined
    | object
    | ExternalFunction
    | Array<any>
    | ExecutionContext;

  /**
   * 虚拟机执行结果类型
   */
  export type ExecutionResult = any;

  /**
   * 强类型的外部变量上下文
   */
  export interface TypedExecutionContext<T = Record<string, ExternalValue>> {
    [K in keyof T]: T[K];
  }

  // ========== 高级配置接口 ==========

  /**
   * 虚拟机创建选项
   */
  export interface JSVMPOptions {
    /** 初始最大指令执行数量 */
    maxInstructions?: number;
    /** 是否启用调试符号 */
    debugSymbols?: boolean;
    /** 初始调试级别 */
    debugLevel?: DebugLevel;
  }

  /**
   * 编译结果信息
   */
  export interface CompileResult {
    /** 编译后的字节码 */
    bytecode: ByteCode;
    /** 编译统计信息 */
    stats: {
      /** 指令数量 */
      instructionCount: number;
      /** 常量池大小 */
      constantPoolSize: number;
      /** 编译耗时（毫秒） */
      compileTime: number;
    };
  }

  /**
   * 执行结果信息
   */
  export interface ExecuteResult<T = any> {
    /** 执行结果值 */
    result: T;
    /** 执行统计信息 */
    stats: {
      /** 执行指令数量 */
      instructionCount: number;
      /** 执行耗时（毫秒） */
      executeTime: number;
      /** 最大调用栈深度 */
      maxCallStackDepth: number;
    };
  }

  // ========== 事件相关接口 ==========

  /**
   * 虚拟机事件类型
   */
  export type VMEvent = 
    | 'beforeExecute'
    | 'afterExecute'
    | 'beforeInstruction'
    | 'afterInstruction'
    | 'error'
    | 'reset';

  /**
   * 事件监听器
   */
  export type VMEventListener = (event: VMEvent, data?: any) => void;

  // ========== 默认导出 ==========

  /**
   * JSVMP虚拟机主类的默认导出
   * 
   * @example
   * ```typescript
   * import { JSVMP } from 'jsvmp';
   * // 或
   * import JSVMP from 'jsvmp';
   * 
   * const vm = new JSVMP();
   * const result = vm.run('2 + 3'); // 5
   * ```
   */
  export default JSVMP;
} 