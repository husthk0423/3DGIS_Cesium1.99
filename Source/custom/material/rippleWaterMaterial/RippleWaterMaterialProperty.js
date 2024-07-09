/**
 * 流动水面材质
 * 包括定义 RippleWaterMaterialProperty 和添加Cesium.Material.RippleWater 两部分
 * entity方式可直接通过 new Custom.RippleWaterMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.RippleWaterMaterialType) 调用此材质
 */
class RippleWaterMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event();

    if (!options.RippleImg) {
      return;
    }

    this._RippleImg = options.RippleImg;
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // RippleWater 类型材质需已添加到Cesium的Material中才能正常使用此 RippleWaterMaterialProperty
    return 'RippleWater'
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
    result.RippleImg = this._RippleImg;

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
      (other instanceof RippleWaterMaterialProperty &&
        this._RippleImg == other._RippleImg
      )
    );
  }
}

/**
 * 添加流动水面到cesium的Material中
 */
const RippleWaterType = 'RippleWater';
const RippleWaterSource =
  `
    #define MAX_RADIUS 2
    #define HASHSCALE1 .1
    #define HASHSCALE3 vec3(0.1,0.2,0.3)

    float getMixValue(float cycle, inout float offset1, inout float offset2)
    {

        float mixval = cycle * 2.0;
        if(mixval > 1.0) mixval = 2.0 - mixval;
        offset1 = cycle;
        offset2 = mod(offset1 + .5, 1.0);
        return mixval;
    }

    float  getInterval(float _interval)
    {
        float time = czm_frameNumber;
        //间隔速度，值越大，间隔时间越长；值越小，间隔时间越大；
        float cycle = mod(time, _interval)/_interval;   
        return cycle;
    }
 
    float hash12(vec2 p)
    {
        vec3 p3  = fract(vec3(p.xyx) * HASHSCALE1);
        p3 += dot(p3, p3.yzx + 10.);
        return fract((p3.x + p3.y) * p3.z); 
    }

    vec2 hash22(vec2 p)
    {
        vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
        p3 += dot(p3, p3.yzx+20.);
        return fract((p3.xx+p3.yz)*p3.zy);

    }
    vec3 getRippleColor(float t,vec2 _uv,float tiling)
    {
        float LianyiTime=t;
        vec2 uv = _uv *tiling;
        vec2 p0 = floor(uv);
        vec2 circles = vec2(0.);
        for (int j = -MAX_RADIUS; j <= MAX_RADIUS; ++j)
        {
            for (int i = -MAX_RADIUS; i <= MAX_RADIUS; ++i)
            {
                vec2 pi = p0 + vec2(i, j);
                vec2 p = pi + hash22(pi);

                float t = fract(0.05*LianyiTime + hash12(pi));
                vec2 v = p-uv;
                float d = length(v) - (float(MAX_RADIUS) + 1.)*t;

                float h = 1e-3;
                float d1 = d - h;
                float d2 = d + h;   
                float p1 = sin(31.*d1) * smoothstep(-0.6, -0.3, d1) * smoothstep(0., -0.3, d1);
                float p2 = sin(31.*d2) * smoothstep(-0.6, -0.3, d2) * smoothstep(0., -0.3, d2); 
                circles += 0.5 * normalize(v) * ((p2 - p1) / (2. * h) * (1. - t) * (1. - t));
            }
        }
        circles /= float((MAX_RADIUS*2+1)*(MAX_RADIUS*2+1));
        float intensity = mix(0.01, 0.15, smoothstep(0.1, 0.6, abs(fract(0.05*LianyiTime + 0.5)*2.-1.)));
        vec3 n = vec3(circles, sqrt(1. - dot(circles, circles)));
        vec3 _color = texture2D(RippleImg, _uv-intensity*n.xy).rgb;
        float nosie = 5.*pow(clamp(dot(n, normalize(vec3(1., 0.7, 0.5))), 0., 1.), 6.);
        _color = _color + nosie;
        return _color;

    }   
    czm_material czm_getMaterial(czm_materialInput materialInput)
    { 
        czm_material material = czm_getDefaultMaterial(materialInput); 
        float tiling = 20.;
        float LianyiTime = czm_frameNumber/5.;
        vec3 _color=getRippleColor(LianyiTime,materialInput.st,tiling);
    

        material.diffuse=_color;
        return material;
        }
    `;


Cesium.Material._materialCache.addMaterial(RippleWaterType, {
  fabric: {
    type: RippleWaterType,
    uniforms: {
      RippleImg: Cesium.Material.DefaultImageId,
    },
    source: RippleWaterSource,
  },
  translucent: function () {
    return true
  },
})
export default RippleWaterMaterialProperty;