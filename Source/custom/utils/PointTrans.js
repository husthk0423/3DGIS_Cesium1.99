/**
 * 坐标点的转换 相关静态方法。
 *  提供了cesium内部不同坐标系之间的坐标转换、提供了国内偏移坐标系与标准坐标的转换。
 * @module PointTrans
 */
import  proj4  from 'proj4';
import CRS from '../const/CRS';
import LatLngPoint from './LatLngPoint';

/**
 * 经度/纬度 十进制 转为 度分秒格式
 * @param {Number} value 经度或纬度值
 * @return {Object} 度分秒对象，如： { degree:113, minute:24, second:40 }
 */
let degree2dms = function (value) {
    value = Math.abs(value);
    let degree = Math.floor(value); //度
    let minute = Math.floor((value - degree) * 60); //分
    let second = Math.round(((value - degree) * 3600) % 60); //秒

    return {
        degree,
        minute,
        second,
        str: degree + "° " + minute + "'  " + second + '"',
    };
};

/**
 * 经度/纬度  度分秒 转为 十进制
 * @param {Number} degree 度
 * @param {Number} minute 分
 * @param {Number} second 秒
 * @return {Number} 十进制
 */
let dms2degree = function (degree, minute, second) {
    let ten = Math.abs(degree) + minute / 60 + second / 3600;
    return ten;
};

/**
 * 根据经度值 获取CGCS2000投影坐标对应的 EPSG值
 *
 * @param {Number} lng 经度值
 * @param {Boolean} [fd6=false]  是否为6度分带， true:6度分带,false:3度分带
 * @param {Boolean} [hasAddDH=true] 横坐标前是否加带号
 * @return {String|undefined}  EPSG值
 */
let getCGCS2000EPSGByLng = function (lng, fd6, hasAddDH = true) {
    let epsgID;
    if (fd6) {
        let n6 = parseInt(lng / 6) + 1; //13到23
        if (n6 < 13 || n6 > 23) {
            return undefined;
        }
        if (hasAddDH) {
            //EPSG:4491 到 EPSG:4501
            epsgID = n6 + 4478;
        } else {
            //EPSG:4502 到 EPSG:4512
            epsgID = n6 + 4489;
        }
    } else {
        let n3 = parseInt((lng - 1.5) / 3) + 1; //25到45
        if (n3 < 25 || n3 > 45) {
            return undefined;
        }
        if (hasAddDH) {
            //EPSG:4513 到 EPSG:4533
            epsgID = n3 + 4488;
        } else {
            //EPSG:4534 到 EPSG:4554
            epsgID = n3 + 4509;
        }
    }
    return "EPSG:" + epsgID;
};

/**
 * 根据加带号的横坐标值 获取CGCS2000投影坐标对应的EPSG值
 * @param {Number} x 根据加带号的横坐标值
 * @return {String|undefined}  EPSG值
 */
let getCGCS2000EPSGByX = function (x) {
    let dh = parseInt(x.toString().slice(0, 2));
    if (dh >= 13 && dh <= 23) {
        //13到23,   EPSG:4491 到 EPSG:4501
        return "EPSG:" + (dh + 4478);
    } else if (dh >= 25 && dh <= 45) {
        //25到45,   EPSG:4513 到 EPSG:4533
        return "EPSG:" + (dh + 4488);
    } else {
        return undefined;
    }
};

/**
 * 使用proj4转换坐标（支持任意坐标系），
 * 坐标系 可以在 {@link http://epsg.io }进行查询，已经内置支持 EPSG:4326、EPSG:3857、EPSG:4490、EPSG:4491至4554
 *
 * @param {Number[]} arrdata 原始坐标,示例：[39396641,3882123]
 * @param {String|CRS} fromProjParams 原始坐标的坐标系，如'EPSG:4527'
 * @param {String|CRS} [toProjParams='EPSG:4326'] 转为返回的结果坐标系
 * @return {Number[]} 返回结果坐标系的对应坐标,示例：[115.866936, 35.062583]
 */
let proj4Trans = function (arrdata, fromProjParams, toProjParams = "EPSG:4326") {
    if (!fromProjParams || !toProjParams || fromProjParams == toProjParams) {
        return arrdata;
    }
    try {
        if (fromProjParams == CRS.CGCS2000_GK_Zone_3 || fromProjParams == CRS.CGCS2000_GK_Zone_6) {
            fromProjParams = getCGCS2000EPSGByX(arrdata[0]);
        }

        if (toProjParams == CRS.CGCS2000_GK_Zone_3) {
            toProjParams = getCGCS2000EPSGByLng(arrdata[0], false, true);
        } else if (toProjParams == CRS.CGCS2000_GK_Zone_6) {
            toProjParams = getCGCS2000EPSGByLng(arrdata[0], true, true);
        } else if (toProjParams == CRS.CGCS2000_GK_CM_3) {
            toProjParams = getCGCS2000EPSGByLng(arrdata[0], false, false);
        } else if (toProjParams == CRS.CGCS2000_GK_CM_6) {
            toProjParams = getCGCS2000EPSGByLng(arrdata[0], true, false);
        }
        if (!fromProjParams || !toProjParams || fromProjParams == toProjParams) {
            return arrdata;
        }

        let arr = proj4(fromProjParams, toProjParams, arrdata);
        if (Cesium.defined(arr) && arr.length > 1 && !isNaN(arr[0]) && arr[0] != Infinity) {
            return arr;
        }
    } catch (e) {
        //console.log(e)
    }
    return arrdata;
};

/**
 * 使用proj4转换坐标数组（支持任意坐标系），
 * 坐标系 可以在 {@link http://epsg.io }进行查询，已经内置支持 EPSG:4326、EPSG:3857、EPSG:4490、EPSG:4491至4554
 *
 * @param {Number[]} coords 原始坐标数组,示例：[[39396641,3882123],[39396623,3882134]]
 * @param {String} fromProjParams 原始坐标的坐标系，如'EPSG:4527'
 * @param {String} [toProjParams='EPSG:4326'] 转为返回的结果坐标系
 * @return {Number[]} 返回结果坐标系的对应坐标数组,示例：[[115.866936, 35.062583],[115.866923, 35.062565]]
 */
let proj4TransArr = function (coords, fromProjParams, toProjParams = "EPSG:4326") {
    if (!fromProjParams || fromProjParams == toProjParams) {
        return coords;
    }

    let arr = [];
    for (let i = 0, len = coords.length; i < len; i++) {
        let item = coords[i];
        if (Array.isArray(item[0])) {
            let arr2 = proj4TransArr(item, fromProjParams, toProjParams);
            if (arr2 && arr2.length > 0) {
                arr.push(arr2);
            }
        } else {
            let arr2 = proj4Trans(item, fromProjParams, toProjParams);
            if (arr2) {
                arr.push(arr2);
            }
        }
    }
    return arr;
};

/**
 * Cesium笛卡尔空间坐标 转 经纬度坐标
 * 常用于转换geojson
 *
 * @param {Cesium.Cartesian3} cartesian Cesium笛卡尔空间xyz坐标
 * @param {Boolean} noAlt 是否包含高度值
 * @return {Number[]} 经纬度坐标,示例：[123.123456,32.654321,198.7]
 */
let cartesian2lonlat = function (cartesian, noAlt) {
    let carto = Cesium.Cartographic.fromCartesian(cartesian);
    if (carto == null) {
        return null;
    }

    let x = formatNum(Cesium.Math.toDegrees(carto.longitude), LatLngPoint.FormatLength);
    let y = formatNum(Cesium.Math.toDegrees(carto.latitude), LatLngPoint.FormatLength);

    if (noAlt) {
        return [x, y];
    } else {
        let z = formatNum(carto.height, LatLngPoint.FormatAltLength);
        return [x, y, z];
    }
}

/**
 * Cesium笛卡尔空间坐标数组 转 经纬度坐标数组
 * 常用于转换geojson
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions Cesium笛卡尔空间xyz坐标数组
 * @param {Boolean} noAlt 是否包含高度值
 * @return {Array[]} 经纬度坐标数组,示例：[ [123.123456,32.654321,198.7], [111.123456,22.654321,50.7] ]
 */
let cartesians2lonlats = function (positions, noAlt) {
    let coordinates = [];
    for (let i = 0, len = positions.length; i < len; i++) {
        let point = cartesian2lonlat(positions[i], noAlt);
        if (point) {
            coordinates.push(point);
        }
    }
    return coordinates;
}

/**
 * Cesium笛卡尔空间坐标 转 WebMercator投影平面坐标
 *
 * @export
 * @param {Cesium.Cartesian3} position Cesium笛卡尔空间xyz坐标
 * @return {Number[]} 墨卡托投影平面坐标,示例：[13048882,3741659,20.1]
 */
let cartesian2mercator = function (position) {
    if (!position) {
        return null;
    }

    let lonlat = cartesian2lonlat(position);
    return lonlat2mercator(lonlat);
}

/**
 * Cesium笛卡尔空间坐标数组 转 WebMercator投影平面坐标数组
 *
 * @export
 * @param {Cesium.Cartesian3[]} positions Cesium笛卡尔空间xyz坐标数组
 * @return {Array[]} WebMercator投影平面坐标数组,示例：[[13048882,3741659,20.1],[13048882,3741659,21.2] ]
 */
let cartesians2mercators = function (positions) {
    let arrNew = [];
    for (let i = 0, len = positions.length; i < len; i++) {
        let point = cartesian2mercator(positions[i]);
        if (point) {
            arrNew.push(point);
        }
    }
    return arrNew;
};

/**
 * 经纬度坐标 转 Cesium笛卡尔空间xyz坐标
 *
 * @export
 * @param {Array[]} coord 经纬度坐标,示例：[123.123456,32.654321,198.7]
 * @param {Number} [defHeight=0] 默认高度
 * @return {Cesium.Cartesian3} Cesium笛卡尔空间xyz坐标
 */
let lonlat2cartesian = function (coord, defHeight = 0) {
    if (!coord || coord.length < 2) {
        return null;
    }
    return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], coord[2] || defHeight);
}

/**
 * 经纬度坐标数组 转 Cesium笛卡尔空间xyz坐标数组
 *
 * @export
 * @param {Array[]} coords 经纬度坐标数组,示例：[ [123.123456,32.654321,198.7], [111.123456,22.654321,50.7] ]
 * @param {Number} [defHeight=0] 默认高度
 * @return {Cesium.Cartesian3[]} Cesium笛卡尔空间xyz坐标数组
 */
let lonlats2cartesians = function (coords, defHeight) {
    let arr = [];
    for (let i = 0, len = coords.length; i < len; i++) {
        let item = coords[i];
        if (Array.isArray(item[0])) {
            let arr2 = lonlats2cartesians(item, defHeight);
            if (arr2 && arr2.length > 0) {
                arr.push(arr2);
            }
        } else {
            let cartesian = lonlat2cartesian(item, defHeight);
            if (cartesian) {
                arr.push(cartesian);
            }
        }
    }
    return arr;
}

/**
 * 经纬度地理坐标 转 投影平面坐标
 *
 * @export
 * @param {Number[]} lnglat 经纬度坐标,示例：[123.123456,32.654321,20.1]
 * @return {Number[]} WebMercator投影平面坐标,示例：[13048882,3741659,20.1]
 */
let lonlat2mercator = function (lnglat) {
    return jwd2mct(lnglat);
}
/**
 * 经纬度地理坐标数组 转 投影平面坐标数组
 *
 * @export
 * @param {Array[]} arr 经纬度坐标数组,示例：[ [123.123456,32.654321,20.1], [111.123456,22.654321,21.2] ]
 * @return {Array[]} WebMercator投影平面坐标数组,示例：[[13048882,3741659,20.1],[13048882,3741659,21.2] ]
 */
let lonlats2mercators = function (arr) {
    let arrNew = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        let point = lonlat2mercator(arr[i]);
        arrNew.push(point);
    }
    return arrNew;
}

/**
 * 投影平面坐标 转 Cesium笛卡尔空间xyz坐标
 *
 * @export
 * @param {Number[]} point WebMercator投影平面坐标,示例：[13048882,3741659,20.1]
 * @param {Number} [height] 赋值高度
 * @return  {Cesium.Cartesian3}  Cesium笛卡尔空间xyz坐标
 */
let mercator2cartesian = function (point, height) {
    if (isNaN(point[0]) || isNaN(point[1])) {
        return null;
    }

    let lonlat = mercator2lonlat(point);
    if (Cesium.defined(height)) {
        lonlat[2] = height;
    }
    return lonlat2cartesian(lonlat);
}
/**
 * 投影平面坐标数组 转 Cesium笛卡尔空间xyz坐标数组
 *
 * @export
 * @param {Number[]} arr WebMercator投影平面坐标数组,示例：[[13048882,3741659,20.1],[13048882,3741659,21.2] ]
 * @param {Number} [height] 赋值高度
 * @return  {Cesium.Cartesian3}  Cesium笛卡尔空间xyz坐标数组
 */
let mercators2cartesians = function (arr, height) {
    let arrNew = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        let point = mercator2cartesian(arr[i], height);
        if (point) {
            arrNew.push(point);
        }
    }
    return arrNew;
}
/**
 * 投影平面坐标 转 经纬度地理坐标
 *
 * @export
 * @param {Number[]} point WebMercator投影平面坐标,示例：[13048882,3741659,20.1]
 * @return {Number[]} 经纬度坐标,示例：[123.123456,32.654321,20.1]
 */
let mercator2lonlat = function (point) {
    return mct2jwd(point);
}

/**
 * 投影平面坐标数组 转 经纬度地理坐标数组
 *
 * @export
 * @param {Array[]} arr WebMercator投影平面坐标数组,示例：[[13048882,3741659,20.1],[13048882,3741659,21.2] ]
 * @return {Array[]} 经纬度坐标数组,示例：[ [123.123456,32.654321,20.1], [111.123456,22.654321,21.2] ]
 */
let mercators2lonlats = function (arr) {
    let arrNew = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        let point = mercator2lonlat(arr[i]);
        arrNew.push(point);
    }
    return arrNew;
}

//格式化 数字 小数位数
function formatNum(num, digits) {
    return Number(num).toFixed(digits || 0);
}

//========提供了百度（BD09）、国测局（GCJ02）、WGS84、Web墨卡托 4类坐标之间的转换=======
//传入参数 和 返回结果 均是数组：[经度,纬度]

//定义一些常量
let x_PI = (3.14159265358979324 * 3000.0) / 180.0;
let PI = 3.1415926535897932384626;
let a = 6378245.0;
let ee = 0.00669342162296594323;

function transformlat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
}

function transformlng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
}

//判断是否在国内，不在国内则不做偏移
function out_of_china(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271 || false;
}

/**
 * 经纬度坐标转换，
 * 百度坐标 (BD09) 转换为 国测局坐标 (GCJ02)
 *
 * @export
 * @param {Number[]} arrdata 百度坐标 (BD09)坐标数据，示例：[117.225590,31.832916]
 * @return {Number[]} 国测局坐标 (GCJ02)坐标数据，示例：[:117.22559,31.832917]
 */
let bd2gcj = function (arrdata) {
    let bd_lon = Number(arrdata[0]);
    let bd_lat = Number(arrdata[1]);

    let x_pi = (3.14159265358979324 * 3000.0) / 180.0;
    let x = bd_lon - 0.0065;
    let y = bd_lat - 0.006;
    let z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    let theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
    let gg_lng = z * Math.cos(theta);
    let gg_lat = z * Math.sin(theta);

    gg_lng = Number(gg_lng).toFixed(6);
    gg_lat = Number(gg_lat).toFixed(6);
    return [gg_lng, gg_lat];
}

/**
 * 经纬度坐标转换，
 * 国测局坐标 (GCJ02) 转换为 百度坐标 (BD09)
 *
 * @export
 * @param {Number[]} arrdata 高德谷歌等国测局坐标 (GCJ02) 坐标数据，示例：[117.225590,31.832916]
 * @return {Number[]} 百度坐标 (BD09)坐标数据，示例：[117.232039,31.839177]
 */
let gcj2bd = function (arrdata) {
    let lng = Number(arrdata[0]);
    let lat = Number(arrdata[1]);

    let z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
    let theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
    let bd_lng = z * Math.cos(theta) + 0.0065;
    let bd_lat = z * Math.sin(theta) + 0.006;

    bd_lng = Number(bd_lng).toFixed(6);
    bd_lat = Number(bd_lat).toFixed(6);
    return [bd_lng, bd_lat];
}
/**
 * 经纬度坐标转换，
 * 标准无偏坐标（WGS84） 转为 国测局坐标 (GCJ02)
 *
 * @export
 * @param {Number[]} arrdata 标准无偏坐标（WGS84）坐标数据，示例：[117.220102, 31.834912]
 * @return {Number[]} 国测局坐标 (GCJ02)坐标数据，示例：[117.225590,31.832916]
 */
let wgs2gcj = function (arrdata) {
    let lng = Number(arrdata[0]);
    let lat = Number(arrdata[1]);

    if (out_of_china(lng, lat)) {
        return [lng, lat];
    } else {
        let dlat = transformlat(lng - 105.0, lat - 35.0);
        let dlng = transformlng(lng - 105.0, lat - 35.0);
        let radlat = (lat / 180.0) * PI;
        let magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        let sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / (((a * (1 - ee)) / (magic * sqrtmagic)) * PI);
        dlng = (dlng * 180.0) / ((a / sqrtmagic) * Math.cos(radlat) * PI);
        let mglat = lat + dlat;
        let mglng = lng + dlng;

        mglng = Number(mglng).toFixed(6);
        mglat = Number(mglat).toFixed(6);
        return [mglng, mglat];
    }
}
/**
 * 经纬度坐标转换，
 * 国测局坐标 (GCJ02)  转换为 标准无偏坐标（WGS84）
 *
 * @export
 * @param {Number[]} arrdata 国测局坐标 (GCJ02)坐标数据，示例：[117.225590,31.832916]
 * @return {Number[]} 标准无偏坐标（WGS84）坐标数据，示例：[117.220102, 31.834912]
 */
let gcj2wgs = function (arrdata) {
    let lng = Number(arrdata[0]);
    let lat = Number(arrdata[1]);

    if (out_of_china(lng, lat)) {
        return [lng, lat];
    } else {
        let dlat = transformlat(lng - 105.0, lat - 35.0);
        let dlng = transformlng(lng - 105.0, lat - 35.0);
        let radlat = (lat / 180.0) * PI;
        let magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        let sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / (((a * (1 - ee)) / (magic * sqrtmagic)) * PI);
        dlng = (dlng * 180.0) / ((a / sqrtmagic) * Math.cos(radlat) * PI);

        let mglat = lat + dlat;
        let mglng = lng + dlng;

        let jd = lng * 2 - mglng;
        let wd = lat * 2 - mglat;

        jd = Number(jd).toFixed(6);
        wd = Number(wd).toFixed(6);
        return [jd, wd];
    }
}
/**
 * 经纬度坐标转换，
 * 百度坐标 (BD09) 转 标准无偏坐标（WGS84）
 *
 * @export
 * @param {Number[]} arrdata 百度坐标 (BD09)坐标数据，示例：[117.232039,31.839177]
 * @return {Number[]} 标准无偏坐标（WGS84）坐标数据，示例：[117.220102, 31.834912]
 */
let bd2wgs = function (arrdata) {
    return gcj2wgs(bd2gcj(arrdata));
}
/**
 * 标准无偏坐标（WGS84）  转 百度坐标 (BD09)
 *
 * @export
 * @param {Number[]} arrdata 标准无偏坐标（WGS84）坐标数据，示例：[117.220102, 31.834912]
 * @return {Number[]} 百度坐标 (BD09)坐标数据，示例：[117.232039,31.839177]
 */
let wgs2bd = function (arrdata) {
    return gcj2bd(wgs2gcj(arrdata));
}

/**
 * 【方式2】经纬度地理坐标 转 投影平面坐标
 *
 * @export
 * @param {Number[]} arrdata 经纬度坐标,示例：[117.220101,31.834907]
 * @return {Number[]} WebMercator投影平面坐标,示例：[13048882.06,3741659.72]
 */
let jwd2mct = function (arrdata) {
    let lng = Number(arrdata[0]);
    let lat = Number(arrdata[1]);

    let x = (lng * 20037508.34) / 180;
    let y = Math.log(Math.tan(((90 + lat) * PI) / 360)) / (PI / 180);
    y = (y * 20037508.34) / 180; //+ 7.081154553416204e-10;

    x = Number(x).toFixed(2);
    y = Number(y).toFixed(2);
    return [x, y, arrdata[2] || 0];
}
/**
 * 【方式2】投影平面坐标 转 经纬度地理坐标
 *
 * @export
 * @param {Number[]} arrdata WebMercator投影平面坐标，示例：[13048882.06,3741659.72]
 * @return {Number[]} 经纬度坐标数据，示例：[117.220101,31.834907]
 */
let mct2jwd = function (arrdata) {
    let lng = Number(arrdata[0]);
    let lat = Number(arrdata[1]);

    let x = (lng / 20037508.34) * 180;
    let y = (lat / 20037508.34) * 180;
    y = (180 / PI) * (2 * Math.atan(Math.exp((y * PI) / 180)) - PI / 2);

    x = Number(x).toFixed(6);
    y = Number(y).toFixed(6);
    return [x, y, arrdata[2] || 0];
}

export default {degree2dms,dms2degree,getCGCS2000EPSGByLng,getCGCS2000EPSGByX,proj4Trans,proj4TransArr,
    cartesian2lonlat,cartesians2lonlats,cartesian2mercator,cartesians2mercators,lonlat2cartesian,
    lonlats2cartesians,lonlat2mercator,lonlats2mercators,mercator2cartesian,mercators2cartesians,
    mercator2lonlat,mercators2lonlats,bd2gcj,gcj2bd,wgs2gcj,gcj2wgs,bd2wgs,wgs2bd,jwd2mct,mct2jwd};