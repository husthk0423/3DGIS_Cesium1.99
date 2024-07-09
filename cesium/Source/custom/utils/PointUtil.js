import LatLngPoint from './LatLngPoint';
/**
 * 获取 坐标数组 中 最高高程值
 *
 * @export
 * @param {Cartesian3[]} positions 笛卡尔坐标数组
 * @param {Number} [defaultVal=0] 默认高程值
 * @return {Number} 最高高程值
 */
let getMaxHeight = function (positions, defaultVal = 0) {
  if (positions == null || positions.length == 0) {
    return defaultVal;
  }

  let maxHeight = defaultVal;
  for (let i = 0; i < positions.length; i++) {
    let tempCarto = Cesium.Cartographic.fromCartesian(positions[i]);
    if (i == 0) {
      maxHeight = tempCarto.height;
    }
    if (tempCarto.height > maxHeight) {
      maxHeight = tempCarto.height;
    }
  }
  return maxHeight.toFixed(LatLngPoint.FormatAltLength);
};

/**
 * 求 p1指向p2方向线上，距离p1或p2指定长度的 新的点
 *
 * @export
 * @param {Cesium.Cartesian3} p1 起点坐标
 * @param {Cesium.Cartesian3} p2 终点坐标
 * @param {Number} len  指定的距离，addBS为false时：len为距离起点p1的距离，addBS为true时：len为距离终点p2的距离
 * @param {Boolean} [addBS=false]  标识len的参考目标
 * @return {Cesium.Cartesian3}  计算得到的新坐标
 */
let getOnLinePointByLen = function (p1, p2, len, addBS) {
  let mtx4 = Cesium.Transforms.eastNorthUpToFixedFrame(p1);
  let mtx4_inverser = Cesium.Matrix4.inverse(mtx4, new Cesium.Matrix4());
  p1 = Cesium.Matrix4.multiplyByPoint(mtx4_inverser, p1, new Cesium.Cartesian3());
  p2 = Cesium.Matrix4.multiplyByPoint(mtx4_inverser, p2, new Cesium.Cartesian3());

  let substrct = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());

  let dis = Cesium.Cartesian3.distance(p1, p2);
  let scale = len / dis; //求比例
  if (addBS) {
    scale += 1;
  }

  let newP = Cesium.Cartesian3.multiplyByScalar(substrct, scale, new Cesium.Cartesian3());
  newP = Cesium.Matrix4.multiplyByPoint(mtx4, newP, new Cesium.Cartesian3());
  return newP;
};

/**
 * 对坐标（或坐标数组）赋值修改为 指定的海拔高度值
 *
 * @export
 * @param {Cartesian3|Cartesian3[]} positions 笛卡尔坐标数组
 * @param {number} [height=0] 增加的海拔高度值
 * @return {Cartesian3|Cartesian3[]} 增加高度后的坐标（或坐标数组）
 */
let setPositionsHeight = function (positions, height = 0) {
  if (!positions) {
    return positions;
  }

  if (Array.isArray(positions)) {
    let arr = [];
    for (let i = 0, len = positions.length; i < len; i++) {
      let car = Cesium.Cartographic.fromCartesian(positions[i]);
      let point = Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, height);
      arr.push(point);
    }
    return arr;
  } else {
    let car = Cesium.Cartographic.fromCartesian(positions);
    return Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, height);
  }
};
/**
 * 异步计算贴地(或贴模型)高度完成 的回调方法
 * @callback getSurfaceHeight_callback
 * @param {Number|null} newHeight 计算完成的贴地(或贴模型)高度值
 * @param {Cesium.Cartographic} cartOld  原始点坐标对应的Cartographic经纬度值（弧度值）
 */

/**
 * 获取 坐标 的 贴地(或贴模型)高度
 *
 * @export
 * @param {Cesium.Scene} scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} position 坐标
 * @param {Object} [options={}] 参数对象:
 * @param {Boolean} options.asyn  是否进行异步精确计算
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {getSurfaceHeight_callback} options.callback  异步计算高度完成后 的回调方法
 * @return {Number|void} 仅 asyn:false 时返回高度值
 *
 * @example
 * var position = graphic.position
 * position = mars3d.PointUtil.getSurfaceHeight(map.scene, position, {
 *    asyn: true,     //是否异步求准确高度
 *    has3dtiles: true,   //是否先求贴模型上（无模型时改为false，提高效率）
 *    callback: function (newHeight, cartOld) {
 *       console.log("原始高度为：" + cartOld.height.toFixed(2) + ",贴地高度：" + newHeight.toFixed(2))
 *       var positionNew = Cesium.Cartesian3.fromRadians(cartOld.longitude, cartOld.latitude, newHeight);
 *       graphic.position =positionNew
 *    }
 * });
 *
 */
let getSurfaceHeight = function (scene, position, options = {}) {
  if (!position) {
    return position;
  }
  if (scene && scene.scene) {
    scene = scene.scene;
  }

  //是否在3ditiles上面
  let _has3dtiles = Cesium.defaultValue(options.has3dtiles, false);
  if (_has3dtiles) {
    //求贴模型的高度
    return getSurface3DTilesHeight(scene, position, options);
  } else {
    //求贴地形高度
    return getSurfaceTerrainHeight(scene, position, options);
  }
}

/**
 * 获取 坐标 的 贴3dtiles模型高度
 *
 * @export
 * @param {Cesium.Scene} scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} position 坐标
 * @param {Object} [options={}] 参数对象:
 * @param {Boolean} options.asyn  是否进行异步精确计算
 * @param {Object[]} [options.objectsToExclude=null]  排除的不进行贴模型计算的模型对象，可以是： primitives, entities, 或 3D Tiles features
 * @param {getSurfaceHeight_callback} options.callback  异步计算高度完成后 的回调方法
 * @return {Number|void} 仅 asyn:false 时返回高度值
 */
let getSurface3DTilesHeight = function (scene, position, options = {}) {
  //原始的Cartographic坐标
  options.cartographic = options.cartographic || Cesium.Cartographic.fromCartesian(position);
  let carto = options.cartographic;
  let callback = options.callback;

  //是否异步求精确高度
  if (options.asyn) {
    scene.clampToHeightMostDetailed([position], options.objectsToExclude, 0.2).then(function (clampedPositions) {
      let clampedPt = clampedPositions[0];
      if (Cesium.defined(clampedPt)) {
        let cartiles = Cesium.Cartographic.fromCartesian(clampedPt);
        let heightTiles = cartiles.height;
        if (Cesium.defined(heightTiles) && heightTiles > -1000) {
          if (callback) {
            callback(heightTiles, cartiles);
          }
          return;
        }
      }
      //说明没在模型上，继续求地形上的高度
      getSurfaceTerrainHeight(scene, position, options);
    });
  } else {
    //取贴模型高度
    let heightTiles = scene.sampleHeight(carto, options.objectsToExclude, 0.2);
    if (Cesium.defined(heightTiles) && heightTiles > -1000) {
      if (callback) {
        callback(heightTiles, carto);
      }
      return heightTiles;
    }
  }

  return 0; //表示取值失败
}

/**
 * 获取 坐标 的 贴地高度
 *
 * @export
 * @param {Cesium.Scene} scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} position 坐标
 * @param {Object} [options={}] 参数对象:
 * @param {Boolean} options.asyn  是否进行异步精确计算
 * @param {getSurfaceHeight_callback} options.callback  异步计算高度完成后 的回调方法
 * @return {Number|void} 仅 asyn:false 时返回高度值
 *
 * @example
 * var position = entity.position.getValue();
 * position = mars3d.PointUtil.getSurfaceTerrainHeight(map.scene, position, {
 *    asyn: true,     //是否异步求准确高度
 *    callback: function (newHeight, cartOld) {
 *       if (newHeight == null) return;
 *       console.log("地面海拔：" + newHeight.toFixed(2))
 *    }
 * });
 *
 */
function getSurfaceTerrainHeight(scene, position, options = {}) {
  //原始的Cartographic坐标
  let carto = options.cartographic || Cesium.Cartographic.fromCartesian(position);
  let callback = options.callback;

  let _hasTerrain = Boolean(scene.terrainProvider._layers); //是否有地形
  if (!_hasTerrain) {
    //不存在地形，直接返回
    if (callback) {
      callback(carto.height, carto);
    }
    return carto.height;
  }

  //是否异步求精确高度
  if (options.asyn) {
    Promise.resolve(Cesium.sampleTerrainMostDetailed(scene.terrainProvider, [carto])).then(function (samples) {
      let clampedCart = samples[0];
      let heightTerrain;
      if (Cesium.defined(clampedCart) && Cesium.defined(clampedCart.height)) {
        heightTerrain = clampedCart.height;
      } else {
        heightTerrain = scene.globe.getHeight(carto);
      }
      if (callback) {
        callback(heightTerrain, carto);
      }
    });
  } else {
    let heightTerrain = scene.globe.getHeight(carto);
    if (heightTerrain && heightTerrain > -1000) {
      if (callback) {
        callback(heightTerrain, carto);
      }
      return heightTerrain;
    } else {
      return carto.height;
    }
  }
  return 0; //表示取值失败
}

/**
 * 计算 贴地(或贴模型)高度 坐标
 * （非精确计算，根据当前加载的地形和模型数据情况有关）
 *
 * @export
 * @param {Cesium.Scene} scene  三维地图场景对象，一般用map.scene或viewer.scene
 * @param {Cesium.Cartesian3} position 坐标
 * @param {Object} [options={}] 参数对象，具有以下属性:
 * @param {Boolean} [options.relativeHeight=fasle]  是否在地形上侧的高度，在对象具备Cesium.HeightReference.RELATIVE_TO_GROUND时，可以设置为ture
 * @param {Number} [options.maxHeight] 可以限定最高高度，当计算的结果大于maxHeight时，原样返回，可以屏蔽计算误差的数据。
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 * @param {Object[]} [options.objectsToExclude=null]  贴模型分析时，排除的不进行贴模型计算的模型对象，
 * @return {Cesium.Cartesian3} 贴地坐标
 */
function getSurfacePosition(scene, position, options = {}) {
  if (!position) {
    return position;
  }

  let carto = Cesium.Cartographic.fromCartesian(position);

  let height = getSurfaceHeight(scene, position, options);
  if (height != 0 || (Cesium.defined(options.maxHeight) && height <= options.maxHeight)) {
    if (options.relativeHeight) {
      //Cesium.HeightReference.RELATIVE_TO_GROUND时
      height += carto.height;
    }
    let positionNew = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, height);
    return positionNew;
  }
  return position;
}
export default {getMaxHeight,getOnLinePointByLen,setPositionsHeight,getSurfaceHeight,getSurface3DTilesHeight};