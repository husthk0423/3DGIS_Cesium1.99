import TerrainEditBase from '../terrain/TerrainEditBase';
/**
 * 坡度分析
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {Cesium.Cartesian3[]} [options.positions] 分析区域 坐标位置数组
 * @param {Object} [options.colorScheme ] 地表渲染配色方案,默认值为：
 * {
        step: [0.0, 0.29, 0.5, Math.sqrt(2) / 2, 0.87, 0.91, 1.0],
        color: ['#000000', '#2747E0', '#D33B7D', '#D33038', '#FF9742', '#FF9742', '#ffd700'],
   }
 * @export
 * @class Slope
 * @extends {BaseThing}
 * @see [支持的事件类型]{@link Slope.EventType}
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

export default SlopeAnalysis;
