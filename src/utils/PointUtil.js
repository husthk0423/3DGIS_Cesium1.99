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
function getSurfaceHeight(scene, position, options = {}) {
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
function getSurface3DTilesHeight(scene, position, options = {}) {
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
    Cesium.when(Cesium.sampleTerrainMostDetailed(scene.terrainProvider, [carto]), function (samples) {
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

module.exports = {getSurfaceHeight,getSurface3DTilesHeight,getSurfaceTerrainHeight,getSurfacePosition};