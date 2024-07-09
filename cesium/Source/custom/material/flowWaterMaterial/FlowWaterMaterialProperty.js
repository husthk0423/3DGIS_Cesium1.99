/**
 * 流动水面材质
 * 包括定义 FlowWaterMaterialProperty 和添加Cesium.Material.FlowWater 两部分
 * entity方式可直接通过 new Custom.FlowWaterMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.FlowWaterMaterialType) 调用此材质
 */
class FlowWaterMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event();

    if (!options.WaveImage) {
      return;
    }

    this._WaveImage = options.WaveImage;
    //hk add 
    this._WaveColor = options.WaveColor;//rgb
    this._WaveSpeed = options.WaveSpeed;//0~1.0
    this._WaveLightGrade = options.WaveLightGrade;//0~1.0
    this._reflectLightGrade = options.reflectLightGrade;//0~1.0
    this._reflectLightCircleSize=options.reflectLightCircleSize
    this._wateralpha = Cesium.defaultValue(options.wateralpha, 0.7);    // 透明度
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // FlowWater 类型材质需已添加到Cesium的Material中才能正常使用此 FlowWaterMaterialProperty
    return 'FlowWater'
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
     //hk add 
    result.WaveColor = this._WaveColor;
    result.reflectLightGrade=this._reflectLightGrade
    result.reflectLightCircleSize=this._reflectLightCircleSize
    result.WaveSpeed = this._WaveSpeed;
    result.WaveLightGrade = this._WaveLightGrade;

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
      (other instanceof FlowWaterMaterialProperty &&
        this._WaveImage == other._WaveImage &&
        this._wateralpha == other._wateralpha&&
        this._WaveColor == other._WaveColor&&
        this._WaveSpeed == other._WaveSpeed&&
        this._WaveLightGrade == other._WaveLightGrade&&
        this._reflectLightGrade==other._reflectLightGrade
      )
    );
  }
}

/**
 * 添加流动水面到cesium的Material中
 */
const FlowWaterType = 'FlowWater';
const FlowWaterSource =
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
        //水波时间(1.-clamp(WaveSpeed,0.,1.)
        float timeInterval=20.+(1.-clamp(WaveSpeed,0.,1.))*450.;
        float _WaveXSpeed=0.05;
        float _WaveYSpeed=0.05; 
        vec3 bottomColor=vec3(0.7451, 0.7686, 0.6471);
        float o1, o2 = 0.;
        float cycle = mod(czm_frameNumber, timeInterval)/timeInterval;
        float mv = getMixValue(cycle, o1, o2);
        float _time=getInterval(timeInterval);

        vec2 repeat=vec2(18.,18.);
        //往下流
         vec2 xia_speed =vec2(-_WaveXSpeed, _WaveYSpeed);


        czm_material material = czm_getDefaultMaterial(materialInput);         
        vec3 bump1 = texture2D(WaveImage, fract(repeat*materialInput.st)).rgb; 
        vec3 bump2 = texture2D(WaveImage, fract(repeat*materialInput.st-o1*xia_speed)).rgb; 
        //叉乘得到法线分量
        vec3 bumpnormaCross1 = normalize(cross(bump1, bump2));
        
        vec3 bump3 = texture2D(WaveImage, fract(repeat*materialInput.st)).rgb; 
        vec3 bump4 = texture2D(WaveImage, fract(repeat*materialInput.st-o2*xia_speed)).rgb; 
        //叉乘得到法线分量分量
        vec3 bumpnormaCross2 = normalize(cross(bump3, bump4));
        // //得到新的分量,保证水流连续
        vec3 bumpnormaCross=mix(bumpnormaCross2, bumpnormaCross1, mv);
       
        //opengl光照原理,传入法向量
        float diffuseFactor=czm_getLambertDiffuse(czm_lightDirectionEC,bumpnormaCross);
       
        


        float LightGrade=1.-clamp(reflectLightGrade,0.,1.);
        float specularFactor = czm_getSpecularPIE(czm_lightDirectionEC, bumpnormaCross,normalize(materialInput.positionToEyeEC),LightGrade,1.1);
        

        float specularFactor1 =pow(0.99, 0.05);
        diffuseFactor= pow(diffuseFactor, 2.)* 1.;
        
        vec4 blue = vec4(0., 69., 129., 0.) / 255.;
        vec4 orange = vec4(.7, .3, 0.1, 0.0);
        float wd = dot(bumpnormaCross, czm_lightDirectionEC);
        wd = max(0.0, wd);
        float wrp = 0.5;
        wd = (wd+wrp)/(1.+wrp);
        
        vec3 frescol = diffuseFactor*orange.rgb*0.4+blue.rgb*wd;
        
        material.diffuse=WaveColor.rgb*vec3(3.0*clamp(WaveLightGrade,0.,1.));
        material.normal=normalize(materialInput.tangentToEyeMatrix * bumpnormaCross);
        
        // material.specular=specularFactor1;
        material.specular=specularFactor;
        // material.shininess=500.;
        float CircleSize=1.-clamp(reflectLightCircleSize,0.,1.);
        material.shininess=5.*20.*CircleSize;  //值越大光斑越小
        material.alpha=wateralpha;
        return material;
    }
    `;


Cesium.Material._materialCache.addMaterial(FlowWaterType, {
  fabric: {
    type: FlowWaterType,
    uniforms: {
      WaveImage: Cesium.Material.DefaultImageId,
      wateralpha: 0.7,
      WaveColor:new Cesium.Color(0.3, 0.5, 0.8, 1.8),
      WaveSpeed:0.5,
      WaveLightGrade:0.5,
      reflectLightGrade:0.5,
      reflectLightCircleSize:0.5
    },
    source: FlowWaterSource,
  },
  translucent: function () {
    return true
  },
})

export default FlowWaterMaterialProperty;
