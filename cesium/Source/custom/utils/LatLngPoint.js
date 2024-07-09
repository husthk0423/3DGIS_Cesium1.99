/**
 * 坐标点类（含经度、纬度、高度）
 *
 * @param {Number} lng 经度值, -180 至 180
 * @param {Number} lat 纬度值, -90 至 90
 * @param {Number} alt 高度（单位：米）
 * @export
 * @class LatLngPoint
 */
class LatLngPoint {
    constructor(lng, lat, alt) {
        this._lng = Number(lng || 0);
        this._lat = Number(lat || 0);
        this._alt = Number(alt || 0);
    }

    /**
     * 经度值, -180 至 180
     * @type {Number}
     */
    get lng() {
        return this._lng;
    }
    set lng(lng) {
        this._lng = +lng;
        this._position = null;
    }

    /**
     * 纬度值, -180 至 180
     * @type {Number}
     */
    get lat() {
        return this._lat;
    }
    set lat(lat) {
        this._lat = +lat;
        this._position = null;
    }

    /**
     * 高度（单位：米）
     * @type {Number}
     */
    get alt() {
        return this._alt || 0;
    }
    set alt(alt) {
        this._alt = +alt;
        this._position = null;
    }

    /**
     * 复制一份对象
     * @return {void}  无
     */
    clone() {
        let position = new LatLngPoint();
        position.lng = this.lng || 0;
        position.lat = this.lat || 0;
        position.alt = this.alt || 0;
        return position;
    }

    /**
     * 格式化对象内的经纬度的小数位为6位，高度小数位为1位。
     *
     * @return {this} 当前对象本身，可以链式调用
     */
    format() {
        this.lng = this.lng.toFixed(LatLngPoint.FormatLength);
        this.lat = this.lat.toFixed(LatLngPoint.FormatLength);
        this.alt = this.alt.toFixed(LatLngPoint.FormatLength);
        return this;
    }

    /**
     * 转换为数组对象
     * @param {Boolean} noAlt 是否包含高度值
     * @returns {Array} 数组对象，示例[113.123456,31.123456,30.1]
     */
    toArray(noAlt) {
        this.format();
        if (noAlt) {
            return [this.lng, this.lat];
        } else {
            return [this.lng, this.lat, this.alt];
        }
    }

    /**
     * 转换为字符串对象
     * @returns {String} 符串，示例 "113.123456,31.123456,30.1"
     */
    toString() {
        this.format();
        return `${this.lng},${this.lat},${this.alt}`;
    }

    /**
     * 转换为笛卡尔坐标
     * @param {Boolean} clone 是否复制
     * @returns {Cesium.Cartesian3} 笛卡尔坐标
     */
    toCartesian(clone = false) {
        if (!clone && this._position) {
            return this._position;
        } else {
            return Cesium.Cartesian3.fromDegrees(this.lng, this.lat, this.alt);
        }
    }

    /**
     * 转换为 地理坐标(弧度制)
     * @returns {Cesium.Cartographic} 地理坐标(弧度制)
     */
    toCartographic() {
        return Cesium.Cartographic.fromDegrees(this.lng, this.lat, this.alt);
    }

    /**
     * 将此属性与提供的属性进行比较并返回, 如果两者相等返回true，否则为false
     * @param {LatLngPoint} [other] 比较的对象
     * @returns {Boolean}  两者是同一个对象
     */
    equals(other) {
        return this === other || (other instanceof LatLngPoint && this._alt == other._alt && this._lat == other._lat && this._lng == other._lng);
    }

    /**
     * 根据传入的各种对象数据，转换返回LatLngPoint对象
     *
     * @static
     * @param {String|Array|Object|Cesium.Cartesian3|*} position 坐标位置
     * @param {Cesium.JulianDate} [time=Cesium.JulianDate.now()] Cesium坐标时，getValue传入的时间值
     * @return {LatLngPoint}  转换返回的LatLngPoint对象
     */
    static parse(position, time) {
        if (!position) {
            return new LatLngPoint();
        }

        let result;
        if (typeof position == "string") {
            result = LatLngPoint.fromString(position);
        } else if (Array.isArray(position)) {
            result = LatLngPoint.fromArray(position);
        } else if (position instanceof LatLngPoint) {
            result = position.clone();
        } else if (Cesium.defined(position.lat) && Cesium.defined(position.lng)) {
            result = new LatLngPoint(position.lng, position.lat, position.alt);
            for (let key in position) {
                result[key] = position[key];
            }
        } else if (position instanceof Cesium.Cartesian3 || position._value || position.getValue) {
            result = LatLngPoint.fromCartesian(position, time);
            result._position = position;
        } else if (Cesium.defined(position.x) && Cesium.defined(position.y) && Cesium.defined(position.z)) {
            position = new Cesium.Cartesian3(position.x, position.y, position.z);
            result = LatLngPoint.fromCartesian(position, time);
            result._position = position;
        } else {
            result = new LatLngPoint();
            console.log("坐标解析失败，请确认参数是否无误", position);
        }
        return result;
    }

    /**
     * 根据传入的各种对象数据，转换返回Cartesian3对象
     *
     * @static
     * @param {String|Array|Object|Cesium.Cartesian3|*} position 坐标位置
     * @param {Cesium.JulianDate} [time=Cesium.JulianDate.now()] Cesium坐标时，getValue传入的时间值
     * @return {Cartesian3}  转换返回的Cartesian3对象
     */
    static parseCartesian3(position, time) {
        return LatLngPoint.parse(position, time).toCartesian();
    }

    /**
     * 根据数组数据，转换返回LatLngPoint对象
     * 示例：[113.123456,31.123456,30.1]
     *
     * @static
     * @param {Array} arr 坐标位置
     * @return {LatLngPoint}  转换返回的LatLngPoint对象
     */
    static fromArray(arr) {
        let position = new LatLngPoint();
        if (Array.isArray(arr)) {
            position.lng = arr[0] || 0;
            position.lat = arr[1] || 0;
            position.alt = arr[2] || 0;
        }
        return position;
    }

    /**
     * 根据传入字符串，转换返回LatLngPoint对象
     * 示例："113.123456,31.123456,30.1"
     * @static
     * @param {String} str 坐标位置字符串，逗号分割。
     * @return {LatLngPoint}  转换返回的LatLngPoint对象
     */
    static fromString(str) {
        let position = new LatLngPoint();
        if (str && typeof str == "string") {
            let arr = str.split(",");
            position = this.fromArray(arr);
        }
        return position;
    }

    /**
     * 根据传入的笛卡尔坐标，转换返回LatLngPoint对象
     *
     * @static
     * @param {Cesium.Cartesian3|*} cartesian 坐标位置
     * @param {Cesium.JulianDate} [time=Cesium.JulianDate.now()] Cesium坐标时，getValue传入的时间值
     * @return {LatLngPoint}  转换返回的LatLngPoint对象
     */
    static fromCartesian(cartesian, time) {
        let result = new LatLngPoint();

        let _position;
        if (cartesian) {
            if (cartesian instanceof Cesium.Cartesian3) {
                _position = cartesian;
            } else if (cartesian._value && cartesian._value instanceof Cesium.Cartesian3) {
                _position = cartesian._value;
            } else if (typeof cartesian.getValue == "function") {
                _position = cartesian.getValue(time || Cesium.JulianDate.now());
            }
        }
        if (_position) {
            let carto = Cesium.Cartographic.fromCartesian(_position);
            if (carto) {
                result.lat = Cesium.Math.toDegrees(carto.latitude);
                result.lng = Cesium.Math.toDegrees(carto.longitude);
                result.alt = carto.height;
                result.format();
            }
        }
        result._position = cartesian;
        return result;
    }

    /**
     * 根据传入的地理坐标(弧度制)，转换返回LatLngPoint对象
     *
     * @static
     * @param {Cesium.Cartographic} cartographic 地理坐标(弧度制)
     * @return {LatLngPoint}  转换返回的LatLngPoint对象
     */
    static fromCartographic(cartographic) {
        let result = new LatLngPoint();
        result.lat = Cesium.Math.toDegrees(cartographic.latitude);
        result.lng = Cesium.Math.toDegrees(cartographic.longitude);
        result.alt = cartographic.height;
        return result;
    }
}

/**
 * 经度纬度的格式化时的长度，默认为6
 * @type {Number}
 */
LatLngPoint.FormatLength = 6;
/**
 * 高度的格式化时的长度，默认为1
 * @type {Number}
 */
LatLngPoint.FormatAltLength = 1;

export default LatLngPoint;
