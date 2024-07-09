const TerrainEditBase = require('./TerrainEditBase');
const Pit = require('./Pit');

/**
 * 地形开挖，
 * 基于地球材质，可以多个区域开挖。
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只显示单个区域【单个区域场景时使用】
 * @param {Boolean} [options.clipOutSide = false] 是否外切开挖
 * @param {String} [options.image]  开挖区域的井墙面贴图URL。未传入该值时，不显示开挖区域的井。
 * @param {String} [options.imageBottom] 当显示开挖区域的井时，井底面贴图URL
 * @param {Number} [options.diffHeight]  当显示开挖区域的井时，设置所有区域的挖掘深度（单位：米）
 * @param {Number} [splitNum = 30] 当显示开挖区域的井时，井墙面每两点之间插值个数
 *
 * @export
 * @class TerrainClip
 * @extends {TerrainEditBase}
 */
class TerrainClip extends TerrainEditBase {
  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    super(viewer,options);
    this._clipOutSide = Cesium.defaultValue(options.clipOutSide, false);
  }

  //========== 对外属性 ==========
  //分析参数
  get terrainEditCtl() {
    return this._map.scene.globe._surface.tileProvider._excavateAnalysis;
  }

  /**
   * 是否外切开挖
   * @type {Boolean}
   */
  get clipOutSide() {
    return this.terrainEditCtl.showTailorOnly;
  }
  set clipOutSide(val) {
    this.terrainEditCtl.showTailorOnly = val;
  }

  /**
   * 设置所有区域的挖掘深度（单位：米）
   * @type {Number}
   */
  get diffHeight() {
    return this.options.diffHeight;
  }
  set diffHeight(val) {
    this.options.diffHeight = val;
  }


  /**
   * 清除开挖
   * @return {void}  无
   */
  clear() {
    for(let i = 0;i<this._areaList.length;i++){
      let polygonObj = this._areaList[i];
      polygonObj.pitPrimitive._removePit();
    }

    super.clear();
    this.yanmoFbo = null;
    this._map.scene.globe._surface.tileProvider.applyTailor = false;
    this.terrainEditCtl.enableTailor = false;
    this.terrainEditCtl.inverTailorCenterMat = Cesium.Matrix4.IDENTITY;
    this.terrainEditCtl.tailorArea = undefined;

    if (this._hasChangeHighDynamicRange) {
      this._map.scene.highDynamicRange = false;
      this._hasChangeHighDynamicRange = false;
    }
    if (this._hasChangeDepthTestAgainstTerrain) {
      this._map.scene.globe.depthTestAgainstTerrain = false;
      this._hasChangeDepthTestAgainstTerrain = false;
    }
  }

  addPolygon(positions, options) {
    let polygonObj = super.addPolygon(positions,options);
    if (positions && this.options.image) {
      polygonObj.pitPrimitive = new Pit(this._map,{
        style: {
          ...this.options,
          ...options,
        },
        positions: polygonObj.positions_original,
      });
    }

    if (!this._map.scene.highDynamicRange) {
      this._map.scene.highDynamicRange = true;
      this._hasChangeHighDynamicRange = true;
    }
    if (!this._map.scene.globe.depthTestAgainstTerrain) {
      this._map.scene.globe.depthTestAgainstTerrain = true;
      this._hasChangeDepthTestAgainstTerrain = true;
    }

    return polygonObj;
  }


  removePolygon(item) {
    super.removePolygon(item);
    item.pitPrimitive._removePit();
  }

  beginTailor() {
    this._map.scene.globe._surface.tileProvider.applyTailor = true;
    this.terrainEditCtl.inverTailorCenterMat = this.inverTrans;
    this.terrainEditCtl.tailorArea = this.yanmoFbo;
    this.terrainEditCtl.enableTailor = true;
    this.terrainEditCtl.tailorRect = this.floodRect;
  }
}

module.exports = TerrainClip;
