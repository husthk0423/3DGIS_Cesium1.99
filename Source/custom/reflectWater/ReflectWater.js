
const WaterAppearanceVS = `
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 tangent;
attribute vec3 bitangent;
attribute vec3 normal;
attribute vec2 st;
attribute float batchId;

varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec2 v_st;

uniform mat4 reflectorProjectionMatrix;
uniform mat4 reflectorViewMatrix;
uniform mat4 reflectMatrix;
varying vec4 v_worldPosition;  // 世界坐标
varying vec4 v_uv;             // 纹理坐标

varying vec3 vs_normalEC;
varying vec3 vs_tangentEC;
varying vec3 vs_bitangentEC;


void main()
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    v_st = st;
    vs_normalEC=v_normalEC;
    vs_tangentEC=czm_normal*tangent;
    vs_bitangentEC=czm_normal * bitangent; 

    mat4 modelView = reflectorViewMatrix * reflectMatrix * czm_model;
    modelView[3][0] = 0.0;
    modelView[3][1] = 0.0;
    modelView[3][2] = 0.0;
    v_uv = reflectorProjectionMatrix * modelView * p;
    vec4 positionMC = vec4(position3DHigh + position3DLow, 1.0 );
    v_worldPosition = czm_model * positionMC;

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}

`;

const WaterMaterialSource = `
uniform sampler2D texture;
uniform sampler2D normalTexture;
uniform float time;
uniform mat4 fixedFrameToEastNorthUpTransform;

varying vec4 v_worldPosition;
varying vec4 v_uv;

varying vec3 vs_normalEC;
varying vec3 vs_tangentEC;
varying vec3 vs_bitangentEC;
varying vec2 v_st;
varying vec3 v_positionEC;

// 可配置的参数
uniform float size; // 波纹大小（数值越大波纹越密集）
uniform vec4 waterColor; // 水面颜色
uniform float waterAlpha; // 水面透明度
uniform float rf0; // 水面反射率
uniform vec3 lightDirection; // 光照方向
uniform float sunShiny; // 光照强度
uniform float distortionScale; // 倒影的扭曲程度

uniform float lightGrade;  //高光强度
uniform float lightGradeSize;//高光光斑大小

vec3 sunDirection = normalize( lightDirection );
vec3 sunColor = vec3( 1.0 );


// 获取噪声
vec4 getNoise( sampler2D normalMap, vec2 uv ) {
    vec2 uv0 = ( uv / 103.0 ) + vec2( time / 17.0, time / 29.0 );
    vec2 uv1 = uv / 107.0 - vec2( time / -19.0, time / 31.0 );
    vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
    vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
    vec4 noise = texture2D( normalMap, uv0 ) +
        texture2D( normalMap, uv1 ) +
        texture2D( normalMap, uv2 ) +
        texture2D( normalMap, uv3 );
    return noise * 0.5 - 1.0;
}

void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
    vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) ); 
    float direction = max( 0.0, dot( eyeDirection, reflection ) ); 
    specularColor += pow( direction, shiny ) * sunColor * spec;
    diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
}
float  getInterval(float _interval)
{
    float time = czm_frameNumber;
    //间隔速度，值越大，间隔时间越长；值越小，间隔时间越大；
    float cycle = mod(time, _interval)/_interval;   
    return cycle;
}

float getMixValue(float cycle, inout float offset1, inout float offset2)
{

    float mixval = cycle * 2.0;
    if(mixval > 1.0) mixval = 2.0 - mixval;
    offset1 = cycle;
    offset2 = mod(offset1 + .5, 1.0);
    return mixval;
}
vec3 getBumpnormaCross(vec2 st,sampler2D WaveImage)
{
    //水波时间
    float timeInterval=200.;
    float _WaveXSpeed=-0.005;
    float _WaveYSpeed=0.111;  
    
    
    float o1, o2 = 0.;
    float cycle = mod(czm_frameNumber, timeInterval)/timeInterval;
    float mv = getMixValue(cycle, o1, o2);
    float _time=getInterval(timeInterval);
 
    //往上流
    vec2 shang_speed = _time* vec2(_WaveXSpeed, -_WaveYSpeed);
    //往下流
    vec2 xia_speed =vec2(_WaveXSpeed, _WaveYSpeed);
    vec2 xia_speed1 =vec2(-_WaveXSpeed, _WaveYSpeed);
     //往左流
    vec2 zuo_speed = _time* vec2(_WaveXSpeed, _WaveYSpeed);    
      //往右流
    vec2 you_speed = _time* vec2(-_WaveXSpeed, -_WaveYSpeed);
    vec2 RepeatX=vec2(15.,15.);
    vec3 bump1 = texture2D(WaveImage, fract(RepeatX*st)).rgb; 
    vec3 bump2 = texture2D(WaveImage, fract(RepeatX*st-o1*xia_speed)).rgb; 
    //叉乘得到法线分量
    vec3 bumpnormaCross1 = normalize(cross(bump1, bump2));
    
    vec3 bump3 = texture2D(WaveImage, fract(RepeatX*st)).rgb; 
    vec3 bump4 = texture2D(WaveImage, fract(RepeatX*st-o2*xia_speed)).rgb; 
    //叉乘得到法线分量分量
    vec3 bumpnormaCross2 = normalize(cross(bump3, bump4));
    // //得到新的分量,保证水流连续
    vec3 bumpnormaCross=mix(bumpnormaCross2, bumpnormaCross1, mv);
   
    return bumpnormaCross;
    
}



vec3 getAlbedo()
{
      mat3 tangentToEyeMatrix = czm_tangentToEyeSpaceMatrix(vs_normalEC, vs_tangentEC, vs_bitangentEC);
      
      vec2 transformedSt = v_st * 2.0 - 1.0;  // [0, 1] => [-1, 1]
      vec4 noise = getNoise( normalTexture, transformedSt * size );
      vec3 surfaceNormal = normalize( noise.xzy );  

      vec3 diffuseLight = vec3( 0.0 );
      vec3 specularLight = vec3( 0.0 );

      vec3 eye = ( czm_inverseView * vec4( vec3(0.0), 1.0 ) ).xyz;
      eye = ( fixedFrameToEastNorthUpTransform * vec4( eye, 1.0) ).xyz;
      vec3 world = ( fixedFrameToEastNorthUpTransform * vec4( v_worldPosition.xyz, 1.0) ).xyz;

      vec3 worldToEye = eye - world;  // east, north, up
      worldToEye = vec3( worldToEye.x, worldToEye.z, -worldToEye.y );  // Y up
      vec3 eyeDirection = normalize( worldToEye );

      float shiny = sunShiny;
      float spec = 2.0;
      float diffuse = 0.5;
      sunLight( surfaceNormal, eyeDirection, shiny, spec, diffuse, diffuseLight, specularLight );

      float distance = length( worldToEye );
      float distortionScale = distortionScale;
      vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
      
      
      vec2 tempUv=(v_uv.xy / v_uv.w) * 0.5 + 0.5 + distortion;
      vec3 reflectionSample = vec3( texture2D( texture, tempUv));

      float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
      float rf0 = rf0;
      float reflectance = mix( rf0, 1.0, pow( 1.0 - theta, 5.0 ) );

      vec3 waterColor = waterColor.rgb;

      vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
      vec3 albedo = mix(
          sunColor * diffuseLight * 0.3 + scatter,
          vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight,
          reflectance
      );
      return albedo;

}
//自定义光照模型
vec4 CustomLightModel(vec3 sunPostionWC)
{
  mat3 tangentToEyeMatrix = czm_tangentToEyeSpaceMatrix(vs_normalEC, vs_tangentEC, vs_bitangentEC);
  vec3 bumpCross=getBumpnormaCross(v_st,normalTexture);
  vec3 normal=normalize(bumpCross);
  vec3 diffuseColor=getAlbedo();
  vec4 targetCol=vec4(1.0);
    //太阳的视坐标
   vec3 tempLightDirectionEC= normalize(czm_viewRotation3D * sunPostionWC);
   float spec=0.0;
   float customalpha=1.0;
   vec3  specular=vec3(0.0);
   vec3 diffuse=vec3(0.0);

   //环境光
   float ambientStrength = 0.15;
   vec3 ambient = ambientStrength * czm_lightColor;

  //漫反射
   diffuse =diffuseColor;
   //镜面反射
   vec3 normEC = normalize(normal);
   float specularStrength = 0.2*(clamp(lightGradeSize,0.,1.));//光斑大小
   vec3 reflectDir = reflect(tempLightDirectionEC, normEC);
   vec3 normPositionEC = normalize(v_positionEC);
   spec = pow(max(dot(vec3(-normPositionEC), normalize(reflectDir)) * 3.0, 0.), 3.*(clamp(lightGrade,0.,1.)));//光斑亮度
   specular= specularStrength * spec * czm_lightColor;
 

   //光照方程(环境光+漫反射+镜面反射)
  //  vec3 result = (ambient + diffuse + specular) * objectColor;
   vec3 result = (ambient + diffuse + specular);
   targetCol=vec4(result,customalpha);
  //  return targetCol;

  return vec4(diffuse,1.0);
}


// czm_material czm_getMaterial(czm_materialInput materialInput) {
//     czm_material material = czm_getDefaultMaterial(materialInput);
//     mat3 tangentToEyeMatrix = czm_tangentToEyeSpaceMatrix(vs_normalEC, vs_tangentEC, vs_bitangentEC);
   
//     vec2 transformedSt = materialInput.st * 2.0 - 1.0;  // [0, 1] => [-1, 1]
//     vec4 noise = getNoise( normalTexture, transformedSt * size );
//     vec3 surfaceNormal = normalize( noise.xzy );  // [0, +1]，Y up

//     vec3 diffuseLight = vec3( 0.0 );
//     vec3 specularLight = vec3( 0.0 );

//     vec3 eye = ( czm_inverseView * vec4( vec3(0.0), 1.0 ) ).xyz;
//     eye = ( fixedFrameToEastNorthUpTransform * vec4( eye, 1.0) ).xyz;
//     vec3 world = ( fixedFrameToEastNorthUpTransform * vec4( v_worldPosition.xyz, 1.0) ).xyz;

//     vec3 worldToEye = eye - world;  // east, north, up
//     worldToEye = vec3( worldToEye.x, worldToEye.z, -worldToEye.y );  // Y up
//     vec3 eyeDirection = normalize( worldToEye );

//     float shiny = sunShiny;
//     float spec = 2.0;
//     float diffuse = 0.5;
//     sunLight( surfaceNormal, eyeDirection, shiny, spec, diffuse, diffuseLight, specularLight );

//     float distance = length( worldToEye );
//     float distortionScale = distortionScale;
//     vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
//     vec3 reflectionSample = vec3( texture2D( texture, (v_uv.xy / v_uv.w) * 0.5 + 0.5 + distortion ) );

//     float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
//     float rf0 = rf0;
//     float reflectance = mix( rf0, 1.0, pow( 1.0 - theta, 5.0 ) );

//     vec3 waterColor = waterColor.rgb;

//     vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
//     vec3 albedo = mix(
//         sunColor * diffuseLight * 0.3 + scatter,
//         vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight,
//         reflectance
//     );


//     vec3 bumpCross=getBumpnormaCross(materialInput.st,normalTexture);
//     float specularFactor = czm_getSpecular(czm_lightDirectionEC,bumpCross,normalize(-eyeDirection),0.05);
    
   
  
//     material.diffuse = albedo;
//     material.normal=normalize(bumpCross);
//     material.specular=specularFactor;
//     material.shininess=60.;
//     material.alpha = waterAlpha;
//     return material;
// }
`;


const WaterAppearanceeFS = `

  void main()
  {      
      //太阳的世界坐标
      vec3 p1 = vec3(-102129261722.38126,-97061756857.52246,56015807994.99599);
      vec4 targetColor=CustomLightModel(p1);
      gl_FragColor=targetColor;
  }
`;

function createPlaceHolderTexture(context) {
  const placeholderTexture = new Cesium.Texture({
    context,
    source: {
      width: 1,
      height: 1,
      arrayBufferView: new Uint8Array([255, 0, 0, 255]),
    },
    sampler: new Cesium.Sampler({
      wrapS: Cesium.TextureWrap.REPEAT,
      wrapT: Cesium.TextureWrap.REPEAT,
      minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
      magnificationFilter: Cesium.TextureMinificationFilter.LINEAR,
    }),
  });
  placeholderTexture.type = "sampler2D";

  return placeholderTexture;
}

function reflect(view, normal) {
  const scaledNormal = normal.clone();
  const reflect = view.clone();

  const scalar = 2 * Cesium.Cartesian3.dot(view, normal);
  Cesium.Cartesian3.multiplyByScalar(normal, scalar, scaledNormal);

  return Cesium.Cartesian3.subtract(view, scaledNormal, reflect);
}

function isPowerOfTwo(value) {
  return (value & (value - 1)) === 0 && value !== 0;
}

function addTextureUniform(options) {
  const { context, material, uniformName, imgSrc } = options;
  const wrapS = options.wrapS || Cesium.TextureWrap.REPEAT;
  const wrapT = options.wrapT || Cesium.TextureWrap.REPEAT;
  const minificationFilter =
    options.minificationFilter || Cesium.TextureMinificationFilter.LINEAR;
  const magnificationFilter =
    options.magnificationFilter || Cesium.TextureMagnificationFilter.LINEAR;

  const img = new Image();
  img.src = imgSrc;
  img.addEventListener("load", () => {
    const texture = new Cesium.Texture({
      context,
      source: img,
      sampler: new Cesium.Sampler({
        wrapS,
        wrapT,
        minificationFilter,
        magnificationFilter,
      }),
    });
    texture.type = "sampler2D";
    if (isPowerOfTwo(img.width) && isPowerOfTwo(img.height)) {
      texture.generateMipmap(Cesium.MipmapHint.NICEST);
    }
    material.uniforms[uniformName] = texture;
  });
}

const renderTilesetPassState = new Cesium.Cesium3DTilePassState({
  pass: Cesium.Cesium3DTilePass.RENDER,
});

const scratchBackgroundColor = new Cesium.Color();

/**
 * 用 scene._defaultView.camera 渲染 scene 内的 Primitive 到 passStateFramebuffer。
 * @param {Scene} scene
 * @param {Framebuffer} passStateFramebuffer
 *
 * @ignore
 */
function render(scene, passStateFramebuffer) {
  const frameState = scene._frameState;
  const context = scene.context;
  const us = context.uniformState;

  const view = scene._defaultView;
  scene._view = view;

  scene.updateFrameState();
  frameState.passes.render = true;
  frameState.passes.postProcess = scene.postProcessStages.hasSelected;
  frameState.tilesetPassState = renderTilesetPassState;

  let backgroundColor = Cesium.defaultValue(scene.backgroundColor, Cesium.Color.BLACK);
  if (scene._hdr) {
    backgroundColor = Cesium.Color.clone(backgroundColor, scratchBackgroundColor);
    backgroundColor.red = Math.pow(backgroundColor.red, scene.gamma);
    backgroundColor.green = Math.pow(backgroundColor.green, scene.gamma);
    backgroundColor.blue = Math.pow(backgroundColor.blue, scene.gamma);
  }
  frameState.backgroundColor = backgroundColor;

  scene.fog.update(frameState);

  us.update(frameState);

  const shadowMap = scene.shadowMap;
  if (Cesium.defined(shadowMap) && shadowMap.enabled) {
    if (!Cesium.defined(scene.light) || scene.light instanceof Cesium.SunLight) {
      Cesium.Cartesian3.negate(us.sunDirectionWC, scene._shadowMapCamera.direction);
    } else {
      Cesium.Cartesian3.clone(scene.light.direction, scene._shadowMapCamera.direction);
    }
    frameState.shadowMaps.push(shadowMap);
  }

  scene._computeCommandList.length = 0;
  scene._overlayCommandList.length = 0;

  const viewport = view.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  const passState = view.passState;
  passState.framebuffer = passStateFramebuffer;
  passState.blendingEnabled = undefined;
  passState.scissorTest = undefined;
  passState.viewport = Cesium.BoundingRectangle.clone(viewport, passState.viewport);

  if (Cesium.defined(scene.globe)) {
    scene.globe.beginFrame(frameState);
  }

  scene.updateEnvironment();
  scene.updateAndExecuteCommands(passState, backgroundColor);
  scene.resolveFramebuffers(passState);

  if (Cesium.defined(scene.globe)) {
    scene.globe.endFrame(frameState);

    if (!scene.globe.tilesLoaded) {
      scene._renderRequested = true;
    }
  }

  context.endFrame();
}

// 反射相机投影矩阵裁切Bias
const clipBias = 0;

class ReflectWater {

  constructor(viewer, options = {}) {
    this._scene = viewer.scene;

    // 法线图不能为空
    if (!options.normalMapUrl) {
      return;
    }

    this._height = options.height;  // 水面高度
    this._normalMapUrl = options.normalMapUrl;
    this._lightGradeSize = options.lightGradeSize;  // 高光光斑大小
    this._lightGrade =options.lightGrade;  // 高光光照强度
    this._rippleSize = Cesium.defaultValue(options.rippleSize, 50.0); // 波纹大小（数值越大波纹越密集）
    this._waterColor = Cesium.Color.fromCssColorString(Cesium.defaultValue(options.waterColor, "#001e0f"))
    this._waterAlpha = Cesium.defaultValue(options.waterAlpha, 0.9);  // 透明度
    this._reflectivity = Cesium.defaultValue(options.reflectivity, 0.3);  // 水面反射率
    this._lightDirection = Cesium.defaultValue(
      options.lightDirection,
      new Cesium.Cartesian3(0, 0, 1)
    );  // 光照方向
    this._sunShiny = Cesium.defaultValue(options.sunShiny, 100.0);  // 光照强度
    this._distortionScale = Cesium.defaultValue(options.distortionScale, 3.7);  // 扭曲程度

  
    const flowDegrees = Cesium.defaultValue(options.flowDegrees, 0);

    // 计算边界点和中心点
    const positions = options.positions;
    const total = positions.length;
    let x = 0;
    let y = 0;
    let z = 0;
    this._positions = [];
    positions.forEach((p) => {
      const lat = Cesium.Math.toRadians(p.y);
      const lon = Cesium.Math.toRadians(p.x);
      x += Math.cos(lat) * Math.cos(lon)
      y += Math.cos(lat) * Math.sin(lon)
      z += Math.sin(lat)
      this._positions.push(
        Cesium.Cartesian3.fromDegrees(p.x, p.y, this._height)
      );
    });

    x /= total;
    y /= total;
    z /= total;
    const centerLon = Math.atan2(y, x)
    const hyp = Math.sqrt(x * x + y * y)
    const centerLat = Math.atan2(z, hyp)

    // 获取水面中心的世界坐标
    this._reflectorWorldPosition = Cesium.Cartesian3.fromRadians(centerLon, centerLat, this._height);
    // 计算水面中心的法向量
    this._normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(this._reflectorWorldPosition);
    // 获取水面平面
    this._waterPlane = Cesium.Plane.fromPointNormal(
      this._reflectorWorldPosition,
      this._normal
    );

    // 计算反射矩阵
    this._reflectMatrix = new Cesium.Matrix4( // 水面反射矩阵
      -2 * this._waterPlane.normal.x * this._waterPlane.normal.x + 1,
      -2 * this._waterPlane.normal.x * this._waterPlane.normal.y,
      -2 * this._waterPlane.normal.x * this._waterPlane.normal.z,
      -2 * this._waterPlane.normal.x * this._waterPlane.distance,
      -2 * this._waterPlane.normal.y * this._waterPlane.normal.x,
      -2 * this._waterPlane.normal.y * this._waterPlane.normal.y + 1,
      -2 * this._waterPlane.normal.y * this._waterPlane.normal.z,
      -2 * this._waterPlane.normal.y * this._waterPlane.distance,
      -2 * this._waterPlane.normal.z * this._waterPlane.normal.x,
      -2 * this._waterPlane.normal.z * this._waterPlane.normal.y,
      -2 * this._waterPlane.normal.z * this._waterPlane.normal.z + 1,
      -2 * this._waterPlane.normal.z * this._waterPlane.distance,
      0,
      0,
      0,
      1
    );

    // 初始化部分矩阵
    this._reflectorViewMatrix = Cesium.Matrix4.IDENTITY.clone();
    this._reflectorProjectionMatrix = Cesium.Matrix4.IDENTITY.clone();

    // 初始化Uniform变量
    this._initUniforms = {
      normalMapUrl: this._normalMapUrl,
      size: this._rippleSize,
      waterColor: this._waterColor,
      waterAlpha: this._waterAlpha,
      rf0: this._reflectivity,
      lightDirection: this._lightDirection,
      sunShiny: this._sunShiny,
      distortionScale: this._distortionScale,
      lightGrade: this._lightGrade,
      lightGradeSize: this._lightGradeSize
    };

    // 创建 Framebuffer
    const context = this._scene.context;
    this._createFramebuffer(
      context,
      context.drawingBufferWidth,
      context.drawingBufferHeight,
      this._scene.highDynamicRange
    );

    this._primitive = this._createPrimitive(
      this._positions,
      this._height,
      flowDegrees
    );

    this._scene.primitives.add(this._primitive);

    this.preRender = this.preRender.bind(this);
    this._scene.preRender.addEventListener(this.preRender);

    // 不使用对数深度
    this._scene.logarithmicDepthBuffer = false;

    // 替换Cesium源码，实现使用自定义投影矩阵
    Cesium.UniformState.prototype.updateFrustum = function (frustum) {
      //>>如果有自定义的投影矩阵，则使用，否则使用原来的投影矩阵
      Cesium.Matrix4.clone(
        Cesium.defaultValue(
          frustum.customProjectionMatrix,
          frustum.projectionMatrix
        ),
        this._projection
      );
      this._inverseProjectionDirty = true;
      this._viewProjectionDirty = true;
      this._inverseViewProjectionDirty = true;
      this._modelViewProjectionDirty = true;
      this._modelViewProjectionRelativeToEyeDirty = true;
      if (Cesium.defined(frustum.infiniteProjectionMatrix)) {
        Cesium.Matrix4.clone(
          frustum.infiniteProjectionMatrix,
          this._infiniteProjection
        );
        this._modelViewInfiniteProjectionDirty = true;
      }
      this._currentFrustum.x = frustum.near;
      this._currentFrustum.y = frustum.far;

      this._farDepthFromNearPlusOne = frustum.far - frustum.near + 1.0;
      this._log2FarDepthFromNearPlusOne = Cesium.Math.log2(
        this._farDepthFromNearPlusOne
      );
      this._oneOverLog2FarDepthFromNearPlusOne =
        1.0 / this._log2FarDepthFromNearPlusOne;

      if (Cesium.defined(frustum._offCenterFrustum)) {
        frustum = frustum._offCenterFrustum;
      }

      this._frustumPlanes.x = frustum.top;
      this._frustumPlanes.y = frustum.bottom;
      this._frustumPlanes.z = frustum.left;
      this._frustumPlanes.w = frustum.right;
    };

    // 替换Cesium源码，实现使用自定义投影矩阵
    Cesium.PerspectiveFrustum.prototype.clone = function (result) {
      if (!Cesium.defined(result)) {
        result = new Cesium.PerspectiveFrustum();
      }

      result.aspectRatio = this.aspectRatio;
      result.fov = this.fov;
      result.near = this.near;
      result.far = this.far;

      // force update of clone to compute matrices
      result._aspectRatio = undefined;
      result._fov = undefined;
      result._near = undefined;
      result._far = undefined;

      this._offCenterFrustum.clone(result._offCenterFrustum);

      // 传递customProjectionMatrix
      result.customProjectionMatrix = this.customProjectionMatrix;

      return result;
    };
  }

  /**
   * 波纹大小（数值越大波纹越密集）
   */
  get rippleSize() {
    return this._material.uniforms.size;
  }
  set rippleSize(value) {
    this._material.uniforms.size = value;
  }

  /**
   * 水面透明度
   */
  get waterAlpha() {
    return this._material.uniforms.waterAlpha;
  }
  set waterAlpha(value) {
    this._material.uniforms.waterAlpha = value;
  }

  /**
   * 水面反射率
   */
  get reflectivity() {
    return this._material.uniforms.rf0;
  }
  set reflectivity(value) {
    this._material.uniforms.rf0 = value;
  }

  /**
   * 扭曲程度
   */
  get distortionScale() {
    return this._material.uniforms.distortionScale;
  }
  set distortionScale(value) {
    this._material.uniforms.distortionScale = value;
  }

    /**
   * 高光强度
   */
    get lightGrade() {
      return this._material.uniforms.lightGrade;
    }
    set lightGrade(value) {
      this._material.uniforms.lightGrade = value;
    }

      /**
   * 高光光斑大小
   */
  get lightGradeSize() {
    return this._material.uniforms.lightGradeSize;
  }
  set lightGradeSize(value) {
    this._material.uniforms.lightGradeSize = value;
  }
  // 创建水面反射纹理
  _createReflectionWaterMaterial() {
    const context = this._scene.context;

    const placeholderTexture = createPlaceHolderTexture(context);
    const {
      normalMapUrl,
      size,
      waterColor,
      waterAlpha,
      rf0,
      lightDirection,
      sunShiny,
      distortionScale,
      lightGrade,
      lightGradeSize
    } = this._initUniforms;

    const texture = Cesium.Texture.fromFramebuffer({
      context,
      framebuffer: this._colorFramebuffer,
    });
    texture.type = "sampler2D";

    const initUniforms = {
      size: size,
      waterColor: waterColor,
      waterAlpha: waterAlpha,
      rf0: rf0,
      lightDirection: lightDirection,
      sunShiny: sunShiny,
      distortionScale: distortionScale,
      lightGrade: lightGrade,
      lightGradeSize: lightGradeSize,
      normalTexture: placeholderTexture,
      texture: texture,
      time: 0,
      fixedFrameToEastNorthUpTransform: Cesium.Matrix4.toArray(
        this._getFixedFrameToEastNorthUpTransformFromWorldMatrix()
      ),
    };
    const material = new Cesium.Material({
      fabric: {
        type: "ReflectionWater",
        uniforms: initUniforms,
        source: WaterMaterialSource,
      },
      translucent: false,
      // minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
      // magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
    });

    addTextureUniform({
      context,
      material,
      uniformName: "normalTexture",
      imgSrc: normalMapUrl,
    });
    return material;
  }

  // 更新反射相机和贴图矩阵
  _updateVirtualCamera(camera) {
    let lookAtPosition = new Cesium.Cartesian3(0, 0, -1);
    let target = new Cesium.Cartesian3();

    this._virtualCamera = Cesium.Camera.clone(
      camera,
      this._virtualCamera
    );

    // 获取相机的世界坐标
    const cameraWorldPosition = camera.positionWC.clone();

    // 获得相机指向反射面的向量
    let view = Cesium.Cartesian3.subtract(
      this._reflectorWorldPosition,
      cameraWorldPosition,
      new Cesium.Cartesian3()
    );

    // 避免在背向反射面的时候进行渲染
    if (Cesium.Cartesian3.dot(view, this._normal) > 0) {
      return false;
    }

    // 获取视线反射方向的反方向
    view = reflect(view, this._normal);
    Cesium.Cartesian3.negate(view, view);

    // ============================反射相机位置============================
    Cesium.Cartesian3.add(view, this._reflectorWorldPosition, view);
    this._virtualCamera.position = view.clone();
    // ============================反射相机位置============================

    // ============================反射相机视线方向============================
    Cesium.Cartesian3.add(
      camera.directionWC,
      cameraWorldPosition,
      lookAtPosition
    );

    Cesium.Cartesian3.subtract(
      this._reflectorWorldPosition,
      lookAtPosition,
      target
    );
    target = reflect(target, this._normal);
    Cesium.Cartesian3.negate(target, target);
    Cesium.Cartesian3.add(target, this._reflectorWorldPosition, target);

    this._virtualCamera.direction = Cesium.Cartesian3.subtract(
      target,
      this._virtualCamera.position,
      new Cesium.Cartesian3()
    );
    Cesium.Cartesian3.normalize(
      this._virtualCamera.direction,
      this._virtualCamera.direction
    );
    // ============================反射相机视线方向============================

    // ============================反射相机上方向============================
    Cesium.Cartesian3.add(camera.upWC, cameraWorldPosition, lookAtPosition);

    Cesium.Cartesian3.subtract(
      this._reflectorWorldPosition,
      lookAtPosition,
      target
    );
    target = reflect(target, this._normal);
    Cesium.Cartesian3.negate(target, target);
    Cesium.Cartesian3.add(target, this._reflectorWorldPosition, target);

    this._virtualCamera.up = Cesium.Cartesian3.subtract(
      target,
      this._virtualCamera.position,
      new Cesium.Cartesian3()
    );
    Cesium.Cartesian3.normalize(this._virtualCamera.up, this._virtualCamera.up);
    // ============================反射相机上方向============================

    this._reflectorProjectionMatrix = this._virtualCamera.frustum.projectionMatrix;
    this._reflectorViewMatrix = this._virtualCamera.viewMatrix;

    const reflectorPlane = Cesium.Plane.fromPointNormal(
      this._reflectorWorldPosition,
      this._normal
    );
    Cesium.Plane.transform(
      reflectorPlane,
      this._virtualCamera.viewMatrix,
      reflectorPlane
    );

    const clipPlane = new Cesium.Cartesian4(
      reflectorPlane.normal.x,
      reflectorPlane.normal.y,
      reflectorPlane.normal.z,
      reflectorPlane.distance
    );

    const projectionMatrix = Cesium.Matrix4.clone(
      this._virtualCamera.frustum.projectionMatrix
    );

    const q = new Cesium.Cartesian4(
      (Math.sign(clipPlane.x) + projectionMatrix[8]) / projectionMatrix[0],
      (Math.sign(clipPlane.y) + projectionMatrix[9]) / projectionMatrix[5],
      -1,
      (1.0 + projectionMatrix[10]) / projectionMatrix[14]
    );

    Cesium.Cartesian4.multiplyByScalar(
      clipPlane,
      2.0 / Cesium.Cartesian4.dot(clipPlane, q),
      clipPlane
    );

    projectionMatrix[2] = clipPlane.x;
    projectionMatrix[6] = clipPlane.y;
    projectionMatrix[10] = clipPlane.z + 1.0 - clipBias;
    projectionMatrix[14] = clipPlane.w;

    this._virtualCamera.frustum.customProjectionMatrix =
      Cesium.Matrix4.clone(projectionMatrix);

    return true;
  }

  preRender(scene) {
    // 保存原来的状态
    const currnetDefaultViewCamera = scene._defaultView.camera;
    const currentShadowMap = scene.shadowMap;
    const currentGlobe = scene.globe.show;
    const currentShowSkirts = scene.globe.showSkirts;

    // 更新虚拟相机
    if (!this._updateVirtualCamera(scene._defaultView.camera)) {
      // 背向反射面
      this._primitive.show = false;
      return;
    }

    // 设置状态
    this._primitive.show = false;
    scene._defaultView.camera = this._virtualCamera;
    scene.shadowMap = undefined;
    scene.globe.show = false;
    scene.globe.showSkirts = false;

    // resize 时重新创建 framebuffer
    const context = scene.context;
    const width = context.drawingBufferWidth;
    const height = context.drawingBufferHeight;
    const hdr = scene.highDynamicRange;
    this._createFramebuffer(context, width, height, hdr);

    // 渲染到指定的 framebuffer



    render(scene, this._colorFramebuffer);
   //this._colorFramebuffer = scene._view.sceneFramebuffer._colorFramebuffer.framebuffer;





    const appearance = this._primitive.appearance;

    // 设置该 framebuffer 的 color attachments 0 为 sampler2D uniform
    const texture = Cesium.Texture.fromFramebuffer({
      context,
      framebuffer: this._colorFramebuffer,
    });
    texture.type = "sampler2D";

    // 设置 uniform
    this._material.uniforms.texture = texture;
    this._material.uniforms.time = performance.now()*0.5 / 1000.0;
    this._material.uniforms.fixedFrameToEastNorthUpTransform =
      Cesium.Matrix4.toArray(
        this._getFixedFrameToEastNorthUpTransformFromWorldMatrix()
      );
    appearance.uniforms.reflectMatrix = Cesium.Matrix4.toArray(
      this._reflectMatrix
    );
    appearance.uniforms.reflectorProjectionMatrix = Cesium.Matrix4.toArray(
      this._reflectorProjectionMatrix
    );
    appearance.uniforms.reflectorViewMatrix = Cesium.Matrix4.toArray(
      this._reflectorViewMatrix
    );

    // 复原状态
    this._primitive.show = true;
    scene._defaultView.camera = currnetDefaultViewCamera;
    scene.shadowMap = currentShadowMap;
    scene.globe.show = currentGlobe;
    scene.globe.showSkirts = currentShowSkirts;
  }

  // 创建水面primitive
  _createPrimitive(positions, extrudedHeight, flowDegrees) {
    const material = this._createReflectionWaterMaterial();
    this._material = material;

    const appearance = new Cesium.MaterialAppearance({
      material,
      fragmentShaderSource:WaterAppearanceeFS,
      vertexShaderSource: WaterAppearanceVS,
      translucent: true,
    });
    appearance.uniforms = {};
    appearance.uniforms.reflectMatrix = Cesium.Matrix4.toArray(
      this._reflectMatrix
    );
    appearance.uniforms.reflectorProjectionMatrix = Cesium.Matrix4.toArray(
      this._reflectorProjectionMatrix
    );
    appearance.uniforms.reflectorViewMatrix = Cesium.Matrix4.toArray(
      this._reflectorViewMatrix
    );

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(positions),
          perPositionHeight: true,
          extrudedHeight,
          stRotation: Cesium.Math.toRadians(flowDegrees),
          closeTop: true,
          closeBottom: false,
          vertexFormat: Cesium.VertexFormat.POSITION_NORMAL_AND_ST,
        }),
      }),
      appearance,
      asynchronous: true,
    });
    return primitive;
  }

  // 获取当前水面模型位置的东北天矩阵的逆矩阵
  _getFixedFrameToEastNorthUpTransformFromWorldMatrix() {
    const eastNorthUpToFixedFrameTransform =
      Cesium.Transforms.eastNorthUpToFixedFrame(this._reflectorWorldPosition);

    const fixedFrameToEastNorthUpTransform = Cesium.Matrix4.inverse(
      eastNorthUpToFixedFrameTransform,
      new Cesium.Matrix4()
    );
    return eastNorthUpToFixedFrameTransform;
  }

  // 创建 Framebuffer
  _createFramebuffer(context, width, height, hdr) {
    const colorTexture = this._colorTexture;
    if (
      Cesium.defined(colorTexture) &&
      colorTexture.width === width &&
      colorTexture.height === height &&
      this._hdr === hdr
    ) {
      return;
    }

    this._destroyResource();

    this._hdr = hdr;

    const pixelDatatype = hdr
      ? context.halfFloatingPointTexture
        ? Cesium.PixelDatatype.HALF_FLOAT
        : Cesium.PixelDatatype.FLOAT
      : Cesium.PixelDatatype.UNSIGNED_BYTE;
    this._colorTexture = new Cesium.Texture({
      context,
      width,
      height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype,
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
        magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
      }),
    });

    this._depthStencilTexture = new Cesium.Texture({
      context,
      width,
      height,
      pixelFormat: Cesium.PixelFormat.DEPTH_STENCIL,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_INT_24_8,
    });

    this._colorFramebuffer = new Cesium.Framebuffer({
      context,
      colorTextures: [this._colorTexture],
      depthStencilTexture: this._depthStencilTexture,
      destroyAttachments: false,
    });
  }

  // 移除贴图
  _destroyResource() {
    this._colorTexture && this._colorTexture.destroy();
    this._depthStencilTexture && this._depthStencilTexture.destroy();
    this._colorFramebuffer && this._colorFramebuffer.destroy();

    this._colorTexture = undefined;
    this._depthStencilTexture = undefined;
    this._colorFramebuffer = undefined;
  }

  // 销毁
  destroy() {
    if (this.preRender) {
      this._scene.preRender.removeEventListener(this.preRender);
    }

    if (this._primitive) {
      this._scene.primitives.remove(this._primitive);
      this._primitive = null;
    }
  }
}

export default ReflectWater;
