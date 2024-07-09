/**
 * 旋涡水面材质
 * 包括定义 VortexWaterMaterialProperty 和添加Cesium.Material.VortexWater 两部分
 * entity方式可直接通过 new Custom.VortexWaterMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.VortexWaterMaterialType) 调用此材质
 */
class VortexWaterMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event();

    if (!options.VortexImg) {
      return;
    }

    this._WaveImage = options.WaveImage;
    this._FlowWater = options.FlowWater;
    this._FlowMapImage = options.FlowMapImage;
    this._wateralpha = Cesium.defaultValue(options.wateralpha, 0.7);    // 透明度
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // VortexWater 类型材质需已添加到Cesium的Material中才能正常使用此 VortexWaterMaterialProperty
    return 'VortexWater'
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
    result.WaveImage = this._WaveImage;
    result.FlowWater = this._FlowWater;
    result.FlowMapImage = this._FlowMapImage;
    result.wateralpha = this._wateralpha;

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
      (other instanceof VortexWaterMaterialProperty &&
        this._WaveImage == other._WaveImage &&
        this._FlowWater == other._FlowWater &&
        this._FlowMapImage == other._FlowMapImage &&
        this._wateralpha == other._wateralpha
      )
    );
  }
}

/**
 * 添加旋涡水面到cesium的Material中
 */
const VortexWaterType = 'VortexWater';
const VortexWaterSource =
  `
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
 
    czm_material czm_getMaterial(czm_materialInput materialInput)
    { 
        //水波时间
        float timeInterval=200.;
        float _WaveXSpeed=0.05;
        float _WaveYSpeed=0.05; 
        vec3 bottomColor=vec3(0.7451, 0.7686, 0.6471);
        float o1, o2 = 0.;
        float cycle = mod(czm_frameNumber, timeInterval)/timeInterval;
        float mv = getMixValue(cycle, o1, o2);
        float _time=getInterval(timeInterval);

        //往下流
         vec2 xia_speed =vec2(-_WaveXSpeed, _WaveYSpeed);


        czm_material material = czm_getDefaultMaterial(materialInput); 

        vec3 bump1 = normalize(texture2D(WaveImage, fract(materialInput.st))).rgb; 
        vec3 bump2 = normalize(texture2D(WaveImage, fract(materialInput.st)-o1*xia_speed)).rgb; 
        //叉乘得到法线分量
        vec3 bumpnormaCross1 = normalize(cross(bump1, bump2));
        vec3 bump3 = normalize(texture2D(WaveImage, fract(materialInput.st))).rgb; 
        vec3 bump4 = normalize(texture2D(WaveImage, fract(materialInput.st)-o2*xia_speed)).rgb; 
        //叉乘得到法线分量分量
        vec3 bumpnormaCross2 = normalize(cross(bump3, bump4));
        // //得到新的分量,保证水流连续
        vec3 bumpnormaCross=mix(bumpnormaCross2, bumpnormaCross1, mv);
       
        //opengl光照原理,传入法向量
        float diffuseFactor=czm_getLambertDiffuse(czm_lightDirectionEC,bumpnormaCross);
        float specularFactor = czm_getSpecular(czm_lightDirectionEC, bumpnormaCross,normalize(materialInput.positionToEyeEC),10.0);
       
        
        diffuseFactor= pow(diffuseFactor, 2.)* 1.;
        
        vec4 blue = vec4(0., 69., 129., 0.) / 255.;
        vec4 orange = vec4(.7, .3, 0.1, 0.0);
        float wd = dot(bumpnormaCross, czm_lightDirectionEC);
        wd = max(0.0, wd);
        float wrp = 0.5;
        wd = (wd+wrp)/(1.+wrp);
        
        vec3 frescol = diffuseFactor*orange.rgb*0.4+blue.rgb*wd;

        float _flowtimeInterval=4000.;
        float _flowtime=getInterval(_flowtimeInterval);
        vec3 flowDir = texture2D(FlowMapImage, fract(vec2(4.2,4.2)*materialInput.st.xy)).rgb*vec3(4.0)-vec3(1.0);
        float phase0 = fract(_flowtime + 0.2) ;
        float phase1 = fract(_flowtime);
        vec3 color0 = texture2D(FlowWater, fract(materialInput.st.xy + vec2(phase0) * flowDir.xy)).rgb;
        vec3 color1 = texture2D(FlowWater, fract(materialInput.st.xy + vec2(phase1) * flowDir.xy)).rgb;
        float flowLerp =(abs(phase0 - 0.5)) * 2.0;
        vec3 finalCol = mix(color0, color1, flowLerp);

        material.diffuse=mix(mix(bottomColor,frescol,0.3),finalCol,0.9);
        material.normal=normalize(materialInput.tangentToEyeMatrix * bumpnormaCross);;
        material.specular=specularFactor;
        material.shininess=10.;
        material.alpha=wateralpha;
        return material;
    }
    `;


Cesium.Material._materialCache.addMaterial(VortexWaterType, {
  fabric: {
    type: VortexWaterType,
    uniforms: {
      WaveImage: Cesium.Material.DefaultImageId,
      FlowWater: Cesium.Material.DefaultImageId,
      FlowMapImage: Cesium.Material.DefaultImageId,
      wateralpha: 0.7
    },
    source: VortexWaterSource,
  },
  translucent: function () {
    return true
  },
})

export default VortexWaterMaterialProperty;