/**
 * 图上量算 的 常用静态方法
 * @module MeasureUtil
 */
import Poly from './Poly';
const computeStepSurfaceLine = Poly.computeStepSurfaceLine;
const interPolygon = Poly.interPolygon;
const updateVolume = Poly.updateVolume;
const updateVolumeByMinHeight = Poly.updateVolumeByMinHeight;
/**
 * 求坐标数组的空间距离
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 坐标数组
 * @return {Number} 距离（单位：米）
 */
let getDistance = function (positions) {
    if (!Cesium.defined(positions) || positions.length < 2) {
        return 0;
    }

    let distance = 0;
    for (let i = 1, len = positions.length; i < len; i++) {
        distance += Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
    }
    return distance;
};

/**
 * 求坐标数组的 距离（地球表面弧度的）,
 * 比如北京到纽约（不能穿过球心，是贴地表的线的距离）
 *
 * @export
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} positions 坐标数组
 * @return {Number} 距离（单位：米）
 */
let getSurfaceDistance = function (positions) {
    if (!Cesium.defined(positions) || positions.length < 2) {
        return 0;
    }

    let distance = 0;
    for (let i = 1, len = positions.length; i < len; i++) {
        let c1 = Cesium.Cartographic.fromCartesian(positions[i - 1]);
        let c2 = Cesium.Cartographic.fromCartesian(positions[i]);
        let geodesic = new Cesium.EllipsoidGeodesic();
        geodesic.setEndPoints(c1, c2);
        let s = geodesic.surfaceDistance;
        s = Math.sqrt(Math.pow(s, 2) + Math.pow(c2.height - c1.height, 2));
        distance += s;
    }
    return distance;
}
/**
 * 异步计算贴地距离中，每计算完成2个点之间的距离后 的回调方法
 * @callback getClampDistance_endItem
 * @param {Object} options 参数对象，具有以下属性:
 * @param {Number} options.index  坐标数组的index顺序
 * @param {Cesium.Cartesian3[]} options.positions  当前2个点之间的 贴地坐标数组
 * @param {Number} options.distance  当前2个点之间的 贴地距离
 * @param {Number[]} options.arrDistance  已计算完成从第0点到index点的 每一段的长度数组
 * @param {Number} options.all_distance   已计算完成从第0点到index点的 贴地距离
 */

/**
 * 异步计算贴地距离完成 的回调方法
 * @callback getClampDistance_callback
 * @param {Number} all_distance 路线的全部距离，单位：米
 * @param {Array} arrDistance 每2个点间的 每一段的长度数组
 */

/**
 * 异步计算贴地(地表或模型表面)距离，单位：米
 *
 * @export
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} positions 坐标数组
 * @param {Object} options 参数对象，具有以下属性:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Number} [options.splitNum=100]  插值数，将线段分割的个数
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {getClampDistance_endItem} options.endItem  异步计算贴地距离中，每计算完成2个点之间的距离后 的回调方法
 * @param {getClampDistance_callback} options.callback  异步计算贴地距离完成 的回调方法
 * @return {void}  无
 */
let getClampDistance = function (positions, options) {
    let all_distance = 0;
    let arrDistance = [];

    computeStepSurfaceLine({
        scene: options.scene,
        positions: positions,
        splitNum: options.splitNum,
        has3dtiles: options.has3dtiles,
        //计算每个分段后的回调方法
        endItem: function (raisedPositions, noHeight, index) {
            let distance = getSurfaceDistance(raisedPositions);
            if (noHeight && options.disTerrainScale) {
                distance = distance * options.disTerrainScale; //求高度失败，概略估算值
            }
            all_distance += distance;

            arrDistance.push(distance);

            if (options.endItem) {
                options.endItem({
                    index: index,
                    positions: raisedPositions,
                    distance: distance,
                    arrDistance: arrDistance,
                    all_distance: all_distance,
                });
            }
        },
        //计算全部完成的回调方法
        end: function () {
            if (options.callback) {
                options.callback(all_distance, arrDistance);
            }
        },
    });
}

/**
 * 计算面积（空间平面）
 *
 * @export
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} positions 坐标数组
 * @return {Number} 面积，单位：平方米
 */
let getArea = function (positions) {
    if (!positions || !Array.isArray(positions) || positions.length < 3) {
        return 0;
    }

    let geometry = Cesium.CoplanarPolygonGeometry.createGeometry(
        Cesium.CoplanarPolygonGeometry.fromPositions({
            positions: positions,
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
        })
    );
    let result = 0;
    if (!geometry) {
        return result;
    }
    let flatPositions = geometry.attributes.position.values;
    let indices = geometry.indices;
    for (let i = 0; i < indices.length; i += 3) {
        let p0 = Cesium.Cartesian3.unpack(flatPositions, indices[i] * 3, new Cesium.Cartesian3());
        let p1 = Cesium.Cartesian3.unpack(flatPositions, indices[i + 1] * 3, new Cesium.Cartesian3());
        let p2 = Cesium.Cartesian3.unpack(flatPositions, indices[i + 2] * 3, new Cesium.Cartesian3());
        result += getTriangleArea(p0, p1, p2);
    }
    return result;
};

/**
 * 计算三角形面积（空间平面）
 *
 * @export
 * @param {Cesium.Cartesian3} pos1 三角形顶点坐标1
 * @param {Cesium.Cartesian3} pos2 三角形顶点坐标2
 * @param {Cesium.Cartesian3} pos3 三角形顶点坐标3
 * @return {Number} 面积，单位：平方米
 */
let getTriangleArea = function (pos1, pos2, pos3) {
    // let a = Cesium.Cartesian3.distance(pos1, pos2)
    // let b = Cesium.Cartesian3.distance(pos2, pos3)
    // let c = Cesium.Cartesian3.distance(pos3, pos1)
    // let S = (a + b + c) / 2
    // return Math.sqrt(S * (S - a) * (S - b) * (S - c))

    let v0 = Cesium.Cartesian3.subtract(pos1, pos2, new Cesium.Cartesian3());
    let v1 = Cesium.Cartesian3.subtract(pos3, pos2, new Cesium.Cartesian3());
    let cross = Cesium.Cartesian3.cross(v0, v1, v0);
    return Cesium.Cartesian3.magnitude(cross) * 0.5;
};

/**
 * 异步精确计算贴地面积完成 的回调方法
 * @callback getClampArea_callback
 * @param {Number} area 贴地面积，单位：平方米
 * @param {Object} resultInter 面内进行贴地(或贴模型)插值对象
 */

/**
 * 计算贴地面积
 *
 * @export
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} positions 坐标数组
 * @param {Object} options 参数对象，具有以下属性:
 * @param {Boolean} options.asyn  是否进行异步精确计算
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Number} [options.splitNum=10]  插值数，将面分割的网格数
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {getClampArea_callback} options.callback  异步计算贴地距离完成 的回调方法
 * @return {Number|void} 仅 asyn:false 时返回面积，单位：平方米
 */
let getClampArea = function (positions, options) {
    function _restultArea(resultInter) {
        let area = 0; //总面积(贴地三角面)
        for (let i = 0, len = resultInter.list.length; i < len; i++) {
            let item = resultInter.list[i];
            let pt1 = item.point1;
            let pt2 = item.point2;
            let pt3 = item.point3;

            //求面积
            area += getTriangleArea(pt1.pointDM, pt2.pointDM, pt3.pointDM);
        }
        return area;
    }
    let callback = options.callback;
    let resultInter = interPolygon({
        positions: positions,
        scene: options.scene,
        splitNum: options.splitNum,
        has3dtiles: options.has3dtiles,
        asyn: options.asyn,
        callback: function (resultInter) {
            let area = _restultArea(resultInter);
            if (callback) {
                callback(area, resultInter);
            }
        },
    });

    if (options.asyn) {
        return null;
    } else {
        let area = _restultArea(resultInter);
        if (callback) {
            callback(area, resultInter);
        }
        return area;
    }
};

/**
 * 计算2点的角度值，角度已正北为0度，顺时针为正方向
 *
 * @export
 * @param {Cesium.Cartesian3} startPosition 需要计算的点
 * @param {Cesium.Cartesian3} endPosition 目标点，以该点为参考中心。
 * @param {Boolean} [isNorthZero=false]  是否正东为0时的角度（如方位角）
 * @return {Number} 返回角度值，0-360度
 */
let getAngle = function (startPosition, endPosition, isNorthZero) {
    //获取该位置的默认矩阵
    let mat = Cesium.Transforms.eastNorthUpToFixedFrame(endPosition); //中心点 矩阵
    mat = Cesium.Matrix4.getMatrix3(mat, new Cesium.Matrix3());

    let xaxis = Cesium.Matrix3.getColumn(mat, 0, new Cesium.Cartesian3());
    let yaxis = Cesium.Matrix3.getColumn(mat, 1, new Cesium.Cartesian3());
    let zaxis = Cesium.Matrix3.getColumn(mat, 2, new Cesium.Cartesian3());
    //计算该位置 和  position 的 角度值
    let dir = Cesium.Cartesian3.subtract(startPosition, endPosition, new Cesium.Cartesian3());
    //z crosss (dirx cross z) 得到在 xy平面的向量
    dir = Cesium.Cartesian3.cross(dir, zaxis, dir);
    dir = Cesium.Cartesian3.cross(zaxis, dir, dir);
    dir = Cesium.Cartesian3.normalize(dir, dir);

    let heading = Cesium.Cartesian3.angleBetween(xaxis, dir);
    let ay = Cesium.Cartesian3.angleBetween(yaxis, dir);
    if (ay > Math.PI * 0.5) {
        heading = 2 * Math.PI - heading;
    }
    let hDegrees = 360 - Cesium.Math.toDegrees(heading) - 180; //转换为: 正东为0时，顺时针为正方向
    if (isNorthZero) {
        hDegrees += 90; //转换为：以北为0度
    }
    if (hDegrees < 0) {
        hDegrees = hDegrees + 360;
    } else if (hDegrees > 360) {
        hDegrees = hDegrees - 360;
    }

    return hDegrees.toFixed(1);
};

/**
 * 计算体积（方量分析）
 *
 * @export
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} positions 坐标数组
 * @param {Object} options 参数对象，具有以下属性:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Number} [options.splitNum=10]  插值数，将面分割的网格数
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Number} [options.minHeight]  可以指定最低高度（单位：米）
 * @param {Number} [options.height]  可以指定基准面高度（单位：米）
 * @return {Number} 面积，单位：平方米
 */
let getVolume = function (positions, options) {
    if (!positions || !Array.isArray(positions) || positions.length < 3) {
        return 0;
    }

    function _restultVolume(interPolygonObj) {
        if (options.minHeight) {
            interPolygonObj.minHeight = options.minHeight
        }
        interPolygonObj = updateVolumeByMinHeight(interPolygonObj)

        let _jzmHeight = options.height ?? interPolygonObj.minHeight
        let fillV = updateVolume(interPolygonObj, _jzmHeight)
        let { digVolume = 0, fillVolume = 0, totalVolume = 0, totalArea = 0, maxHeight = 0, minHeight = 0 } = fillV

        let res = { digVolume, fillVolume, totalVolume, totalArea, maxHeight, minHeight }
        if (digVolume < 0) {
            delete res['digVolume']
        }
        if (fillVolume < 0) {
            delete res['fillVolume']
        }
        return res
    }

    let callback = options.callback;
    //计算体积
    let resultInter = interPolygon({
        positions: positions,
        scene: options.scene,
        splitNum: options.splitNum,
        has3dtiles: options.has3dtiles,
        asyn: options.asyn,
        callback: (interPolygonObj) => {
            let result = _restultVolume(interPolygonObj);

            if (callback) {
                callback(result)
            }
        },
    })

    if (options.asyn) {
        return null;
    } else {
        let volume = _restultVolume(resultInter);
        if (callback) {
            callback(volume, resultInter);
        }
        return volume;
    }
};


/**
 * 格式化显示距离值, 可指定单位
 *
 * @export
 * @param {Number} val  距离值，米
 * @param {String} [unit='auto'] 计量单位, 可选值：auto、m、km、mile、zhang 。auto时根据距离值自动选用k或km
 * @return {String} 带单位的格式化距离值字符串，如：20.17 米
 */
let formatDistance = function (val, unit) {
    if (val == null) {
        return "";
    }

    if (unit == null || unit == "auto") {
        if (val < 1000) {
            unit = "m";
        } else {
            unit = "km";
        }
    }

    let valstr = "";
    switch (unit) {
        default:
        case "m":
            valstr = val.toFixed(2) + "_米";
            break;
        case "km":
            valstr = (val * 0.001).toFixed(2) + "_公里";
            break;
        case "mile":
            valstr = (val * 0.00054).toFixed(2) + "_海里";
            break;
        case "zhang":
            valstr = (val * 0.3).toFixed(2) + "_丈";
            break;
    }
    return valstr;
};

/**
 * 格式化显示面积值, 可指定单位
 *
 * @export
 * @param {Number} val 面积值，平方米
 * @param {String} [unit='auto'] 计量单位，可选值：auto、m、km、mu、ha 。auto时根据面积值自动选用m或km
 * @return {String} 带单位的格式化面积值字符串，如：20.21 平方公里
 */
let formatArea = function (val, unit) {
    if (val == null) {
        return "";
    }

    if (unit == null || unit == "auto") {
        if (val < 1000000) {
            unit = "m";
        } else {
            unit = "km";
        }
    }

    let valstr = "";
    switch (unit) {
        default:
        case "m":
            valstr = val.toFixed(2) + "_平方米";
            break;
        case "km":
            valstr = (val / 1000000).toFixed(2) + "_平方公里";
            break;
        case "mu":
            valstr = (val * 0.0015).toFixed(2) + "_亩";
            break;
        case "ha":
            valstr = (val * 0.0001).toFixed(2) + "_公顷";
            break;
    }

    return valstr;
};

/**
 * 格式化显示体积值, 可指定单位
 *
 * @export
 * @param {Number} val 体积值，立方米
 * @param {String} [unit='auto'] 计量单位，当前无用，备用参数
 * @return {String} 带单位的格式化体积值字符串，如：20.21 方
 */
let formatVolume = function (val, unit) {
    if (val == null) {
        return "";
    }

    if (val < 10000) {
        return val.toFixed(2) + "_立方米";
    } else {
        return (val / 10000).toFixed(2) + "_万立方米";
    }
};

export default {getDistance,getSurfaceDistance,getClampDistance,getArea,getTriangleArea,getClampArea,getAngle,
    getVolume,formatDistance,formatArea,formatVolume};