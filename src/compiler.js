const { OpCodes, ByteCode } = require('./opcodes');

/**
 * 基于Babel AST的编译器
 * 直接处理Babel原生AST节点，无需转换
 */
class Compiler {
    constructor() {
        this.bytecode = null;
        this.scopes = [new Map()]; // 作用域栈
        this.currentScope = 0;
        this.labels = new Map(); // 标签映射
        this.breaks = []; // break跳转地址栈
        this.continues = []; // continue跳转地址栈
        this.loopStack = []; // 循环栈，用于break和continue
        this.switchStack = []; // switch栈，用于break
        this.sourceCode = ''; // 原始源码
        this.enableDebugSymbols = true; // 是否启用调试符号
    }

    compile(ast, sourceCode = '') {
        this.bytecode = new ByteCode();
        this.scopes = [new Map()];
        this.currentScope = 0;
        this.loopStack = [];
        this.switchStack = [];
        this.sourceCode = sourceCode;
        
        // 设置源码到字节码中
        if (sourceCode) {
            this.bytecode.setSourceCode(sourceCode);
        }
        
        this.compileNode(ast);
        this.addInstruction(OpCodes.HALT);
        return this.bytecode;
    }

    compileNode(node) {
        if (!node) return;

        switch (node.type) {
            case 'File': 
                // Babel解析器返回File节点，实际程序在program属性中
                this.compileNode(node.program);
                break;
            case 'Program': this.compileProgram(node); break;
            case 'BlockStatement': this.compileBlockStatement(node); break;
            case 'ExpressionStatement': this.compileExpressionStatement(node); break;
            case 'VariableDeclaration': this.compileVariableDeclaration(node); break;
            case 'FunctionDeclaration': this.compileFunctionDeclaration(node); break;
            case 'ReturnStatement': this.compileReturnStatement(node); break;
            case 'IfStatement': this.compileIfStatement(node); break;
            case 'WhileStatement': this.compileWhileStatement(node); break;
            case 'DoWhileStatement': this.compileDoWhileStatement(node); break;
            case 'ForStatement': this.compileForStatement(node); break;
            case 'ForInStatement': this.compileForInStatement(node); break;
            case 'SwitchStatement': this.compileSwitchStatement(node); break;
            case 'BreakStatement': this.compileBreakStatement(node); break;
            case 'ContinueStatement': this.compileContinueStatement(node); break;
            case 'ThrowStatement': this.compileThrowStatement(node); break;
            case 'TryStatement': this.compileTryStatement(node); break;
            case 'DebuggerStatement': this.compileDebuggerStatement(node); break;

            case 'Literal':
            case 'NumericLiteral':
            case 'StringLiteral':
            case 'BooleanLiteral':
            case 'NullLiteral': this.compileLiteral(node); break;
            case 'RegExpLiteral': this.compileRegExpLiteral(node); break;
            case 'TemplateLiteral': this.compileTemplateLiteral(node); break;
            case 'Identifier': this.compileIdentifier(node); break;
            case 'ThisExpression': this.compileThisExpression(node); break;
            case 'BinaryExpression': this.compileBinaryExpression(node); break;
            case 'LogicalExpression': this.compileLogicalExpression(node); break;
            case 'UnaryExpression': this.compileUnaryExpression(node); break;
            case 'UpdateExpression': this.compileUpdateExpression(node); break;
            case 'AssignmentExpression': this.compileAssignmentExpression(node); break;
            case 'ConditionalExpression': this.compileConditionalExpression(node); break;
            case 'SequenceExpression': this.compileSequenceExpression(node); break;
            case 'CallExpression': this.compileCallExpression(node); break;
            case 'NewExpression': this.compileNewExpression(node); break;
            case 'MemberExpression': this.compileMemberExpression(node); break;
            case 'ArrayExpression': this.compileArrayExpression(node); break;
            case 'ObjectExpression': this.compileObjectExpression(node); break;
            case 'FunctionExpression': this.compileFunctionExpression(node); break;

            default:
                throw new Error(`未支持的节点类型: ${node.type}`);
        }
    }

    // 程序和基础节点
    compileProgram(node) {
        for (let i = 0; i < node.body.length; i++) {
            const statement = node.body[i];
            this.compileNode(statement);
            if (i < node.body.length - 1 && statement.type === 'ExpressionStatement') {
                this.bytecode.addInstruction(OpCodes.POP);
            }
        }
    }

    compileExpressionStatement(node) {
        this.compileNode(node.expression);
    }

    compileBlockStatement(node) {
        this.enterScope();
        for (let i = 0; i < node.body.length; i++) {
            const statement = node.body[i];
            this.compileNode(statement);
            // 在块语句中，除了最后一个表达式语句，所有表达式语句都需要清理栈上的返回值
            if (statement.type === 'ExpressionStatement') {
                const isLastStatement = (i === node.body.length - 1);
                
                // 对于非最后一个表达式语句，或者在任何块语句中（非程序顶层），都需要清理栈
                if (!isLastStatement) {
                    this.bytecode.addInstruction(OpCodes.POP);
                }
                // 对于最后一个表达式语句，只有在非程序顶层的情况下才清理
                // 程序顶层的最后一个表达式语句保留返回值
                else {
                    // 在块语句中（比如函数体、循环体等），最后一个表达式语句也需要清理
                    // 只有程序顶层才保留返回值
                    this.bytecode.addInstruction(OpCodes.POP);
                }
            }
        }
        this.exitScope();
    }

    // 字面量
    compileLiteral(node) {
        const constantIndex = this.bytecode.addConstant(node.value);
        this.addInstruction(OpCodes.PUSH, constantIndex, node);
    }

    compileRegExpLiteral(node) {
        const regexpObj = new RegExp(node.pattern, node.flags);
        const constantIndex = this.bytecode.addConstant(regexpObj);
        this.addInstruction(OpCodes.PUSH, constantIndex, node);
    }

    compileTemplateLiteral(node) {
        if (node.expressions.length === 0) {
            const value = node.quasis[0].value.cooked;
            const constantIndex = this.bytecode.addConstant(value);
            this.addInstruction(OpCodes.PUSH, constantIndex, node);
            return;
        }

        let isFirst = true;
        for (let i = 0; i < node.quasis.length; i++) {
            const quasi = node.quasis[i];
            
            if (quasi.value.cooked !== '') {
                const strIndex = this.bytecode.addConstant(quasi.value.cooked);
                this.addInstruction(OpCodes.PUSH, strIndex, node);
                if (!isFirst) this.addInstruction(OpCodes.ADD, null, node);
                isFirst = false;
            }

            if (i < node.expressions.length) {
                this.compileNode(node.expressions[i]);
                const stringIndex = this.bytecode.addConstant('String');
                this.addInstruction(OpCodes.LOAD, stringIndex, node);
                this.addInstruction(OpCodes.CALL, this.bytecode.addConstant(1), node);
                if (!isFirst) this.addInstruction(OpCodes.ADD, null, node);
                isFirst = false;
            }
        }
        
        if (isFirst) {
            const emptyIndex = this.bytecode.addConstant('');
            this.addInstruction(OpCodes.PUSH, emptyIndex, node);
        }
    }

    compileIdentifier(node) {
        const nameIndex = this.bytecode.addConstant(node.name);
        this.addInstruction(OpCodes.LOAD, nameIndex, node);
    }

    compileThisExpression(node) {
        const thisIndex = this.bytecode.addConstant('this');
        this.addInstruction(OpCodes.LOAD, thisIndex, node);
    }

    // 表达式
    compileBinaryExpression(node) {
        this.compileNode(node.left);
        this.compileNode(node.right);
        
        const ops = {
            '+': OpCodes.ADD, '-': OpCodes.SUB, '*': OpCodes.MUL, '/': OpCodes.DIV, '%': OpCodes.MOD,
            '==': OpCodes.EQ, '===': OpCodes.EQ, '!=': OpCodes.NE, '!==': OpCodes.NE,
            '<': OpCodes.LT, '<=': OpCodes.LE, '>': OpCodes.GT, '>=': OpCodes.GE,
            '<<': OpCodes.SHL, '>>': OpCodes.SHR, '>>>': OpCodes.USHR,
            '&': OpCodes.BIT_AND, '|': OpCodes.BIT_OR, '^': OpCodes.BIT_XOR
        };
        
                if (ops[node.operator]) {
            this.addInstruction(ops[node.operator], null, node);
        } else {
            throw new Error(`未支持的二元运算符: ${node.operator}`);
        }
    }

    compileLogicalExpression(node) {
        this.compileNode(node.left);
        
        if (node.operator === '&&') {
            this.bytecode.addInstruction(OpCodes.DUP);
            const skipJump = this.getCurrentAddress();
            this.bytecode.addInstruction(OpCodes.JNF, 0);
            this.bytecode.addInstruction(OpCodes.POP);
            this.compileNode(node.right);
            this.patchInstruction(skipJump, this.getCurrentAddress());
        } else if (node.operator === '||') {
            this.bytecode.addInstruction(OpCodes.DUP);
            const skipJump = this.getCurrentAddress();
            this.bytecode.addInstruction(OpCodes.JIF, 0);
            this.bytecode.addInstruction(OpCodes.POP);
            this.compileNode(node.right);
            this.patchInstruction(skipJump, this.getCurrentAddress());
        } else {
            throw new Error(`未支持的逻辑运算符: ${node.operator}`);
        }
    }

    compileUnaryExpression(node) {
        this.compileNode(node.argument);
        
        const ops = {
            '-': OpCodes.NEG, '!': OpCodes.NOT, '~': OpCodes.BIT_NOT, 'typeof': OpCodes.TYPEOF
        };
        
        if (ops[node.operator]) {
            this.bytecode.addInstruction(ops[node.operator]);
        } else if (node.operator === 'void') {
            this.bytecode.addInstruction(OpCodes.POP);
            const undefinedIndex = this.bytecode.addConstant(undefined);
            this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
        } else if (node.operator === 'delete') {
            this.bytecode.addInstruction(OpCodes.POP);
            const trueIndex = this.bytecode.addConstant(true);
            this.bytecode.addInstruction(OpCodes.PUSH, trueIndex);
        } else {
            throw new Error(`未支持的一元运算符: ${node.operator}`);
        }
    }

    compileUpdateExpression(node) {
        if (node.argument.type === 'Identifier') {
            const varName = node.argument.name;
            const nameIndex = this.bytecode.addConstant(varName);
            
            if (node.prefix) {
                this.bytecode.addInstruction(OpCodes.LOAD, nameIndex);
                const oneIndex = this.bytecode.addConstant(1);
                this.bytecode.addInstruction(OpCodes.PUSH, oneIndex);
                this.bytecode.addInstruction(node.operator === '++' ? OpCodes.ADD : OpCodes.SUB);
                this.bytecode.addInstruction(OpCodes.DUP);
                this.bytecode.addInstruction(OpCodes.STORE, nameIndex);
            } else {
                this.bytecode.addInstruction(OpCodes.LOAD, nameIndex);
                this.bytecode.addInstruction(OpCodes.DUP);
                const oneIndex = this.bytecode.addConstant(1);
                this.bytecode.addInstruction(OpCodes.PUSH, oneIndex);
                this.bytecode.addInstruction(node.operator === '++' ? OpCodes.ADD : OpCodes.SUB);
                this.bytecode.addInstruction(OpCodes.STORE, nameIndex);
            }
        } else if (node.argument.type === 'MemberExpression') {
            // 支持成员表达式的自增/自减：obj.prop++ 或 arr[index]++
            const memberExpr = node.argument;
            
            if (node.prefix) {
                // 前缀自增/自减：++obj.prop 或 ++arr[index]
                // 1. 获取当前值
                this.compileNode(memberExpr);
                
                // 2. 执行自增/自减运算
                const oneIndex = this.bytecode.addConstant(1);
                this.bytecode.addInstruction(OpCodes.PUSH, oneIndex);
                this.bytecode.addInstruction(node.operator === '++' ? OpCodes.ADD : OpCodes.SUB);
                this.bytecode.addInstruction(OpCodes.DUP); // 复制新值用于返回
                
                // 3. 设置新值
                this.compileNode(memberExpr.object);
                if (memberExpr.computed) {
                    this.compileNode(memberExpr.property);
                    this.bytecode.addInstruction(OpCodes.SET_PROP); // 修复：使用SET_PROP而不是SET_ELEM
                } else {
                    const propIndex = this.bytecode.addConstant(memberExpr.property.name);
                    this.bytecode.addInstruction(OpCodes.PUSH, propIndex);
                    this.bytecode.addInstruction(OpCodes.SET_PROP);
                }
                this.bytecode.addInstruction(OpCodes.POP); // 清理SET操作的返回值
            } else {
                // 后缀自增/自减：obj.prop++ 或 arr[index]++
                // 1. 获取当前值
                this.compileNode(memberExpr);
                this.bytecode.addInstruction(OpCodes.DUP); // 复制当前值用于返回
                
                // 2. 执行自增/自减运算
                const oneIndex = this.bytecode.addConstant(1);
                this.bytecode.addInstruction(OpCodes.PUSH, oneIndex);
                this.bytecode.addInstruction(node.operator === '++' ? OpCodes.ADD : OpCodes.SUB);
                
                // 3. 设置新值
                this.compileNode(memberExpr.object);
                if (memberExpr.computed) {
                    this.compileNode(memberExpr.property);
                    this.bytecode.addInstruction(OpCodes.SET_PROP); // 修复：使用SET_PROP而不是SET_ELEM
                } else {
                    const propIndex = this.bytecode.addConstant(memberExpr.property.name);
                    this.bytecode.addInstruction(OpCodes.PUSH, propIndex);
                    this.bytecode.addInstruction(OpCodes.SET_PROP);
                }
                this.bytecode.addInstruction(OpCodes.POP); // 清理SET操作的返回值
            }
        } else {
            throw new Error(`不支持的自增/自减目标类型: ${node.argument.type}`);
        }
    }

    compileAssignmentExpression(node) {
        if (node.operator !== '=') {
            const binaryOp = node.operator.slice(0, -1);
            
            // 对于复合赋值，我们需要先获取当前值，然后执行运算，最后设置新值
            if (node.left.type === 'Identifier') {
                // 简单变量的复合赋值: x += y
                this.compileNode(node.left);  // 加载当前值
                this.compileNode(node.right); // 加载右侧值
                
                // 执行二元运算
                const ops = {
                    '+': OpCodes.ADD, '-': OpCodes.SUB, '*': OpCodes.MUL, '/': OpCodes.DIV, '%': OpCodes.MOD,
                    '<<': OpCodes.SHL, '>>': OpCodes.SHR, '>>>': OpCodes.USHR,
                    '&': OpCodes.BIT_AND, '|': OpCodes.BIT_OR, '^': OpCodes.BIT_XOR
                };
                
                if (ops[binaryOp]) {
                    this.bytecode.addInstruction(ops[binaryOp]);
                } else {
                    throw new Error(`未支持的复合赋值运算符: ${node.operator}`);
                }
                
                // 设置新值
                const varName = node.left.name;
                const nameIndex = this.bytecode.addConstant(varName);
                this.bytecode.addInstruction(OpCodes.DUP);
                this.bytecode.addInstruction(OpCodes.STORE, nameIndex);
            } else if (node.left.type === 'MemberExpression') {
                // 数组/对象属性的复合赋值: arr[i] |= y 
                // 先获取当前值
                this.compileNode(node.left);
                
                // 编译右侧表达式
                this.compileNode(node.right);
                
                // 执行二元运算
                const ops = {
                    '+': OpCodes.ADD, '-': OpCodes.SUB, '*': OpCodes.MUL, '/': OpCodes.DIV, '%': OpCodes.MOD,
                    '<<': OpCodes.SHL, '>>': OpCodes.SHR, '>>>': OpCodes.USHR,
                    '&': OpCodes.BIT_AND, '|': OpCodes.BIT_OR, '^': OpCodes.BIT_XOR
                };
                
                if (ops[binaryOp]) {
                    this.bytecode.addInstruction(ops[binaryOp]);
                } else {
                    throw new Error(`未支持的复合赋值运算符: ${node.operator}`);
                }
                
                // 重新编译左侧用于设置值
                this.compileNode(node.left.object);
                
                if (node.left.computed) {
                    this.compileNode(node.left.property);
                    this.bytecode.addInstruction(OpCodes.SET_PROP); // 修复：使用SET_PROP而不是SET_ELEM
                } else {
                    const propIndex = this.bytecode.addConstant(node.left.property.name);
                    this.bytecode.addInstruction(OpCodes.PUSH, propIndex);
                    this.bytecode.addInstruction(OpCodes.SET_PROP);
                }
            } else {
                throw new Error(`不支持的赋值目标类型: ${node.left.type}`);
            }
        } else {
            // 简单赋值 =
            this.compileNode(node.right);
            
            if (node.left.type === 'Identifier') {
                const varName = node.left.name;
                const nameIndex = this.bytecode.addConstant(varName);
                this.bytecode.addInstruction(OpCodes.DUP);
                this.bytecode.addInstruction(OpCodes.STORE, nameIndex);
            } else if (node.left.type === 'MemberExpression') {
                this.compileNode(node.left.object);
                
                if (node.left.computed) {
                    this.compileNode(node.left.property);
                    this.bytecode.addInstruction(OpCodes.SET_PROP); // 修复：使用SET_PROP而不是SET_ELEM
                } else {
                    const propIndex = this.bytecode.addConstant(node.left.property.name);
                    this.bytecode.addInstruction(OpCodes.PUSH, propIndex);
                    this.bytecode.addInstruction(OpCodes.SET_PROP);
                }
            } else {
                throw new Error(`不支持的赋值目标类型: ${node.left.type}`);
            }
        }
    }

    compileConditionalExpression(node) {
        this.compileNode(node.test);
        const falseJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JNF, 0);
        this.compileNode(node.consequent);
        const endJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        this.patchInstruction(falseJump, this.getCurrentAddress());
        this.compileNode(node.alternate);
        this.patchInstruction(endJump, this.getCurrentAddress());
    }

    compileSequenceExpression(node) {
        for (let i = 0; i < node.expressions.length; i++) {
            this.compileNode(node.expressions[i]);
            if (i < node.expressions.length - 1) {
                this.bytecode.addInstruction(OpCodes.POP);
            }
        }
    }

    compileCallExpression(node) {
        for (let i = node.arguments.length - 1; i >= 0; i--) {
            this.compileNode(node.arguments[i]);
        }
        
        if (node.callee.type === 'MemberExpression') {
            this.compileNode(node.callee.object);
            this.bytecode.addInstruction(OpCodes.DUP);
            
            if (node.callee.computed) {
                this.compileNode(node.callee.property);
            } else {
                const propIndex = this.bytecode.addConstant(node.callee.property.name);
                this.bytecode.addInstruction(OpCodes.PUSH, propIndex);
            }
            
            this.bytecode.addInstruction(OpCodes.GET_PROP);
            this.bytecode.addInstruction(OpCodes.CALL_METHOD, this.bytecode.addConstant(node.arguments.length));
        } else {
            this.compileNode(node.callee);
            this.bytecode.addInstruction(OpCodes.CALL, this.bytecode.addConstant(node.arguments.length));
        }
    }

    compileNewExpression(node) {
        for (let i = node.arguments.length - 1; i >= 0; i--) {
            this.compileNode(node.arguments[i]);
        }
        this.compileNode(node.callee);
        this.bytecode.addInstruction(OpCodes.NEW, this.bytecode.addConstant(node.arguments.length));
    }

    compileMemberExpression(node) {
        this.compileNode(node.object);
        
        if (node.computed) {
            this.compileNode(node.property);
        } else {
            const propertyName = this.bytecode.addConstant(node.property.name);
            this.bytecode.addInstruction(OpCodes.PUSH, propertyName);
        }
        
        this.bytecode.addInstruction(OpCodes.GET_PROP);
    }

    compileArrayExpression(node) {
        for (const element of node.elements) {
            if (element) {
                this.compileNode(element);
            } else {
                const undefinedIndex = this.bytecode.addConstant(undefined);
                this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
            }
        }
        
        const lengthIndex = this.bytecode.addConstant(node.elements.length);
        this.bytecode.addInstruction(OpCodes.PUSH, lengthIndex);
        this.bytecode.addInstruction(OpCodes.NEW_ARR);
    }

    compileObjectExpression(node) {
        for (const property of node.properties) {
            this.compileNode(property.value);
            
            if (property.key.type === 'Identifier' && !property.computed) {
                const keyIndex = this.bytecode.addConstant(property.key.name);
                this.bytecode.addInstruction(OpCodes.PUSH, keyIndex);
            } else {
                this.compileNode(property.key);
            }
        }
        
        const propCountIndex = this.bytecode.addConstant(node.properties.length);
        this.bytecode.addInstruction(OpCodes.PUSH, propCountIndex);
        this.bytecode.addInstruction(OpCodes.NEW_OBJ);
    }

    // 变量和函数
    compileVariableDeclaration(node) {
        for (const declarator of node.declarations) {
            const varName = declarator.id.name;
            this.declareVariable(varName);
            
            if (declarator.init) {
                this.compileNode(declarator.init);
            } else {
                const undefinedIndex = this.bytecode.addConstant(undefined);
                this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
            }
            
            const nameIndex = this.bytecode.addConstant(varName);
            this.bytecode.addInstruction(OpCodes.DECLARE, nameIndex);
        }
    }

    compileFunctionDeclaration(node) {
        const funcName = node.id.name;
        const jumpIndex = this.bytecode.getInstructionCount();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        
        const functionStartAddress = this.bytecode.getInstructionCount();
        const funcInfo = {
            name: funcName,
            params: node.params.map(p => p.name),
            startAddress: functionStartAddress,
            closureScope: this.captureClosure()
        };
        
        this.enterScope();
        for (const param of node.params) {
            this.declareVariable(param.name);
        }
        this.compileNode(node.body);
        
        const undefinedIndex = this.bytecode.addConstant(undefined);
        this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
        this.bytecode.addInstruction(OpCodes.RET);
        this.exitScope();
        
        this.bytecode.instructions[jumpIndex].operand = this.bytecode.getInstructionCount();
        const funcIndex = this.bytecode.addConstant(funcInfo);
        this.bytecode.addInstruction(OpCodes.PUSH, funcIndex);
        const nameIndex = this.bytecode.addConstant(funcName);
        this.bytecode.addInstruction(OpCodes.DECLARE, nameIndex);
    }

    compileFunctionExpression(node) {
        const jumpIndex = this.bytecode.getInstructionCount();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        
        const functionStartAddress = this.bytecode.getInstructionCount();
        const funcInfo = {
            name: node.id ? node.id.name : null,
            params: node.params.map(p => p.name),
            startAddress: functionStartAddress,
            closureScope: this.captureClosure()
        };
        
        this.enterScope();
        if (node.id) this.declareVariable(node.id.name);
        for (const param of node.params) {
            this.declareVariable(param.name);
        }
        this.compileNode(node.body);
        
        const undefinedIndex = this.bytecode.addConstant(undefined);
        this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
        this.bytecode.addInstruction(OpCodes.RET);
        this.exitScope();
        
        this.bytecode.instructions[jumpIndex].operand = this.bytecode.getInstructionCount();
        const funcIndex = this.bytecode.addConstant(funcInfo);
        this.bytecode.addInstruction(OpCodes.PUSH, funcIndex);
    }

    // 控制流语句
    compileReturnStatement(node) {
        if (node.argument) {
            this.compileNode(node.argument);
        } else {
            const undefinedIndex = this.bytecode.addConstant(undefined);
            this.bytecode.addInstruction(OpCodes.PUSH, undefinedIndex);
        }
        this.bytecode.addInstruction(OpCodes.RET);
    }

    compileIfStatement(node) {
        this.compileNode(node.test);
        const elseJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JNF, 0);
        this.compileNode(node.consequent);
        
        if (node.alternate) {
            const endJump = this.getCurrentAddress();
            this.bytecode.addInstruction(OpCodes.JMP, 0);
            this.patchInstruction(elseJump, this.getCurrentAddress());
            this.compileNode(node.alternate);
            this.patchInstruction(endJump, this.getCurrentAddress());
        } else {
            this.patchInstruction(elseJump, this.getCurrentAddress());
        }
    }

    compileWhileStatement(node) {
        const loopStart = this.getCurrentAddress();
        const loopContext = { type: 'while', breakTargets: [], continueTargets: [] };
        this.loopStack.push(loopContext);
        
        this.compileNode(node.test);
        const exitJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JNF, 0);
        loopContext.breakTargets.push(exitJump);
        
        this.compileNode(node.body);
        
        for (const target of loopContext.continueTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.bytecode.addInstruction(OpCodes.JMP, loopStart);
        
        for (const target of loopContext.breakTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.loopStack.pop();
    }

    compileDoWhileStatement(node) {
        const loopStart = this.getCurrentAddress();
        const loopContext = { type: 'do-while', breakTargets: [], continueTargets: [] };
        this.loopStack.push(loopContext);
        
        this.compileNode(node.body);
        
        const continueTarget = this.getCurrentAddress();
        for (const target of loopContext.continueTargets) {
            this.patchInstruction(target, continueTarget);
        }
        
        this.compileNode(node.test);
        this.bytecode.addInstruction(OpCodes.JIF, loopStart);
        
        for (const target of loopContext.breakTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.loopStack.pop();
    }

    compileForStatement(node) {
        this.enterScope();
        const loopContext = { type: 'for', breakTargets: [], continueTargets: [] };
        this.loopStack.push(loopContext);
        
        if (node.init) {
            this.compileNode(node.init);
            // 只有在不是变量声明时才需要POP，因为变量声明会消费栈顶的值
            if (node.init.type !== 'VariableDeclaration') {
                this.addInstruction(OpCodes.POP, null, node.init);
            }
        }
        
        const loopStart = this.getCurrentAddress();
        
        if (node.test) {
            this.compileNode(node.test);
            const exitJump = this.getCurrentAddress();
            this.bytecode.addInstruction(OpCodes.JNF, 0);
            loopContext.breakTargets.push(exitJump);
        }
        
        this.compileNode(node.body);
        
        const continueTarget = this.getCurrentAddress();
        for (const target of loopContext.continueTargets) {
            this.patchInstruction(target, continueTarget);
        }
        
        if (node.update) {
            this.compileNode(node.update);
            this.bytecode.addInstruction(OpCodes.POP);
        }
        
        this.bytecode.addInstruction(OpCodes.JMP, loopStart);
        
        for (const target of loopContext.breakTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.loopStack.pop();
        this.exitScope();
    }

    compileForInStatement(node) {
        this.enterScope();
        const loopContext = { type: 'for-in', breakTargets: [], continueTargets: [] };
        this.loopStack.push(loopContext);
        
        this.compileNode(node.right);
        
        const objectKeysIndex = this.bytecode.addConstant('Object');
        this.bytecode.addInstruction(OpCodes.LOAD, objectKeysIndex);
        const keysIndex = this.bytecode.addConstant('keys');
        this.bytecode.addInstruction(OpCodes.PUSH, keysIndex);
        this.bytecode.addInstruction(OpCodes.GET_PROP);
        this.bytecode.addInstruction(OpCodes.CALL, this.bytecode.addConstant(1));
        
        const indexVar = '__for_in_index__';
        this.declareVariable(indexVar);
        const zeroIndex = this.bytecode.addConstant(0);
        this.bytecode.addInstruction(OpCodes.PUSH, zeroIndex);
        const indexNameIndex = this.bytecode.addConstant(indexVar);
        this.bytecode.addInstruction(OpCodes.DECLARE, indexNameIndex);
        
        const lengthVar = '__for_in_length__';
        this.declareVariable(lengthVar);
        this.bytecode.addInstruction(OpCodes.DUP);
        const lengthPropIndex = this.bytecode.addConstant('length');
        this.bytecode.addInstruction(OpCodes.PUSH, lengthPropIndex);
        this.bytecode.addInstruction(OpCodes.GET_PROP);
        const lengthNameIndex = this.bytecode.addConstant(lengthVar);
        this.bytecode.addInstruction(OpCodes.DECLARE, lengthNameIndex);
        
        const keysVar = '__for_in_keys__';
        this.declareVariable(keysVar);
        const keysNameIndex = this.bytecode.addConstant(keysVar);
        this.bytecode.addInstruction(OpCodes.DECLARE, keysNameIndex);
        
        const loopStart = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.LOAD, indexNameIndex);
        this.bytecode.addInstruction(OpCodes.LOAD, lengthNameIndex);
        this.bytecode.addInstruction(OpCodes.LT);
        
        const exitJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JNF, 0);
        loopContext.breakTargets.push(exitJump);
        
        this.bytecode.addInstruction(OpCodes.LOAD, keysNameIndex);
        this.bytecode.addInstruction(OpCodes.LOAD, indexNameIndex);
        this.bytecode.addInstruction(OpCodes.GET_ELEM);
        
        if (node.left.type === 'VariableDeclaration') {
            const varName = node.left.declarations[0].id.name;
            this.declareVariable(varName);
            const varNameIndex = this.bytecode.addConstant(varName);
            this.bytecode.addInstruction(OpCodes.DECLARE, varNameIndex);
        } else {
            const varName = node.left.name;
            const varNameIndex = this.bytecode.addConstant(varName);
            this.bytecode.addInstruction(OpCodes.STORE, varNameIndex);
        }
        
        this.compileNode(node.body);
        
        const continueTarget = this.getCurrentAddress();
        for (const target of loopContext.continueTargets) {
            this.patchInstruction(target, continueTarget);
        }
        
        this.bytecode.addInstruction(OpCodes.LOAD, indexNameIndex);
        const oneIndex = this.bytecode.addConstant(1);
        this.bytecode.addInstruction(OpCodes.PUSH, oneIndex);
        this.bytecode.addInstruction(OpCodes.ADD);
        this.bytecode.addInstruction(OpCodes.STORE, indexNameIndex);
        
        this.bytecode.addInstruction(OpCodes.JMP, loopStart);
        
        for (const target of loopContext.breakTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.loopStack.pop();
        this.exitScope();
    }

    compileSwitchStatement(node) {
        this.compileNode(node.discriminant);
        
        const switchContext = { type: 'switch', breakTargets: [] };
        this.switchStack.push(switchContext);
        
        const caseJumps = [];
        let defaultJump = null;
        
        for (let i = 0; i < node.cases.length; i++) {
            const caseNode = node.cases[i];
            
            if (caseNode.test) {
                this.bytecode.addInstruction(OpCodes.DUP);
                this.compileNode(caseNode.test);
                this.bytecode.addInstruction(OpCodes.EQ);
                
                const jumpIndex = this.getCurrentAddress();
                this.bytecode.addInstruction(OpCodes.JIF, 0);
                caseJumps.push({ jumpIndex, caseIndex: i });
            } else {
                defaultJump = i;
            }
        }
        
        this.bytecode.addInstruction(OpCodes.POP);
        
        const noMatchJump = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        
        const caseAddresses = [];
        for (let i = 0; i < node.cases.length; i++) {
            caseAddresses[i] = this.getCurrentAddress();
            for (const statement of node.cases[i].consequent) {
                this.compileNode(statement);
            }
        }
        
        for (const { jumpIndex, caseIndex } of caseJumps) {
            this.patchInstruction(jumpIndex, caseAddresses[caseIndex]);
        }
        
        if (defaultJump !== null) {
            this.patchInstruction(noMatchJump, caseAddresses[defaultJump]);
        } else {
            this.patchInstruction(noMatchJump, this.getCurrentAddress());
        }
        
        for (const target of switchContext.breakTargets) {
            this.patchInstruction(target, this.getCurrentAddress());
        }
        
        this.switchStack.pop();
    }

    compileBreakStatement(node) {
        const jumpIndex = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        
        if (this.switchStack.length > 0) {
            const switchContext = this.switchStack[this.switchStack.length - 1];
            switchContext.breakTargets.push(jumpIndex);
        } else if (this.loopStack.length > 0) {
            const loopContext = this.loopStack[this.loopStack.length - 1];
            loopContext.breakTargets.push(jumpIndex);
        } else {
            throw new Error('break语句必须在循环或switch语句内');
        }
    }

    compileContinueStatement(node) {
        const jumpIndex = this.getCurrentAddress();
        this.bytecode.addInstruction(OpCodes.JMP, 0);
        
        if (this.loopStack.length > 0) {
            const loopContext = this.loopStack[this.loopStack.length - 1];
            loopContext.continueTargets.push(jumpIndex);
        } else {
            throw new Error('continue语句必须在循环语句内');
        }
    }

    compileThrowStatement(node) {
        this.compileNode(node.argument);
        this.bytecode.addInstruction(OpCodes.THROW);
    }

    compileTryStatement(node) {
        this.bytecode.addInstruction(OpCodes.TRY);
        this.compileNode(node.block);
        
        if (node.handler) {
            this.bytecode.addInstruction(OpCodes.CATCH);
            this.compileCatchClause(node.handler);
        }
        
        if (node.finalizer) {
            this.bytecode.addInstruction(OpCodes.FINALLY);
            this.compileNode(node.finalizer);
        }
        
        this.bytecode.addInstruction(OpCodes.END_TRY);
    }

    compileCatchClause(node) {
        if (node.param) {
            const paramName = node.param.name;
            this.declareVariable(paramName);
            const nameIndex = this.bytecode.addConstant(paramName);
            this.bytecode.addInstruction(OpCodes.STORE, nameIndex);
        }
        this.compileNode(node.body);
    }

    compileDebuggerStatement(node) {
        this.bytecode.addInstruction(OpCodes.NOP);
        const debugMarkerIndex = this.bytecode.addConstant('__DEBUGGER__');
        this.bytecode.addInstruction(OpCodes.PUSH, debugMarkerIndex);
        this.bytecode.addInstruction(OpCodes.POP);
    }

    // 工具方法
    enterScope() {
        this.scopes.push(new Map());
        this.currentScope++;
    }

    exitScope() {
        this.scopes.pop();
        this.currentScope--;
    }

    declareVariable(name) {
        const currentScopeMap = this.scopes[this.currentScope];
        currentScopeMap.set(name, { scope: this.currentScope, declared: true });
    }

    lookupVariable(name) {
        for (let i = this.currentScope; i >= 0; i--) {
            const scope = this.scopes[i];
            if (scope.has(name)) return scope.get(name);
        }
        return null;
    }

    getCurrentAddress() {
        return this.bytecode.getInstructionCount();
    }

    patchInstruction(address, operand) {
        this.bytecode.instructions[address].operand = operand;
    }

    captureClosure() {
        const closure = new Map();
        for (let i = 0; i <= this.currentScope; i++) {
            const scope = this.scopes[i];
            for (const [varName, varInfo] of scope.entries()) {
                closure.set(varName, { scope: varInfo.scope, declared: varInfo.declared });
            }
        }
        return closure;
    }

    /**
     * 检测当前是否在函数体内
     * @returns {boolean} 是否在函数体内
     */
    isInFunctionBody() {
        // 如果当前作用域大于0，说明在函数内部
        return this.currentScope > 0;
    }

    /**
     * 从AST节点提取调试信息
     * @param {object} node - AST节点
     * @returns {object} 调试信息
     */
    extractDebugInfo(node) {
        if (!this.enableDebugSymbols || !node || !node.loc) return null;
        
        const loc = node.loc;
        const line = loc.start.line;
        const column = loc.start.column;
        
        // 提取源码文本片段
        let sourceText = '';
        if (this.sourceCode && this.bytecode.sourceLines.length > 0) {
            const lines = this.bytecode.sourceLines;
            if (loc.start.line === loc.end.line) {
                // 单行
                const lineText = lines[line - 1] || '';
                sourceText = lineText.substring(column, loc.end.column);
            } else {
                // 多行，取第一行
                const lineText = lines[line - 1] || '';
                sourceText = lineText.substring(column);
                if (sourceText.length > 50) {
                    sourceText = sourceText.substring(0, 50) + '...';
                }
            }
        }
        
        return {
            line,
            column,
            sourceText: sourceText.trim()
        };
    }

    /**
     * 添加带调试信息的指令
     * @param {number} opcode - 操作码
     * @param {any} operand - 操作数
     * @param {object} node - AST节点（用于调试信息）
     */
    addInstruction(opcode, operand = null, node = null) {
        const debugInfo = this.extractDebugInfo(node);
        this.bytecode.addInstruction(opcode, operand, debugInfo);
    }

    /**
     * 设置是否启用调试符号
     * @param {boolean} enable - 是否启用
     */
    setDebugSymbols(enable) {
        this.enableDebugSymbols = enable;
    }
}

module.exports = { Compiler }; 