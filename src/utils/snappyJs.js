/**
 * Modules in this bundle
 * @license
 *
 * snappyjs:
 *   license: MIT (http://opensource.org/licenses/MIT)
 *   author: Zhipeng Jia
 *   version: 0.6.0
 *
 * This header is generated by licensify (https://github.com/twada/licensify)
 */
// define(['exports'], function (exports) {

    'use strict'

    var WORD_MASK = [0, 0xff, 0xffff, 0xffffff, 0xffffffff]

    function copyBytes (fromArray, fromPos, toArray, toPos, length) {
        var i
        for (i = 0; i < length; i++) {
            toArray[toPos + i] = fromArray[fromPos + i]
        }
    }

    function selfCopyBytes (array, pos, offset, length) {
        var i
        for (i = 0; i < length; i++) {
            array[pos + i] = array[pos - offset + i]
        }
    }

    function SnappyDecompressor (compressed) {
        this.array = compressed
        this.pos = 0
    }

    SnappyDecompressor.prototype.readUncompressedLength = function () {
        var result = 0
        var shift = 0
        var c, val
        while (shift < 32 && this.pos < this.array.length) {
            c = this.array[this.pos]
            this.pos += 1
            val = c & 0x7f
            if (((val << shift) >>> shift) !== val) {
                return -1
            }
            result |= val << shift
            if (c < 128) {
                return result
            }
            shift += 7
        }
        return -1
    }

    SnappyDecompressor.prototype.uncompressToBuffer = function (outBuffer) {
        var array = this.array
        var arrayLength = array.length
        var pos = this.pos
        var outPos = 0

        var c, len, smallLen
        var offset

        while (pos < array.length) {
            c = array[pos]
            pos += 1
            if ((c & 0x3) === 0) {
                // Literal
                len = (c >>> 2) + 1
                if (len > 60) {
                    if (pos + 3 >= arrayLength) {
                        return false
                    }
                    smallLen = len - 60
                    len = array[pos] + (array[pos + 1] << 8) + (array[pos + 2] << 16) + (array[pos + 3] << 24)
                    len = (len & WORD_MASK[smallLen]) + 1
                    pos += smallLen
                }
                if (pos + len > arrayLength) {
                    return false
                }
                copyBytes(array, pos, outBuffer, outPos, len)
                pos += len
                outPos += len
            } else {
                switch (c & 0x3) {
                    case 1:
                        len = ((c >>> 2) & 0x7) + 4
                        offset = array[pos] + ((c >>> 5) << 8)
                        pos += 1
                        break
                    case 2:
                        if (pos + 1 >= arrayLength) {
                            return false
                        }
                        len = (c >>> 2) + 1
                        offset = array[pos] + (array[pos + 1] << 8)
                        pos += 2
                        break
                    case 3:
                        if (pos + 3 >= arrayLength) {
                            return false
                        }
                        len = (c >>> 2) + 1
                        offset = array[pos] + (array[pos + 1] << 8) + (array[pos + 2] << 16) + (array[pos + 3] << 24)
                        pos += 4
                        break
                    default:
                        break
                }
                if (offset === 0 || offset > outPos) {
                    return false
                }
                selfCopyBytes(outBuffer, outPos, offset, len)
                outPos += len
            }
        }
        return true
    }


    // var snappyJS = {};
    // SnappyDecompressor.prototype.readUncompressedLength = function () {
    //     var result = 0
    //     var shift = 0
    //     var c, val
    //     while (shift < 32 && this.pos < this.array.length) {
    //         c = this.array[this.pos]
    //         this.pos += 1
    //         val = c & 0x7f
    //         if (((val << shift) >>> shift) !== val) {
    //             return -1
    //         }
    //         result |= val << shift
    //         if (c < 128) {
    //             return result
    //         }
    //         shift += 7
    //     }
    //     return -1
    // }
    //
    // SnappyDecompressor.prototype.uncompressToBuffer = function (outBuffer) {
    //     var array = this.array
    //     var arrayLength = array.length
    //     var pos = this.pos
    //     var outPos = 0
    //
    //     var c, len, smallLen
    //     var offset
    //
    //     while (pos < array.length) {
    //         c = array[pos]
    //         pos += 1
    //         if ((c & 0x3) === 0) {
    //             // Literal
    //             len = (c >>> 2) + 1
    //             if (len > 60) {
    //                 if (pos + 3 >= arrayLength) {
    //                     return false
    //                 }
    //                 smallLen = len - 60
    //                 len = array[pos] + (array[pos + 1] << 8) + (array[pos + 2] << 16) + (array[pos + 3] << 24)
    //                 len = (len & WORD_MASK[smallLen]) + 1
    //                 pos += smallLen
    //             }
    //             if (pos + len > arrayLength) {
    //                 return false
    //             }
    //             copyBytes(array, pos, outBuffer, outPos, len)
    //             pos += len
    //             outPos += len
    //         } else {
    //             switch (c & 0x3) {
    //                 case 1:
    //                     len = ((c >>> 2) & 0x7) + 4
    //                     offset = array[pos] + ((c >>> 5) << 8)
    //                     pos += 1
    //                     break
    //                 case 2:
    //                     if (pos + 1 >= arrayLength) {
    //                         return false
    //                     }
    //                     len = (c >>> 2) + 1
    //                     offset = array[pos] + (array[pos + 1] << 8)
    //                     pos += 2
    //                     break
    //                 case 3:
    //                     if (pos + 3 >= arrayLength) {
    //                         return false
    //                     }
    //                     len = (c >>> 2) + 1
    //                     offset = array[pos] + (array[pos + 1] << 8) + (array[pos + 2] << 16) + (array[pos + 3] << 24)
    //                     pos += 4
    //                     break
    //                 default:
    //                     break
    //             }
    //             if (offset === 0 || offset > outPos) {
    //                 return false
    //             }
    //             selfCopyBytes(outBuffer, outPos, offset, len)
    //             outPos += len
    //         }
    //     }
    //     return true
    // }


    function isNode () {
        if (typeof process === 'object') {
            if (typeof process.versions === 'object') {
                if (typeof process.versions.node !== 'undefined') {
                    return true
                }
            }
        }
        return false
    }

    function isUint8Array (object) {
        return object instanceof Uint8Array && (!isNode() || !Buffer.isBuffer(object))
    }

    function isArrayBuffer (object) {
        return object instanceof ArrayBuffer
    }

    function isBuffer (object) {
        if (!isNode()) {
            return false
        }
        return Buffer.isBuffer(object)
    }
    var TYPE_ERROR_MSG = 'Argument compressed must be type of ArrayBuffer, Buffer, or Uint8Array'
    function uncompress (compressed) {
        if (!isUint8Array(compressed) && !isArrayBuffer(compressed) && !isBuffer(compressed)) {
            throw new TypeError(TYPE_ERROR_MSG)
        }
        var uint8Mode = false
        var arrayBufferMode = false
        if (isUint8Array(compressed)) {
            uint8Mode = true
        } else if (isArrayBuffer(compressed)) {
            arrayBufferMode = true
            compressed = new Uint8Array(compressed)
        }
        var decompressor = new SnappyDecompressor(compressed)
        var length = decompressor.readUncompressedLength()
        if (length === -1) {
            throw new Error('Invalid Snappy bitstream')
        }
        var uncompressed, uncompressedView
        if (uint8Mode) {
            uncompressed = new Uint8Array(length)
            if (!decompressor.uncompressToBuffer(uncompressed)) {
                throw new Error('Invalid Snappy bitstream')
            }
        } else if (arrayBufferMode) {
            uncompressed = new ArrayBuffer(length)
            uncompressedView = new Uint8Array(uncompressed)
            if (!decompressor.uncompressToBuffer(uncompressedView)) {
                throw new Error('Invalid Snappy bitstream')
            }
        } else {
            uncompressed = Buffer.alloc(length)
            if (!decompressor.uncompressToBuffer(uncompressed)) {
                throw new Error('Invalid Snappy bitstream')
            }
        }
        return uncompressed
    }

module.exports = uncompress;