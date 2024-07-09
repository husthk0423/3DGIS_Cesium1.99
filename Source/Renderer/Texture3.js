import DeveloperError from "../Core/DeveloperError.js";
import destroyObject from "../Core/destroyObject.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import createGuid from "../Core/createGuid.js";
import PixelFormat from "../Core/PixelFormat.js";
import Cartesian3 from "../Core/Cartesian3.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";


/**
 * @private
 */
function Texture3(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const context = options.context;
  const gl = context._gl;

  const source = options.source;
  let width = options.width;
  let height = options.height;
  let depth = options.depth;

  if (defined(source)) {
    if (!defined(width)) {
      width = defaultValue(source.videoWidth, source.width);
    }
    if (!defined(height)) {
      height = defaultValue(source.videoHeight, source.height);
    }
    if (!defined(depth)) {
      depth = defaultValue(source.videoDepth, source.depth);
    }
  }

  if (!defined(width) || !defined(height) || !defined(depth)) {
    throw new DeveloperError(
      "options requires a source field to create an initialized texture or width or height and depth fields to create a blank texture."
    );
  }

  const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  const pixelDatatype = defaultValue(
    options.pixelDatatype,
    PixelDatatype.FLOAT
  );
  const internalFormat = PixelFormat.toInternalFormat(
    pixelFormat,
    pixelDatatype,
    context
  );

  const preMultiplyAlpha = false;
  const flipY = false;
  const skipColorSpaceConversion = true;
  let unpackAlignment = 4;
  if (defined(source) && defined(source.arrayBufferView)) {
    unpackAlignment = PixelFormat.alignmentInBytes(
      pixelFormat,
      pixelDatatype,
      width
    );
  }

  const textureTarget = gl.TEXTURE_3D;
  const texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(textureTarget, texture);

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);
  gl.pixelStorei(
    gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
    skipColorSpaceConversion ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL
  );
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

  if (defined(source) && defined(source.arrayBufferView)) {
    const arrayBufferView = source.arrayBufferView;
    gl.texImage3D(
      textureTarget,
      0,
      internalFormat,
      width,
      height,
      depth,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      arrayBufferView
    );
  }

  gl.bindTexture(textureTarget, null);

  const sizeInBytes = texture3DSizeInBytes(
    pixelFormat,
    pixelDatatype,
    width,
    height,
    depth
  );

  this._id = createGuid();
  this._context = context;
  this._textureFilterAnisotropic = context._textureFilterAnisotropic;
  this._texture = texture;
  this._textureTarget = textureTarget;
  this._internalFormat = internalFormat;
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = pixelDatatype;
  this._width = width;
  this._height = height;
  this._depth = depth;

  this._hasMipmap = false;
  this._sizeInBytes = sizeInBytes;
  this._preMultiplyAlpha = preMultiplyAlpha;
  this._flipY = flipY;
  this._initialized = true;
  this._dimensions = new Cartesian3(width, height, depth);

  this._sampler = undefined;
  this.sampler = defaultValue(options.sampler, new Sampler());
}

Object.defineProperties(Texture3.prototype, {
  id: {
    get: function () {
      return this._id;
    },
  },
  sampler: {
    get: function () {
      return this._sampler;
    },
    set: function (sampler) {
      const minificationFilter = sampler.minificationFilter;
      const magnificationFilter = sampler.magnificationFilter;
      const context = this._context;

      const gl = context._gl;
      const target = this._textureTarget;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(target, this._texture);

      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
      gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
      gl.texParameteri(target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

      gl.bindTexture(target, null);

      this._sampler = sampler;
    },
  },
  pixelFormat: {
    get: function () {
      return this._pixelFormat;
    },
  },
  pixelDatatype: {
    get: function () {
      return this._pixelDatatype;
    },
  },
  dimensions: {
    get: function () {
      return this._dimensions;
    },
  },
  width: {
    get: function () {
      return this._width;
    },
  },
  height: {
    get: function () {
      return this._height;
    },
  },
  depth: {
    get: function () {
      return this._depth;
    },
  },
  preMultiplyAlpha: {
    get: function () {
      return this._preMultiplyAlpha;
    },
  },
  flipY: {
    get: function () {
      return this._flipY;
    },
  },
  sizeInBytes: {
    get: function () {
      return this._sizeInBytes;
    },
  },

  _target: {
    get: function () {
      return this._textureTarget;
    },
  },
});

Texture3.prototype.isDestroyed = function () {
  return false;
};

Texture3.prototype.destroy = function () {
  this._context._gl.deleteTexture(this._texture);
  return destroyObject(this);
};

function texture3DSizeInBytes(
  pixelFormat,
  pixelDatatype,
  width,
  height,
  depth
) {
  const componentsLength = PixelFormat.componentsLength(pixelFormat);
  const typeBytes = PixelDatatype.sizeInBytes(pixelDatatype);
  return width * height * depth * componentsLength * typeBytes;
}

export default Texture3;