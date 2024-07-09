const fragmentShaderSource = `uniform float czzj;
uniform float dis;
uniform float spzj;
uniform vec3 visibleColor;
uniform vec3 disVisibleColor;
uniform float mixNum;
uniform sampler2D colorTexture;
uniform sampler2D marsShadow;
uniform sampler2D depthTexture;
uniform mat4 _shadowMap_matrix;
uniform vec4 shadowMap_lightPositionEC;
uniform vec3 shadowMap_lightPositionWC;
uniform vec4 shadowMap_lightDirectionEC;
uniform vec3 shadowMap_lightUp;
uniform vec3 shadowMap_lightDir;
uniform vec3 shadowMap_lightRight;
uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness;
uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth;
varying vec2 v_textureCoordinates;
vec4 toEye(in vec2 uv, in float depth){
    vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));
    vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);
    posInCamera =posInCamera / posInCamera.w;
    return posInCamera;
}
float getDepth(in vec4 depth){
    float z_window = czm_unpackDepth(depth);
    z_window = czm_reverseLogDepth(z_window);
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    return (2.0 * z_window - n_range - f_range) / (f_range - n_range);
}
float _czm_sampleShadowMap(sampler2D shadowMap, vec2 uv){
    return texture2D(shadowMap, uv).r;
}
float _czm_shadowDepthCompare(sampler2D shadowMap, vec2 uv, float depth){
    return step(depth, _czm_sampleShadowMap(shadowMap, uv));
}
float _czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters){
    float depthBias = shadowParameters.depthBias;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    float darkness = shadowParameters.darkness;
    vec2 uv = shadowParameters.texCoords;
    depth -= depthBias;
    vec2 texelStepSize = shadowParameters.texelStepSize;
    float radius = 1.0;
    float dx0 = -texelStepSize.x * radius;
    float dy0 = -texelStepSize.y * radius;
    float dx1 = texelStepSize.x * radius;
    float dy1 = texelStepSize.y * radius;
    float visibility =
    (
    _czm_shadowDepthCompare(shadowMap, uv, depth)
    +_czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth)
    ) * (1.0 / 9.0)
    ;
    return visibility;
}
vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){
    vec3 v01 = point -planeOrigin;
    float d = dot(planeNormal, v01) ;
    return (point - planeNormal * d);
}
float ptm(vec3 pt){
    return sqrt(pt.x*pt.x + pt.y*pt.y + pt.z*pt.z);
}
void main()
{
    const float PI = 3.141592653589793;
    vec4 color = texture2D(colorTexture, v_textureCoordinates);
    vec4 currD = texture2D(depthTexture, v_textureCoordinates);

    // vec4 stcc = texture2D(marsShadow, v_textureCoordinates);
    // gl_FragColor = currD;
    // return;
    if(currD.r>=1.0){
        gl_FragColor = color;
        return;
    }

    float depth = getDepth(currD);
    // gl_FragColor = vec4(depth,0.0,0.0,1.0);
    // return;
    // float depth = czm_unpackDepth(texture2D(depthTexture, v_textureCoordinates));
    vec4 positionEC = toEye(v_textureCoordinates, depth);
    vec3 normalEC = vec3(1.0);
    czm_shadowParameters shadowParameters;
    shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy;
    shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z;
    shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w;
    shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w;
    shadowParameters.depthBias *= max(depth * 0.01, 1.0);
    vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz);
    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0);
    vec4 shadowPosition = _shadowMap_matrix * positionEC;
    shadowPosition /= shadowPosition.w;
    if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0))))
    {
        gl_FragColor = color;
        return;
    }

    //坐标与视点位置距离，大于最大距离则舍弃阴影效果
    vec4 lw = vec4(shadowMap_lightPositionWC,1.0);
    vec4 vw = czm_inverseView* vec4(positionEC.xyz, 1.0);
    if(distance(lw.xyz,vw.xyz)>dis){
        gl_FragColor = color;
        return;
    }


    //水平夹角限制
    vec3 ptOnSP = pointProjectOnPlane(shadowMap_lightUp,lw.xyz,vw.xyz);
    directionEC = ptOnSP - lw.xyz;
    float directionECMO = ptm(directionEC.xyz);
    float shadowMap_lightDirMO = ptm(shadowMap_lightDir.xyz);
    float cosJJ = dot(directionEC,shadowMap_lightDir)/(directionECMO*shadowMap_lightDirMO);
    float degJJ = acos(cosJJ)*(180.0 / PI);
    degJJ = abs(degJJ);
    if(degJJ>spzj/2.0){
        gl_FragColor = color;
        return;
    }

    //垂直夹角限制
    vec3 ptOnCZ = pointProjectOnPlane(shadowMap_lightRight,lw.xyz,vw.xyz);
    vec3 dirOnCZ = ptOnCZ - lw.xyz;
    float dirOnCZMO = ptm(dirOnCZ);
    float cosJJCZ = dot(dirOnCZ,shadowMap_lightDir)/(dirOnCZMO*shadowMap_lightDirMO);
    float degJJCZ = acos(cosJJCZ)*(180.0 / PI);
    degJJCZ = abs(degJJCZ);
    if(degJJCZ>czzj/2.0){
        gl_FragColor = color;
        return;
    }

    shadowParameters.texCoords = shadowPosition.xy;
    shadowParameters.depth = shadowPosition.z;
    shadowParameters.nDotL = nDotL;
    float visibility = _czm_shadowVisibility(marsShadow, shadowParameters);
    if(visibility==1.0){
        gl_FragColor = mix(color,vec4(visibleColor,1.0),mixNum);
    }else{
        // if(abs(shadowPosition.z-0.0)<0.01){
        //     return;
        // }
        gl_FragColor = mix(color,vec4(disVisibleColor,1.0),mixNum);
    }
}`;

/**
 * 可视域分析
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {LatLngPoint|Cesium.Cartesian3} [options.position] 视点位置，未传入值时自动激活鼠标绘制
 * @param {LatLngPoint|Cesium.Cartesian3} [options.cameraPosition] 相机位置
 *
 * @param {Number} [options.horizontalAngle = 120] 水平张角(度数)，取值范围 0-120
 * @param {Number} [options.verticalAngle = 90] 垂直张角(度数)，取值范围 0-90
 * @param {Cesium.Color} [options.visibleAreaColor =  new Cesium.Color(0, 1, 0, 1)] 可视区域颜色
 * @param {Cesium.Color} [options.hiddenAreaColor =  new Cesium.Color(1, 0, 0, 1)] 不可视区域颜色
 * @param {Number} [options.alpha = 0.5] 混合系数 0.0-1.0
 * @param {Number} [options.offsetHeight=1.5] 在起点增加的高度值，比如加上人的身高
 * @param {Boolean} [options.showFrustum=true] 是否显示视椎体框线
 *
 * @export
 * @class ViewShedAnalysis
 */
class ViewShedAnalysis{
    //========== 构造方法 ==========
    constructor(viewer,options = {}) {
        this._map = viewer;
        this.options = options;
        this._horizontalAngle = Cesium.defaultValue(options.horizontalAngle, 120); //水平张角
        this._verticalAngle = Cesium.defaultValue(options.verticalAngle, 90); //垂直张角
        this._visibleAreaColor = Cesium.defaultValue(options.visibleAreaColor, new Cesium.Color(0, 1, 0)); //可视颜色
        this._hiddenAreaColor = Cesium.defaultValue(options.hiddenAreaColor, new Cesium.Color(1, 0, 0)); //不可视颜色
        this._alpha = Cesium.defaultValue(options.alpha, 0.5); //混合系数
        this._offsetHeight = Cesium.defaultValue(options.offsetHeight, 1.5);
        this._showFrustum = Cesium.defaultValue(options.showFrustum, true); //视椎体显示

        this._maximumDistance = Cesium.defaultValue(options.maximumDistance, 5000.0);
    }

    //========== 对外属性 ==========

    //========== 对外属性 ==========
    /**
     *  水平张角(度数)，取值范围 0-120
     * @type {Number}
     */
    get horizontalAngle() {
        return this._horizontalAngle;
    }
    set horizontalAngle(val) {
        this._horizontalAngle = val;
        if (this._rectangularSensor) {
            //传感器水平半角
            this._rectangularSensor.style = { xHalfAngle: Cesium.Math.toRadians(val / 2) };
        }
    }

    /**
     *  垂直张角(度数)，取值范围 0-90
     * @type {Number}
     */
    get verticalAngle() {
        return this._verticalAngle;
    }
    set verticalAngle(val) {
        this._verticalAngle = val;
        if (this._rectangularSensor) {
            //传感器垂直半角
            this._rectangularSensor.style = { yHalfAngle: Cesium.Math.toRadians(val / 2) };
        }
    }

    /**
     * 可视距离（单位：米）
     * @type {Number}
     */
    get distance() {
        return this._distance;
    }
    set distance(val) {
        this._distance = val;
        if (this._rectangularSensor) {
            this._rectangularSensor.style = { radius: val };
        }
    }

    /**
     *  可视区域颜色
     * @type {Cesium.Color}
     */
    get visibleAreaColor() {
        return this._visibleAreaColor;
    }
    set visibleAreaColor(val) {
        this._visibleAreaColor = val;
    }

    /**
     *  不可视区域颜色
     * @type {Cesium.Color}
     */
    get hiddenAreaColor() {
        return this._hiddenAreaColor;
    }
    set hiddenAreaColor(val) {
        this._hiddenAreaColor = val;
    }

    /**
     * 混合系数 0-1
     * @type {Number}
     */
    get alpha() {
        return this._alpha;
    }
    set alpha(val) {
        this._alpha = val;
    }

    /**
     * 是否显示视椎体框线
     * @type {Boolean}
     */
    get showFrustum() {
        return this._showFrustum;
    }
    set showFrustum(val) {
        this._showFrustum = val;
        if (this._rectangularSensor) {
            this._rectangularSensor.show = val;
        }
    }

    /**
     * 相机位置(笛卡尔坐标)
     * @type {Cesium.Cartesian3}
     * @readonly
     */
    get cameraPosition() {
        return this._cameraPosition;
    }
    set cameraPosition(value) {
        this._cameraPoint = LatLngPoint.parse(value);
        this._cameraPosition = this._cameraPoint?.toCartesian();

        this._updateDraw();
    }
    /**
     * 相机位置
     * @type {LatLngPoint}
     */
    get cameraPoint() {
        return this._cameraPoint;
    }
    /**
     * 视点位置 （笛卡尔坐标）
     * @type {Cesium.Cartesian3}
     * @readonly
     */
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;

        this._updateDraw();
    }

    add(){
        //默认材质
        this._defaultColorTexture = new Cesium.Texture({
            context: this._map.scene.context,
            source: {
                width: 1,
                height: 1,
                arrayBufferView: new Uint8Array([0, 0, 0, 0]),
            },
            flipY: false,
        });

        this._map.terrainShadows = Cesium.ShadowMode.ENABLED;

        if (this.options.cameraPosition) {
            //相机位置
            this.cameraPosition = this.options.cameraPosition;
        }
        if (this.options.position) {
            //视点位置
            this.position = this.options.position;
        }

        if (this.cameraPosition && this.position) {
            this._addToScene();
        } else {
            this._bindMourseEvent();
        }
    }

    remove(){
        this._map.terrainShadows = Cesium.ShadowMode.DISABLED;
        this._unbindMourseEvent();

        if (this.postProcess) {
            this._map.scene.postProcessStages.remove(this.postProcess);
            delete this.postProcess;
        }
        if (this._rectangularSensor) {
            // this._rectangularSensor.remove();
            // delete this._rectangularSensor;
        }
        this._map.scene.primitives.remove(this);
    }

    //激活绑定事件
    _bindMourseEvent() {
        // this.fire(EventType.drawStart);
        this._map.on('click', this._onClickHandler, this);
        this._map.on('mouseMove', this._onMouseMoveHandler, this);
        this._map.setCursor(true);
    }

    //解绑事件
    _unbindMourseEvent() {
        this._map.off('click', this._onClickHandler, this);
        this._map.off('mouseMove', this._onMouseMoveHandler, this);
        this._map.setCursor(false);
    }


    _onClickHandler(event) {
        let cartesian = event.cartesian;
        if (!cartesian) {
            return;
        }

        // this.fire(EventType.drawAddPoint, event);

        if (!this._cameraPosition) {
            //相机位置
            cartesian = this.addPositionsHeight(cartesian, this._offsetHeight); //加人的身高等因素，略微抬高一些
            this.cameraPosition = cartesian;
        } else if (this._cameraPosition && !this._position) {
            let len = Cesium.Cartesian3.distance(this._cameraPosition, cartesian);
            if (len > 5000) {
                cartesian = this.getOnLinePointByLen(this._cameraPosition, cartesian, 5000);
            }
            this.position = cartesian;

            this._addToScene();
            this._unbindMourseEvent();

            // this.fire(EventType.drawCreated, event);
        }
    }
    _onMouseMoveHandler(event) {
        let cartesian = event.cartesian;
        if (!cartesian) {
            return;
        }
        let cp = this._cameraPosition;
        if (cp) {
            let len = Cesium.Cartesian3.distance(cp, cartesian);
            if (len > 5000) {
                len = 5000;
                cartesian = this.getOnLinePointByLen(cp, cartesian, 5000);
            }

            this.frustumQuaternion = this.getFrustumQuaternion(cp, cartesian);
            this.distance = Number(len.toFixed(1));

            this._addRectangularSensor();

            // this.fire(EventType.drawMouseMove, event);
        }
    }

    _updateDraw() {
        if (!this._map) {
            return;
        }
    }

    //添加到场景里
    _addToScene() {
        let scene = this._map.scene;
        let camera_pos = this._cameraPosition;
        let lookat_pos = this._position;

        this.frustumQuaternion = this.getFrustumQuaternion(camera_pos, lookat_pos);
        this.distance = Number(Cesium.Cartesian3.distance(camera_pos, lookat_pos).toFixed(1));

        let lightCamera = new Cesium.Camera(scene);
        lightCamera.position = camera_pos;
        lightCamera.direction = Cesium.Cartesian3.subtract(lookat_pos, camera_pos, new Cesium.Cartesian3(0, 0, 0));
        lightCamera.up = Cesium.Cartesian3.normalize(camera_pos, new Cesium.Cartesian3(0, 0, 0));
        lightCamera.frustum = new Cesium.PerspectiveFrustum({
            fov: Cesium.Math.toRadians(120),
            aspectRatio: scene.canvas.clientWidth / scene.canvas.clientHeight,
            near: 0.1,
            far: 5000,
        });

        //创建ShadowMap
        this.viewShadowMap = new Cesium.ShadowMap({
            lightCamera: lightCamera,
            enabled: false,
            isPointLight: false,
            isSpotLight: true,
            cascadesEnabled: false,
            context: scene.context,
            pointLightRadius: this.distance,
            maximumDistance: this._maximumDistance,
        });

        this._addPostProcess();
        this._addRectangularSensor();

        this._map.scene.primitives.add(this);

        // this.fire(EventType.end, {
        //     distance: this.distance,
        //     cameraPosition: this._cameraPosition,
        //     position: this._position,
        // });
    }

    //添加雷达
    _addRectangularSensor() {
        // if (this._rectangularSensor) {
        //     this._rectangularSensor.orientation = this.frustumQuaternion;
        //     this._rectangularSensor.position = this._cameraPosition;
        //     return;
        // }
        // this._rectangularSensor = new RectangularSensor({
        //     position: this._cameraPosition,
        //     orientation: this.frustumQuaternion,
        //     style: {
        //         radius: this.distance, //传感器的半径
        //         xHalfAngle: Cesium.Math.toRadians(this.horizontalAngle / 2), //传感器水平半角
        //         yHalfAngle: Cesium.Math.toRadians(this.verticalAngle / 2), //传感器垂直半角
        //         material: new Cesium.Color(0.0, 1.0, 1.0, 0.4), //目前用的统一材质
        //         lineColor: new Cesium.Color(1.0, 1.0, 1.0, 1.0), //线的颜色
        //         slice: 8,
        //         showScanPlane: false, //是否显示扫描面
        //         showThroughEllipsoid: false, //此参数控制深度检测，为false启用深度检测，可以解决雷达一半在地球背面时显示的问题
        //         showLateralSurfaces: false,
        //         showDomeSurfaces: false,
        //     },
        //     show: this._showFrustum && this.enabled,
        // });
        // this.graphicLayer.addGraphic(this._rectangularSensor);
    }


    //添加后处理
    _addPostProcess() {
        let that = this;
        let bias = this.viewShadowMap._isPointLight ? this.viewShadowMap._pointBias : this.viewShadowMap._primitiveBias;

        this.postProcess = new Cesium.PostProcessStage({
            fragmentShader: fragmentShaderSource,
            uniforms: {
                czzj: function () {
                    return that.verticalAngle;
                },
                dis: function () {
                    return that.distance;
                },
                spzj: function () {
                    return that.horizontalAngle;
                },
                visibleColor: function () {
                    return that.visibleAreaColor;
                },
                disVisibleColor: function () {
                    return that.hiddenAreaColor;
                },
                mixNum: function () {
                    return that.alpha;
                },
                marsShadow: function () {
                    return that.viewShadowMap._shadowMapTexture || that._defaultColorTexture;
                },
                _shadowMap_matrix: function () {
                    return that.viewShadowMap._shadowMapMatrix;
                },
                shadowMap_lightPositionEC: function () {
                    return that.viewShadowMap._lightPositionEC;
                },
                shadowMap_lightPositionWC: function shadowMap_lightPositionWC() {
                    return that.viewShadowMap._lightCamera.position;
                },
                shadowMap_lightDirectionEC: function () {
                    return that.viewShadowMap._lightDirectionEC;
                },
                shadowMap_lightUp: function () {
                    return that.viewShadowMap._lightCamera.up;
                },
                shadowMap_lightDir: function () {
                    return that.viewShadowMap._lightCamera.direction;
                },
                shadowMap_lightRight: function () {
                    return that.viewShadowMap._lightCamera.right;
                },
                shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: function () {
                    let texelStepSize = new Cesium.Cartesian2();
                    texelStepSize.x = 1.0 / that.viewShadowMap._textureSize.x;
                    texelStepSize.y = 1.0 / that.viewShadowMap._textureSize.y;
                    return Cesium.Cartesian4.fromElements(texelStepSize.x, texelStepSize.y, bias.depthBias, bias.normalShadingSmooth, this.combinedUniforms1);
                },
                shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: function () {
                    return Cesium.Cartesian4.fromElements(
                        bias.normalOffsetScale,
                        that.viewShadowMap._distance,
                        that.viewShadowMap.maximumDistance,
                        that.viewShadowMap._darkness,
                        this.combinedUniforms2
                    );
                },
                depthTexture1: function () {
                    return that.getSceneDepthTexture(that._map.scene);
                },
            },
        });
        this._map.scene.postProcessStages.add(this.postProcess);
    }

    getSceneDepthTexture(scene) {
        let environmentState = scene._environmentState;
        let view = scene._view;
        let useGlobeDepthFramebuffer = environmentState.useGlobeDepthFramebuffer;
        let globeFramebuffer = useGlobeDepthFramebuffer ? view.globeDepth.framebuffer : undefined;
        let sceneFramebuffer = view.sceneFramebuffer.getFramebuffer();
        let depthTexture = Cesium.defaultValue(globeFramebuffer, sceneFramebuffer).depthStencilTexture; //对的
        return depthTexture;
    }

    //获取四元数
    getFrustumQuaternion(cpos, position) {
        //获取相机四元数，用来调整视椎体摆放
        let direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(position, cpos, new Cesium.Cartesian3()), new Cesium.Cartesian3());
        let up = Cesium.Cartesian3.normalize(cpos, new Cesium.Cartesian3());
        let camera = new Cesium.Camera(this._map.scene);
        camera.position = cpos;
        camera.direction = direction;
        camera.up = up;
        direction = camera.directionWC;
        up = camera.upWC;
        let right = camera.rightWC;
        let scratchRight = new Cesium.Cartesian3();
        let scratchRotation = new Cesium.Matrix3();
        let scratchOrientation = new Cesium.Quaternion();

        right = Cesium.Cartesian3.negate(right, scratchRight);
        let rotation = scratchRotation;
        Cesium.Matrix3.setColumn(rotation, 0, right, rotation);
        Cesium.Matrix3.setColumn(rotation, 1, up, rotation);
        Cesium.Matrix3.setColumn(rotation, 2, direction, rotation);
        //计算视锥姿态
        let orientation = Cesium.Quaternion.fromRotationMatrix(rotation, scratchOrientation);
        return orientation;
    }


    //更新
    update(frameState) {
        if (this.viewShadowMap) {
            frameState.shadowMaps.push(this.viewShadowMap);
        }
    }


    /**
     * 求 p1指向p2方向线上，距离p1或p2指定长度的 新的点
     *
     * @export
     * @param {Cesium.Cartesian3} p1 起点坐标
     * @param {Cesium.Cartesian3} p2 终点坐标
     * @param {Number} len  指定的距离，addBS为false时：len为距离起点p1的距离，addBS为true时：len为距离终点p2的距离
     * @param {Boolean} [addBS=false]  标识len的参考目标
     * @return {Cesium.Cartesian3}  计算得到的新坐标
     */
    getOnLinePointByLen(p1, p2, len, addBS) {
        let mtx4 = Cesium.Transforms.eastNorthUpToFixedFrame(p1);
        let mtx4_inverser = Cesium.Matrix4.inverse(mtx4, new Cesium.Matrix4());
        p1 = Cesium.Matrix4.multiplyByPoint(mtx4_inverser, p1, new Cesium.Cartesian3());
        p2 = Cesium.Matrix4.multiplyByPoint(mtx4_inverser, p2, new Cesium.Cartesian3());

        let substrct = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());

        let dis = Cesium.Cartesian3.distance(p1, p2);
        let scale = len / dis; //求比例
        if (addBS) {
            scale += 1;
        }

        let newP = Cesium.Cartesian3.multiplyByScalar(substrct, scale, new Cesium.Cartesian3());
        newP = Cesium.Matrix4.multiplyByPoint(mtx4, newP, new Cesium.Cartesian3());
        return newP;
    }

    /**
     * 对坐标（或坐标数组）增加 指定的海拔高度值
     *
     * @export
     * @param {Cartesian3|Cartesian3[]} positions 笛卡尔坐标数组
     * @param {number} [addHeight=0] 增加的海拔高度值
     * @return {Cartesian3|Cartesian3[]} 增加高度后的坐标（或坐标数组）
     */
    addPositionsHeight(positions, addHeight = 0) {
        addHeight = Number(addHeight);

        if (isNaN(addHeight) || addHeight == 0) {
            return positions;
        }

        if (Array.isArray(positions)) {
            let arr = [];
            for (let i = 0, len = positions.length; i < len; i++) {
                let car = Cesium.Cartographic.fromCartesian(positions[i]);
                let point = Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, car.height + addHeight);
                arr.push(point);
            }
            return arr;
        } else {
            let car = Cesium.Cartographic.fromCartesian(positions);
            return Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, car.height + addHeight);
        }
    }
}

module.exports = ViewShedAnalysis;
