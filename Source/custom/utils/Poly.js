/**
 * 多个点 或 线面数据 相关处理 静态方法
 * @module PolyUtil
 */
import { bezierSpline, booleanPointInPolygon, buffer as turf_buffer, convex as turf_convex} from '@turf/turf';
import PointUtil from './PointUtil';
import PointTrans from './PointTrans';
import LatLngArray from './LatLngArray';
import LatLngPoint from './LatLngPoint';

const cartesians2lonlats = PointTrans.cartesians2lonlats;
const lonlats2cartesians = PointTrans.lonlats2cartesians;

const getMaxHeight = PointUtil.getMaxHeight;
const getOnLinePointByLen = PointUtil.getOnLinePointByLen;
const getSurfaceHeight = PointUtil.getSurfaceHeight;
const setPositionsHeight  =PointUtil.setPositionsHeight;

/**
 * 缓冲分析，求指定 点线面geojson对象 按width半径的 缓冲面对象
 *
 * @export
 * @param {Object} geojson geojson格式对象
 * @param {Number} width 缓冲半径,单位：米
 * @param {Number} [steps=8] 缓冲步幅
 * @return {Object} 缓冲面对象，geojson格式
 */
let buffer = function (geojson, width, steps) {
    //判断tur库是否存在 start
    try {
        if (!turf_buffer) {
            throw new Error("turf不存在");
        }
    } catch (e) {
        console.log("buffer：该方法依赖turf库，请引入该库。", e);
        return geojson;
    }
    //判断tur库是否存在 end

    try {
        width = Cesium.defaultValue(width, 1);

        if (geojson?.geometry?.type == "Polygon") {
            geojson.geometry.coordinates[0].push(geojson.geometry.coordinates[0][0]);
        }

        //API: http://turfjs.org/docs/#buffer
        geojson = turf_buffer(geojson, width, { units: "meters", steps: steps || 8 });
    } catch (e) {
        console.log("PolyUtil buffer:缓冲分析异常", e);
    }
    return geojson;
};

/**
 * 缓冲分析，坐标数组围合面，按width半径的 缓冲新的坐标
 *
 * @export
 * @param {LatLngPoint[]} points 坐标数组
 * @param {Number} width 缓冲半径,单位：米
 * @param {Number} [steps=8] 缓冲步幅
 * @return {LatLngPoint[]} 缓冲后的新坐标数组
 */
let bufferPoints = function (points, width, steps) {
    try {
        width = Cesium.defaultValue(width, 1);

        let coordinates = LatLngArray.toArray(points);
        if (coordinates[0][0] != coordinates[coordinates.length - 1][0] && coordinates[0][1] != coordinates[coordinates.length - 1][1]) {
            coordinates.push(coordinates[0]);
        }

        //API: http://turfjs.org/docs/#buffer
        let polygon = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coordinates] },
        };
        let geojson = turf_buffer(polygon, width, { units: "meters", steps: steps || 8 });

        return LatLngArray.toPoints(geojson.geometry.coordinates[0]);
    } catch (e) {
        console.log("PolyUtil buffer:缓冲分析异常", e);
    }
    return points;
};

/**
 * 求坐标数组的矩形范围内 按 splitNum网格数插值的 granularity值
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 坐标数组
 * @param {Int} [splitNum=10] splitNum网格数
 * @return {Number} granularity值
 */
let getGranularity = function (positions, splitNum = 10) {
    let recta = Cesium.Rectangle.fromCartesianArray(positions);
    let granularity = Math.max(recta.height, recta.width);
    granularity /= splitNum;
    return granularity;
};

/**
 * 面内进行贴地(或贴模型)插值, 返回三角网等计算结果 的回调方法
 * @callback interPolygon_callback
 * @param {Object} [options={}] 参数对象:
 * @param {Number} options.granularity 面内按splitNum网格数插值的granularity值
 * @param {Number} options.maxHeight 面内最大高度
 * @param {Number} options.minHeight 面内最小高度
 * @param {Object[]} options.list  三角网对象数组，每个对象包含三角形的3个顶点(point1\point2\point3)相关值
 */

/**
 * 面内进行贴地(或贴模型)插值, 返回三角网等计算结果
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3[]} options.positions 坐标数组
 * @param {interPolygon_callback} options.callback  异步计算高度完成后 的回调方法
 * @param {Number} [options.splitNum=10] 插值数，横纵等比分割的网格个数
 * @param {Boolean} [options.asyn=false]  是否进行异步精确计算
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {Boolean} [options.onlyPoint=false] truea时，返回结果中只返回点，不返回三角网
 * @return {Object|void} 仅 asyn:false 时返回计算结果值
 */
let interPolygon = function (options) {
    let scene = options.scene;

    //坐标数组
    let positions = [];
    let pos = options.positions;
    for (let i = 0; i < pos.length; i++) {
        positions.push(pos[i].clone());
    }

    //splitNum分割的个数
    let granularity = getGranularity(positions, options.splitNum);

    //插值求面的三角网
    let arrPoly = [];

    let polygonGeometry = new Cesium.PolygonGeometry.fromPositions({
        positions: positions,
        vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
        granularity: granularity,
    });
    let geom = new Cesium.PolygonGeometry.createGeometry(polygonGeometry);

    let i0, i1, i2;
    let cartesian1, cartesian2, cartesian3;
    for (let i = 0; i < geom.indices.length; i += 3) {
        i0 = geom.indices[i];
        i1 = geom.indices[i + 1];
        i2 = geom.indices[i + 2];

        //三角形 点1
        cartesian1 = new Cesium.Cartesian3(
            geom.attributes.position.values[i0 * 3],
            geom.attributes.position.values[i0 * 3 + 1],
            geom.attributes.position.values[i0 * 3 + 2]
        );
        arrPoly.push(cartesian1);

        //三角形 点2
        cartesian2 = new Cesium.Cartesian3(
            geom.attributes.position.values[i1 * 3],
            geom.attributes.position.values[i1 * 3 + 1],
            geom.attributes.position.values[i1 * 3 + 2]
        );
        arrPoly.push(cartesian2);

        //三角形 点3
        cartesian3 = new Cesium.Cartesian3(
            geom.attributes.position.values[i2 * 3],
            geom.attributes.position.values[i2 * 3 + 1],
            geom.attributes.position.values[i2 * 3 + 2]
        );
        arrPoly.push(cartesian3);
    }

    let maxHeight = 0;
    let minHeight = 9999;
    let onlyPoint = Cesium.defaultValue(options.onlyPoint, false); //只返回点，不需要三角网时

    //格式化每个点
    function onFormatPoint(position, noHeight) {
        let height;
        let point;
        let pointDM;
        let carto;

        if (noHeight) {
            delete options.callback;
            height = getSurfaceHeight(scene, position, options);

            carto = Cesium.Cartographic.fromCartesian(position);
            point = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
            pointDM = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, height);
        } else {
            carto = Cesium.Cartographic.fromCartesian(position);
            height = carto.height;

            point = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
            pointDM = position;
        }

        if (maxHeight < height) {
            maxHeight = height;
        }
        if (minHeight > height) {
            minHeight = height;
        }

        return {
            height: height,
            point: point,
            pointDM: pointDM,
        };
    }

    function interCallback(raisedPositions, noHeight) {
        let arrSJW = [];
        let obj1, obj2, obj3;
        for (let i = 0; i < raisedPositions.length; i += 3) {
            //三角形 点1
            obj1 = onFormatPoint(raisedPositions[i], noHeight);
            //三角形 点2
            obj2 = onFormatPoint(raisedPositions[i + 1], noHeight);
            //三角形 点3
            obj3 = onFormatPoint(raisedPositions[i + 2], noHeight);

            if (onlyPoint) {
                //只返回点，不需要三角网
                addPointFoyArrOnly(arrSJW, obj1);
                addPointFoyArrOnly(arrSJW, obj2);
                addPointFoyArrOnly(arrSJW, obj3);
            } else {
                //常规返回，三角网
                arrSJW.push({
                    point1: obj1,
                    point2: obj2,
                    point3: obj3,
                });
            }
        }

        if (Cesium.defined(options.minHeight)) {
            minHeight = Math.max(options.minHeight, minHeight);
            maxHeight = Math.max(maxHeight, minHeight);
        }

        let result = {
            granularity: granularity,
            maxHeight: maxHeight,
            minHeight: minHeight,
            list: arrSJW, //三角网
        };
        let callback = options.callback;
        if (callback) {
            callback(result);
        }

        return result;
    }

    //是否异步求精确高度
    if (options.asyn) {
        //求高度
        return computeSurfacePoints({
            scene: scene,
            positions: arrPoly,
            has3dtiles: options.has3dtiles,
            callback: interCallback,
        });
    } else {
        return interCallback(arrPoly, true);
    }
}

//判断坐标点是否在数组内
function addPointFoyArrOnly(arr, newItem) {
    let isIn = false;
    let point = newItem.point;
    for (let z = 0; z < arr.length; z++) {
        let item = arr[z].point;
        if (point.x == item.x && point.y == item.y && point.z == item.z) {
            isIn = true;
            break;
        }
    }
    if (!isIn) {
        arr.push(newItem);
    }
};

/**
 * 计算面内最大、最小高度值
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 坐标数组
 * @param {Cesium.Scene} scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Object} [options={}] 参数对象:
 * @param {Number} [options.splitNum=10] 插值数，横纵等比分割的网格个数
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @return {Object} 计算面内最大、最小高度值对象，结果示例：{ maxHeight: 100, minHeight: 21 }
 */
let getHeightRange = function (positions, scene, options) {
    let resultInter = interPolygon({
        positions: positions,
        scene: scene,
        ...options,
    });

    return {
        has3dtiles: resultInter._has3dtiles,
        maxHeight: resultInter.maxHeight,
        minHeight: resultInter.minHeight,
    };
}

/**
 * 计算三角形面积（空间平面）
 *
 * @export
 * @param {Cesium.Cartesian3} pos1 三角形顶点坐标1
 * @param {Cesium.Cartesian3} pos2 三角形顶点坐标2
 * @param {Cesium.Cartesian3} pos3 三角形顶点坐标3
 * @return {Number} 面积，单位：平方米
 * @private
 */
function getTriangleArea(pos1, pos2, pos3) {
    let a = Cesium.Cartesian3.distance(pos1, pos2);
    let b = Cesium.Cartesian3.distance(pos2, pos3);
    let c = Cesium.Cartesian3.distance(pos3, pos1);
    let S = (a + b + c) / 2;
    return Math.sqrt(S * (S - a) * (S - b) * (S - c));
}

/**
 * 体积计算
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3[]} options.positions 坐标数组
 * @param {VolumeResult} options.callback  异步计算高度完成后 的回调方法
 * @param {Number} [options.splitNum=10] 插值数，横纵等比分割的网格个数
 * @param {Boolean} [options.asyn=false]  是否进行异步精确计算
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @return {VolumeResult|void} 仅 asyn:false 时返回计算结果值
 */
let computeVolume = function (options) {
    let resultInter = interPolygon(options);
    if (resultInter) {
        resultInter = updateVolumeByMinHeight(resultInter);
    }
    return resultInter;
}

/**
 * 面内进行贴地(或贴模型)插值, 返回三角网等计算结果 的回调方法
 * @callback VolumeResult
 * @param {Object} [options={}] 参数对象:
 * @param {Number} options.granularity 面内按splitNum网格数插值的granularity值
 * @param {Number} options.maxHeight 面内最大高度
 * @param {Number} options.minHeight 面内最小高度
 * @param {Object[]} options.list  三角网对象数组，每个对象包含三角形的3个顶点(point1\point2\point3)相关值
 *
 * @param {Number} options.totalArea 总面积(横截面/投影底面)，执行updateVolumeByMinHeight后赋值
 * @param {Number} options.totalVolume  总体积，执行updateVolumeByMinHeight后赋值
 *
 * @param {Number} options.digVolume  挖方体积，执行updateVolume后赋值
 * @param {Number} options.fillVolume  填方体积，执行updateVolume后赋值
 */

/**
 * 根据 minHeight最低底面高度 计算（或重新计算）填挖方体积
 *
 * @export
 * @param {interPolygon_callback} resultInter 插值完的对象
 * @return {VolumeResult} 计算完成的填挖方体积
 */
let updateVolumeByMinHeight = function (resultInter) {
    let minHeight = resultInter.minHeight;

    let totalArea = 0; //总面积(横截面/投影底面)
    let totalVolume = 0; //总体积

    for (let i = 0, len = resultInter.list.length; i < len; i++) {
        let item = resultInter.list[i];

        let pt1 = item.point1;
        let pt2 = item.point2;
        let pt3 = item.point3;

        //横截面面积
        let bottomArea = getTriangleArea(pt1.point, pt2.point, pt3.point);
        item.area = bottomArea;
        totalArea += bottomArea;

        let height1 = pt1.height;
        let height2 = pt2.height;
        let height3 = pt3.height;
        if (height1 < minHeight) {
            height1 = minHeight;
        }
        if (height2 < minHeight) {
            height2 = minHeight;
        }
        if (height3 < minHeight) {
            height3 = minHeight;
        }

        //挖方体积 （横截面面积 * 3个点的平均高）
        let cutVolume = (bottomArea * (height1 - minHeight + height2 - minHeight + height3 - minHeight)) / 3;
        item.cutVolume = cutVolume;
        totalVolume = totalVolume + cutVolume;
    }

    resultInter.totalArea = totalArea; //总面积(横截面/投影底面)
    resultInter.totalVolume = totalVolume; //总体积

    return resultInter;
}

/**
 * 根据 基准面高度 重新计算填挖方体积
 *
 * @export
 * @param {VolumeResult} resultInter 插值完的对象
 * @param {Number} cutHeight 基准面高度
 * @return {VolumeResult} 重新计算填挖方体积后的对象
 */
let updateVolume = function (resultInter, cutHeight) {
    if (!resultInter) {
        return;
    }

    let minHeight = resultInter.minHeight;
    let totalVolume = resultInter.totalVolume; //总体积

    if (cutHeight <= minHeight) {
        resultInter.fillVolume = 0; //填方体积
        resultInter.digVolume = totalVolume; //挖方体积

        return resultInter;
    }

    let totalV = 0; //底部到基准面的总体积
    let totalBottomV = 0; //挖方体积
    for (let i = 0, len = resultInter.list.length; i < len; i++) {
        let item = resultInter.list[i];

        //底部到基准面的总体积
        totalV += item.area * (cutHeight - minHeight);

        let pt1 = item.point1;
        let pt2 = item.point2;
        let pt3 = item.point3;

        let height1 = pt1.height;
        let height2 = pt2.height;
        let height3 = pt3.height;
        if (height1 < cutHeight) {
            height1 = cutHeight;
        }
        if (height2 < cutHeight) {
            height2 = cutHeight;
        }
        if (height3 < cutHeight) {
            height3 = cutHeight;
        }

        //挖方体积 （横截面面积 * 3个点的平均高）
        totalBottomV += (item.area * (height1 - cutHeight + height2 - cutHeight + height3 - cutHeight)) / 3;
    }

    resultInter.digVolume = totalBottomV; //挖方体积
    resultInter.fillVolume = totalV - (totalVolume - totalBottomV); //填方体积

    return resultInter;
}

/**
 * 获取 圆（或椭圆）边线上的坐标点数组
 *
 * @export
 * @param {Object} [options] 参数对象:
 * @param {Cesium.Cartesian3|LatLngPoint} options.position  圆的中心坐标
 * @param {Number} options.radius  如是圆时，半径（单位：米）
 * @param {Number} options.semiMajorAxis  椭圆时的 长半轴半径（单位：米）
 * @param {Number} options.semiMinorAxis   椭圆时的 短半轴半径（单位：米）
 * @param {Number} [options.count=1]  象限内点的数量，返回的总数为 count*4
 * @param {Number} [options.rotation=0]  旋转的角度
 * @return {Cesium.Cartesian3[]}  边线上的坐标点数组
 */
let getEllipseOuterPositions = function (options) {
    let position = options.position;
    if (!position) {
        return null;
    }
    position = LatLngPoint.parseCartesian3(position);

    let count = Cesium.defaultValue(options.count, 1); //点的数量，总数为count*4
    let semiMajorAxis = Cesium.defaultValue(options.semiMajorAxis, options.radius);
    let semiMinorAxis = Cesium.defaultValue(options.semiMinorAxis, options.radius);
    let rotation = Cesium.defaultValue(options.rotation, 0);

    if (!semiMajorAxis || !semiMinorAxis) {
        return [position, position, position];
    }

    //获取椭圆上的坐标点数组
    let cep = Cesium.EllipseGeometryLibrary.computeEllipsePositions(
        {
            center: position,
            semiMajorAxis: semiMajorAxis, //长半轴
            semiMinorAxis: semiMinorAxis, //短半轴
            rotation: rotation,
            granularity: Math.PI / (16 * count),
        },
        true,
        true
    );

    let arr = cep.outerPositions;
    let positions = [];
    for (let i = 0, len = arr.length; i < len; i += 3) {
        //长半轴上的坐标点
        let pt = new Cesium.Cartesian3(arr[i], arr[i + 1], arr[i + 2]);
        positions.push(pt);
    }
    return positions;
}

/**
 * 格式化Rectangle矩形对象,返回经纬度值
 *
 * @export
 * @param {Cesium.Rectangle} rectangle 矩形对象
 * @param  {Int} [digits=6] 经纬度保留的小数位数
 * @return {Object} 返回经纬度值，示例： { xmin: 73.16895, xmax: 134.86816, ymin: 12.2023, ymax: 54.11485 }
 */
let formatRectangle = function (rectangle, digits = LatLngPoint.FormatLength) {
    let west = Cesium.Math.toDegrees(rectangle.west).toFixed(digits);
    let east = Cesium.Math.toDegrees(rectangle.east).toFixed(digits);
    let north = Cesium.Math.toDegrees(rectangle.north).toFixed(digits);
    let south = Cesium.Math.toDegrees(rectangle.south).toFixed(digits);

    if (west > east) {
        let temp = west;
        west = east;
        east = temp;
    }

    if (south > north) {
        let temp = south;
        south = north;
        north = temp;
    }

    return {
        xmin: west,
        xmax: east,
        ymin: south,
        ymax: north,
    };
}

/**
 * 获取 坐标数组 的 矩形边界值
 *
 * @export
 * @param {Cesium.Cartesian3[]|String[]|Array[]|LatLngPoint[]} positions 坐标数组
 * @param {Boolean} [isFormat=false] 是否格式化，格式化时示例： { xmin: 73.16895, xmax: 134.86816, ymin: 12.2023, ymax: 54.11485 }
 * @return {Cesium.Rectangle|Object} isFormat：true时，返回格式化对象，isFormat：false时返回Cesium.Rectangle对象
 */
let getRectangle = function (positions, isFormat) {
    if (!positions) {
        return null;
    }

    //剔除null值的数据
    for (let i = positions.length - 1; i >= 0; i--) {
        if (!Cesium.defined(positions[i])) {
            positions.splice(i, 1);
        }
    }

    positions = LatLngArray.toCartesians(positions);

    let rectangle = Cesium.Rectangle.fromCartesianArray(positions);
    if (isFormat) {
        return formatRectangle(rectangle);
    } else {
        return rectangle;
    }
}

/**
 * 获取坐标点数组的外接矩形的 4个顶点坐标点（数组）
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions  坐标点数组
 * @param {Number} [rotation=0]  旋转的角度，弧度值
 * @return {Cesium.Cartesian3[]} 4个顶点坐标点
 */
let getPositionsRectVertex =  function (positions, rotation = 0) {
    let rectangle = Cesium.Rectangle.fromCartesianArray(positions);
    let height = getMaxHeight(positions);

    let arr = getRectangleOuterPositions({
        rectangle: rectangle,
        rotation: rotation,
        height: height,
    });
    return arr;
}

/**
 * 获取矩形（含旋转角度）的边线上的4个顶点坐标点数组
 *
 * @export
 * @param {Object} [options] 参数对象:
 * @param {Cesium.Rectangle} options.rectangle  矩形对象
 * @param {Number} [options.rotation=0]  旋转的角度，弧度值
 * @param {Number} [options.height=0]  坐标的高度
 * @param {Number} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE]  granularity值
 * @param {Cesium.Ellipsoid} [options.ellipsoid=Cesium.Ellipsoid.WGS84] 变换中使用固定坐标系的椭球。
 * @return {Cesium.Cartesian3[]} 边线上的4个顶点坐标点数组
 */
let getRectangleOuterPositions = function (options) {
    let rectangle = options.rectangle;
    let rotation = Cesium.defaultValue(options.rotation, 0.0);
    let height = Cesium.defaultValue(options.height, 0.0);

    if (rotation == 0) {
        return [
            Cesium.Cartesian3.fromRadians(rectangle.west, rectangle.south, height),
            Cesium.Cartesian3.fromRadians(rectangle.east, rectangle.south, height),
            Cesium.Cartesian3.fromRadians(rectangle.east, rectangle.north, height),
            Cesium.Cartesian3.fromRadians(rectangle.west, rectangle.north, height),
        ];
    }

    let granularity = Cesium.defaultValue(options.granularity, Cesium.Math.RADIANS_PER_DEGREE);

    let rectangleScratch = new Cesium.Rectangle();
    let nwScratch = new Cesium.Cartographic();
    let computedOptions = Cesium.RectangleGeometryLibrary.computeOptions(rectangle, granularity, rotation, 0, rectangleScratch, nwScratch);

    let w_height = computedOptions.height;
    let w_width = computedOptions.width;
    let ellipsoid = Cesium.defaultValue(options.ellipsoid, Cesium.Ellipsoid.WGS84);

    let scratchRectanglePoints = [new Cesium.Cartesian3(), new Cesium.Cartesian3(), new Cesium.Cartesian3(), new Cesium.Cartesian3()];

    Cesium.RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, 0, 0, scratchRectanglePoints[0]);
    Cesium.RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, 0, w_width - 1, scratchRectanglePoints[1]);

    Cesium.RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, w_height - 1, w_width - 1, scratchRectanglePoints[2]);

    Cesium.RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, w_height - 1, 0, scratchRectanglePoints[3]);

    if (height != 0) {
        scratchRectanglePoints = setPositionsHeight(scratchRectanglePoints, height);
    }

    return scratchRectanglePoints;
}

/**
 * 根据传入中心点、高宽或角度，计算矩形面的顶点坐标。
 *
 * @export
 * @param {Object} [options] 参数对象:
 * @param {Cesium.Cartesian3} options.center  中心坐标
 * @param {Number} [options.width]  矩形的宽度，单位：米
 * @param {Number} [options.height]  矩形的高度，单位：米
 * @param {Number} [options.rotation=0]  旋转的角度
 * @param {Number} [options.originX=0.5]  中心点所在的位置x轴方向比例，取值范围：0.1-1.0
 * @param {Number} [options.originY=0.5]  中心点所在的位置y轴方向比例，取值范围：0.1-1.0
 * @return {Cesium.Cartesian3[]}  矩形面的顶点坐标数组
 */
let getRectPositionsByCenter = function (options) {
    let center = options.center;
    let width = options.width;
    let height = options.height;
    let rotation = Cesium.defaultValue(options.rotation, 0);
    let originX = Cesium.defaultValue(options.originX, 0.5);
    let originY = Cesium.defaultValue(options.originY, 0.5);

    let scratchEnuMatrix = new Cesium.Matrix4();
    let scratchRotationQuat = new Cesium.Quaternion();
    let scratchSrtMatrix = new Cesium.Matrix4();

    let localPositions = [
        Cesium.Cartesian3.fromElements(-originX, -originY, 0.0),
        Cesium.Cartesian3.fromElements(1.0 - originX, -originY, 0.0),
        Cesium.Cartesian3.fromElements(1.0 - originX, 1.0 - originY, 0.0),
        Cesium.Cartesian3.fromElements(-originX, 1.0 - originY, 0.0),
    ];

    let enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center, Cesium.Ellipsoid.WGS84, scratchEnuMatrix);

    let rotationQuat = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, rotation, scratchRotationQuat);
    let cmftqrs = Cesium.Matrix4.fromTranslationQuaternionRotationScale;
    let srtMatrix = cmftqrs(Cesium.Cartesian3.ZERO, rotationQuat, Cesium.Cartesian3.fromElements(width, height), scratchSrtMatrix);

    let modelMatrix = Cesium.Matrix4.multiply(enuMatrix, srtMatrix, srtMatrix);

    let result = [];
    localPositions.forEach(function (lp, index) {
        if (typeof result[index] == "undefined") {
            result[index] = new Cesium.Cartesian3();
        }
        Cesium.Matrix4.multiplyByPoint(modelMatrix, lp, result[index]);
    });

    return result;
}

/**
 * 判断点是否 多边形内
 *
 * @param {Cesium.Cartesian3|LatLngPoint} position 需要判断的点
 * @param {Cesium.Cartesian3[]|LatLngPoint[]} coordinates 多边形的边界点
 * @return {Boolean} 是否在多边形内
 */
let isInPoly = function (position, coordinates) {
    //判断tur库是否存在 start
    try {
        if (!booleanPointInPolygon) {
            throw new Error("turf不存在");
        }
    } catch (e) {
        console.log("isInPoly：该方法依赖turf库，请引入该库。", e);
        return false;
    }
    //判断tur库是否存在 end

    let pt = {
        type: "Feature",
        geometry: { type: "Point", coordinates: LatLngPoint.parse(position).toArray() },
    };
    let poly = { type: "Polygon", coordinates: [LatLngArray.toArray(coordinates)] };
    return booleanPointInPolygon(pt, poly); //turf插件计算的
}

/**
 * 求贝塞尔曲线坐标
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 坐标数组
 * @param {Boolean} [closure=fasle] 是否闭合曲线
 * @return {Cesium.Cartesian3[]} 坐标数组
 */
let getBezierCurve = function (positions, closure) {
    if (!positions || positions.length < 3) {
        return positions;
    }

    let coordinates = cartesians2lonlats(positions);
    if (closure) {
        //闭合曲线
        coordinates.push(coordinates[0]);
    }
    let defHeight = coordinates[coordinates.length - 1][2];

    //判断tur库是否存在 start
    try {
        if (!bezierSpline) {
            throw new Error("turf不存在");
        }
    } catch (e) {
        console.log("getBezierCurve：该方法依赖turf库，请引入该库。", e);
        return positions;
    }
    //判断tur库是否存在 end

    let curved = bezierSpline({
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: coordinates,
        },
    });
    let result = lonlats2cartesians(curved.geometry.coordinates, defHeight);
    if (closure) {
        result.push(result[0]);
    }
    return result;
}

/**
 * 对路线进行平面等比插值，高度：指定的固定height值 或 按贴地高度。
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} options.positions 坐标数组
 * @param {Number} [options.splitNum=100] 插值数，等比分割的个数
 * @param {Number} [options.minDistance=null] 插值最小间隔(单位：米)，优先级高于splitNum
 * @param {Number} [options.height=0] 坐标的高度
 * @param {Boolean} [options.surfaceHeight=true] 是否计算贴地高度 （非精确计算，根据当前加载的地形和模型数据情况有关）
 * @return {Cesium.Cartesian3[]} 插值后的路线坐标数组
 */
let interPolyline = function (options) {
    let positions = options.positions;
    let scene = options.scene;

    let granularity = getGranularity(positions, options.splitNum || 100);
    if (granularity <= 0) {
        granularity = null;
    }

    let flatPositions = Cesium.PolylinePipeline.generateArc({
        positions: positions,
        height: options.height, //未传入时，内部默认为0
        minDistance: options.minDistance, //插值间隔(米)，优先级高于granularity
        granularity: granularity, //splitNum分割的个数
    });

    let arr = [];
    for (let i = 0; i < flatPositions.length; i += 3) {
        let position = Cesium.Cartesian3.unpack(flatPositions, i);
        if (scene && Cesium.defaultValue(options.surfaceHeight, true)) {
            delete options.callback;
            let height = getSurfaceHeight(scene, position, options);
            let car = Cesium.Cartographic.fromCartesian(position);
            position = Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, height);
        }
        arr.push(position);
    }
    return arr;
}

/**
 * 对路线进行按空间等比插值，高度：高度值按各点的高度等比计算
 * 比如：用于航线的插值运算
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 坐标数组
 * @param {Object} [options={}] 参数对象:
 * @param {Number} [options.splitNum] 插值数，等比分割的个数，默认不插值
 * @param {Number} [options.minDistance] 插值时的最小间隔(单位：米)，优先级高于splitNum
 * @return {Cesium.Cartesian3[]} 插值后的坐标对象
 */
let interLine = function (positions, options = {}) {
    if (!positions || positions.length < 2) {
        return positions;
    }

    let granularity;
    if (options.splitNum) {
        //splitNum分割的个数
        granularity = getGranularity(positions, options.splitNum);
        if (granularity <= 0) {
            granularity = null;
        }
    }

    let arr = [positions[0]];
    for (let index = 1, length = positions.length; index < length; index++) {
        let startP = positions[index - 1];
        let endP = positions[index];

        let interPositions = Cesium.PolylinePipeline.generateArc({
            positions: [startP, endP],
            minDistance: options.minDistance, //插值间隔(米)，优先级高于granularity
            granularity: granularity, //splitNum分割的个数
        });

        //剖面的数据
        let h1 = Cesium.Cartographic.fromCartesian(startP).height;
        let h2 = Cesium.Cartographic.fromCartesian(endP).height;
        let hstep = (h2 - h1) / interPositions.length;

        for (let i = 3, len = interPositions.length; i < len; i += 3) {
            let position = Cesium.Cartesian3.unpack(interPositions, i);

            let car = Cesium.Cartographic.fromCartesian(position);

            let height = Number((h1 + hstep * i).toFixed(1));
            position = Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, height);

            arr.push(position);
        }
    }
    return arr;
}

/**
 * 面内进行贴地(或贴模型)插值, 返回三角网等计算结果 的回调方法
 * @callback surfaceLineWork_callback
 * @param {Cesium.Cartesian3[]} raisedPositions  计算完成后得到的贴地点数组
 * @param {Boolean} noHeight  是否计算贴地高度失败，true时标识计算失败了
 * @param {Cesium.Cartesian3[]} positions 原始的坐标数组
 */

/**
 * 求路线的贴地线坐标（插值）
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} options.positions 坐标数组
 * @param {Number} [options.splitNum=100] 插值数，等比分割的个数
 * @param {Number} [options.minDistance=null] 插值最小间隔(单位：米)，优先级高于splitNum
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {Number} [options.offset=0]  可以按需增加偏移高度（单位：米），便于可视
 * @param {surfaceLineWork_callback} options.callback  异步计算高度完成后 的回调方法
 * @return {void} 无
 */
let computeSurfaceLine = function (options) {
    return surfaceLineWork.start(options);
}

/**
 * 求 多个点 的的贴地新坐标（不插值）
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} options.positions 坐标数组
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {Number} [options.offset=0]  可以按需增加偏移高度（单位：米），便于可视
 * @param {surfaceLineWork_callback} options.callback  异步计算高度完成后 的回调方法
 * @return {void} 无
 */
let computeSurfacePoints = function (options) {
    options.split = false;
    return surfaceLineWork.start(options);
}

//计算贴地(或贴模型)路线（异步）
let surfaceLineWork = {
    start: function (params) {
        this.params = params;
        this.scene = params.map ? params.map.scene : params.scene;
        if (!this.scene) {
            console.log(`surfaceLineWork: 请传入scene参数`, params);
            return;
        }

        let positions = params.positions;
        if (positions == null || positions.length == 0) {
            //无数据
            this.end(positions);
            return;
        }
        this.positions = positions;

        //线中间插值
        let _split = Cesium.defaultValue(params.split, true);
        if (_split) {
            positions = interPolyline({
                ...params,
                scene: this.scene,
                positions: positions,
            });

            let positionsClone = [];
            for (let i = 0, len = positions.length; i < len; ++i) {
                positionsClone.push(positions[i].clone());
            }
            this.positions = positionsClone;
        }

        let _has3dtiles = Cesium.defaultValue(params.has3dtiles, Cesium.defined(pick3DTileset(this.scene, positions))); //是否在3ditiles上面
        let _hasTerrain = Boolean(this.scene.terrainProvider._layers); //是否有地形

        this._has3dtiles = _has3dtiles;
        this._hasTerrain = _hasTerrain;

        if (!_hasTerrain && !_has3dtiles) {
            //无地形和无模型时，直接返回
            this.end(positions);
            return;
        }

        //开始分析
        if (_hasTerrain) {
            this.clampToTerrain(positions);
        } else {
            this.clampTo3DTileset(positions);
        }
        return this;
    },
    clampToTerrain: function (positions) {
        let ellipsoid = this.scene.globe.ellipsoid;
        let cartographicArray = ellipsoid.cartesianArrayToCartographicArray(positions);

        //用于缺少地形数据时，赋值的高度
        let tempHeight = Cesium.Cartographic.fromCartesian(positions[0]).height;

        let that = this;
        Promise.resolve(Cesium.sampleTerrainMostDetailed(this.scene.terrainProvider, cartographicArray)).then(function (samples) {
            samples = that.removeNullData(samples);

            let noHeight = false;
            let offset = Cesium.defaultValue(that.params.offset, 0); //增高高度，便于可视

            let _terrainExaggeration = that.scene._terrainExaggeration?that.scene._terrainExaggeration:1;
            for (let i = 0; i < samples.length; ++i) {
                if (samples[i].height == null) {
                    noHeight = true;
                    samples[i].height = tempHeight;
                } else {
                    samples[i].height = offset + samples[i].height * _terrainExaggeration;
                }
            }

            let raisedPositions = ellipsoid.cartographicArrayToCartesianArray(samples);

            if (that._has3dtiles) {
                that.clampTo3DTileset(raisedPositions);
            } else {
                that.end(raisedPositions, noHeight);
            }
        });
    },
    clampTo3DTileset: function (positions) {
        let that = this;
        let positionsClone = [];
        for (let i = 0, len = positions.length; i < len; ++i) {
            positionsClone.push(positions[i].clone());
        }
        this.scene.clampToHeightMostDetailed(positionsClone, this.params.objectsToExclude, 0.2).then(function (clampedCartesians) {
            clampedCartesians = that.removeNullData(clampedCartesians);
            if (clampedCartesians.length == 0) {
                clampedCartesians = positions;
            }
            that.end(clampedCartesians);
        });
    },
    end: function (raisedPositions, noHeight) {
        let callback = this.params.callback;
        if (callback) {
            callback(raisedPositions, noHeight, this.positions);
        }
    },
    removeNullData: function (samples) {
        let arrNew = [];
        for (let i = 0; i < samples.length; ++i) {
            if (samples[i] != null) {
                arrNew.push(samples[i]);
            }
        }
        return arrNew;
    },
};

/**
 * 异步分段分步计算贴地距离中，每计算完成2个点之间的距离后 的回调方法
 * @callback computeStepSurfaceLine_endItem
 * @param {Cesium.Cartesian3[]} raisedPositions  当前2个点之间的 贴地坐标数组
 * @param {Boolean} noHeight  是否计算贴地高度失败，true时标识计算失败了
 * @param {Number} index  坐标数组的index顺序
 */

/**
 * 异步分段分步计算贴地距离中，每计算完成2个点之间的距离后 的回调方法
 * @callback computeStepSurfaceLine_end
 * @param {Array[]} arrStepPoints  二维数组坐标集合，各分段2点之间的贴地点数组的集合
 */

/**
 * 按2个坐标点分段分步来计算，求路线的贴地线坐标（插值）
 *
 * @export
 * @param {Object} [options={}] 参数对象:
 * @param {Cesium.Scene} options.scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} options.positions 坐标数组
 * @param {Number} [options.splitNum=100] 插值数，等比分割的个数
 * @param {Number} [options.minDistance=null] 插值最小间隔(单位：米)，优先级高于splitNum
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {Number} [options.offset=0]  可以按需增加偏移高度（单位：米），便于可视
 * @param {computeStepSurfaceLine_endItem} options.endItem  异步计算高度完成后 的回调方法
 * @param {computeStepSurfaceLine_end} options.end  异步计算高度完成后 的回调方法
 * @param {computeStepSurfaceLine_end} options.callback  异步计算高度完成后 的回调方法(别名，同end)
 * @return {void} 无
 */
let computeStepSurfaceLine = function (options) {
    let positions = options.positions;

    let arrStepPoints = [];

    let params = {};
    for (let key in options) {
        if (key == "positions" || key == "callback" || key == "end" || key == "endItem") {
            continue;
        }
        params[key] = options[key];
    }

    let index = 0;
    let allcount = positions.length - 1;
    function getLineFD() {
        if (index >= allcount) {
            if (options.callback) {
                options.callback(arrStepPoints);
            }
            if (options.end) {
                options.end(arrStepPoints);
            }
            return;
        }

        params.positions = [positions[index], positions[index + 1]];
        params.callback = function (raisedPositions, noHeight) {
            if (options.endItem) {
                options.endItem(raisedPositions, noHeight, index);
            }
            arrStepPoints.push(raisedPositions);

            index++;
            getLineFD();
        };
        surfaceLineWork.start(params);
    }
    getLineFD();
}

/**
 * 计算2点间的 曲线链路的点集（空中曲线）
 *
 * @export
 * @param {Cesium.Cartesian3} startPoint 开始节点
 * @param {Cesium.Cartesian3} endPoint 结束节点
 * @param {Number} angularityFactor 曲率
 * @param {Number} numOfSingleLine 点集数量
 * @return {Cesium.Cartesian3[]}  曲线坐标数组
 */
let getLinkedPointList = function (startPoint, endPoint, angularityFactor, numOfSingleLine) {
    let result = [];

    let startPosition = Cesium.Cartographic.fromCartesian(startPoint);
    let endPosition = Cesium.Cartographic.fromCartesian(endPoint);

    let startLon = (startPosition.longitude * 180) / Math.PI;
    let startLat = (startPosition.latitude * 180) / Math.PI;
    let endLon = (endPosition.longitude * 180) / Math.PI;
    let endLat = (endPosition.latitude * 180) / Math.PI;

    let dist = Math.sqrt((startLon - endLon) * (startLon - endLon) + (startLat - endLat) * (startLat - endLat));

    //var dist = Cesium.Cartesian3.distance(startPoint, endPoint);
    let angularity = dist * angularityFactor;

    let startVec = Cesium.Cartesian3.clone(startPoint);
    let endVec = Cesium.Cartesian3.clone(endPoint);

    let startLength = Cesium.Cartesian3.distance(startVec, Cesium.Cartesian3.ZERO);
    let endLength = Cesium.Cartesian3.distance(endVec, Cesium.Cartesian3.ZERO);

    Cesium.Cartesian3.normalize(startVec, startVec);
    Cesium.Cartesian3.normalize(endVec, endVec);

    if (Cesium.Cartesian3.distance(startVec, endVec) == 0) {
        return result;
    }

    //var cosOmega = Cesium.Cartesian3.dot(startVec, endVec);
    //var omega = Math.acos(cosOmega);

    let omega = Cesium.Cartesian3.angleBetween(startVec, endVec);

    result.push(startPoint);
    for (let i = 1; i < numOfSingleLine - 1; i++) {
        let t = (i * 1.0) / (numOfSingleLine - 1);
        let invT = 1 - t;

        let startScalar = Math.sin(invT * omega) / Math.sin(omega);
        let endScalar = Math.sin(t * omega) / Math.sin(omega);

        let startScalarVec = Cesium.Cartesian3.multiplyByScalar(startVec, startScalar, new Cesium.Cartesian3());
        let endScalarVec = Cesium.Cartesian3.multiplyByScalar(endVec, endScalar, new Cesium.Cartesian3());

        let centerVec = Cesium.Cartesian3.add(startScalarVec, endScalarVec, new Cesium.Cartesian3());

        let ht = t * Math.PI;
        let centerLength = startLength * invT + endLength * t + Math.sin(ht) * angularity;
        centerVec = Cesium.Cartesian3.multiplyByScalar(centerVec, centerLength, centerVec);

        result.push(centerVec);
    }

    result.push(endPoint);

    return result;
}

/**
 * 计算平行线
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 原始线的坐标数组
 * @param {Number} offset 偏移的距离（单位米），正负决定方向
 * @return {Cesium.Cartesian3[]}  平行线坐标数组
 */
let getOffsetLine = function (positions, offset) {
    let arrNew = [];
    for (let i = 1; i < positions.length; i++) {
        let point1 = positions[i - 1];
        let point2 = positions[i];

        let dir12 = Cesium.Cartesian3.subtract(point1, point2, new Cesium.Cartesian3());
        let dir21left = Cesium.Cartesian3.cross(point1, dir12, new Cesium.Cartesian3());

        let p1offset = computedOffsetData(point1, dir21left, offset * 1000);
        let p2offset = computedOffsetData(point2, dir21left, offset * 1000);

        if (i == 1) {
            arrNew.push(p1offset);
        }
        arrNew.push(p2offset);
    }
    return arrNew;
}

function computedOffsetData(ori, dir, wid) {
    let currRay = new Cesium.Ray(ori, dir);
    return Cesium.Ray.getPoint(currRay, wid, new Cesium.Cartesian3());
}

/**
 * 截取路线指定最大长度的新路线，
 * 在最后一个点往前截取maxDistance长度。
 * 应用场景： 航迹的 “尾巴线” 的运算
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions 路线坐标
 * @param {Number} maxDistance  最大的截取长度
 * @param {Object} [options={}] 参数对象:
 * @param {Boolean} [options.point=false] 为true时 只返回计算的maxDistance处的坐标
 * @return {Cesium.Cartesian3[]|Cesium.Cartesian3}  指定长度的坐标数组 ，options.point为true时，只返回数组的第1个点。
 */
let sliceByMaxDistance = function (positions, maxDistance, options = {}) {
    if (positions.length < 2) {
        return positions;
    }

    for (let i = positions.length - 1; i >= 1; i--) {
        let pt1 = positions[i];
        let pt2 = positions[i - 1];
        let distance = Cesium.Cartesian3.distance(pt1, pt2);
        maxDistance -= distance;

        if (maxDistance == 0) {
            if (options.point) {
                return pt1;
            } else {
                return positions.slice(i);
            }
        } else if (maxDistance < 0) {
            maxDistance += distance;
            //求指定长度拼接上去
            let newpt = getOnLinePointByLen(pt1, pt2, maxDistance);
            if (options.point) {
                return newpt;
            } else {
                return [newpt].concat(positions.slice(i));
            }
        }
    }
    return positions;
}

/**
 * 求 坐标点 的 外包围凸体面(简化只保留边界线坐标)
 *
 * @export
 * @param {Array[]} coordinates 经纬度坐标数组,示例：[ [123.123456,32.654321,198.7], [111.123456,22.654321,50.7] ]
 * @return {Array[]} 经纬度坐标数组,示例：[ [123.123456,32.654321,198.7], [111.123456,22.654321,50.7] ]
 */
let convex = function (coordinates) {
    if (coordinates.length > 0) {
        //判断tur库是否存在 start
        try {
            if (!turf_convex) {
                throw new Error("turf不存在");
            }
        } catch (e) {
            console.log("convex：该方法依赖turf库，请引入该库。", e);
            return coordinates;
        }
        //判断tur库是否存在 end

        let pts = [];
        for (let i = 0; i < coordinates.length; i++) {
            pts.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: coordinates[i] },
            });
        }
        //求外包围凸体
        let hull = turf_convex({ type: "FeatureCollection", features: pts });
        if (hull) {
            let coords = hull?.geometry?.coordinates;
            if (coords && coords.length > 0) {
                coordinates = coords[0];
            }
        }
    }
    return coordinates;
}


//获取坐标点处的3dtiles模型，用于计算贴地时进行判断（和视角有关系，不一定精确）
function pick3DTileset(scene, positions) {
    if (!positions) {
        return null;
    }

    if (positions instanceof Cesium.Cartesian3) {
        positions = [positions];
    }

    for (let i = 0, len = positions.length; i < len; ++i) {
        let position = positions[i];
        let coorPX = Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position);
        if (!Cesium.defined(coorPX)) {
            continue;
        }

        let pickedObject = scene.pick(coorPX, 10, 10);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.primitive) && pickedObject.primitive instanceof Cesium.Cesium3DTileset) {
            // Cesium.defined(pickedObject.primitive.isCesium3DTileset)
            return pickedObject.primitive;
        }
    }

    return null;
}

export default {buffer,bufferPoints,getGranularity,interPolygon,getHeightRange,computeVolume,updateVolumeByMinHeight,
    updateVolume,getEllipseOuterPositions,formatRectangle,getRectangle,getPositionsRectVertex,getRectangleOuterPositions,
    getRectPositionsByCenter,isInPoly,getBezierCurve,interPolyline,interLine,computeSurfaceLine,computeSurfacePoints,
    computeStepSurfaceLine,getLinkedPointList,getOffsetLine,sliceByMaxDistance,convex,pick3DTileset};