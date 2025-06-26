/**
 * Token类型定义
 */
const TokenType = {
    // 字面量
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    BOOLEAN: 'BOOLEAN',
    NULL: 'NULL',
    UNDEFINED: 'UNDEFINED',
    
    // 标识符和关键字
    IDENTIFIER: 'IDENTIFIER',
    KEYWORD: 'KEYWORD',
    
    // 运算符
    PLUS: 'PLUS',               // +
    MINUS: 'MINUS',             // -
    MULTIPLY: 'MULTIPLY',       // *
    DIVIDE: 'DIVIDE',           // /
    MODULO: 'MODULO',           // %
    
    ASSIGN: 'ASSIGN',           // =
    PLUS_ASSIGN: 'PLUS_ASSIGN', // +=
    
    EQUAL: 'EQUAL',             // ==
    NOT_EQUAL: 'NOT_EQUAL',     // !=
    STRICT_EQUAL: 'STRICT_EQUAL', // ===
    STRICT_NOT_EQUAL: 'STRICT_NOT_EQUAL', // !==
    
    LESS: 'LESS',               // <
    LESS_EQUAL: 'LESS_EQUAL',   // <=
    GREATER: 'GREATER',         // >
    GREATER_EQUAL: 'GREATER_EQUAL', // >=
    
    LOGICAL_AND: 'LOGICAL_AND', // &&
    LOGICAL_OR: 'LOGICAL_OR',   // ||
    LOGICAL_NOT: 'LOGICAL_NOT', // !
    
    // 分隔符
    SEMICOLON: 'SEMICOLON',     // ;
    COMMA: 'COMMA',             // ,
    DOT: 'DOT',                 // .
    
    LPAREN: 'LPAREN',           // (
    RPAREN: 'RPAREN',           // )
    LBRACE: 'LBRACE',           // {
    RBRACE: 'RBRACE',           // }
    LBRACKET: 'LBRACKET',       // [
    RBRACKET: 'RBRACKET',       // ]
    
    // 特殊
    EOF: 'EOF',
    NEWLINE: 'NEWLINE'
};

/**
 * JavaScript关键字
 */
const Keywords = new Set([
    'var', 'let', 'const', 'function', 'return',
    'if', 'else', 'for', 'while', 'do',
    'true', 'false', 'null', 'undefined',
    'new', 'this', 'typeof', 'instanceof',
    'in', 'of', 'break', 'continue',
    'try', 'catch', 'finally', 'throw'
]);

/**
 * Token类
 */
class Token {
    constructor(type, value, line = 1, column = 1) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
    
    toString() {
        return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
    }
}

/**
 * 词法分析器
 */
class Lexer {
    constructor() {
        this.source = '';
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
    }
    
    /**
     * 对源代码进行词法分析
     * @param {string} source - 源代码
     * @returns {Token[]} Token数组
     */
    tokenize(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        
        while (this.pos < this.source.length) {
            this.scanToken();
        }
        
        this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column));
        return this.tokens;
    }
    
    /**
     * 扫描下一个token
     */
    scanToken() {
        this.resetTokenStart();
        const char = this.advance();
        
        switch (char) {
            // 跳过空白字符
            case ' ':
            case '\r':
            case '\t':
                break;
                
            case '\n':
                this.line++;
                this.column = 1;
                break;
                
            // 单字符token
            case '(':
                this.addToken(TokenType.LPAREN, char);
                break;
            case ')':
                this.addToken(TokenType.RPAREN, char);
                break;
            case '{':
                this.addToken(TokenType.LBRACE, char);
                break;
            case '}':
                this.addToken(TokenType.RBRACE, char);
                break;
            case '[':
                this.addToken(TokenType.LBRACKET, char);
                break;
            case ']':
                this.addToken(TokenType.RBRACKET, char);
                break;
            case ',':
                this.addToken(TokenType.COMMA, char);
                break;
            case '.':
                this.addToken(TokenType.DOT, char);
                break;
            case ';':
                this.addToken(TokenType.SEMICOLON, char);
                break;
            case '+':
                if (this.match('=')) {
                    this.addToken(TokenType.PLUS_ASSIGN, '+=');
                } else {
                    this.addToken(TokenType.PLUS, char);
                }
                break;
            case '-':
                this.addToken(TokenType.MINUS, char);
                break;
            case '*':
                this.addToken(TokenType.MULTIPLY, char);
                break;
            case '/':
                if (this.match('/')) {
                    // 单行注释
                    this.skipLineComment();
                } else if (this.match('*')) {
                    // 多行注释
                    this.skipBlockComment();
                } else {
                    this.addToken(TokenType.DIVIDE, char);
                }
                break;
            case '%':
                this.addToken(TokenType.MODULO, char);
                break;
            case '=':
                if (this.match('=')) {
                    if (this.match('=')) {
                        this.addToken(TokenType.STRICT_EQUAL, '===');
                    } else {
                        this.addToken(TokenType.EQUAL, '==');
                    }
                } else {
                    this.addToken(TokenType.ASSIGN, char);
                }
                break;
            case '!':
                if (this.match('=')) {
                    if (this.match('=')) {
                        this.addToken(TokenType.STRICT_NOT_EQUAL, '!==');
                    } else {
                        this.addToken(TokenType.NOT_EQUAL, '!=');
                    }
                } else {
                    this.addToken(TokenType.LOGICAL_NOT, char);
                }
                break;
            case '<':
                if (this.match('=')) {
                    this.addToken(TokenType.LESS_EQUAL, '<=');
                } else {
                    this.addToken(TokenType.LESS, char);
                }
                break;
            case '>':
                if (this.match('=')) {
                    this.addToken(TokenType.GREATER_EQUAL, '>=');
                } else {
                    this.addToken(TokenType.GREATER, char);
                }
                break;
            case '&':
                if (this.match('&')) {
                    this.addToken(TokenType.LOGICAL_AND, '&&');
                } else {
                    this.error(`未期望的字符: ${char}`);
                }
                break;
            case '|':
                if (this.match('|')) {
                    this.addToken(TokenType.LOGICAL_OR, '||');
                } else {
                    this.error(`未期望的字符: ${char}`);
                }
                break;
            case '"':
            case "'":
                this.scanString(char);
                break;
            default:
                if (this.isDigit(char)) {
                    this.scanNumber();
                } else if (this.isAlpha(char)) {
                    this.scanIdentifier();
                } else {
                    this.error(`未期望的字符: ${char}`);
                }
                break;
        }
    }
    
    /**
     * 扫描字符串字面量
     * @param {string} quote - 引号类型
     */
    scanString(quote) {
        let value = '';
        
        while (this.peek() !== quote && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }
            
            if (this.peek() === '\\') {
                this.advance(); // 跳过反斜杠
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case 'r': value += '\r'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case "'": value += "'"; break;
                    default: value += escaped; break;
                }
            } else {
                value += this.advance();
            }
        }
        
        if (this.isAtEnd()) {
            this.error('未结束的字符串');
        }
        
        // 跳过结束引号
        this.advance();
        
        this.addToken(TokenType.STRING, value);
    }
    
    /**
     * 扫描数字字面量
     */
    scanNumber() {
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        
        // 检查小数点
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance(); // 跳过小数点
            
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        
        const value = this.source.substring(this.tokenStart, this.pos);
        this.addToken(TokenType.NUMBER, parseFloat(value));
    }
    
    /**
     * 扫描标识符或关键字
     */
    scanIdentifier() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        
        const value = this.source.substring(this.tokenStart, this.pos);
        
        if (Keywords.has(value)) {
            // 特殊处理布尔值和null
            if (value === 'true' || value === 'false') {
                this.addToken(TokenType.BOOLEAN, value === 'true');
            } else if (value === 'null') {
                this.addToken(TokenType.NULL, null);
            } else if (value === 'undefined') {
                this.addToken(TokenType.UNDEFINED, undefined);
            } else {
                this.addToken(TokenType.KEYWORD, value);
            }
        } else {
            this.addToken(TokenType.IDENTIFIER, value);
        }
    }
    
    /**
     * 跳过单行注释
     */
    skipLineComment() {
        while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
        }
    }
    
    /**
     * 跳过多行注释
     */
    skipBlockComment() {
        while (!(this.peek() === '*' && this.peekNext() === '/') && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }
            this.advance();
        }
        
        if (this.isAtEnd()) {
            this.error('未结束的块注释');
        }
        
        // 跳过 */
        this.advance();
        this.advance();
    }
    
    /**
     * 添加token
     * @param {string} type - token类型
     * @param {any} value - token值
     */
    addToken(type, value) {
        this.tokens.push(new Token(type, value, this.line, this.tokenColumn || this.column));
    }
    
    /**
     * 前进一个字符
     * @returns {string} 当前字符
     */
    advance() {
        const char = this.source.charAt(this.pos++);
        this.column++;
        return char;
    }
    
    /**
     * 匹配指定字符
     * @param {string} expected - 期望的字符
     * @returns {boolean} 是否匹配
     */
    match(expected) {
        if (this.isAtEnd()) return false;
        if (this.source.charAt(this.pos) !== expected) return false;
        
        this.pos++;
        this.column++;
        return true;
    }
    
    /**
     * 查看当前字符
     * @returns {string} 当前字符
     */
    peek() {
        if (this.isAtEnd()) return '\0';
        return this.source.charAt(this.pos);
    }
    
    /**
     * 查看下一个字符
     * @returns {string} 下一个字符
     */
    peekNext() {
        if (this.pos + 1 >= this.source.length) return '\0';
        return this.source.charAt(this.pos + 1);
    }
    
    /**
     * 是否到达末尾
     * @returns {boolean} 是否到达末尾
     */
    isAtEnd() {
        return this.pos >= this.source.length;
    }
    
    /**
     * 是否为数字字符
     * @param {string} char - 字符
     * @returns {boolean} 是否为数字
     */
    isDigit(char) {
        return char >= '0' && char <= '9';
    }
    
    /**
     * 是否为字母字符
     * @param {string} char - 字符
     * @returns {boolean} 是否为字母
     */
    isAlpha(char) {
        return (char >= 'a' && char <= 'z') ||
               (char >= 'A' && char <= 'Z') ||
               char === '_' || char === '$';
    }
    
    /**
     * 是否为字母数字字符
     * @param {string} char - 字符
     * @returns {boolean} 是否为字母数字
     */
    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }
    
    /**
     * 重置token开始位置
     */
    resetTokenStart() {
        this.tokenStart = this.pos;
        this.tokenColumn = this.column;
    }
    
    /**
     * 报告错误
     * @param {string} message - 错误消息
     */
    error(message) {
        throw new Error(`词法分析错误 (${this.line}:${this.column}): ${message}`);
    }
}

module.exports = {
    TokenType,
    Token,
    Lexer
}; 