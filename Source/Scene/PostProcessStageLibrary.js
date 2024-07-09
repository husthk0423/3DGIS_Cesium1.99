import buildModuleUrl from "../Core/buildModuleUrl.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import AcesTonemapping from "../Shaders/PostProcessStages/AcesTonemappingStage.js";
import AmbientOcclusionGenerate from "../Shaders/PostProcessStages/AmbientOcclusionGenerate.js";
import AmbientOcclusionModulate from "../Shaders/PostProcessStages/AmbientOcclusionModulate.js";
import BlackAndWhite from "../Shaders/PostProcessStages/BlackAndWhite.js";
import BloomComposite from "../Shaders/PostProcessStages/BloomComposite.js";
import Brightness from "../Shaders/PostProcessStages/Brightness.js";
import ContrastBias from "../Shaders/PostProcessStages/ContrastBias.js";
import DepthOfField from "../Shaders/PostProcessStages/DepthOfField.js";
import DepthView from "../Shaders/PostProcessStages/DepthView.js";
import EdgeDetection from "../Shaders/PostProcessStages/EdgeDetection.js";
import FilmicTonemapping from "../Shaders/PostProcessStages/FilmicTonemapping.js";
import FXAA from "../Shaders/PostProcessStages/FXAA.js";
import GaussianBlur1D from "../Shaders/PostProcessStages/GaussianBlur1D.js";
import LensFlare from "../Shaders/PostProcessStages/LensFlare.js";
import ModifiedReinhardTonemapping from "../Shaders/PostProcessStages/ModifiedReinhardTonemapping.js";
import NightVision from "../Shaders/PostProcessStages/NightVision.js";
import ReinhardTonemapping from "../Shaders/PostProcessStages/ReinhardTonemapping.js";
import Silhouette from "../Shaders/PostProcessStages/Silhouette.js";
import FXAA3_11 from "../Shaders/FXAA3_11.js";
import AutoExposure from "./AutoExposure.js";
import PostProcessStage from "./PostProcessStage.js";
import PostProcessStageComposite from "./PostProcessStageComposite.js";
import PostProcessStageSampleMode from "./PostProcessStageSampleMode.js";

/**
 * Contains functions for creating common post-process stages.
 *
 * @namespace PostProcessStageLibrary
 */
const PostProcessStageLibrary = {};

function createBlur(name) {
  const delta = 1.0;
  const sigma = 2.0;
  const stepSize = 1.0;

  const blurShader = `#define USE_STEP_SIZE\n${GaussianBlur1D}`;
  const blurX = new PostProcessStage({
    name: `${name}_x_direction`,
    fragmentShader: blurShader,
    uniforms: {
      delta: delta,
      sigma: sigma,
      stepSize: stepSize,
      direction: 0.0,
    },
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });
  const blurY = new PostProcessStage({
    name: `${name}_y_direction`,
    fragmentShader: blurShader,
    uniforms: {
      delta: delta,
      sigma: sigma,
      stepSize: stepSize,
      direction: 1.0,
    },
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    delta: {
      get: function () {
        return blurX.uniforms.delta;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.delta = blurYUniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blurX.uniforms.sigma;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.sigma = blurYUniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blurX.uniforms.stepSize;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.stepSize = blurYUniforms.stepSize = value;
      },
    },
  });
  return new PostProcessStageComposite({
    name: name,
    stages: [blurX, blurY],
    uniforms: uniforms,
  });
}

/**
 * Creates a post-process stage that applies a Gaussian blur to the input texture. This stage is usually applied in conjunction with another stage.
 * <p>
 * This stage has the following uniforms: <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <p>
 * <code>delta</code> and <code>sigma</code> are used to compute the weights of a Gaussian filter. The equation is <code>exp((-0.5 * delta * delta) / (sigma * sigma))</code>.
 * The default value for <code>delta</code> is <code>1.0</code>. The default value for <code>sigma</code> is <code>2.0</code>.
 * <code>stepSize</code> is the distance to the next texel. The default is <code>1.0</code>.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies a Gaussian blur to the input texture.
 */
PostProcessStageLibrary.createBlurStage = function () {
  return createBlur("czm_blur");
};

/**
 * Creates a post-process stage that applies a depth of field effect.
 * <p>
 * Depth of field simulates camera focus. Objects in the scene that are in focus
 * will be clear whereas objects not in focus will be blurred.
 * </p>
 * <p>
 * This stage has the following uniforms: <code>focalDistance</code>, <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <p>
 * <code>focalDistance</code> is the distance in meters from the camera to set the camera focus.
 * </p>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * The blur is applied to the areas out of focus.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies a depth of field effect.
 */
PostProcessStageLibrary.createDepthOfFieldStage = function () {
  const blur = createBlur("czm_depth_of_field_blur");
  const dof = new PostProcessStage({
    name: "czm_depth_of_field_composite",
    fragmentShader: DepthOfField,
    uniforms: {
      focalDistance: 5.0,
      blurTexture: blur.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    focalDistance: {
      get: function () {
        return dof.uniforms.focalDistance;
      },
      set: function (value) {
        dof.uniforms.focalDistance = value;
      },
    },
    delta: {
      get: function () {
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
  });
  return new PostProcessStageComposite({
    name: "czm_depth_of_field",
    stages: [blur, dof],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Whether or not a depth of field stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isDepthOfFieldSupported = function (scene) {
  return scene.context.depthTexture;
};

/**
 * Creates a post-process stage that detects edges.
 * <p>
 * Writes the color to the output texture with alpha set to 1.0 when it is on an edge.
 * </p>
 * <p>
 * This stage has the following uniforms: <code>color</code> and <code>length</code>
 * </p>
 * <ul>
 * <li><code>color</code> is the color of the highlighted edge. The default is {@link Color#BLACK}.</li>
 * <li><code>length</code> is the length of the edges in pixels. The default is <code>0.5</code>.</li>
 * </ul>
 * <p>
 * This stage is not supported in 2D.
 * </p>
 * @return {PostProcessStage} A post-process stage that applies an edge detection effect.
 *
 * @example
 * // multiple silhouette effects
 * const yellowEdge = Cesium.PostProcessLibrary.createEdgeDetectionStage();
 * yellowEdge.uniforms.color = Cesium.Color.YELLOW;
 * yellowEdge.selected = [feature0];
 *
 * const greenEdge = Cesium.PostProcessLibrary.createEdgeDetectionStage();
 * greenEdge.uniforms.color = Cesium.Color.LIME;
 * greenEdge.selected = [feature1];
 *
 * // draw edges around feature0 and feature1
 * postProcessStages.add(Cesium.PostProcessLibrary.createSilhouetteStage([yellowEdge, greenEdge]);
 */
PostProcessStageLibrary.createEdgeDetectionStage = function () {
  // unique name generated on call so more than one effect can be added
  const name = createGuid();
  return new PostProcessStage({
    name: `czm_edge_detection_${name}`,
    fragmentShader: EdgeDetection,
    uniforms: {
      length: 0.25,
      color: Color.clone(Color.BLACK),
    },
  });
};

/**
 * Whether or not an edge detection stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isEdgeDetectionSupported = function (scene) {
  return scene.context.depthTexture;
};

function getSilhouetteEdgeDetection(edgeDetectionStages) {
  if (!defined(edgeDetectionStages)) {
    return PostProcessStageLibrary.createEdgeDetectionStage();
  }

  const edgeDetection = new PostProcessStageComposite({
    name: "czm_edge_detection_multiple",
    stages: edgeDetectionStages,
    inputPreviousStageTexture: false,
  });

  const compositeUniforms = {};
  let fsDecl = "";
  let fsLoop = "";
  for (let i = 0; i < edgeDetectionStages.length; ++i) {
    fsDecl += `uniform sampler2D edgeTexture${i}; \n`;
    fsLoop +=
      `        vec4 edge${i} = texture2D(edgeTexture${i}, v_textureCoordinates); \n` +
      `        if (edge${i}.a > 0.0) \n` +
      `        { \n` +
      `            color = edge${i}; \n` +
      `            break; \n` +
      `        } \n`;
    compositeUniforms[`edgeTexture${i}`] = edgeDetectionStages[i].name;
  }

  const fs =
    `${fsDecl}varying vec2 v_textureCoordinates; \n` +
    `void main() { \n` +
    `    vec4 color = vec4(0.0); \n` +
    `    for (int i = 0; i < ${edgeDetectionStages.length}; i++) \n` +
    `    { \n${fsLoop}    } \n` +
    `    gl_FragColor = color; \n` +
    `} \n`;

  const edgeComposite = new PostProcessStage({
    name: "czm_edge_detection_combine",
    fragmentShader: fs,
    uniforms: compositeUniforms,
  });
  return new PostProcessStageComposite({
    name: "czm_edge_detection_composite",
    stages: [edgeDetection, edgeComposite],
  });
}

/**
 * Creates a post-process stage that applies a silhouette effect.
 * <p>
 * A silhouette effect composites the color from the edge detection pass with input color texture.
 * </p>
 * <p>
 * This stage has the following uniforms when <code>edgeDetectionStages</code> is <code>undefined</code>: <code>color</code> and <code>length</code>
 * </p>
 * <p>
 * <code>color</code> is the color of the highlighted edge. The default is {@link Color#BLACK}.
 * <code>length</code> is the length of the edges in pixels. The default is <code>0.5</code>.
 * </p>
 * @param {PostProcessStage[]} [edgeDetectionStages] An array of edge detection post process stages.
 * @return {PostProcessStageComposite} A post-process stage that applies a silhouette effect.
 */
PostProcessStageLibrary.createSilhouetteStage = function (edgeDetectionStages) {
  const edgeDetection = getSilhouetteEdgeDetection(edgeDetectionStages);
  const silhouetteProcess = new PostProcessStage({
    name: "czm_silhouette_color_edges",
    fragmentShader: Silhouette,
    uniforms: {
      silhouetteTexture: edgeDetection.name,
    },
  });

  return new PostProcessStageComposite({
    name: "czm_silhouette",
    stages: [edgeDetection, silhouetteProcess],
    inputPreviousStageTexture: false,
    uniforms: edgeDetection.uniforms,
  });
};

/**
 * Whether or not a silhouette stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isSilhouetteSupported = function (scene) {
  return scene.context.depthTexture;
};

/**
 * Creates a post-process stage that applies a bloom effect to the input texture.
 * <p>
 * A bloom effect adds glow effect, makes bright areas brighter, and dark areas darker.
 * </p>
 * <p>
 * This post-process stage has the following uniforms: <code>contrast</code>, <code>brightness</code>, <code>glowOnly</code>,
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <ul>
 * <li><code>contrast</code> is a scalar value in the range [-255.0, 255.0] and affects the contract of the effect. The default value is <code>128.0</code>.</li>
 * <li><code>brightness</code> is a scalar value. The input texture RGB value is converted to hue, saturation, and brightness (HSB) then this value is
 * added to the brightness. The default value is <code>-0.3</code>.</li>
 * <li><code>glowOnly</code> is a boolean value. When <code>true</code>, only the glow effect will be shown. When <code>false</code>, the glow will be added to the input texture.
 * The default value is <code>false</code>. This is a debug option for viewing the effects when changing the other uniform values.</li>
 * </ul>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage to applies a bloom effect.
 *
 * @private
 */
PostProcessStageLibrary.createBloomStage = function () {
  const contrastBias = new PostProcessStage({
    name: "czm_bloom_contrast_bias",
    fragmentShader: ContrastBias,
    uniforms: {
      contrast: 128.0,
      brightness: -0.3,
    },
  });
  const blur = createBlur("czm_bloom_blur");
  const generateComposite = new PostProcessStageComposite({
    name: "czm_bloom_contrast_bias_blur",
    stages: [contrastBias, blur],
  });

  const bloomComposite = new PostProcessStage({
    name: "czm_bloom_generate_composite",
    fragmentShader: BloomComposite,
    uniforms: {
      glowOnly: false,
      bloomTexture: generateComposite.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    glowOnly: {
      get: function () {
        return bloomComposite.uniforms.glowOnly;
      },
      set: function (value) {
        bloomComposite.uniforms.glowOnly = value;
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
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
  });

  return new PostProcessStageComposite({
    name: "czm_bloom",
    stages: [generateComposite, bloomComposite],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Creates a post-process stage that Horizon-based Ambient Occlusion (HBAO) to the input texture.
 * <p>
 * Ambient occlusion simulates shadows from ambient light. These shadows would always be present when the
 * surface receives light and regardless of the light's position.
 * </p>
 * <p>
 * The uniforms have the following properties: <code>intensity</code>, <code>bias</code>, <code>lengthCap</code>,
 * <code>stepSize</code>, <code>frustumLength</code>, <code>randomTexture</code>, <code>ambientOcclusionOnly</code>,
 * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code>.
 * </p>
 * <ul>
 * <li><code>intensity</code> is a scalar value used to lighten or darken the shadows exponentially. Higher values make the shadows darker. The default value is <code>3.0</code>.</li>
 * <li><code>bias</code> is a scalar value representing an angle in radians. If the dot product between the normal of the sample and the vector to the camera is less than this value,
 * sampling stops in the current direction. This is used to remove shadows from near planar edges. The default value is <code>0.1</code>.</li>
 * <li><code>lengthCap</code> is a scalar value representing a length in meters. If the distance from the current sample to first sample is greater than this value,
 * sampling stops in the current direction. The default value is <code>0.26</code>.</li>
 * <li><code>stepSize</code> is a scalar value indicating the distance to the next texel sample in the current direction. The default value is <code>1.95</code>.</li>
 * <li><code>frustumLength</code> is a scalar value in meters. If the current fragment has a distance from the camera greater than this value, ambient occlusion is not computed for the fragment.
 * The default value is <code>1000.0</code>.</li>
 * <li><code>randomTexture</code> is a texture where the red channel is a random value in [0.0, 1.0]. The default value is <code>undefined</code>. This texture needs to be set.</li>
 * <li><code>ambientOcclusionOnly</code> is a boolean value. When <code>true</code>, only the shadows generated are written to the output. When <code>false</code>, the input texture is modulated
 * with the ambient occlusion. This is a useful debug option for seeing the effects of changing the uniform values. The default value is <code>false</code>.</li>
 * </ul>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * The blur is applied to the shadows generated from the image to make them smoother.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies an ambient occlusion effect.
 *
 * @private
 */
PostProcessStageLibrary.createAmbientOcclusionStage = function () {
  const generate = new PostProcessStage({
    name: "czm_ambient_occlusion_generate",
    fragmentShader: AmbientOcclusionGenerate,
    uniforms: {
      intensity: 3.0,
      bias: 0.1,
      lengthCap: 0.26,
      stepSize: 1.95,
      frustumLength: 1000.0,
      randomTexture: undefined,
    },
  });
  const blur = createBlur("czm_ambient_occlusion_blur");
  blur.uniforms.stepSize = 0.86;
  const generateAndBlur = new PostProcessStageComposite({
    name: "czm_ambient_occlusion_generate_blur",
    stages: [generate, blur],
  });

  const ambientOcclusionModulate = new PostProcessStage({
    name: "czm_ambient_occlusion_composite",
    fragmentShader: AmbientOcclusionModulate,
    uniforms: {
      ambientOcclusionOnly: false,
      ambientOcclusionTexture: generateAndBlur.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    intensity: {
      get: function () {
        return generate.uniforms.intensity;
      },
      set: function (value) {
        generate.uniforms.intensity = value;
      },
    },
    bias: {
      get: function () {
        return generate.uniforms.bias;
      },
      set: function (value) {
        generate.uniforms.bias = value;
      },
    },
    lengthCap: {
      get: function () {
        return generate.uniforms.lengthCap;
      },
      set: function (value) {
        generate.uniforms.lengthCap = value;
      },
    },
    stepSize: {
      get: function () {
        return generate.uniforms.stepSize;
      },
      set: function (value) {
        generate.uniforms.stepSize = value;
      },
    },
    frustumLength: {
      get: function () {
        return generate.uniforms.frustumLength;
      },
      set: function (value) {
        generate.uniforms.frustumLength = value;
      },
    },
    randomTexture: {
      get: function () {
        return generate.uniforms.randomTexture;
      },
      set: function (value) {
        generate.uniforms.randomTexture = value;
      },
    },
    delta: {
      get: function () {
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    blurStepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
    ambientOcclusionOnly: {
      get: function () {
        return ambientOcclusionModulate.uniforms.ambientOcclusionOnly;
      },
      set: function (value) {
        ambientOcclusionModulate.uniforms.ambientOcclusionOnly = value;
      },
    },
  });

  return new PostProcessStageComposite({
    name: "czm_ambient_occlusion",
    stages: [generateAndBlur, ambientOcclusionModulate],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Whether or not an ambient occlusion stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isAmbientOcclusionSupported = function (scene) {
  return scene.context.depthTexture;
};

const fxaaFS = `#define FXAA_QUALITY_PRESET 39 \n${FXAA3_11}\n${FXAA}`;

/**
 * Creates a post-process stage that applies Fast Approximate Anti-aliasing (FXAA) to the input texture.
 * @return {PostProcessStage} A post-process stage that applies Fast Approximate Anti-aliasing to the input texture.
 *
 * @private
 */
PostProcessStageLibrary.createFXAAStage = function () {
  return new PostProcessStage({
    name: "czm_FXAA",
    fragmentShader: fxaaFS,
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });
};

/**
 * Creates a post-process stage that applies ACES tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies ACES tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createAcesTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += AcesTonemapping;
  return new PostProcessStage({
    name: "czm_aces",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies filmic tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies filmic tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createFilmicTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += FilmicTonemapping;
  return new PostProcessStage({
    name: "czm_filmic",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies Reinhard tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies Reinhard tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createReinhardTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += ReinhardTonemapping;
  return new PostProcessStage({
    name: "czm_reinhard",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies modified Reinhard tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies modified Reinhard tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createModifiedReinhardTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += ModifiedReinhardTonemapping;
  return new PostProcessStage({
    name: "czm_modified_reinhard",
    fragmentShader: fs,
    uniforms: {
      white: Color.WHITE,
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that finds the average luminance of the input texture.
 * @return {PostProcessStage} A post-process stage that finds the average luminance of the input texture.
 * @private
 */
PostProcessStageLibrary.createAutoExposureStage = function () {
  return new AutoExposure();
};

/**
 * Creates a post-process stage that renders the input texture with black and white gradations.
 * <p>
 * This stage has one uniform value, <code>gradations</code>, which scales the luminance of each pixel.
 * </p>
 * @return {PostProcessStage} A post-process stage that renders the input texture with black and white gradations.
 */
PostProcessStageLibrary.createBlackAndWhiteStage = function () {
  return new PostProcessStage({
    name: "czm_black_and_white",
    fragmentShader: BlackAndWhite,
    uniforms: {
      gradations: 5.0,
    },
  });
};

/**
 * Creates a post-process stage that saturates the input texture.
 * <p>
 * This stage has one uniform value, <code>brightness</code>, which scales the saturation of each pixel.
 * </p>
 * @return {PostProcessStage} A post-process stage that saturates the input texture.
 */
PostProcessStageLibrary.createBrightnessStage = function () {
  return new PostProcessStage({
    name: "czm_brightness",
    fragmentShader: Brightness,
    uniforms: {
      brightness: 0.5,
    },
  });
};

/**
 * Creates a post-process stage that adds a night vision effect to the input texture.
 * @return {PostProcessStage} A post-process stage that adds a night vision effect to the input texture.
 */
PostProcessStageLibrary.createNightVisionStage = function () {
  return new PostProcessStage({
    name: "czm_night_vision",
    fragmentShader: NightVision,
  });
};

/**
 * Creates a post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
 * @return {PostProcessStage} A post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
 *
 * @private
 */
PostProcessStageLibrary.createDepthViewStage = function () {
  return new PostProcessStage({
    name: "czm_depth_view",
    fragmentShader: DepthView,
  });
};

/**
 * Creates a post-process stage that applies an effect simulating light flaring a camera lens.
 * <p>
 * This stage has the following uniforms: <code>dirtTexture</code>, <code>starTexture</code>, <code>intensity</code>, <code>distortion</code>, <code>ghostDispersal</code>,
 * <code>haloWidth</code>, <code>dirtAmount</code>, and <code>earthRadius</code>.
 * <ul>
 * <li><code>dirtTexture</code> is a texture sampled to simulate dirt on the lens.</li>
 * <li><code>starTexture</code> is the texture sampled for the star pattern of the flare.</li>
 * <li><code>intensity</code> is a scalar multiplied by the result of the lens flare. The default value is <code>2.0</code>.</li>
 * <li><code>distortion</code> is a scalar value that affects the chromatic effect distortion. The default value is <code>10.0</code>.</li>
 * <li><code>ghostDispersal</code> is a scalar indicating how far the halo effect is from the center of the texture. The default value is <code>0.4</code>.</li>
 * <li><code>haloWidth</code> is a scalar representing the width of the halo  from the ghost dispersal. The default value is <code>0.4</code>.</li>
 * <li><code>dirtAmount</code> is a scalar representing the amount of dirt on the lens. The default value is <code>0.4</code>.</li>
 * <li><code>earthRadius</code> is the maximum radius of the earth. The default value is <code>Ellipsoid.WGS84.maximumRadius</code>.</li>
 * </ul>
 * </p>
 * @return {PostProcessStage} A post-process stage for applying a lens flare effect.
 */
PostProcessStageLibrary.createLensFlareStage = function () {
  return new PostProcessStage({
    name: "czm_lens_flare",
    fragmentShader: LensFlare,
    uniforms: {
      dirtTexture: buildModuleUrl("Assets/Textures/LensFlare/DirtMask.jpg"),
      starTexture: buildModuleUrl("Assets/Textures/LensFlare/StarBurst.jpg"),
      intensity: 2.0,
      distortion: 10.0,
      ghostDispersal: 0.4,
      haloWidth: 0.4,
      dirtAmount: 0.4,
      earthRadius: Ellipsoid.WGS84.maximumRadius,
    },
  });
};


/*************新增开始**************/
const Snow = `uniform sampler2D colorTexture; //输入的场景渲染照片
    varying vec2 v_textureCoordinates;
    uniform float snow_density;
    uniform float snow_size;
    uniform float snow_fall_speed;

    float snow(vec2 uv,float scale)
    {
        float fallsize =clamp(ceil(snow_size*4.0),1.,4.);
        float time = czm_frameNumber / 400.0*clamp(snow_fall_speed*10.,2.0,10.0);
        float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;
        //运动轨迹控制
        uv+=time/scale;
        uv.y+=time*2./scale;
        uv.x+=sin(uv.y+time*.5)/scale;
        uv*=scale;
        vec2 s=floor(uv),f=fract(uv),p;float k=9.,d;
        p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p*clamp((1.5-fallsize*0.5),0.3,1.4));k=min(d,k);
        k=smoothstep(0.,k,sin(f.x+f.y)*0.01);
        return k*w;
    }
    
    void main(void){
        float density =clamp(ceil(snow_density*4.0),1.,4.);
        vec2 resolution = czm_viewport.zw;
        vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y)*vec2(clamp(0.1*density,0.2,0.8));
        vec3 finalColor=vec3(0);
        float c = clamp(0.1*density,0.1,1.0);
        c+=snow(uv,12.*clamp(2.*density,1.2,1.8));
        c+=snow(uv,10.*clamp(2.*density,1.2,1.8));
        c+=snow(uv,8.*clamp(2.*density,1.2,1.8));
        c+=snow(uv,6.*clamp(2.*density,1.2,1.8));
        finalColor=(vec3(c)); //屏幕上雪的颜色
        gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.2);  //将雪和三维场景融合
    
    }`;

const CoverSnow = `#extension GL_OES_standard_derivatives : enable
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float alpha;
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
void main(){
  vec4 color = texture2D(colorTexture, v_textureCoordinates);
  vec4 currD = texture2D(depthTexture, v_textureCoordinates);
  if(currD.r>=1.0){
    gl_FragColor = color;
    return;
  }
  float depth = getDepth(currD);
  vec4 positionEC = toEye(v_textureCoordinates, depth);
  vec3 dx = dFdx(positionEC.xyz);
  vec3 dy = dFdy(positionEC.xyz);
  vec3 nor = normalize(cross(dx,dy));

  vec4 positionWC = normalize(czm_inverseView * positionEC);
  vec3 normalWC = normalize(czm_inverseViewRotation * nor);
  float dotNumWC = dot(positionWC.xyz,normalWC);
  if(dotNumWC<=0.3){
    gl_FragColor = mix(color,vec4(1.0),alpha*0.3);
    return;
  }
  gl_FragColor = mix(color,vec4(1.0),dotNumWC*alpha);
}`;


const Rain = `
            uniform sampler2D colorTexture; 
            varying vec2 v_textureCoordinates;


            uniform sampler2D rain_img; 
            uniform float rain_speed;
            uniform float rain_size;
            uniform float rain_density;
            uniform float mix_factor;

            void main(void){
                float _speed=clamp(rain_speed*5.,0.5,5.);
                float _density=30.-clamp(rain_density*0.8,0.09,0.8)*28.;
                //density比较大时size和density成反比关系(待研究)
                float _sizeTemp=clamp(rain_size,0.1,1.0);
                float _size=(1.1-_sizeTemp)*0.01;
                vec2 uv=gl_FragCoord.xy;
                float iTime = czm_frameNumber*_speed/ 200.0;
                float col=.6-_density*fract((uv.x*.2+uv.y*_size)*fract(uv.x*.91)+iTime)*1.5;
                vec4 o = vec4(col, col, col, 1.0);
                if(col < 0.01){
                    o = vec4(0, 0, 0, 1.0);
                }
                gl_FragColor=mix(texture2D(colorTexture, v_textureCoordinates),o,mix_factor);
  
            }
            `;

PostProcessStageLibrary.createSnowStage = function (option) {
  option = Cesium.defaultValue(option, {});

  var density = Cesium.defaultValue(option.density, 0.5);
  var size = Cesium.defaultValue(option.size, 0.5);
  var speed = Cesium.defaultValue(option.speed, 0.5);

  var snow = new PostProcessStage({
    name: 'czm_snow',
    fragmentShader: Snow,
    uniforms: {
      snow_density: density,  // 密集程度越大雪越大
      snow_size: size,        // 尺寸越大雪越大
      snow_fall_speed: speed  // 速度越大雪越大
    }
  });
  return snow;
}

PostProcessStageLibrary.createCoverSnowStage = function (option) {
  return new Cesium.PostProcessStage({
    name: 'czm_coverSnow',
    fragmentShader: CoverSnow,
    uniforms: {
      alpha: Cesium.defaultValue(option.alpha, 1.0), //覆盖强度  0-1
    }
  });
}

PostProcessStageLibrary.createRainStage = function (option) {
  option = Cesium.defaultValue(option, {});

  var density = Cesium.defaultValue(option.density, 0.5);
  var size = Cesium.defaultValue(option.size, 0.5);
  var speed = Cesium.defaultValue(option.speed, 0.5);
  var mix_factor = Cesium.defaultValue(option.mix_factor, 0.5);

  var rain = new PostProcessStage({
    name: 'czm_rain',
    fragmentShader: Rain,
    uniforms: {
      rain_density: density,    // 密集程度越大雨越大
      rain_size: size,          // 尺寸越大雨越大
      rain_speed: speed,    // 速度越大雨越大
      mix_factor: mix_factor
    }
  });
  return rain;
}

const fogShader = "float getDistance(sampler2D depthTexture, vec2 texCoords) \n" +
  "{ \n" +
  "    float depth = czm_unpackDepth(texture2D(depthTexture, texCoords)); \n" +
  "    if (depth == 0.0) { \n" +
  "        return czm_infinity; \n" +
  "    } \n" +
  "    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth); \n" +
  "    return -eyeCoordinate.z / eyeCoordinate.w; \n" +
  "} \n" +
  "float interpolateByDistance(vec4 nearFarScalar, float distance) \n" +
  "{ \n" +
  "    float startDistance = nearFarScalar.x; \n" +
  "    float startValue = nearFarScalar.y; \n" +
  "    float endDistance = nearFarScalar.z; \n" +
  "    float endValue = nearFarScalar.w; \n" +
  "    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0); \n" +
  "    return mix(startValue, endValue, t); \n" +
  "} \n" +
  "vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor) \n" +
  "{ \n" +
  "    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a); \n" +
  "} \n" +
  "uniform sampler2D colorTexture; \n" +
  "uniform sampler2D depthTexture; \n" +
  "uniform vec4 fogByDistance; \n" +
  "uniform vec4 fogColor; \n" +
  "varying vec2 v_textureCoordinates; \n" +
  "void main(void) \n" +
  "{ \n" +
  "    float distance = getDistance(depthTexture, v_textureCoordinates); \n" +
  "    vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates); \n" +
  "    float blendAmount = interpolateByDistance(fogByDistance, distance); \n" +
  "    vec4 finalFogColor = vec4(fogColor.rgb, fogColor.a * blendAmount); \n" +
  "    gl_FragColor = alphaBlend(finalFogColor, sceneColor); \n" +
  "} \n";


/**
 *  雾天
 * @param visibility 能见度，单位米
 * @returns {PostProcessStage|PostProcessStage}
 */
PostProcessStageLibrary.createFogStage = function (visibility) {
  var fog = new Cesium.PostProcessStage({
    fragmentShader: fogShader,
    uniforms: {
      fogByDistance: new Cesium.Cartesian4(0, 0.0, visibility, 1.0),//800为能见度
      fogColor: Cesium.Color.WHITE,
    }
  });
  return fog;
}

/**
 *  夜晚
 * @param visibility 能见度,单位米
 * @returns {PostProcessStage|PostProcessStage}
 */
PostProcessStageLibrary.createNightStage = function (visibility) {
  var night = new Cesium.PostProcessStage({
    fragmentShader: fogShader,
    uniforms: {
      fogByDistance: new Cesium.Cartesian4(0, 0.0, visibility, 1.0),//800为能见度
      fogColor: Cesium.Color.BLACK,
    }
  });
  return night;
}


const LightningShader = `
        float hash(float x)
            {
                return fract(21654.6512 * sin(385.51 * x));
            }

            float hash(vec2 p)
            {
                return fract(1654.65157 * sin(15.5134763 * p.x + 45.5173247 * p.y+ 5.21789));
            }

            vec2 hash2(vec2 p)
            {
                return vec2(hash(p*.754),hash(1.5743*p+4.5476351));
            }
            vec2 add = vec2(1.0, 0.0);

            vec2 noise2(vec2 x)
            {
                vec2 p = floor(x);
                vec2 f = fract(x);
                f = f*f*(3.0-2.0*f);
                vec2 res = mix(mix( hash2(p),        
                hash2(p + add.xy),f.x),
                mix( hash2(p + add.yx), hash2(p + add.xx),f.x),f.y);
                return res;
            }

            vec2 fbm2(vec2 x)
            {
                vec2 r = vec2(0.0);
                float a = 1.0;
                for (int i = 0; i < 8; i++)
                {
                    r += noise2(x) * a;
                    x *= 2.;
                    a *= .5;
                }
                
                return r;
            }
            float dseg( vec2 ba, vec2 pa )
            {
                
                float h = clamp( dot(pa,ba)/dot(ba,ba), -0.2, 1. );	
                return length( pa - ba*h );
            }

            

            uniform sampler2D colorTexture; 
            uniform float fall_interval;
            uniform float mix_factor;
            varying vec2 v_textureCoordinates;
            
            void main(void){
                vec2 uv=gl_FragCoord.xy;
                float iTime = czm_frameNumber*0.5*clamp(fall_interval*0.1,0.01,0.1);
                vec2 p = uv/czm_viewport.zw;
                vec2 d;
                vec2 tgt = vec2(1., -1.);
                float c=0.;
                if(p.y>=0.)
                    c= (1.-(fbm2((p+.2)*p.y+.1*iTime)).x)*p.y;
                else 
                    c = (1.-(fbm2(p+.2+.1*iTime)).x)*p.y*p.y;
                vec3 col=vec3(0.);
                //用分布朗运动模拟乌云
                vec3 col1 = c*vec3(.3,.5,1.);
                float mdist = 100000.;
                
                float t = hash(floor(5.*iTime));
                tgt+=4.*hash2(tgt+t)-1.5;
                if(hash(t+2.3)>.6)
                for (int i=0; i<100; i++) {
                
                    vec2 dtgt = tgt-p;		
                    d = .05*(vec2(-.5, -1.)+hash2(vec2(float(i), t)));
                    //点d到选段dtgt的距离
                    float dist =dseg(d,dtgt);
                    //求最小距离(https://blog.csdn.net/weixin_43751272/article/details/114017953
                    mdist = min(mdist,dist);
                    tgt -= d;
                    c=exp(-1.2*dist)+exp(-55.*mdist);
                    col=c*vec3(.7,.8,1.);
                }
                //加上乌云
                col+=col1;
                gl_FragColor=mix(texture2D(colorTexture, v_textureCoordinates),vec4(col,0.0),mix_factor);
            }
`

/**
 *  闪电
 * @returns {PostProcessStage|PostProcessStage}
 */
PostProcessStageLibrary.createLightningStage = function (option) {
  option = Cesium.defaultValue(option, {});
  var interval = Cesium.defaultValue(option.interval, 0.3);
  var mix_factor = Cesium.defaultValue(option.mix_factor, 0.5);

  var Lightning = new Cesium.PostProcessStage({
    fragmentShader: LightningShader,
    uniforms: {
      fall_interval: interval,
      mix_factor: mix_factor
    }
  });
  return Lightning;
}

/*************新增结束**************/
export default PostProcessStageLibrary;
