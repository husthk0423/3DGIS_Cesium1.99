/**
 * 水面材质
 * 包括定义 ReflexWaterMaterialProperty 和添加Cesium.Material.ReflexWater 两部分
 * entity方式可直接通过 new Custom.ReflexWaterMaterialProperty 调用此材质
 * primitive方式可直接通过 Cesium.Material.fromType(Custom.ReflexWaterMaterialType) 调用此材质
 */
class ReflexWaterMaterialProperty {
  constructor(options) {
    options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)

    this._definitionChanged = new Cesium.Event();

    if (!options.WaveImage) {
      return;
    }

    this._WaveImage = options.WaveImage;
    this._bottomImage = options.bottomImage;
    this._repeat = Cesium.defaultValue(options.repeat, new Cesium.Cartesian2(1.0, 1.0));
    this._RainState = Cesium.defaultValue(options.RainState, false);    // 是否有溅落的雨滴
    this._RainSize = Cesium.defaultValue(options.RainSize, 1.0);        // 浮点型，雨滴溅落在水面的size
    this._RainNoiseImage = options.RainNoiseImage;                      // 溅落雨滴的图片
    this._wateralpha = Cesium.defaultValue(options.wateralpha, 0.7);    // 透明度
    this._Vortex = Cesium.defaultValue(options.Vortex, false);    // 是否有旋涡
    this._FlowWater = options.FlowWater;                          // 旋涡图片
    this._FlowMapImage = options.FlowMapImage;                    // 旋涡法线图片
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType() {
    // ReflexWater 类型材质需已添加到Cesium的Material中才能正常使用此 ReflexWaterMaterialProperty
    return 'ReflexWater'
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
    result.bottomImage = this._bottomImage;
    result.repeat = this.getCesiumValue(this._repeat, Cesium.Cartesian2, time);
    result.RainState = this._RainState;
    result.RainSize = this._RainSize;
    result.RainNoiseImage = this._RainNoiseImage;
    result.wateralpha = this._wateralpha;
    result.Vortex = this._Vortex;
    result.FlowWater = this._FlowWater;
    result.FlowMapImage = this._FlowMapImage;

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
      (other instanceof ReflexWaterMaterialProperty &&
        this._WaveImage == other._WaveImage &&
        this._bottomImage == other._bottomImage &&
        Cesium.Property.equals(this._repeat, other._repeat) &&
        this._RainState == other._RainState &&
        this._RainSize == other._RainSize &&
        this._RainNoiseImage == other._RainNoiseImage &&
        this._wateralpha == other._wateralpha &&
        this._Vortex == other._Vortex &&
        this._FlowWater == other._FlowWater &&
        this._FlowMapImage == other._FlowMapImage
      )
    );
  }
}

/**
 * 添加反射水面到cesium的Material中
 */
const ReflexWaterType = 'ReflexWater';
const ReflexWaterSource =
  `
    float hash( vec2 p ) {
        float h = dot(p,vec2(127.1,311.7));	
        return fract(sin(h)*43758.5453123);
    }
    float noise( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );	
        vec2 u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ), 
                        hash( i + vec2(1.0,0.0) ), u.x),
                    mix( hash( i + vec2(0.0,1.0) ), 
                        hash( i + vec2(1.0,1.0) ), u.x), u.y);
    }

    float water(vec2 uv) {
        uv += noise(uv * .8);        
        vec2 wv = 1.0-abs(sin(uv)); 
        return (wv.x + wv.y) * .5;
    }
    float river(vec2 uv)
    {
        float s = 0.;
        const float levels = 4.;
        mat2 r;
        r[0] = vec2(0.4, 0.4);
        r[1] = vec2(-0.24, 0.27);
        for (int i = 1; i < 5; i++)
        {
            uv *= r;
            s += water(uv * vec2(i) * vec2(2.));
        }
        s /= (levels + 1.);
        return s;
    }
    vec3 seagrad(in vec2 uv, float bump, float t)
    {
        uv *= 100.;
        float hc = river(uv);
        vec2 off = vec2(3./t, 0.0);
        float hh = river(uv + off);
        float hv = river(uv + off.yx);
        
        vec3 h = normalize(vec3(bump, hh - hc, 0.)); 
        vec3 v = normalize(vec3(0., hv - hc, bump));
        return -normalize(cross(h, v));
    }


    float texNoise1( in vec3 x, float lod_bias )
    {   
        vec3 p = floor( x );
        vec3 f = fract( x );
        f = f * f * ( 3.0 - 2.0 * f );
        vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
        vec2 rg = texture2D(RainNoiseImage, fract(uv*(1./256.0))).yx;
        return mix( rg.x, rg.y, f.z );

    }

    vec4 BlendUnder(vec4 accum,vec4 col)
    {
        col = clamp( col, vec4( 0 ), vec4( 1 ) );   
        accum += vec4( col.rgb * col.a, col.a ) * ( 1.0 - accum.a );   
        return accum;
    }
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


    vec4 getNoise( vec2 uv,sampler2D normalSampler,float time)
    {
        vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
        vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
        vec2 uv2 = uv / vec2( 897.0, 983.0 ) + vec2( time / 101.0, time / 97.0 );
        vec2 uv3 = uv / vec2( 991.0, 877.0 ) - vec2( time / 109.0, time / -113.0 );
        uv0 = fract(uv0);
        uv1 = fract(uv1);
        uv2 = fract(uv2);
        uv3 = fract(uv3);
        vec4 noise = texture2D( normalSampler, uv0 ) +
            texture2D( normalSampler, uv1 ) +
            texture2D( normalSampler, uv2 ) +
            texture2D( normalSampler, uv3 );
        return ((noise /4.0) - 0.5)*2.0;
	}
    czm_material czm_getMaterial(czm_materialInput materialInput)
    { 
        //水波时间
        float timeInterval=200.;
        float _WaveXSpeed=0.05;
        float _WaveYSpeed=0.05; 
        vec3 waterColor = vec3(0.0196, 0.4235, 0.6431)*1.5;
        // vec3 bottomColor=vec3(0.7608, 0.8118, 0.5569);
        vec3 bottomColor=vec3(0.7451, 0.7686, 0.6471);
        float o1, o2 = 0.;
        float cycle = mod(czm_frameNumber, timeInterval)/timeInterval;
        float mv = getMixValue(cycle, o1, o2);
        float _time=getInterval(timeInterval);
        
        //流向控制
        
        //往上流
        vec2 shang_speed = _time* vec2(_WaveXSpeed, -_WaveYSpeed);
        //往下流
         vec2 xia_speed =vec2(-_WaveXSpeed, _WaveYSpeed);
        //往左流
         vec2 zuo_speed = _time* vec2(_WaveXSpeed, _WaveYSpeed);
        //往右流
         vec2 you_speed = _time* vec2(-_WaveXSpeed, -_WaveYSpeed);


        czm_material material = czm_getDefaultMaterial(materialInput); 
        
        
        //  vec3 bottomColor =texture2D(bottomImage, materialInput.st.xy).rgb;//纹理映射
        //  vec3 bump1 = normalize(getNoise(materialInput.st*8000.-speed,WaveImage,czm_frameNumber)).rgb; 
        //  bump1= bump1.xyz * vec3(1.0, 1.0, (1.0 / 5.));
        //  vec3 bump2 = normalize(getNoise(materialInput.st*8000.+speed,WaveImage,czm_frameNumber)).rgb; 
        //  bump2=bump2.xyz * vec3(1.0, 1.0, (1.0 / 5.));
        //  vec3 bumpnormaCross =normalize(cross(bump1, bump2)); 
        

        vec3 bump1 = normalize(texture2D(WaveImage, fract(repeat*materialInput.st))).rgb; 
        vec3 bump2 = normalize(texture2D(WaveImage, fract(repeat*materialInput.st)-o1*xia_speed)).rgb; 
        //叉乘得到法线分量
        vec3 bumpnormaCross1 = normalize(cross(bump1, bump2));
        vec3 bump3 = normalize(texture2D(WaveImage, fract(repeat*materialInput.st))).rgb; 
        vec3 bump4 = normalize(texture2D(WaveImage, fract(repeat*materialInput.st)-o2*xia_speed)).rgb; 
        //叉乘得到法线分量分量
        vec3 bumpnormaCross2 = normalize(cross(bump3, bump4));
        // //得到新的分量,保证水流连续
        vec3 bumpnormaCross=mix(bumpnormaCross2, bumpnormaCross1, mv);
       
        //opengl光照原理,传入法向量
        float diffuseFactor=czm_getLambertDiffuse(czm_lightDirectionEC,bumpnormaCross);
        // float LightGrade=(50.-(clamp(reflectLightGrade,0.,1.)*50.))*0.05;
        float specularFactor = czm_getSpecular(czm_lightDirectionEC, bumpnormaCross,normalize(materialInput.positionToEyeEC),0.05);
       
        
        diffuseFactor= pow(diffuseFactor, 2.)* 1.;
        
        vec4 blue = vec4(0., 69., 129., 0.) / 255.;
        vec4 orange = vec4(.7, .3, 0.1, 0.0);
        float wd = dot(bumpnormaCross, czm_lightDirectionEC);
        wd = max(0.0, wd);
        float wrp = 0.5;
        wd = (wd+wrp)/(1.+wrp);
        
        
        vec3 frescol = diffuseFactor*orange.rgb*0.4+blue.rgb*wd;

        // 旋涡
        float _flowtimeInterval=2000.;
        float _flowtime=getInterval(_flowtimeInterval);
        vec3 flowDir = texture2D(FlowMapImage, fract(vec2(1.2,1.2)*materialInput.st.xy)).rgb*vec3(4.0)-vec3(1.0);
        float phase0 = fract(_flowtime + 0.2) ;
        float phase1 = fract(_flowtime);
        vec3 color0 = texture2D(FlowWater, fract(materialInput.st.xy + vec2(phase0) * flowDir.xy)).rgb;
        vec3 color1 = texture2D(FlowWater, fract(materialInput.st.xy + vec2(phase1) * flowDir.xy)).rgb;
        float flowLerp =(abs(phase0 - 0.5)) * 2.0;
        vec3 finalCol = mix(color0, color1, flowLerp);

        vec3 mixTargetCol=mix(bottomColor,frescol,0.4);
        if(RainState)
        {
            vec3 uvw = materialInput.positionToEyeEC;
            uvw *= 0.2*1.0/RainSize;
            uvw.y += czm_frameNumber * 0.5;//速度
            float dens = texNoise1(uvw, 0.0 );
            dens = pow( dens, 5. );//密度
            dens=sin(dens);
            dens *= 0.4;
            mixTargetCol = BlendUnder( vec4(mixTargetCol,0.0), vec4( 1, 1, 1, dens )).xyz;

            if (Vortex) {
              mixTargetCol = mix(mixTargetCol,finalCol,0.5);
            }
        } 
        else {
          if (Vortex) {
            mixTargetCol = mix(mix(bottomColor,frescol,0.3),finalCol,0.9)*vec3(1.2);
          }
        }
        material.diffuse=WaveColor.rgb;
        material.normal=normalize(materialInput.tangentToEyeMatrix * bumpnormaCross);;
        material.specular=specularFactor;
        material.shininess=10.;
        material.alpha=wateralpha;
        return material;
    }
    `;


Cesium.Material._materialCache.addMaterial(ReflexWaterType, {
  fabric: {
    type: ReflexWaterType,
    uniforms: {
      WaveImage: Cesium.Material.DefaultImageId,
      bottomImage: Cesium.Material.DefaultImageId,
      repeat: new Cesium.Cartesian2(1.0, 1.0),
      RainState: false,  //是否有溅落的雨滴
      RainSize: 1.0,      //浮点型，雨滴溅落在水面的size
      RainNoiseImage: Cesium.Material.DefaultImageId, //雨滴的噪声图
      wateralpha: 0.7,
      Vortex: false,  // 是否有旋涡
      FlowWater: Cesium.Material.DefaultImageId,   // 旋涡图片
      FlowMapImage: Cesium.Material.DefaultImageId, // 旋涡法线图片
    },
    source: ReflexWaterSource,
  },
  translucent: function () {
    return true
  },
})

export default ReflexWaterMaterialProperty;
