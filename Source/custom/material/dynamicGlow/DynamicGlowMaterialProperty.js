/**
 * 动态发光材质
 * 包括定义DynamicGlowMaterialProperty和添加Cesium.Material.DynamicFlowType两部分
 * entity方式可直接通过 new Custom.DynamicGlowMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.DynamicGlowMaterialType) 调用此材质
 */
class DynamicGlowMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event()

    this._image = options.image || options.url; //背景图片
    this._color = Cesium.defaultValue(Cesium.Color.fromCssColorString(options.color), Cesium.Color.RED); //背景图片颜色
    this._axisY = Cesium.defaultValue(options.axisY, false);
    this._speed = Cesium.defaultValue(options.speed, 10); //速度
    this._repeat = Cesium.defaultValue(options.repeat, new Cesium.Cartesian2(1.0, 1.0));
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // DynamicGlow 类型材质需已添加到Cesium的Material中才能正常使用此DynamicFlowMaterialProperty
    return 'DynamicGlow'
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
    result.image = this._image;
    result.color = this.getCesiumValue(this._color, Cesium.Color, time);
    result.repeat = this.getCesiumValue(this._repeat, Cesium.Cartesian2, time);
    result.axisY = this._axisY;
    result.speed = this.getCesiumValue(this._speed, Number, time);

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
        (other instanceof DynamicGlowMaterialProperty &&
            Cesium.Property.equals(this._color, other._color) &&
            Cesium.Property.equals(this._repeat, other._repeat) &&
            this._image == other._image &&
            this._axisY == other._axisY &&
            this._speed == other._speed)
    );
  }
}


/**
 * 添加动态发光材质到cesium的Material中
 */
const DynamicGlowType = 'DynamicGlow';
const DynamicGlowSource = `czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = repeat * materialInput.st;
    vec4 colorImage = texture2D(image, vec2(fract((axisY?st.t:st.s) - speed*czm_frameNumber/1000.0), st.t));
    if(color.a == 0.0) {
    if(colorImage.rgb == vec3(1.0)){
        discard;
        }
        material.alpha = colorImage.a;
        material.diffuse = colorImage.rgb;
    }
    else {
        material.alpha = colorImage.a * color.a;
        material.diffuse = max(color.rgb * material.alpha * 3.0, color.rgb);
    }

    return material;
}`

Cesium.Material._materialCache.addMaterial(DynamicGlowType, {
  fabric: {
    type: DynamicGlowType,
    uniforms: {
      image: Cesium.Material.DefaultImageId,
      color: new Cesium.Color(1, 0, 0, 1.0),
      repeat: new Cesium.Cartesian2(1.0, 1.0),
      axisY: false,
      speed: 10.0,
    },
    source: DynamicGlowSource,
  },
  translucent: function () {
    return true
  },
})

export default DynamicGlowMaterialProperty;
