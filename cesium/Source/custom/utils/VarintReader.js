import uncompress from './snappyJs';
import CodeTool from './CodeTool';
import LayerContentModel from './LayerContentModel';
import GisTool from './gistools/GisTools';
/**
 * 瓦片数据解析
 */
class VarintReader {
    /**
     * 构造函数
     * @param vectorVarintBuffer {Buffer} vector或layer格式buffer
     * @param headerLength {number} 数据头长度
     * @param proSizeObj {Object} 要素属性数量
     */
    constructor(vectorVarintBuffer, headerLength, proSizeObj) {
        //缩进长度
        this.headerLength = headerLength;
        //要素属性数量
        this.proSizeObj = proSizeObj;
        //数字类型的byte长度
        this.intLength = 4;
        //瓦片数据的标识
        this.vectorName = "vector";
        //空间类型的key
        this.gTypeKey = "gType";
        //字符串编码
        this.encoding = "utf8";
        //要素属性间隔
        this.featureSpace = "#@";
        //瓦片buffer
        this.vectorVarintBuffer = vectorVarintBuffer;
        //图层buffer
        this.layerMap = new Object();
        //瓦片头带有的属性
        this.vectorHeaderProMap = new Object();
        //图层头带的属性
        this.layerHeaderProMap = new Object();
         this.layerHeaderProBuffer = new Object();
        //图层的空间数据类型
        this.geometyTypeMap = new Object();
        //图层要素
        this.featureMap = new Object();
        this.featureArrayMap = new Object();
        //图层坐标索引buffer
        this.offsetBufferMap = new Object();
        //图层坐标索引数组
        this.offsetArrayMap = new Object();
        //图层坐标
        this.varintMap = new Object();

        this._parseVector(vectorVarintBuffer);
    }

    /**
     * 获取vector的头属性
     * @returns {Object}
     */
    getVectorHeaderProMap() {
        return this.vectorHeaderProMap;
    }

    /**
     * 获取layer的头属性
     * @returns {Object}
     */
    getLayerHeaderProMap() {
        return this.layerHeaderProMap;
    }

    /**
     * 获得图层varint编码buffer
     * @param layerName {string}
     * @returns {Buffer}
     */
    getLayerBuffer(layerName) {
        return this.layerMap[layerName];
    }

    /**
     * 通过要素过滤对应的buffer
     * @param layerName {string}图层名称
     * @param featureIndexArray {[number]}选择的要素数组下标
     * @returns {LayerContentModel}
     */
    getLayerProByFilter(layerName, featureIndexArray) {
        let coordinateBufferArray = [];
        let offsetArray = this.offsetArrayMap[layerName];
        let featureArray = this._lazyParseFeature(layerName);
        let filterArray = [];
        let idx;
        let offset;
        let length;
        let proSize = this.proSizeObj[layerName];
        for (let i = 0; i < featureIndexArray.length; i++) {
            idx = featureIndexArray[i];
            //挑选要素
            filterArray.push(...featureArray[idx]);
            //挑选要素对应的坐标索引
            offset = offsetArray[idx*2];
            length = offsetArray[idx*2 + 1];
            coordinateBufferArray.push(this.varintMap[layerName].slice(offset, offset + length));
        }

        let model = new LayerContentModel();
        model.setLayerHeaderProBuffer(this.layerHeaderProBuffer[layerName]);
        model.setFeatureArray(filterArray);
        model.setCoordinateBufferArray(coordinateBufferArray);

        return model;
    }

    /**
     * 获得图层名称数组
     * @returns {[图层名称1， 图层名称2， ...]}
     */
    getAllLayerNames() {
        let layerNames = [];
        for (let value in this.layerMap) {
            layerNames.push(value);
        }
        return layerNames;
    }


    /**
     * 图层的空间类型
     * @param {string} layerName
     * @returns {any}
     */
    getGeometryType(layerName) {
        return this.geometyTypeMap[layerName];
    }

    /**
     * 获取指定的图层要素属性
     * @param layerName {string} 图层名称
     * @param featureIndex {number}要素数组的下标
     * @returns {*|string[]}
     */
    getLayerProByIndex(layerName, featureIndex) {
        let featureArray = this._lazyParseFeature(layerName);
        return featureArray[featureIndex]
    }

    /**
     * 图层的属性信息
     * @param layerName {string}图层名称
     * @returns {[属性数组]}
     */
    getLayerPro(layerName) {
        return this._lazyParseFeature(layerName);
    }

    /**
     * 获得图层所有坐标数组的偏移量数组
     * @param layerName {string}图层名称
     * @returns {[number]} [属性1字节开始位置，属性1坐标字节长度 ,属性2字节开始位置，属性2坐标字节长度 ,....]
     */
    getOffsetArray(layerName) {
        return this.offsetArrayMap[layerName];
    }

    /**
     * 获得图层某个属性的坐标偏移量数组
     * @param layerName {string}图层名称
     * @param featureIndex {number} 要素所在数组的位置
     * @returns {[属性字节开始位置，属性坐标字节长度]}
     */
    getOffsetByIndex(layerName, featureIndex) {
        let all = this.offsetArrayMap[layerName];

        let arr = [];
        arr.push(all[featureIndex * 2]);
        arr.push(all[featureIndex * 2 + 1]);

        return arr;
    }

    /**
     * 获得图层的所有坐标字节
     * @param layerName {string}图层名称
     * @returns {Buffer}
     */
    getLayerCoordinate(layerName) {
        return this.varintMap[layerName];
    }

    /**
     * 获得要素
     * @param layerName {string}图层名称
     * @returns {[object]} [要素属性数组， 坐标偏移量， 坐标varint数组]
     */
    getLayerFeature(layerName) {
        return [this.featureMap[layerName], this.offsetArrayMap[layerName], this.varintMap[layerName]];
    }

    /**
     * 图层所有数字坐标
     * @param layerName {string} 图层名称
     * @param precision {number} 数字精度
     * @returns {[[number]]} [[要素1坐标],[要素2坐标],...]
     */
    getAllCoordinates(layerName, precision) {
        let ofs = this.offsetArrayMap[layerName];
        let buffer = this.varintMap[layerName];
        let coorArray = [];
        let offset;
        let length;
        let bf;
        for (let i = 0; i < ofs.length / 2; i++) {
            offset = ofs[i * 2];
            length = ofs[i * 2 + 1];
            bf = buffer.slice(offset, offset + length);
            coorArray.push(this._bufferToDoubleArray(bf, precision)[0]);
        }
        return coorArray;
    }

    /**
     * 图层某个要素的数字坐标
     * @param layerName {string}图层名称
     * @param proIndex {[number]} 属性所在数组的位置
     * @param precision {number} 数字精度
     * @returns {[number]} 要素坐标
     */
    getCoordinatesByIndex(layerName, proIndex, precision) {
        let ofs = this.getOffsetByIndex(layerName, proIndex);
        let buffer = this.varintMap[layerName];
        let offset = ofs[0];
        let length = ofs[1];
        let bf = buffer.slice(offset, offset + length);
        return this._bufferToDoubleArray(bf, precision)[0];
    }

    /**
     * 解析瓦片数据
     * @param vectorVarintBuffer {Buffer} varint编码Buffer
     * @private
     */
    _parseVector(vectorVarintBuffer) {
        //读取geometry类型的字节长度
        let offset = this.headerLength;

        let typeLength = vectorVarintBuffer.readInt32BE(offset);
        offset = offset + this.intLength;
        //读取数据类型。vector是多图层结构；其它geometry类型的为单图层结构
        let type = vectorVarintBuffer.slice( offset, offset + typeLength).toString("utf-8");
        offset = offset + typeLength;
        if (type !== this.vectorName) {
            console.error("不是瓦片数据！");
            return;
        }
        //读取vector头属性
        let array = this._parseHeaderPro(vectorVarintBuffer, offset);
        offset = array[0];
        this.vectorHeaderProMap = array[1];

        //读取坐标数据索引字节开始位置
        let indexLength = vectorVarintBuffer.readInt32BE(offset);
        //截取index表述字节
        offset = offset + this.intLength;
        let indexBuffer = vectorVarintBuffer.slice(offset, offset + indexLength);
        //截取数字字节
        offset = offset + indexLength;
        let dataBuffer = vectorVarintBuffer.slice(offset, this.vectorVarintBuffer.length);

        let layerNameLength = 0;
        let layerName;
        let dataLength;
        let dataBegin = 0;
        let begin = 0;
        let end = 0;
        let layerBuffer;
        for (let i = 0; i < indexBuffer.length;) {
            begin = i;
            layerNameLength = indexBuffer.readInt32BE(begin);
            begin = begin + this.intLength;
            end = begin + layerNameLength;
            layerName = indexBuffer.toString(this.encoding, begin, end);
            begin = end;
            dataLength = indexBuffer.readInt32BE(begin);
            begin = begin + this.intLength;
            //截取每个layer的坐标字节段
            layerBuffer = dataBuffer.slice(dataBegin, dataBegin + dataLength);
            dataBegin = dataBegin + dataLength;
            this.layerMap[layerName] = layerBuffer;
            this._parseLayer(layerName, layerBuffer);
            i = begin;
        }
    }

    /**
     * 解析图层Buffer
     * @param layerName 图层名
     * @param buffer varint编码Buffer
     * @private
     */
    _parseLayer(layerName, layerBuffer) {

        if (layerBuffer.length === 0) {
            return;
        }

        let offset = this.headerLength;
        //读取layer头属性
        let array = this._parseHeaderPro(layerBuffer, offset);
        offset = array[0];
        this.layerHeaderProMap[layerName] = array[1];
        this.layerHeaderProBuffer[layerName] = array[2];
        //读取空间类型
        let geometrytype = this.layerHeaderProMap[layerName][this.gTypeKey];
        this.geometyTypeMap[layerName] = geometrytype;
        //要素数组
        let featureLength = layerBuffer.readInt32BE(offset);
        offset = offset + this.intLength;
        let featureBuffer = layerBuffer.slice(offset, offset + featureLength);
        featureBuffer = uncompress(featureBuffer);
        offset = offset + featureLength;
        this.featureMap[layerName]=featureBuffer;
        //读取偏移量数组
        let indexRes = this._parseIndex(layerBuffer, offset);
        offset = indexRes.offset;
        this.offsetBufferMap[layerName]=indexRes.buffer;
        this.offsetArrayMap[layerName]=indexRes.array;
        //读取坐标
        let varintBuf = layerBuffer.slice(offset);
        this.varintMap[layerName]=varintBuf;
    }
        /**
         * 解析头属性
         * @param varintBuffer
         * @param offset
         * @returns {(*|Map<any, any>)[]}
         * @private
         */
    _parseHeaderPro(varintBuffer, offset) {
        let proMap = new Object();
        let headerProLength = varintBuffer.readInt32BE(offset);
        offset = offset + this.intLength;
        let headerProBuffer = varintBuffer.slice(offset, offset + headerProLength);
        offset = offset + headerProLength;
        if (headerProLength == 0) {
            return [offset, proMap];
        }

        let headerProArray = GisTool.Utf8ArrayToStr(uncompress(headerProBuffer)).split(":");

        for (let i = 0; i < headerProArray.length / 2; i++) {
            proMap[headerProArray[i * 2]] = headerProArray[i * 2 + 1];
        }

        return [offset, proMap, headerProBuffer];
    }

    /**
     * 解析偏移量数组
     * @param layerBuffer
     * @param offset
     * @returns {{offset: *, array: *[], buffer: *}}
     * @private
     */
    _parseIndex(layerBuffer, offset) {
        //读取偏移量数组长度
        let length = layerBuffer.readInt32BE(offset);
        offset = offset + this.intLength;
        //截取出偏移量数组
        let buffer = layerBuffer.slice(offset, offset + length);
        offset = offset + length;
        //把varint编码的byte流转换为数组
        let array = CodeTool.varintToIntArray(buffer);
        return {
            "offset": offset,
            "buffer": buffer,
            "array": array
        };
    }

    _lazyParseFeature(layerName) {
        let featureArray = this.featureArrayMap[layerName];
        let proSize = this.proSizeObj[layerName];
        if (featureArray == undefined) {
            let buffer = this.featureMap[layerName];
            let props = [];
            if (buffer.length > 0) {
                props = GisTool.Utf8ArrayToStr(this.featureMap[layerName]).split(this.featureSpace);
            } else {
                this.featureArrayMap[layerName] = [];
                return [];
            }
            let item = [];
            let length = (props.length - 1) / proSize;
            featureArray = [];
            let current = 0;
            let next = current;
            for (let i = 0; i < length; i++) {
                next = current + proSize;
                item = props.slice(current, next);
                featureArray.push(item);
                current = next;
            }
            this.featureArrayMap[layerName] = featureArray;
        }
        return featureArray;
    }

    /**
     * varint坐标转数字坐标
     * @param buffer varint字节数组
     * @param precision 数字精度
     * @returns {[number]} 数字坐标
     * @private
     */
    _bufferToDoubleArray(buffer, precision) {
        let varintCode = [];
        let path = [];
        let high;
        let bf_index = 0;
        let nums = [];
        let oldX = 0;
        let oldY = 0;
        let x;
        let y;
        let isX = true;
        //多循环一次处理最后一段数据
        for (let i = 0; i <= buffer.length; i++) { //buffer.length
            high = 0x00000000 | (buffer[i] >> 7) & 0x01;
            if (high === 0 && bf_index > 0) {
                if (bf_index > 0 && bf_index <= 5) {
                    if (isX) {
                        x = CodeTool.varintToInt(varintCode) + oldX;
                        path.push(x / precision);
                        isX = false;
                        oldX = x;
                    } else {
                        y = CodeTool.varintToInt(varintCode) + oldY;
                        path.push(y / precision);
                        isX = true;
                        oldY = y;
                    }
                    bf_index = 0;
                    varintCode = [];
                } else if (bf_index > 5) { //bf_index > 5为间隔符
                    oldX = 0;
                    oldY = 0;
                    bf_index = 0;
                    varintCode = [];
                    nums.push(path);
                    path = [];
                }
            }

             if (i !== buffer.length){
                varintCode.push(buffer[i]);
                bf_index++;
            } else {
                if (path.length > 0) {
                nums.push(path);
                }
            }
        }
        return nums;
    }

}

export default VarintReader;