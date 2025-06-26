/**
 * 纯JavaScript实现的MD5算法
 * 用于测试JSVMP的编译和执行能力
 */

// MD5算法的JavaScript实现
var md5Code = `
(function(global) {
    "use strict";

    /**
     * 32位整数安全加法，防止溢出
     */
    function safeAdd(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /**
     * 位旋转操作
     */
    function bitRotateLeft(value, amount) {
        return (value << amount) | (value >>> (32 - amount));
    }

    /**
     * MD5核心变换函数
     */
    function md5CoreTransform(func, a, b, x, s, t) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, func), safeAdd(x, t)), s), b);
    }

    /**
     * MD5辅助函数F: (x & y) | ((~x) & z)
     */
    function md5FF(a, b, c, d, x, s, t) {
        return md5CoreTransform((b & c) | ((~b) & d), a, b, x, s, t);
    }

    /**
     * MD5辅助函数G: (x & z) | (y & (~z))
     */
    function md5GG(a, b, c, d, x, s, t) {
        return md5CoreTransform((b & d) | (c & (~d)), a, b, x, s, t);
    }

    /**
     * MD5辅助函数H: x ^ y ^ z
     */
    function md5HH(a, b, c, d, x, s, t) {
        return md5CoreTransform(b ^ c ^ d, a, b, x, s, t);
    }

    /**
     * MD5辅助函数I: y ^ (x | (~z))
     */
    function md5II(a, b, c, d, x, s, t) {
        return md5CoreTransform(c ^ (b | (~d)), a, b, x, s, t);
    }

    /**
     * MD5核心计算函数
     */
    function md5Core(blocks, length) {
        // 添加填充位
        blocks[length >> 5] |= 0x80 << (length % 32);
        blocks[(((length + 64) >>> 9) << 4) + 14] = length;
        // MD5初始化常量
        let a = 0x67452301;
        let b = 0xEFCDAB89;
        let c = 0x98BADCFE;
        let d = 0x10325476;

        // 处理每个512位块
        for (let i = 0; i < blocks.length; i += 16) {
            const oldA = a, oldB = b, oldC = c, oldD = d;

            // 第一轮
            a = md5FF(a, b, c, d, blocks[i], 7, 0xD76AA478);
            d = md5FF(d, a, b, c, blocks[i + 1], 12, 0xE8C7B756);
            c = md5FF(c, d, a, b, blocks[i + 2], 17, 0x242070DB);
            b = md5FF(b, c, d, a, blocks[i + 3], 22, 0xC1BDCEEE);
            a = md5FF(a, b, c, d, blocks[i + 4], 7, 0xF57C0FAF);
            d = md5FF(d, a, b, c, blocks[i + 5], 12, 0x4787C62A);
            c = md5FF(c, d, a, b, blocks[i + 6], 17, 0xA8304613);
            b = md5FF(b, c, d, a, blocks[i + 7], 22, 0xFD469501);
            a = md5FF(a, b, c, d, blocks[i + 8], 7, 0x698098D8);
            d = md5FF(d, a, b, c, blocks[i + 9], 12, 0x8B44F7AF);
            c = md5FF(c, d, a, b, blocks[i + 10], 17, 0xFFFF5BB1);
            b = md5FF(b, c, d, a, blocks[i + 11], 22, 0x895CD7BE);
            a = md5FF(a, b, c, d, blocks[i + 12], 7, 0x6B901122);
            d = md5FF(d, a, b, c, blocks[i + 13], 12, 0xFD987193);
            c = md5FF(c, d, a, b, blocks[i + 14], 17, 0xA679438E);
            b = md5FF(b, c, d, a, blocks[i + 15], 22, 0x49B40821);

            // 第二轮
            a = md5GG(a, b, c, d, blocks[i + 1], 5, 0xF61E2562);
            d = md5GG(d, a, b, c, blocks[i + 6], 9, 0xC040B340);
            c = md5GG(c, d, a, b, blocks[i + 11], 14, 0x265E5A51);
            b = md5GG(b, c, d, a, blocks[i], 20, 0xE9B6C7AA);
            a = md5GG(a, b, c, d, blocks[i + 5], 5, 0xD62F105D);
            d = md5GG(d, a, b, c, blocks[i + 10], 9, 0x02441453);
            c = md5GG(c, d, a, b, blocks[i + 15], 14, 0xD8A1E681);
            b = md5GG(b, c, d, a, blocks[i + 4], 20, 0xE7D3FBC8);
            a = md5GG(a, b, c, d, blocks[i + 9], 5, 0x21E1CDE6);
            d = md5GG(d, a, b, c, blocks[i + 14], 9, 0xC33707D6);
            c = md5GG(c, d, a, b, blocks[i + 3], 14, 0xF4D50D87);
            b = md5GG(b, c, d, a, blocks[i + 8], 20, 0x455A14ED);
            a = md5GG(a, b, c, d, blocks[i + 13], 5, 0xA9E3E905);
            d = md5GG(d, a, b, c, blocks[i + 2], 9, 0xFCEFA3F8);
            c = md5GG(c, d, a, b, blocks[i + 7], 14, 0x676F02D9);
            b = md5GG(b, c, d, a, blocks[i + 12], 20, 0x8D2A4C8A);

            // 第三轮
            a = md5HH(a, b, c, d, blocks[i + 5], 4, 0xFFFA3942);
            d = md5HH(d, a, b, c, blocks[i + 8], 11, 0x8771F681);
            c = md5HH(c, d, a, b, blocks[i + 11], 16, 0x6D9D6122);
            b = md5HH(b, c, d, a, blocks[i + 14], 23, 0xFDE5380C);
            a = md5HH(a, b, c, d, blocks[i + 1], 4, 0xA4BEEA44);
            d = md5HH(d, a, b, c, blocks[i + 4], 11, 0x4BDECFA9);
            c = md5HH(c, d, a, b, blocks[i + 7], 16, 0xF6BB4B60);
            b = md5HH(b, c, d, a, blocks[i + 10], 23, 0xBEBFBC70);
            a = md5HH(a, b, c, d, blocks[i + 13], 4, 0x289B7EC6);
            d = md5HH(d, a, b, c, blocks[i], 11, 0xEAA127FA);
            c = md5HH(c, d, a, b, blocks[i + 3], 16, 0xD4EF3085);
            b = md5HH(b, c, d, a, blocks[i + 6], 23, 0x04881D05);
            a = md5HH(a, b, c, d, blocks[i + 9], 4, 0xD9D4D039);
            d = md5HH(d, a, b, c, blocks[i + 12], 11, 0xE6DB99E5);
            c = md5HH(c, d, a, b, blocks[i + 15], 16, 0x1FA27CF8);
            b = md5HH(b, c, d, a, blocks[i + 2], 23, 0xC4AC5665);

            // 第四轮
            a = md5II(a, b, c, d, blocks[i], 6, 0xF4292244);
            d = md5II(d, a, b, c, blocks[i + 7], 10, 0x432AFF97);
            c = md5II(c, d, a, b, blocks[i + 14], 15, 0xAB9423A7);
            b = md5II(b, c, d, a, blocks[i + 5], 21, 0xFC93A039);
            a = md5II(a, b, c, d, blocks[i + 12], 6, 0x655B59C3);
            d = md5II(d, a, b, c, blocks[i + 3], 10, 0x8F0CCC92);
            c = md5II(c, d, a, b, blocks[i + 10], 15, 0xFFEFF47D);
            b = md5II(b, c, d, a, blocks[i + 1], 21, 0x85845DD1);
            a = md5II(a, b, c, d, blocks[i + 8], 6, 0x6FA87E4F);
            d = md5II(d, a, b, c, blocks[i + 15], 10, 0xFE2CE6E0);
            c = md5II(c, d, a, b, blocks[i + 6], 15, 0xA3014314);
            b = md5II(b, c, d, a, blocks[i + 13], 21, 0x4E0811A1);
            a = md5II(a, b, c, d, blocks[i + 4], 6, 0xF7537E82);
            d = md5II(d, a, b, c, blocks[i + 11], 10, 0xBD3AF235);
            c = md5II(c, d, a, b, blocks[i + 2], 15, 0x2AD7D2BB);
            b = md5II(b, c, d, a, blocks[i + 9], 21, 0xEB86D391);

            // 添加本轮结果
            a = safeAdd(a, oldA);
            b = safeAdd(b, oldB);
            c = safeAdd(c, oldC);
            d = safeAdd(d, oldD);
        }

        return [a, b, c, d];
    }

    /**
     * 将32位整数数组转换为二进制字符串
     */
    function binlToStr(bin) {
        let str = "";
        const length = bin.length * 32;
        for (let i = 0; i < length; i += 8) {
            str += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return str;
    }

    /**
     * 将字符串转换为32位整数数组
     */
    function strToBinl(str) {
        const bin = [];
        const length = str.length;
        
        // 初始化数组
        bin[(length >> 2) - 1] = undefined;
        for (let i = 0; i < bin.length; i++) {
            bin[i] = 0;
        }
        
        // 转换字符串
        for (let i = 0; i < length * 8; i += 8) {
            bin[i >> 5] |= (str.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return bin;
    }

    /**
     * 将二进制字符串转换为十六进制字符串
     */
    function binlToHex(binarray) {
        const hexTab = "0123456789abcdef";
        let str = "";
        for (let i = 0; i < binarray.length; i++) {
            const byte = binarray.charCodeAt(i);
            str += hexTab.charAt((byte >>> 4) & 0x0F) + hexTab.charAt(byte & 0x0F);
        }
        return str;
    }

    /**
     * UTF-8编码
     */
    function utf8Encode(string) {
        return unescape(encodeURIComponent(string));
    }

    /**
     * 计算字符串的MD5哈希值（返回二进制字符串）
     */
    function rawMD5(string) {
        const encoded = utf8Encode(string);
        return binlToStr(md5Core(strToBinl(encoded), encoded.length * 8));
    }

    /**
     * 计算字符串的MD5哈希值（返回十六进制字符串）
     */
    function hexMD5(string) {
        return binlToHex(rawMD5(string));
    }

    /**
     * 计算HMAC-MD5（返回二进制字符串）
     */
    function rawHMACMD5(key, data) {
        const encodedKey = utf8Encode(key);
        const encodedData = utf8Encode(data);
        
        let bkey = strToBinl(encodedKey);
        if (bkey.length > 16) {
            bkey = md5Core(bkey, encodedKey.length * 8);
        }

        const ipad = Array(16).fill(0);
        const opad = Array(16).fill(0);
        
        for (let i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        const hash = md5Core(
            ipad.concat(strToBinl(encodedData)), 
            512 + encodedData.length * 8
        );
        
        return binlToStr(md5Core(opad.concat(hash), 512 + 128));
    }

    /**
     * 计算HMAC-MD5（返回十六进制字符串）
     */
    function hexHMACMD5(key, data) {
        return binlToHex(rawHMACMD5(key, data));
    }

    /**
     * 主要的MD5函数
     * @param {string} string - 要哈希的字符串
     * @param {string} [key] - HMAC密钥（可选）
     * @param {boolean} [raw] - 是否返回原始二进制字符串
     * @returns {string} MD5哈希值
     */
    function md5(string, key, raw) {
        if (!key) {
            return raw ? rawMD5(string) : hexMD5(string);
        } else {
            return raw ? rawHMACMD5(key, string) : hexHMACMD5(key, string);
        }
    }

    global.md5 = md5;
    

})(this);
md5("hello")
`;

module.exports = { md5Code }; 