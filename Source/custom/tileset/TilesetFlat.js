import TilesetEditBase from './TilesetEditBase';
/**
 * 3dtiles模型压平
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {TilesetLayer} options.layer 需要压平的对象（3dtiles图层）
 * @param {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只压平单个区域【单个区域场景时使用】
 * @param {Number} [options.height] 压平高度 (单位：米)，基于压平区域最低点高度的偏移量
 * @export
 * @class TilesetFlat
 * @extends {TilesetEditBase}
 */
class TilesetFlat extends TilesetEditBase {

  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    super(viewer,options);
    if(options.hasOwnProperty('height')){
       this.height = options.height;
    }
  }
  /**
   * 压平高度 (单位：米)，基于压平区域最低点高度的偏移量
   * @type {Number}
   */
  get height() {
    return this.options.height;
  }
  set height(val) {
    this.options.height = val;

    if (this.tileset.modelEditor) {
      this.tileset.modelEditor.heightVar[1] = val;
    }
  }

  _activeModelEditor() {
    this.tileset.modelEditor.fbo = this.fbo;
    this.tileset.modelEditor.polygonBounds = this.polygonBounds;
    this.tileset.modelEditor.IsYaPing[0] = true;
    this.tileset.modelEditor.IsYaPing[1] = true;
    this.tileset.modelEditor.heightVar[0] = this._minLocalZ;
    this.tileset.modelEditor.heightVar[1] = this.height || 0;
    this.tileset.modelEditor.enable = this.enabled;

    //Hao
    this.tileset.modelEditor._inverseTransform = this.matrix;
    this.tileset.modelEditor.upZ = this.upZ;
  }
}

export default TilesetFlat;
