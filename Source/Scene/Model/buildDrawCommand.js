import BoundingSphere from "../../Core/BoundingSphere.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import RenderState from "../../Renderer/RenderState.js";
import VertexArray from "../../Renderer/VertexArray.js";
import ModelFS from "../../Shaders/Model/ModelFS.js";
import ModelVS from "../../Shaders/Model/ModelVS.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import ClassificationModelDrawCommand from "./ClassificationModelDrawCommand.js";
import ModelUtility from "./ModelUtility.js";
import ModelDrawCommand from "./ModelDrawCommand.js";

/**
 * Builds the {@link ModelDrawCommand} for a {@link ModelRuntimePrimitive}
 * using its render resources. If the model classifies another asset, it
 * builds a {@link ClassificationModelDrawCommand} instead.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {ModelDrawCommand|ClassificationModelDrawCommand} The generated ModelDrawCommand or ClassificationModelDrawCommand.
 *
 * @private
 */
function buildDrawCommand(primitiveRenderResources, frameState,unifromZ) {
  const shaderBuilder = primitiveRenderResources.shaderBuilder;
  // let str = 'const float unifromZ = '+unifromZ +';\n' ;
  // let  Modeltemp = str + ModelVS;
  shaderBuilder.addVertexLines(ModelVS);
  shaderBuilder.addFragmentLines(ModelFS);

  //  unifromZ=Math.random()*100;
  let str = 'unifromZ  '+unifromZ +'' ;
  shaderBuilder._vertexShaderParts.defineLines.push(str);
  let strVaring = 'varying float v_isFlatState;\n';
  shaderBuilder._fragmentShaderParts.varyingLines.push(strVaring);
  shaderBuilder._fragmentShaderParts.defineLines.push(str);

  const indexBuffer = getIndexBuffer(primitiveRenderResources);

  const vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: indexBuffer,
    attributes: primitiveRenderResources.attributes,
  });

  const model = primitiveRenderResources.model;
  model._pipelineResources.push(vertexArray);

  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._pipelineResources.push(shaderProgram);

  const pass = primitiveRenderResources.alphaOptions.pass;
  const sceneGraph = model.sceneGraph;

  const modelMatrix = Matrix4.multiplyTransformation(
    sceneGraph.computedModelMatrix,
    primitiveRenderResources.runtimeNode.computedTransform,
    new Matrix4()
  );

  let boundingSphere;
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    !frameState.scene3DOnly &&
    model._projectTo2D
  ) {
    const runtimePrimitive = primitiveRenderResources.runtimePrimitive;
    boundingSphere = runtimePrimitive.boundingSphere2D;
  } else {
    boundingSphere = BoundingSphere.transform(
      primitiveRenderResources.boundingSphere,
      modelMatrix,
      primitiveRenderResources.boundingSphere
    );
  }

  // Initialize render state with default values
  let renderState = clone(
    RenderState.fromCache(primitiveRenderResources.renderStateOptions),
    true
  );

  renderState.cull.face = ModelUtility.getCullFace(
    modelMatrix,
    primitiveRenderResources.primitiveType
  );
  renderState = RenderState.fromCache(renderState);

  const hasClassification = defined(model.classificationType);
  const castShadows = hasClassification
    ? false
    : ShadowMode.castShadows(model.shadows);
  const receiveShadows = hasClassification
    ? false
    : ShadowMode.receiveShadows(model.shadows);
  // Pick IDs are only added to specific draw commands for classification.
  // This behavior is handled by ClassificationModelDrawCommand.
  const pickId = hasClassification
    ? undefined
    : primitiveRenderResources.pickId;


  // shaderProgram._vertexShaderText =str+shaderProgram._vertexShaderText;
  const command = new DrawCommand({
    boundingVolume: boundingSphere,
    modelMatrix: modelMatrix,
    uniformMap: primitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: model.cull,
    pass: pass,
    count: primitiveRenderResources.count,
    owner: model,
    pickId: pickId,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: castShadows,
    receiveShadows: receiveShadows,
  });

  if (hasClassification) {
    return new ClassificationModelDrawCommand({
      primitiveRenderResources: primitiveRenderResources,
      command: command,
    });
  }

  return new ModelDrawCommand({
    primitiveRenderResources: primitiveRenderResources,
    command: command,
  });
}

/**
 * @private
 */
function getIndexBuffer(primitiveRenderResources) {
  const wireframeIndexBuffer = primitiveRenderResources.wireframeIndexBuffer;
  if (defined(wireframeIndexBuffer)) {
    return wireframeIndexBuffer;
  }

  const indices = primitiveRenderResources.indices;
  if (!defined(indices)) {
    return undefined;
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(indices.buffer)) {
    throw new DeveloperError("Indices must be provided as a Buffer");
  }
  //>>includeEnd('debug');

  return indices.buffer;
}

export default buildDrawCommand;
