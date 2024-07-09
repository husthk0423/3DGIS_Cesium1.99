/**
 * @description 创建目标辉光
 * @returns 
 */
//This file is automatically rebuilt by the Cesium build process.
const GaussianBlur1DFS = "#ifndef SAMPLES\n\
#define SAMPLES 8\n\
#endif\n\
uniform float delta;\n\
uniform float sigma;\n\
uniform float direction;\n\
uniform sampler2D colorTexture;\n\
#ifdef USE_STEP_SIZE\n\
uniform float stepSize;\n\
#else\n\
uniform vec2 step;\n\
#endif\n\
varying vec2 v_textureCoordinates;\n\
void main()\n\
{\n\
vec2 st = v_textureCoordinates;\n\
vec2 dir = vec2(1.0 - direction, direction);\n\
#ifdef USE_STEP_SIZE\n\
vec2 step = vec2(stepSize * (czm_pixelRatio / czm_viewport.zw));\n\
#else\n\
vec2 step = step;\n\
#endif\n\
vec3 g;\n\
g.x = 1.0 / (sqrt(czm_twoPi) * sigma);\n\
g.y = exp((-0.5 * delta * delta) / (sigma * sigma));\n\
g.z = g.y * g.y;\n\
vec4 result = texture2D(colorTexture, st) * g.x;\n\
for (int i = 1; i < SAMPLES; ++i)\n\
{\n\
g.xy *= g.yz;\n\
vec2 offset = float(i) * dir * step;\n\
result += texture2D(colorTexture, st - offset) * g.x;\n\
result += texture2D(colorTexture, st + offset) * g.x;\n\
}\n\
gl_FragColor = result;\n\
}\n\
";
const ContrastBiasFS = `
    uniform sampler2D colorTexture;\n\
    uniform float contrast;\n\
    uniform float brightness;\n\
    \n\
    varying vec2 v_textureCoordinates;\n\
    \n\
    void main(void)\n\
    {\n\
        vec3 sceneColor = texture2D(colorTexture, v_textureCoordinates).xyz;\n\
        sceneColor = czm_RGBToHSB(sceneColor);\n\
        sceneColor.z += brightness;\n\
        sceneColor = czm_HSBToRGB(sceneColor);\n\
    \n\
        float factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));\n\
        sceneColor = factor * (sceneColor - vec3(0.5)) + vec3(0.5);\n\
        gl_FragColor = vec4(sceneColor, 1.0);\n\
    }\n\
    `;
    
//This file is automatically rebuilt by the Cesium build process.
const BloomCompositeFS = "uniform sampler2D colorTexture;\n\
  uniform sampler2D bloomTexture;\n\
  uniform bool glowOnly;\n\
  uniform float selectedBloom;\n\
  uniform vec4 bloomColor;\n\
  varying vec2 v_textureCoordinates;\n\
  void main(void)\n\
  {\n\
  vec4 color = texture2D(colorTexture, v_textureCoordinates);\n\
  vec4 bloom = texture2D(bloomTexture, v_textureCoordinates);\n\
  bloom *= bloomColor ;\n\
  #ifdef CZM_SELECTED_FEATURE\n\
  if (czm_selected()) {\n\
  bloom *= selectedBloom;\n\
  }\n\
  #endif\n\
  gl_FragColor = glowOnly ? bloom : bloom + color;\n\
  }\n\
  ";
/**
 * 创建高光纹理
 * @param {*} name 
 * @returns 
 */
function createLuminosityHighPass(name) {

    // 创建高亮后处理
    var highPass = new Cesium.PostProcessStage({
        name: name + "_bright",
        fragmentShader: "\n\
        uniform sampler2D colorTexture;\n\
        uniform vec3 defaultColor;\n\
        uniform float defaultOpacity;\n\
        uniform float luminosityThreshold;\n\
        uniform float smoothWidth;\n\
        \n\
        varying vec2 v_textureCoordinates;\n\
        void main() {\n\
            vec4 texel = texture2D( colorTexture, v_textureCoordinates );\n\
            \n\
           #ifdef CZM_SELECTED_FEATURE\n\
               if (!czm_selected()) {\n\
                   texel = vec4(0.);\n\
               }\n\
           #endif\n\
           \n\
            vec3 luma = vec3( 0.299, 0.587, 0.114 );\n\
            float v = dot( texel.xyz, luma );\n\
            vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );\n\
            float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );\n\
            gl_FragColor = mix( outputColor, texel, alpha );\n\
        }\n\
        " ,
        uniforms: {
            luminosityThreshold: 0.0,
            smoothWidth: 0.01,
            defaultColor: new Cesium.Color.fromRgba(0x000000),
            defaultOpacity: 1
        },
    });

    return highPass;
}

/**
 * 创建模糊纹理
 * @param {*} name 
 * @returns 
 */
Cesium.PostProcessStageLibrary.blurSamples = 32; // 模糊采样
function createBlur(name) {
    var delta = 1.0;
    var sigma = 2.0;
    var stepSize = 1.0;

    var blurShader = "#define USE_STEP_SIZE\n";
    if (Cesium.defined(Cesium.PostProcessStageLibrary.blurSamples))
        blurShader +=
            "#define SAMPLES " + Cesium.PostProcessStageLibrary.blurSamples + "\n";
    blurShader += GaussianBlur1DFS;

    var blurX = new Cesium.PostProcessStage({
        name: name + "_x_direction",
        fragmentShader: blurShader,
        uniforms: {
            delta: delta,
            sigma: sigma,
            stepSize: stepSize,
            direction: 0.0,
        },
        sampleMode: Cesium.PostProcessStageSampleMode.LINEAR,
    });
    var blurY = new Cesium.PostProcessStage({
        name: name + "_y_direction",
        fragmentShader: blurShader,
        uniforms: {
            delta: delta,
            sigma: sigma,
            stepSize: stepSize,
            direction: 1.0,
        },
        sampleMode: Cesium.PostProcessStageSampleMode.LINEAR,
    });

    var uniforms = {};
    Object.defineProperties(uniforms, {
        delta: {
            get: function () {
                return blurX.uniforms.delta;
            },
            set: function (value) {
                var blurXUniforms = blurX.uniforms;
                var blurYUniforms = blurY.uniforms;
                blurXUniforms.delta = blurYUniforms.delta = value;
            },
        },
        sigma: {
            get: function () {
                return blurX.uniforms.sigma;
            },
            set: function (value) {
                var blurXUniforms = blurX.uniforms;
                var blurYUniforms = blurY.uniforms;
                blurXUniforms.sigma = blurYUniforms.sigma = value;
            },
        },
        stepSize: {
            get: function () {
                return blurX.uniforms.stepSize;
            },
            set: function (value) {
                var blurXUniforms = blurX.uniforms;
                var blurYUniforms = blurY.uniforms;
                blurXUniforms.stepSize = blurYUniforms.stepSize = value;
            },
        },
    });
    return new Cesium.PostProcessStageComposite({
        name: name,
        stages: [blurX, blurY],
        uniforms: uniforms,
    });
}

Cesium.PostProcessStageLibrary.createTargetBloomStage = function () {

    var contrastBias = new Cesium.PostProcessStage({
        name: "czm_localbloom_contrast_bias",
        fragmentShader: ContrastBiasFS,
        uniforms: {
            contrast: 128.0,
            brightness: -0.3,
        },
    });

    let highPass = createLuminosityHighPass("localbloom")

    let blurPass = createBlur("czm_localbloom_blur")

    let separableBlurStages = [highPass, blurPass]

    let blurComposite = new Cesium.PostProcessStageComposite({
        name: name + "_blur_composite",
        stages: separableBlurStages,
        inputPreviousStageTexture: true
    });


    var generateComposite = new Cesium.PostProcessStageComposite({
        name: "czm_localbloom_contrast_bias_blur",
        stages: [contrastBias, blurComposite],
    });

    var bloomComposite = new Cesium.PostProcessStage({
        name: "czm_localbloom_generate_composite",
        fragmentShader: BloomCompositeFS,
        uniforms: {
            glowOnly: false,
            bloomTexture: generateComposite.name,
            selectedBloom: 1.0,
            bloomColor: Cesium.Color.WHITE,
        },
    });

    var uniforms = {};
    Object.defineProperties(uniforms, {
        glowOnly: {
            get: function () {
                return bloomComposite.uniforms.glowOnly;
            },
            set: function (value) {
                bloomComposite.uniforms.glowOnly = value;
            },
        },
        selectedBloom:{
            get: function () {
                return bloomComposite.uniforms.selectedBloom;
            },
            set: function (value) {
                bloomComposite.uniforms.selectedBloom = value;
            }, 
        },
        contrast: {
            get: function () {
                return contrastBias.uniforms.contrast;
            },
            set: function (value) {
                contrastBias.uniforms.contrast = value;
            },
        },
        brightness: {
            get: function () {
                return contrastBias.uniforms.brightness;
            },
            set: function (value) {
                contrastBias.uniforms.brightness = value;
            },
        },
        delta: {
            get: function () {
                return blurPass.uniforms.delta;
            },
            set: function (value) {
                blurPass.uniforms.delta = value;
            },
        },
        sigma: {
            get: function () {
                return blurPass.uniforms.sigma;
            },
            set: function (value) {
                blurPass.uniforms.sigma = value;
            },
        },
        stepSize: {
            get: function () {
                return blurPass.uniforms.stepSize;
            },
            set: function (value) {
                blurPass.uniforms.stepSize = value;
            },
        },
        smoothWidth: {
            get: function () {
                return highPass.uniforms.smoothWidth;
            },
            set: function (value) {
                highPass.uniforms.smoothWidth = value;
            },
        },
        luminosityThreshold: {
            get: function () {
                return highPass.uniforms.luminosityThreshold;
            },
            set: function (value) {
                highPass.uniforms.luminosityThreshold = value;
            },
        },
        bloomColor: {
            get: function () {
                return bloomComposite.uniforms.bloomColor;
            },
            set: function (value) {
                bloomComposite.uniforms.bloomColor = value;
            },
        },
    });

    return new Cesium.PostProcessStageComposite({
        name: "czm_localbloom",
        stages: [generateComposite, bloomComposite],
        inputPreviousStageTexture: false,
        uniforms: uniforms,
    });
};

export default {};