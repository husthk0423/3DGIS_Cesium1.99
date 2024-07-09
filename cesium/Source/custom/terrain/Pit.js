import PointUtil from '../utils/PointUtil';
const getSurfaceHeight = PointUtil.getSurfaceHeight;
/**
 * 井  支持的样式信息，
 *
 * @typedef {Object} Pit.StyleOptions
 *
 * @property {String} image   井墙面贴图URL
 * @property {String} imageBottom   井底面贴图URL
 * @property {Number} diffHeight  井下深度（单位：米）
 * @property {Number} [splitNum = 50] 井墙面每两点之间插值个数
 *
 * @property {LabelPrimitive.StyleOptions} [label] 支持附带文字的显示
 */

/**
 * 井 矢量对象
 * 用于显示地形开挖后的开挖效果。
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {BaseGraphic.ConstructorOptions} [options.通用参数] 支持所有Graphic通用参数
 * @param {BasePrimitive.ConstructorOptions} [options.通用参数P] 支持所有Primitive通用参数
 *
 * @param {LatLngPoint[]|Cesium.Cartesian3[]} options.positions 坐标位置
 * @param {Pit.StyleOptions}options.style 样式信息
 * @param {Object} [options.attr] 附件的属性信息，可以任意附加属性，导出geojson或json时会自动处理导出。
 *
 * @extends {BasePolyPrimitive}
 * @see [支持的事件类型]{@link BasePrimitive.EventType}
 */
class Pit {
  constructor(_map, options = {}) {
    this._map = _map;
    this.style = options.style;
    this.style.diffHeight = Cesium.defaultValue(this.style.diffHeight, 10); //挖掘深度
    this.style.splitNum = Cesium.defaultValue(this.style.splitNum, 50); //每两点之间插值个数
    if (options.positions) {
      //坐标位置
      this.positions = options.positions;
    }

    let wellData = this._getWellData();
    this.wellData = wellData;

    this._createPit(wellData);
  }

  //内部用，文本等附加对象
  get czmObjectEx() {
    let arr = [];
    if (this._bottomPrimitive) {
      arr.push(this._bottomPrimitive);
    }
    if (this._primitive_label) {
      arr.push(this._primitive_label);
    }
    return arr;
  }

  //中心点坐标，覆盖父类
  get center() {
    return this.centerOfMass;
  }

  /**
   * 井下深度（单位：米）
   * @type {Number}
   */
  get diffHeight() {
    return this.style.diffHeight;
  }
  set diffHeight(val) {
    this.style.diffHeight = val;

    let bottomPositions = [];
    let bottomHeight = this._minHeight - val; //墙底部的高度
    let cartoList = this.wellData.cartoList;
    for (let i = 0, len = cartoList.length; i < len; i++) {
      let carto = cartoList[i];
      bottomPositions.push(Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, bottomHeight));
    }
    //墙底部的坐标数组
    this.wellData.bottomPositions = bottomPositions;

    this._removePit();
    this._createPit(this.wellData);
  }

  _getWellData() {
    if (this.positions.length == 0) {
      return;
    }

    let wallTopPositions = [];
    let bottomPositions = [];
    let cartoList = [];

    let positionsNew = this.interPolyline({
      scene: this._map.scene,
      positions: this.positions.concat(this.positions[0]),
      splitNum: this.style.splitNum,
    });

    //墙顶部的高度（也是绘制的坐标的最低点高度）
    let minMaxHeight = this.getHeight(positionsNew);
    this._minHeight = minMaxHeight.min;
    this._maxHeight = minMaxHeight.max;

    //墙底部的高度
    let bottomHeight = this._minHeight - this.diffHeight;

    for (let i = 0, len = positionsNew.length; i < len; i++) {
      let point = Cesium.Cartographic.fromCartesian(positionsNew[i]);
      cartoList.push(new Cesium.Cartographic(point.longitude, point.latitude));

      bottomPositions.push(Cesium.Cartesian3.fromRadians(point.longitude, point.latitude, bottomHeight));
      wallTopPositions.push(Cesium.Cartesian3.fromRadians(point.longitude, point.latitude, 0)); //无地形时直接使用这个0
    }
    return {
      cartoList: cartoList,
      bottomPositions: bottomPositions,
      wallTopPositions: wallTopPositions,
    };
  }

  _removePit() {
    if (this._primitive) {
      this._map.scene.primitives.remove(this._primitive);
      delete this._primitive;
    }

    if (this._bottomPrimitive) {
      this._map.scene.primitives.remove(this._bottomPrimitive);
      delete this._bottomPrimitive;
    }

    if (this._upliftPrimitive) {
      this._map.scene.primitives.remove(this._upliftPrimitive);
      delete this._upliftPrimitive;
    }

    if (this._upliftBottomPrimitive) {
      this._map.scene.primitives.remove(this._upliftBottomPrimitive);
      delete this._upliftBottomPrimitive;
    }
  }

  //给Cartesian加指定的高度
  addCartesianAddHeight(c3,height){
    let cartographic = Cesium.Cartographic.fromCartesian(c3);
    let h = cartographic.height + height;
    return Cesium.Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,h);
  }

  _createPit(wellData) {
    this._createBottomSurface(wellData.bottomPositions);
    let hasTerrain = Boolean(this._map.terrainProvider._layers);

    if (hasTerrain) {
      let promise = Cesium.sampleTerrainMostDetailed(this._map.terrainProvider, wellData.cartoList);
      promise.then((updatedPositions) => {
        let _maxHeight = -9999;

        let wallTopPositions = []; //墙顶部的坐标数组
        for (let k = 0, len = updatedPositions.length; k < len; k++) {
          let carto = updatedPositions[k];
          _maxHeight = Math.max(carto.height, _maxHeight);
          wallTopPositions.push(Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height));
        }
        this._maxHeight = _maxHeight;

        this._createWellWall(wallTopPositions);
      });
    } else {
      this._createBottomtranslucentSurface(wellData.bottomPositions);
      this._createWellWall(wellData.wallTopPositions);
    }
  }

  //创建井壁
  _createWellWall(top) {
    //墙底部的高度
    let bottomHeight = this._minHeight - this.diffHeight;
    let g = new Cesium.GeometryInstance({
      geometry: new Cesium.WallGeometry({
        positions: top,
        minimumHeights:Array(top.length).fill(bottomHeight),
      }),
    });

    this._primitive = new Cesium.Primitive({
      asynchronous:false,
      geometryInstances: [g],
      appearance: new Cesium.MaterialAppearance({
        translucent: true,
        flat: true,
        material: Cesium.Material.fromType(Cesium.Material.ImageType, {
          image: this.style.image,
          color: Cesium.Color.WHITE.withAlpha(this.style.opacity || 1.0),
        }),
      }),
    });

    this._map.scene.primitives.add(this._primitive);

    if(this.style.openUplift) {
      let upliftTop = [];
      for (let j = 0; j < top.length; j++) {
        upliftTop.push(this.addCartesianAddHeight(top[j], this.style.upHeight));
      }

      let g1 = new Cesium.GeometryInstance({
        geometry: new Cesium.WallGeometry({
          positions: upliftTop,
          minimumHeights:Array(upliftTop.length).fill(bottomHeight+this.style.upHeight),
        }),
      });

      this._upliftPrimitive = new Cesium.Primitive({
        asynchronous:false,
        geometryInstances: [g1],
        appearance: new Cesium.MaterialAppearance({
          translucent: true,
          flat: true,
          material: Cesium.Material.fromType(Cesium.Material.ImageType, {
            image: this.style.upliftImage?this.style.upliftImage:this.style.image,
            color: Cesium.Color.WHITE.withAlpha(this.style.opacity || 1.0),
          }),
        }),
      });

      this._map.scene.primitives.add(this._upliftPrimitive);
    }
  }
  _createBottomtranslucentSurface(bottomPositions) {

    if(this.style.openUplift){
      let upliftBottomPositions = [];
      for(let i = 0;i<bottomPositions.length;i++){
        upliftBottomPositions.push(this.addCartesianAddHeight(bottomPositions[i],this.style.upHeight));
      }

      let g1 = new Cesium.GeometryInstance({
        geometry: Cesium.PolygonGeometry.fromPositions({
          positions: upliftBottomPositions,
          perPositionHeight: true,
        })
      });

      this._upliftBottomPrimitive = new Cesium.Primitive({
        asynchronous:false,
        geometryInstances: [g1],
        appearance: new Cesium.MaterialAppearance({
          translucent: true,
          flat: true,
          material: Cesium.Material.fromType(Cesium.Material.ImageType, {
            image: this.style.upliftImageBottom ? this.style.upliftImageBottom : this.style.imageBottom,
            color: Cesium.Color.WHITE.withAlpha(this.style.opacity || 1.0),
          }),
        }),
      });

      this._map.scene.primitives.add(this._upliftBottomPrimitive);
    }

  }
  //创建井底
  _createBottomSurface(bottomPositions) {
    if (!bottomPositions.length) {
      return;
    }


    let g = new Cesium.GeometryInstance({
      geometry: Cesium.PolygonGeometry.fromPositions({
        positions: bottomPositions,
        perPositionHeight: true,
      })
    });

    this._bottomPrimitive = new Cesium.Primitive({
      asynchronous:false,
      geometryInstances: [g],
      appearance: new Cesium.MaterialAppearance({
        translucent: true,
        flat: true,
        material: Cesium.Material.fromType(Cesium.Material.ImageType, {
          image: this.style.imageBottom,
          color: Cesium.Color.WHITE.withAlpha(this.style.opacity || 1.0),
        }),
      }),
    });

    this._map.scene.primitives.add(this._bottomPrimitive);
  }


  getHeight(positions, defaultVal = 0) {
    if (positions == null || positions.length == 0) {
      return {
        min: defaultVal,
        max: defaultVal
      };
    }

    let minHeight = defaultVal;
    let maxHeight = defaultVal;
    for (let i = 0; i < positions.length; i++) {
      let tempCarto = Cesium.Cartographic.fromCartesian(positions[i]);
      if (i == 0) {
        minHeight = tempCarto.height;
        maxHeight = tempCarto.height;
      }
      if (tempCarto.height < minHeight) {
        minHeight = tempCarto.height;
      }

      if (tempCarto.height > maxHeight) {
        maxHeight = tempCarto.height;
      }
    }
    return {
      min: minHeight.toFixed(3) * 1,
      max: maxHeight.toFixed(3) * 1
    };
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
  interPolyline(options) {
    let positions = options.positions;
    let scene = options.scene;

    let granularity = this.getGranularity(positions, options.splitNum || 100);
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
   * 求坐标数组的矩形范围内 按 splitNum网格数插值的 granularity值
   *
   * @export
   * @param {Cesium.Cartesian3[]} positions 坐标数组
   * @param {Int} [splitNum=10] splitNum网格数
   * @return {Number} granularity值
   */
  getGranularity(positions, splitNum = 10) {
    let recta = Cesium.Rectangle.fromCartesianArray(positions);
    let granularity = Math.max(recta.height, recta.width);
    granularity /= splitNum;
    return granularity;
  }


}
export default Pit;