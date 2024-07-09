const TilesetEditBase = require('./TilesetEditBase');
/**
 * 3dtiles模型裁剪
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {TilesetLayer} options.layer 需要裁剪的对象（3dtiles图层）
 * @param {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只裁剪单个区域【单个区域场景时使用】
 *
 * @param {Boolean} [options.clipOutSide = false] 是否外裁剪
 *
 * @export
 * @class TilesetClip
 * @extends {TilesetEditBase}
 */
class TilesetClip extends TilesetEditBase {

  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    super(viewer,options);

    if(options.hasOwnProperty('clipOutSide')){
      this.clipOutSide = options.clipOutSide;
    }
  }

  /**
   * 是否外裁剪
   * @type {Boolean}
   */
  get clipOutSide() {
    return this.options.clipOutSide;
  }
  set clipOutSide(val) {
    this.optio_modelEditor_modelEditorns.clipOutSide = val;

    if (this.tileset.modelEditor) {
      this.tileset.modelEditor.editVar[0] = val;
    }
  }

  _activeModelEditor() {
    this.tileset.modelEditor.fbo = this.fbo;
    this.tileset.modelEditor.polygonBounds = this.polygonBounds;
    this.tileset.modelEditor.IsYaPing[0] = true;
    this.tileset.modelEditor.IsYaPing[2] = true;
    this.tileset.modelEditor.editVar[0] = this.clipOutSide;
    this.tileset.modelEditor.enable = this.enabled;

    //Hao
    this.tileset.modelEditor._inverseTransform = this.matrix;
    this.tileset.modelEditor.upZ = this.upZ;
  }
}
module.exports = TilesetClip;
