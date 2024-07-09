import RippleWaterMaterialProperty from "../rippleWaterMaterial/RippleWaterMaterialProperty";

/**
 * 视频透明材质
 * 包括定义 VideoTranslucentMaterialProperty 和添加Cesium.Material.VideoTranslucent 两部分
 * entity方式可直接通过 new Custom.VideoTranslucentMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.VideoTranslucentMaterialType) 调用此材质
 */
class VideoTranslucentMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event();

    if (!options.video || options.translucentImage) {
      return;
    }

    this._video = options.video;
    this._translucentImage = options.translucentImage;
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // FlowWater 类型材质需已添加到Cesium的Material中才能正常使用此 FlowWaterMaterialProperty
    return 'VideoTranslucent';
  }

  /**
   * 获取所提供时间的属性值。
   *
   * @param {Cesium.JulianDate} [time] 检索值的时间。
   * @param {Object} [result] 用于存储值的对象，如果省略，则创建并返回一个新的实例。
   * @returns {Object} 修改的result参数或一个新的实例(如果没有提供result参数)。
   */
  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {};
    }
    result.video = this._video;
    result.translucentImage = this._translucentImage;
    return result;
  }

  getCesiumValue(obj, ClasName, time) {
    if (!obj) {
      return obj;
    }
    if (ClasName) {
      if (obj instanceof ClasName) {
        return obj;
      } else if (obj._value && obj._value instanceof ClasName) {
        return obj._value;
      }
    }

    if (typeof obj.getValue == "function") {
      return obj.getValue(time || Cesium.JulianDate.now());
    }
    return obj;
  }

  /**
   * 将此属性与提供的属性进行比较并返回, 如果两者相等返回true，否则为false
   * @param { Cesium.Property} [other] 比较的对象
   * @returns {Boolean}  两者是同一个对象
   */
  equals(other) {
    return (
      this == other ||
      (other instanceof VideoTranslucentMaterialProperty &&
        this._video == other.video &&
        this._translucentImage == other.translucentImage
      )
    );
  }
}


/**
 * 添加流动水面到cesium的Material中
 */
const VideoTranslucentMaterialType = 'VideoTranslucent';
Cesium.Material._materialCache.addMaterial(VideoTranslucentMaterialType, {
  fabric: {
    type: VideoTranslucentMaterialType,
    uniforms: {
      video: Cesium.Material.DefaultImageId,
      translucentImage: Cesium.Material.DefaultImageId,
      repeat: new Cesium.Cartesian2(1.0, 1.0),
      color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
    },
    components: {
      diffuse:
          "texture2D(video, fract(repeat * materialInput.st)).rgb * color.rgb",
      alpha: "texture2D(video, fract(repeat * materialInput.st)).a * texture2D(translucentImage, fract(repeat * materialInput.st)).a * color.a",
    },
  },
  translucent: function (material) {
    return material.uniforms.color.alpha < 1.0;
  },
});
export default  VideoTranslucentMaterialProperty;