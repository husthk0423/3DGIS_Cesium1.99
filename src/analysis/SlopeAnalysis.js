const TerrainEditBase = require('../terrain/TerrainEditBase');

/**
 * 坡度分析
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只显示单个区域【单个区域场景时使用】
 * @param {Boolean} [options.contourShow = true] 是否显示等高线
 * @param {Number} [options.spacing = 100.0] 等高线 间隔（单位：米）
 * @param {Number} [options.width = 1.5] 等高线 线宽（单位：像素）
 * @param {Cesium.Color|String} [options.color = Cesium.Color.RED] 等高线 颜色
 * @param {String} [options.shadingType = 'none'] 地表渲染效果，可选值: 无none, 高程 elevation, 坡度slope, 坡向aspect
 * @param {Object} [options.colorScheme ] 地表渲染配色方案,默认值为：
 * {
        step: [0.0, 0.29, 0.5, Math.sqrt(2) / 2, 0.87, 0.91, 1.0],
        color: ['#000000', '#2747E0', '#D33B7D', '#D33038', '#FF9742', '#FF9742', '#ffd700'],
   }
 * @param {Boolean} [options.showElseArea = true] 是否显示区域外的地图
 * @param {Number} [options.minHeight = -414.0] 地表渲染配色方案中的 最低海拔高度
 * @param {Number} [options.maxHeight = 8777] 地表渲染配色方案中的 最高海拔高度
 *
 * @export
 * @class ContourLine
 * @extends {TerrainEditBase}
 */
class SlopeAnalysis extends TerrainEditBase {
  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    super(viewer,options);
    //配色方案
    this.colorScheme = options.colorScheme || {
      step: [0.0, 0.29, 0.5, Math.sqrt(2) / 2, 0.87, 0.91, 1.0],
      color: ["#000000", "#2747E0", "#D33B7D", "#D33038", "#FF9742", "#FF9742", "#ffd700"]
    };
  }

  //========== 对外属性 ==========

  /**
   * 清除数据
   * @return {void}  无
   */
  clear() {
    super.clear();
    this._map.scene.globe.material = null;

    if (this.hasResetEnableLighting) {
      this._map.scene.globe.enableLighting = false;
      this._map.clock.currentTime = Cesium.JulianDate.now();
      delete this.hasResetEnableLighting;
    }
  }

  //=========地球渲染材质相关==========
  updateMaterial() {
    let material;
    let shadingUniforms;
    material = Cesium.Material.fromType("SlopeRamp");
    shadingUniforms = material.uniforms;
    shadingUniforms.minimumHeight = this.minHeight;
    shadingUniforms.maximumHeight = this.maxHeight;
    shadingUniforms.image = this.getColorRamp();

    if (!this._map.scene.globe.enableLighting) {
      this._map.scene.globe.enableLighting = true;
      let now = new Date();
      now.setHours(10);
      this._map.clock.currentTime = Cesium.JulianDate.fromDate(new Date(now));
      this.hasResetEnableLighting = true;
    }

    this._map.scene.globe.material = material;
  }

  addPolygon(positions, options) {
    let areaObj = super.addPolygon(positions,options);
    this.updateMaterial();
    return areaObj;
  }

  getColorRamp() {
    let ramp = document.createElement("canvas");
    ramp.width = 100;
    ramp.height = 1;

    let ctx = ramp.getContext("2d");
    let grd = ctx.createLinearGradient(0, 0, 100, 0);

    let colorScheme = this.colorScheme;
    if (colorScheme.step.length > 0) {
      for (let i = 0, len = colorScheme.step.length; i < len; i++) {
        grd.addColorStop(colorScheme.step[i], colorScheme.color[i]);
      }
    }

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 100, 1);

    return ramp;
  }
}

module.exports = SlopeAnalysis;
