/**
 * 编码工具类
 */
class CodeTool {

    constructor() {}

    /**
     * //生成随机头
     * @returns {[]}
     */
    static getHeaderArray(headerLength) {
        let harr = [];
        for (let i = 0; i < headerLength; i++) {
            harr[i] = this._getRandomNum();
        }
        return harr;
    }

    /**
     * 生成随机数头
     * @returns {number}
     * @private
     */
    static _getRandomNum() {
        let Range = 80;
        let Rand = Math.random();
        return (50 + Math.round(Rand * Range));
    }

    /**
     * 字符串转byte数组
     * @param str 字符串
     * @param encoding 字符串编码;默认utf8
     * @returns {[]} 字节数组
     */
    static stringToByte(str, encoding) {
        if (encoding === undefined) {
            encoding = "utf8";
        }
        let bytes = [];
        let buffer = Buffer.from(str, encoding);
        for (let i = 0; i < buffer.length; i++) {
            bytes.push(buffer[i]);
        }

        return bytes;
    }

    /**
     * byte数组转字符串
     * @param bytes 字节数组
     * @param encoding 字符串编码;默认utf8
     * @returns {string}
     */
    static byteToString(bytes, encoding) {
        if (encoding === undefined) {
            encoding = "utf8";
        }
        return Buffer.from(bytes).toString(encoding);
    }

    /**
     * 数字转byte数组
     * @param num
     * @returns {number[]}
     */
    static intToBytes(num) {
        return [(num >> 24) & 0x00ff, (num >> 16) & 0x00ff, (num >> 8) & 0x00ff, num & 0x00ff];
    }

    /**
     * byte数组转数字
     * @param bytes
     * @returns {number}
     */
    static bytesToInt(bytes) {
        return bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
    }

    /**
     * varint转数字
     * @param buffer 单个数字的varint编码
     * @returns {number}
     */
    static varintToInt(buffer) {
        let intBuffer = [];
        let highBuffer = [];
        let j = 3;
        let offset = 0;
        for (let i = buffer.length - 1; i >= 0; i--) {
            if (i - 1 >= 0) {
                highBuffer[0] = (buffer[i - 1] << (7 - offset));
            } else {
                highBuffer[0] = 0;
            }
            if (j === -1) {
                break;
            }
            intBuffer[j] = ((buffer[i] & 0x7f) >> offset | highBuffer[0]);
            j--;
            offset++;
        }

        let t = intBuffer[0] << 24 & 0xff000000 | intBuffer[1] << 16 & 0x00ff0000 | intBuffer[2] << 8 & 0x0000ff00 | intBuffer[3] & 0x000000ff;
        t = (t >> 1) ^ -(t & 1);
        return t;
    }

    /**
     * 数字转varint编码
     * @param num
     * @returns {[]|number[]}
     */
    static intToVarint(num) {
        if (num === 0) {
            return [0];
        }

        num = this._zigZagEncoding(num);
        let buffer = [];
        let now;
        let high = 0;
        for (let i = 5; i > 0; i--) {
            now = num >> ((i - 1) * 7) & 0x7f;
            if (high !== 0) {
                now = now | 0x80;
            }
            if (now !== 0) {
                buffer.push(now);
            }
            high = now;
        }
        return buffer;
    }


    /**
     * varint编码转数字数组
     * @param buffer
     * @returns {[]}
     */
    static varintToIntArray(buffer) {
        let varintCode = [];
        let high;
        let bf_index = 0;
        let nums = [];
        for (let i = 0; i < buffer.length; i++) {
            high = 0x00000000 | (buffer[i] >> 7) & 0x01;
            if (high === 0) {
                if (bf_index > 0 && bf_index <= 5) {
                    nums.push(this.varintToInt(varintCode));
                    varintCode = [];
                    bf_index = 0;
                }
            }
            varintCode.push(buffer[i]);
            bf_index++;

        }
        nums.push(this.varintToInt(varintCode));
        return nums;
    }

    /**
     * 数字数组转varint编码buffer
     * @param numArray 数字数组
     * @returns {Buffer} varint编码buffer
     */
    static intArrayToVarintBuffer(numArray) {
        let bytea = [];
        let numBytes;
        for (let i = 0; i < numArray.length; i++) {
            numBytes = this.intToVarint(numArray[i]);
            bytea.push(...numBytes);
        }
        return Buffer.from(bytea);
    }

    /**
     * 负数转正数编码
     * @param num
     * @returns {number}
     * @private
     */
    static _zigZagEncoding(num) {
        return (num >> 31) ^ (num << 1);
    }

}
module.exports = CodeTool;