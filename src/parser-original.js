const { TokenType } = require('./lexer');

/**
 * AST节点类型
 */
const NodeType = {
    PROGRAM: 'Program',
    LITERAL: 'Literal',
    IDENTIFIER: 'Identifier',
    BINARY_EXPRESSION: 'BinaryExpression',
    UNARY_EXPRESSION: 'UnaryExpression',
    ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
    CALL_EXPRESSION: 'CallExpression',
    MEMBER_EXPRESSION: 'MemberExpression',
    ARRAY_EXPRESSION: 'ArrayExpression',
    OBJECT_EXPRESSION: 'ObjectExpression',
    VARIABLE_DECLARATION: 'VariableDeclaration',
    FUNCTION_DECLARATION: 'FunctionDeclaration',
    RETURN_STATEMENT: 'ReturnStatement',
    EXPRESSION_STATEMENT: 'ExpressionStatement',
    BLOCK_STATEMENT: 'BlockStatement',
    IF_STATEMENT: 'IfStatement',
    WHILE_STATEMENT: 'WhileStatement',
    FOR_STATEMENT: 'ForStatement',
};

/**
 * AST基础节点
 */
class ASTNode {
    constructor(type) {
        this.type = type;
    }
}

/**
 * 程序节点
 */
class Program extends ASTNode {
    constructor(body = []) {
        super(NodeType.PROGRAM);
        this.body = body;
    }
}

/**
 * 字面量节点
 */
class Literal extends ASTNode {
    constructor(value, raw = null) {
        super(NodeType.LITERAL);
        this.value = value;
        this.raw = raw;
    }
}

/**
 * 标识符节点
 */
class Identifier extends ASTNode {
    constructor(name) {
        super(NodeType.IDENTIFIER);
        this.name = name;
    }
}

/**
 * 二元表达式节点
 */
class BinaryExpression extends ASTNode {
    constructor(left, operator, right) {
        super(NodeType.BINARY_EXPRESSION);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

/**
 * 一元表达式节点
 */
class UnaryExpression extends ASTNode {
    constructor(operator, argument, prefix = true) {
        super(NodeType.UNARY_EXPRESSION);
        this.operator = operator;
        this.argument = argument;
        this.prefix = prefix;
    }
}

/**
 * 赋值表达式节点
 */
class AssignmentExpression extends ASTNode {
    constructor(left, operator, right) {
        super(NodeType.ASSIGNMENT_EXPRESSION);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

/**
 * 函数调用表达式节点
 */
class CallExpression extends ASTNode {
    constructor(callee, args = []) {
        super(NodeType.CALL_EXPRESSION);
        this.callee = callee;
        this.arguments = args;
    }
}

/**
 * 成员表达式节点
 */
class MemberExpression extends ASTNode {
    constructor(object, property, computed = false) {
        super(NodeType.MEMBER_EXPRESSION);
        this.object = object;
        this.property = property;
        this.computed = computed;
    }
}

/**
 * 变量声明节点
 */
class VariableDeclaration extends ASTNode {
    constructor(declarations = [], kind = 'var') {
        super(NodeType.VARIABLE_DECLARATION);
        this.declarations = declarations;
        this.kind = kind;
    }
}

/**
 * 函数声明节点
 */
class FunctionDeclaration extends ASTNode {
    constructor(id, params = [], body) {
        super(NodeType.FUNCTION_DECLARATION);
        this.id = id;
        this.params = params;
        this.body = body;
    }
}

/**
 * 返回语句节点
 */
class ReturnStatement extends ASTNode {
    constructor(argument = null) {
        super(NodeType.RETURN_STATEMENT);
        this.argument = argument;
    }
}

/**
 * 表达式语句节点
 */
class ExpressionStatement extends ASTNode {
    constructor(expression) {
        super(NodeType.EXPRESSION_STATEMENT);
        this.expression = expression;
    }
}

/**
 * 块语句节点
 */
class BlockStatement extends ASTNode {
    constructor(body = []) {
        super(NodeType.BLOCK_STATEMENT);
        this.body = body;
    }
}

/**
 * While语句节点
 */
class WhileStatement extends ASTNode {
    constructor(test, body) {
        super(NodeType.WHILE_STATEMENT);
        this.test = test;
        this.body = body;
    }
}

/**
 * For语句节点
 */
class ForStatement extends ASTNode {
    constructor(init, test, update, body) {
        super(NodeType.FOR_STATEMENT);
        this.init = init;
        this.test = test;
        this.update = update;
        this.body = body;
    }
}

/**
 * 运算符优先级
 */
const Precedence = {
    LOWEST: 1,
    LOGICAL_OR: 2,      // ||
    LOGICAL_AND: 3,     // &&
    EQUALITY: 4,        // ==, !=, ===, !==
    COMPARISON: 5,      // <, >, <=, >=
    TERM: 6,            // +, -
    FACTOR: 7,          // *, /, %
    UNARY: 8,           // !, -
    CALL: 9,            // ()
    MEMBER: 10,         // .
    INDEX: 11,          // []
};

/**
 * Token类型到运算符优先级的映射
 */
const tokenPrecedences = {
    [TokenType.LOGICAL_OR]: Precedence.LOGICAL_OR,
    [TokenType.LOGICAL_AND]: Precedence.LOGICAL_AND,
    [TokenType.EQUAL]: Precedence.EQUALITY,
    [TokenType.NOT_EQUAL]: Precedence.EQUALITY,
    [TokenType.STRICT_EQUAL]: Precedence.EQUALITY,
    [TokenType.STRICT_NOT_EQUAL]: Precedence.EQUALITY,
    [TokenType.LESS]: Precedence.COMPARISON,
    [TokenType.LESS_EQUAL]: Precedence.COMPARISON,
    [TokenType.GREATER]: Precedence.COMPARISON,
    [TokenType.GREATER_EQUAL]: Precedence.COMPARISON,
    [TokenType.PLUS]: Precedence.TERM,
    [TokenType.MINUS]: Precedence.TERM,
    [TokenType.MULTIPLY]: Precedence.FACTOR,
    [TokenType.DIVIDE]: Precedence.FACTOR,
    [TokenType.MODULO]: Precedence.FACTOR,
    [TokenType.LPAREN]: Precedence.CALL,
    [TokenType.DOT]: Precedence.MEMBER,
    [TokenType.LBRACKET]: Precedence.INDEX,
};

/**
 * 语法分析器
 */
class Parser {
    constructor() {
        this.tokens = [];
        this.current = 0;
    }

    /**
     * 解析token流生成AST
     * @param {Token[]} tokens - token数组
     * @returns {Program} AST根节点
     */
    parse(tokens) {
        this.tokens = tokens;
        this.current = 0;
        return this.parseProgram();
    }

    /**
     * 解析程序
     * @returns {Program} 程序节点
     */
    parseProgram() {
        const statements = [];
        
        while (!this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }
        
        return new Program(statements);
    }

    /**
     * 解析语句
     * @returns {ASTNode} 语句节点
     */
    parseStatement() {
        if (this.match(TokenType.KEYWORD)) {
            const keyword = this.previous().value;
            
            switch (keyword) {
                case 'var':
                case 'let':
                case 'const':
                    return this.parseVariableDeclaration(keyword);
                case 'function':
                    return this.parseFunctionDeclaration();
                case 'return':
                    return this.parseReturnStatement();
                case 'while':
                    return this.parseWhileStatement();
                case 'for':
                    return this.parseForStatement();
                default:
                    this.error(`未实现的关键字: ${keyword}`);
            }
        }
        
        if (this.check(TokenType.LBRACE)) {
            return this.parseBlockStatement();
        }
        
        return this.parseExpressionStatement();
    }

    /**
     * 解析变量声明
     * @param {string} kind - 声明类型 (var, let, const)
     * @returns {VariableDeclaration} 变量声明节点
     */
    parseVariableDeclaration(kind) {
        const declarations = [];
        
        do {
            const id = this.consume(TokenType.IDENTIFIER, '期望变量名');
            const identifier = new Identifier(id.value);
            
            let init = null;
            if (this.match(TokenType.ASSIGN)) {
                init = this.parseExpression();
            }
            
            declarations.push({
                type: 'VariableDeclarator',
                id: identifier,
                init: init
            });
        } while (this.match(TokenType.COMMA));
        
        // 分号是可选的
        this.match(TokenType.SEMICOLON);
        return new VariableDeclaration(declarations, kind);
    }

    /**
     * 解析函数声明
     * @returns {FunctionDeclaration} 函数声明节点
     */
    parseFunctionDeclaration() {
        const name = this.consume(TokenType.IDENTIFIER, '期望函数名');
        const id = new Identifier(name.value);
        
        this.consume(TokenType.LPAREN, '期望 "("');
        
        const params = [];
        if (!this.check(TokenType.RPAREN)) {
            do {
                const param = this.consume(TokenType.IDENTIFIER, '期望参数名');
                params.push(new Identifier(param.value));
            } while (this.match(TokenType.COMMA));
        }
        
        this.consume(TokenType.RPAREN, '期望 ")"');
        
        const body = this.parseBlockStatement();
        
        return new FunctionDeclaration(id, params, body);
    }

    /**
     * 解析返回语句
     * @returns {ReturnStatement} 返回语句节点
     */
    parseReturnStatement() {
        let argument = null;
        
        if (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
            argument = this.parseExpression();
        }
        
        // 分号是可选的
        this.match(TokenType.SEMICOLON);
        return new ReturnStatement(argument);
    }

    /**
     * 解析表达式语句
     * @returns {ExpressionStatement} 表达式语句节点
     */
    parseExpressionStatement() {
        const expr = this.parseExpression();
        // 分号是可选的
        this.match(TokenType.SEMICOLON);
        return new ExpressionStatement(expr);
    }

    /**
     * 解析块语句
     * @returns {BlockStatement} 块语句节点
     */
    parseBlockStatement() {
        this.consume(TokenType.LBRACE, '期望 "{"');
        
        const statements = [];
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }
        
        this.consume(TokenType.RBRACE, '期望 "}"');
        return new BlockStatement(statements);
    }

    /**
     * 解析while语句
     * @returns {WhileStatement} while语句节点
     */
    parseWhileStatement() {
        this.consume(TokenType.LPAREN, '期望 "("');
        const test = this.parseExpression();
        this.consume(TokenType.RPAREN, '期望 ")"');
        
        const body = this.check(TokenType.LBRACE) ? 
            this.parseBlockStatement() : 
            this.parseStatement();
        
        return new WhileStatement(test, body);
    }

    /**
     * 解析for语句
     * @returns {ForStatement} for语句节点
     */
    parseForStatement() {
        this.consume(TokenType.LPAREN, '期望 "("');
        
        // 初始化部分
        let init = null;
        if (!this.check(TokenType.SEMICOLON)) {
            if (this.check(TokenType.KEYWORD) && this.peek().value === 'var') {
                init = this.parseStatement();
            } else {
                init = this.parseExpression();
                this.consume(TokenType.SEMICOLON, '期望 ";"');
            }
        } else {
            this.advance(); // 跳过分号
        }
        
        // 条件部分
        let test = null;
        if (!this.check(TokenType.SEMICOLON)) {
            test = this.parseExpression();
        }
        this.consume(TokenType.SEMICOLON, '期望 ";"');
        
        // 更新部分
        let update = null;
        if (!this.check(TokenType.RPAREN)) {
            update = this.parseExpression();
        }
        this.consume(TokenType.RPAREN, '期望 ")"');
        
        const body = this.check(TokenType.LBRACE) ? 
            this.parseBlockStatement() : 
            this.parseStatement();
        
        return new ForStatement(init, test, update, body);
    }

    /**
     * 解析表达式
     * @param {number} precedence - 最小优先级
     * @returns {ASTNode} 表达式节点
     */
    parseExpression(precedence = Precedence.LOWEST) {
        let left = this.parsePrimaryExpression();
        
        while (!this.isAtEnd() && precedence < this.peekPrecedence()) {
            const operator = this.advance();
            left = this.parseInfixExpression(left, operator);
        }
        
        return left;
    }

    /**
     * 解析主表达式
     * @returns {ASTNode} 表达式节点
     */
    parsePrimaryExpression() {
        // 处理前缀表达式
        if (this.match(TokenType.LOGICAL_NOT, TokenType.MINUS)) {
            const operator = this.previous();
            const argument = this.parseExpression(Precedence.UNARY);
            return new UnaryExpression(operator.value, argument);
        }
        
        // 处理括号表达式
        if (this.match(TokenType.LPAREN)) {
            const expr = this.parseExpression();
            this.consume(TokenType.RPAREN, '期望 ")"');
            return expr;
        }
        
        // 处理字面量
        if (this.match(TokenType.NUMBER, TokenType.STRING, TokenType.BOOLEAN, TokenType.NULL, TokenType.UNDEFINED)) {
            const token = this.previous();
            return new Literal(token.value);
        }
        
        // 处理标识符
        if (this.match(TokenType.IDENTIFIER)) {
            const token = this.previous();
            return new Identifier(token.value);
        }
        
        this.error(`未期望的token: ${this.peek().type}`);
    }

    /**
     * 解析中缀表达式
     * @param {ASTNode} left - 左表达式
     * @param {Token} operator - 操作符
     * @returns {ASTNode} 表达式节点
     */
    parseInfixExpression(left, operator) {
        if (operator.type === TokenType.LPAREN) {
            // 函数调用
            const args = [];
            if (!this.check(TokenType.RPAREN)) {
                do {
                    args.push(this.parseExpression());
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RPAREN, '期望 ")"');
            return new CallExpression(left, args);
        }
        
        if (operator.type === TokenType.DOT) {
            // 成员表达式
            const property = this.consume(TokenType.IDENTIFIER, '期望属性名');
            return new MemberExpression(left, new Identifier(property.value), false);
        }
        
        if (operator.type === TokenType.ASSIGN) {
            // 赋值表达式
            const right = this.parseExpression(Precedence.LOWEST);
            return new AssignmentExpression(left, operator.value, right);
        }
        
        // 二元表达式
        const precedence = this.getPrecedence(operator.type);
        const right = this.parseExpression(precedence);
        return new BinaryExpression(left, operator.value, right);
    }

    /**
     * 获取运算符优先级
     * @param {string} tokenType - token类型
     * @returns {number} 优先级
     */
    getPrecedence(tokenType) {
        return tokenPrecedences[tokenType] || Precedence.LOWEST;
    }

    /**
     * 查看下一个token的优先级
     * @returns {number} 优先级
     */
    peekPrecedence() {
        return this.getPrecedence(this.peek().type);
    }

    /**
     * 检查当前token类型
     * @param {string} type - token类型
     * @returns {boolean} 是否匹配
     */
    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    /**
     * 匹配并消费token
     * @param {...string} types - token类型列表
     * @returns {boolean} 是否匹配
     */
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    /**
     * 消费指定类型的token
     * @param {string} type - token类型
     * @param {string} message - 错误消息
     * @returns {Token} 被消费的token
     */
    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        
        this.error(message);
    }

    /**
     * 前进到下一个token
     * @returns {Token} 当前token
     */
    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    /**
     * 是否到达token流末尾
     * @returns {boolean} 是否到达末尾
     */
    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }

    /**
     * 查看当前token
     * @returns {Token} 当前token
     */
    peek() {
        return this.tokens[this.current];
    }

    /**
     * 查看上一个token
     * @returns {Token} 上一个token
     */
    previous() {
        return this.tokens[this.current - 1];
    }

    /**
     * 报告错误
     * @param {string} message - 错误消息
     */
    error(message) {
        const token = this.peek();
        throw new Error(`语法分析错误 (${token.line}:${token.column}): ${message}`);
    }
}

module.exports = {
    NodeType,
    ASTNode,
    Program,
    Literal,
    Identifier,
    BinaryExpression,
    UnaryExpression,
    AssignmentExpression,
    CallExpression,
    MemberExpression,
    VariableDeclaration,
    FunctionDeclaration,
    ReturnStatement,
    ExpressionStatement,
    BlockStatement,
    WhileStatement,
    ForStatement,
    Parser
}; 