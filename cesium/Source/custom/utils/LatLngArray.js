import LatLngPoint from './LatLngPoint';
/**
 * 坐标数组处理类
 *
 * @export
 * @class LatLngArray
 */
class LatLngArray {
    /**
     * 根据传入的各种对象数据数组，转换返回Cartesian3数组
     *
     * @static
     * @param {String[]|Array[]|LatLngPoint[]} value 坐标位置数组
     * @return {Cesium.Cartesian3[]}  转换返回的Cartesian3数组
     */
    static toCartesians(value) {
        if (!Array.isArray(value)) {
            return value;
        }

        let _positions = [];
        value.forEach(function (item) {
            if (item instanceof Cesium.Cartesian3) {
                _positions.push(item);
                return;
            }
            let _point = LatLngPoint.parse(item);
            if (!_point) {
                return;
            }
            _positions.push(_point.toCartesian(true));
        });
        return _positions;
    }

    /**
     * 根据传入的各种对象数据数组，转换返回LatLngPoint数组
     *
     * @static
     * @param {String[]|Array[]|Cesium.Cartesian3[]} value 坐标位置数组
     * @return {LatLngPoint[]}  转换返回的LatLngPoint数组
     */
    static toPoints(value) {
        if (!Array.isArray(value)) {
            return value;
        }

        let _points = [];
        value.forEach(function (item) {
            if (item instanceof LatLngPoint) {
                _points.push(item);
                return;
            }
            let _point = LatLngPoint.parse(item);
            if (!_point) {
                return;
            }
            _points.push(_point);
        });
        return _points;
    }

    /**
     * 根据传入的各种对象数据数组，转换返回经纬度坐标数组
     *
     * @static
     * @param {String[]|Array[]|Cesium.Cartesian3[]} value 坐标位置数组
     * @param {Boolean} noAlt 是否包含高度值
     * @return {Array[]} 经纬度坐标数组,示例：[ [123.123456,32.654321,198.7], [111.123456,22.654321,50.7] ]
     */
    static toArray(value, noAlt) {
        if (!Array.isArray(value)) {
            return value;
        }

        let _points = [];
        value.forEach(function (item) {
            if (Array.isArray(item)) {
                _points.push(item);
                return;
            }

            let _point = LatLngPoint.parse(item);
            if (!_point) {
                return;
            }
            _points.push(_point.toArray(noAlt));
        });
        return _points;
    }
}
export default LatLngArray;