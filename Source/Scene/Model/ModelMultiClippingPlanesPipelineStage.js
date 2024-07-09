import ClippingPlaneCollection from "../ClippingPlaneCollection.js";
import combine from "../../Core/combine.js";
import ModelMultiClippingPlanesStageFS from "../../Shaders/Model/ModelMultiClippingPlanesStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";

/**
 * The model clipping planes stage is responsible for applying clipping planes to the model.
 *
 * @namespace ModelMultiClippingPlanesPipelineStage
 *
 * @private
 */
const ModelMultiClippingPlanesPipelineStage = {
  name: "ModelMultiClippingPlanesPipelineStage", // Helps with debugging
}; 

// const textureResolutionScratch = new Cartesian2();
/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model has clipping planes</li>
 *  <li>adds the defines to the fragment shader for parameters related to clipping planes, such as the number of planes</li>
 *  <li>adds a function to the fragment shader to apply the clipping planes to the model's base color</li>
 *  <li>adds the uniforms for the fragment shader for the clipping plane texture and matrix</li>
 *</ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
 ModelMultiClippingPlanesPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  const context = frameState.context;
  const shaderBuilder = renderResources.shaderBuilder;
  const multiclippingPlanes = model.multiClippingPlanes;
  const dataTexture = model.multiClippingPlanes.dataTexture;

  
  const scratchClippingPlanesMatrix = new Matrix4();
  const scratchInverseTransposeClippingPlanesMatrix = new Matrix4();

  //  if(multiclippingPlanes._clipOutSide && dataTexture){
    //  shaderBuilder.addDefine(
    //      "HAS_UNION_MULTI_CLIPPING_REGIONS",
    //      undefined,
    //      ShaderDestination.FRAGMENT
    //  );
  //  }

  shaderBuilder.addDefine(
    "HAS_MULTI_CLIPPING_PLANES",
    undefined,
    ShaderDestination.FRAGMENT
  );


  if (ClippingPlaneCollection.useFloatTexture(context)) {
    shaderBuilder.addDefine(
      "USE_CLIPPING_PLANES_FLOAT_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  if(defined(multiclippingPlanes))
  {
    shaderBuilder.addDefine(
      "u_collectionLength",
      multiclippingPlanes.length,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "u_maxLength",
      multiclippingPlanes.maxCollectionLength,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addUniform(
    "sampler2D",
    "u_model_clippingPlanes",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "mat4",
    "u_model_clippingPlanesMatrix",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "sampler2D",
    "u_multiClippingPlanesLength",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "vec4",
    "u_clippingPlanesEdgeStyle",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines(ModelMultiClippingPlanesStageFS);

  const uniformMap = {
    u_dataTexture_width: function () {
      const _multiClippingPlanes = multiclippingPlanes;
      if (defined(_multiClippingPlanes)) {
        const texture = _multiClippingPlanes.dataTexture;
        if (defined(texture)) {
          return texture.width;
        }
      }
      return frameState.context.defaultTexture;
    },

    u_dataTexture_height: function () {
      const _multiClippingPlanes = multiclippingPlanes;
      if (defined(_multiClippingPlanes)) {
        const texture = _multiClippingPlanes.dataTexture;
        if (defined(texture)) {
          return texture.height;
        }
      }
      return frameState.context.defaultTexture;
    },

    u_model_clippingPlanes: function () {
      const _multiClippingPlanes = multiclippingPlanes;
      if (defined(_multiClippingPlanes)) {
        const texture = _multiClippingPlanes.dataTexture;
        if (defined(texture)) {
          return texture;
        }
      }
      return frameState.context.defaultTexture;
    },

    u_model_clippingPlanesMatrix: function () {
      return model._multiclippingPlanesMatrix;
    },
    u_multiClippingPlanesLength:function () {
      const _multiClippingPlanes= multiclippingPlanes;
      if (defined(_multiClippingPlanes)) {
        const texture = _multiClippingPlanes.lengthTexture;
        if (defined(texture))
        {
          return texture;
        }
      
          return frameState.context.defaultTexture;
        
      }
      return frameState.context.defaultTexture;
    },
    u_clippingPlanesEdgeStyle: function() {
      const _multiClippingPlanes = multiclippingPlanes;
      if (defined(_multiClippingPlanes)) {
        const style = _multiClippingPlanes.edgeColor.clone();
        style.alpha = _multiClippingPlanes.edgeWidth;
        return style;
      }
      const style = this.properties.clippingPlanesEdgeColor.clone();
      style.alpha = this.properties.clippingPlanesEdgeWidth;
      return style;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelMultiClippingPlanesPipelineStage;
