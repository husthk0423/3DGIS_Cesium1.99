class LayerContentModel {

    constructor() {
        this.layerHeaderProBuffer = Buffer.alloc(0);
        this.coordinateBufferArray = [];
        this.featureArray = [];
    }

    /**
     * 获取头属性
     * @returns {Buffer}
     */
    getLayerHeaderProBuffer() {
        return this.layerHeaderProBuffer;
    }

    /**
     * 设置头属性
     * @param headerProMap {Buffer}
     */
    setLayerHeaderProBuffer(layerHeaderProBuffer) {
        this.layerHeaderProBuffer = layerHeaderProBuffer;
    }

    /**
     * 获得要素buffer数组
     * @returns {[Buffer]}
     */
    getFeatureArray() {
        return this.featureArray;
    }

    /**
     * 设置要素buffer数组
     * @param featureArray {[Buffer]}
     */
    setFeatureArray(featureArray) {
        this.featureArray = featureArray;
    }

    /**
     * 获得坐标buffer数组
     * @returns {[Buffer]}
     */
    getCoordinateBufferArray() {
        return this.coordinateBufferArray;
    }

    /**
     * 设置坐标buffer数组
     * @param coordinateBufferArray {[Buffer]}
     */
    setCoordinateBufferArray(coordinateBufferArray) {
        this.coordinateBufferArray = coordinateBufferArray;
    }

}

module.exports = LayerContentModel;