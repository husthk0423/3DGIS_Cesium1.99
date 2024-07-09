const TilesetEditVS = `uniform mat4 myPorjection;
attribute vec3 position;
varying vec2 depth;
void main()
{
    vec4 pos = vec4(position.xyz,1.0);
    depth = pos.zw;
    pos.z = 0.0;
    gl_Position = czm_projection*pos;
}`;
const TilesetEditFS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

#define OES_texture_float_linear

varying vec2 depth;

vec4 packDepth(float depth)
{
    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * depth;
    enc = fract(enc);
    enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
    return enc;
}

void main()
{
    float fDepth = (depth.x / 5000.0)/2.0 + 0.5;
    // gl_FragColor = packDepth(fDepth);
    gl_FragColor = vec4(1.0,0.0,0.0,1.0);
}`;

/**
 * 3dtiles模型分析（裁剪、压平、淹没） 基础类
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {TilesetLayer} options.layer 需要模型分析的对象（3dtiles图层）
 * @param {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只分析的单个区域【单个区域场景时使用】
 *
 * @export
 * @class TilesetEditBase
 * @extends {BaseThing}
 */
class TilesetEditBase{
  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    this.options = options;
    this._map = viewer;
    this._areaList = []; //区域数组
    this._cache_id = 0;
    if(this.options.hasOwnProperty('tileset')){
      this.tileset = this.options.tileset;
    }
  }
  //========== 对外属性 ==========

  /**
   * 区域 列表
   * @type {Object[]}
   * @readonly
   */
  get list() {
    return this._areaList;
  }

  // /**
  //  * 需要分析的模型（3dtiles图层）
  //  * @type {TilesetLayer}
  //  */
  // get layer() {
  //   return this._layer;
  // }
  // set layer(tilesetLayer) {
  //   this._layer = tilesetLayer;
  //
  //   if (tilesetLayer.loadOk) {
  //     this.tileset = tilesetLayer.tileset;
  //   } else {
  //     tilesetLayer.on(EventType.load, (e) => {
  //       this.tileset = tilesetLayer.tileset;
  //     });
  //   }
  // }

  /**
   * 需要分析的模型 对应的 Cesium3DTileset 对象
   * @type {Cesium.Cesium3DTileset}
   */
  get tileset() {
    return this._tileset;
  }
  set tileset(val) {
    this._tileset = val;
    this._inverseTransform = null;

    // if (this.options.positions) {
    //   if(this._tileset.ready){
    //     this.addPolygon(this.options.positions);
    //   }
    //
    //   this._tileset.readyPromise.then(function(){
    //     this.addPolygon(this.options.positions);
    //   }.bind(this));
    // }
  }

  /**
   * 获取当前转换计算模型矩阵。如果方向或位置未定义，则返回undefined。
   * @type {Cesium.Matrix4}
   * @readonly
   */
  get matrix() {
    if (!this._tileset) {
      return null;
    }

    //是否z轴向上，默认为y向上
    this.upZ = this._tileset.asset.gltfUpAxis == "Z" || this._tileset.asset.gltfUpAxis == "z";

    if (!this._inverseTransform) {
      let transform;
      let tmp = this._tileset.root.transform;
      if (!tmp || tmp.equals(Cesium.Matrix4.IDENTITY)) {
        // 不存在 root.transform
        transform = Cesium.Transforms.eastNorthUpToFixedFrame(this._tileset.boundingSphere.center);
      } else {
        transform = Cesium.Matrix4.fromArray(this._tileset.root.transform);
      }
      this._inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
    }
    return this._inverseTransform;
  }

  /**
   * 坐标位置数组，只显示单个区域【单个区域场景时使用】
   */
  get positions() {
    if (this.length > 0) {
      return this._areaList[0].positions;
    } else {
      return null;
    }
  }
  set positions(val) {
    this.clear();
    this.addPolygon(val);
  }

  /**
   * 已添加的区域个数
   * @type {Int}
   * @readonly
   */
  get length() {
    if (this._areaList) {
      return this._areaList.length;
    } else {
      return 0;
    }
  }




  /**
   * 清除分析
   * @return {void}  无
   */
  clear() {
    this._areaList = [];
    this._cache_id = 0;
    this._disable();
  }

  /**
   * 根据id获取区域对象
   *
   * @param {Number} id id值
   * @return {Object} 区域对象
   */
  getPolygonById(id) {
    for (let i = 0; i < this._areaList.length; i++) {
      let item = this._areaList[i];
      if (item.id == id) {
        return item;
      }
    }
    return null;
  }

  /**
   * 隐藏单个区域
   * @param {Number} id 区域id值
   * @return {void}  无
   */
  hidePolygon(id) {
    let item = this.getPolygonById(id);
    if (item) {
      item.show = false;
      this.drawed = false;
    }
  }

  /**
   * 显示单个区域
   * @param {Number} id 区域id值
   * @return {void}  无
   */
  showPolygon(id) {
    let item = this.getPolygonById(id);
    if (item) {
      item.show = true;
      this.drawed = false;
    }
  }

  /**
   * 移除单个区域
   * @param {Number|Object} item 区域的id，或 addArea返回的区域对象
   * @return {void}  无
   */
  removePolygon(item) {
    if (item) {
      this.removeArrayItem(this._areaList, item);

      this._disable();
      this._activete();
    }
  }

  /**
   * 添加区域
   *
   * @param {String[]|Array[]|LatLngPoint[]|Cesium.Cartesian3[]} positions 坐标位置数组
   * @return {Object} 添加区域的记录对象
   */
  addPolygon(positions) {
    if (!positions || positions.length === 0) {
      return;
    }

    let areaObj = {
      show: true,
      id: ++this._cache_id,
      positions: positions,
    };
    this._areaList.push(areaObj);

    this._disable();
    this._activete();

    return areaObj;
  }

  _activete() {
    if (!this._tileset) {
      return;
    }

    this._preparePos();
    this._createTexture();

    if (!this._map.scene.primitives.contains(this)) {
      this._map.scene.primitives.add(this);
    }
  }
  _disable() {
    if (this.tileset.modelEditor) {
      if (this.fbo && this.fbo.destroy) {
        this.fbo.destroy();
        this.fbo = null;
      }
      this.tileset.modelEditor.IsYaPing = [false, false, false, false]; //[是否开启编辑，是否开启压平，是否开启裁剪，是否开启淹没]
      this.tileset.modelEditor.editVar = [false, false, false, false]; //[是否开启裁剪外部，是否开启淹没全局，]

      this.tileset.modelEditor.floodColor = [0.0, 0.0, 0.0, 0.5]; //[淹没颜色的r(0-1之间)，淹没颜色的g，淹没颜色的b，淹没混合系数（建议取值范围0.3-0.7）]
      this.tileset.modelEditor.floodVar = [0, 0, 0, 0]; //[基础淹没高度，当前淹没高度，最大淹没高度,默认高度差(最大淹没高度 - 基础淹没高度)]
      this.tileset.modelEditor.heightVar = [0, 0]; //基础压平高度，调整压平高度值
      this.tileset.modelEditor.enable = false;
    }
    this.drawed = false;
  }

  //更新
  update(frameState) {
    if (this.drawed || !this._areaList || this._areaList.length == 0) {
      return;
    }
    this._createCommand();
    this._activeModelEditor();

    this.drawed = true;
    let context = frameState.context;
    let width = 4096;
    let height = 4096;
    if (!this._passState) {
      this._passState = new Cesium.PassState(context);
    }
    this._passState.framebuffer = this.fbo;
    this._passState.viewport = new Cesium.BoundingRectangle(0, 0, width, height);
    let us = context.uniformState;
    us.updateCamera(this._camera);
    this._fboClearCommand.execute(frameState.context);

    this._areaList.forEach((areaObj) => {
      const command = areaObj.drawCommand;
      if (command && areaObj.show) {
        us.updatePass(command.pass);
        command.framebuffer = this.fbo;
        command.execute(context, this._passState);
      }
    });
  }

  _activeModelEditor() {}

  deActiveEdit() {
    //激活
    this.tileset.modelEditor.IsYaPing[0] = false;
  }

  //预处理顶点
  _preparePos() {
    let _minLocalZ;
    let _minHeight = 99999;

    //2021-7-17
    let inverMAT = this.matrix;

    this._areaList.forEach((areaObj) => {
      if (!areaObj.show) {
        return;
      }

      let localPos = [];
      const positions = areaObj.positions;
      if (positions && positions.length > 2) {
        for (let i = 0; i < positions.length; i++) {
          let cart = Cesium.Cartographic.fromCartesian(positions[i]);
          let height = cart.height;
          let currLocalPos = Cesium.Matrix4.multiplyByPoint(inverMAT, positions[i], new Cesium.Cartesian3());

          localPos.push(currLocalPos);
          if (height < _minHeight) {
            _minHeight = height;
            _minLocalZ = currLocalPos.z;
          }
        }
        areaObj.localPos = localPos;
      }
    });
    this._minLocalZ = _minLocalZ;
  }

  _createTexture() {
    //创建FBO以及清除指令
    let context = this._map.scene.context;
    let tt = new Cesium.Texture({
      context: context,
      width: 4096,
      height: 4096,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
        magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST,
      }),
    });

    let depthStencilTexture = new Cesium.Texture({
      context: context,
      width: 4096,
      height: 4096,
      pixelFormat: Cesium.PixelFormat.DEPTH_STENCIL,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_INT_24_8,
    });

    this.fbo = new Cesium.Framebuffer({
      context: context,
      colorTextures: [tt],
      depthStencilTexture: depthStencilTexture,
      destroyAttachments: false,
    });

    this._fboClearCommand = new Cesium.ClearCommand({
      color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
      framebuffer: this.fbo,
    });
  }

  _createCommand() {
    //创建指令
    let context = this._map.scene.context;

    let minX = 99999999;
    let minY = 99999999;
    let maxX = -99999999;
    let maxY = -99999999;

    this._areaList.forEach((areaObj) => {

      const localPos = areaObj.localPos;
      if (localPos) {
        //创建geometry
        let flattenPolygon = new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(localPos),
          perPositionHeight: true,
        });
        let ppp = Cesium.PolygonGeometry.createGeometry(flattenPolygon);
        let sp = Cesium.ShaderProgram.fromCache({
          context: context,
          vertexShaderSource: TilesetEditVS,
          fragmentShaderSource: TilesetEditFS,
          attributeLocations: {
            position: 0,
          },
        });
        let vao = Cesium.VertexArray.fromGeometry({
          context: context,
          geometry: ppp,
          attributeLocations: sp._attributeLocations,
          bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
          interleave: true,
        });

        let rs = new Cesium.RenderState();
        rs.depthTest.enabled = false;
        rs.depthRange.near = -1000000.0;
        rs.depthRange.far = 1000000.0;

        let bg = Cesium.BoundingRectangle.fromPoints(areaObj.localPos, new Cesium.BoundingRectangle());
        if (minX > bg.x) {
          minX = bg.x;
        }
        if (minY > bg.y) {
          minY = bg.y;
        }
        if (maxX < bg.x + bg.width) {
          maxX = bg.x + bg.width;
        }
        if (maxY < bg.y + bg.height) {
          maxY = bg.y + bg.height;
        }

        let myPorjection = Cesium.Matrix4.computeOrthographicOffCenter(
          bg.x, 
          bg.x + bg.width,
          bg.y,
          bg.y + bg.height,
          1,
          500000000,
          new Cesium.Matrix4()
        );

        areaObj.polygonBounds = new Cesium.Cartesian4(bg.x, bg.y, bg.x + bg.width, bg.y + bg.height);
        
        areaObj.drawCommand = new Cesium.DrawCommand({
          boundingVolume: ppp.boundingVolume,
          primitiveType: Cesium.PrimitiveType.TRIANGLES,
          vertexArray: vao,
          shaderProgram: sp,
          renderState: rs,
          pass: Cesium.Pass.CESIUM_3D_TILE,
          uniformMap: {
            myPorjection: function () {
              return myPorjection;
            },
          },
        });
      }
    });
    //创建相机
    let _camera = {
      viewMatrix: Cesium.Matrix4.IDENTITY,
      inverseViewMatrix: Cesium.Matrix4.IDENTITY,
      frustum: new Cesium.OrthographicOffCenterFrustum(),
      positionCartographic: new Cesium.Cartographic(),
      positionWC: new Cesium.Cartesian3(),
      directionWC: Cesium.Cartesian3.UNIT_Z,
      upWC: Cesium.Cartesian3.UNIT_Y,
      rightWC: Cesium.Cartesian3.UNIT_X,
      viewProjectionMatrix: Cesium.Matrix4.IDENTITY,
    };
    _camera.frustum.left = minX;
    _camera.frustum.top = maxY;
    _camera.frustum.right = maxX;
    _camera.frustum.bottom = minY;
    this.polygonBounds = new Cesium.Cartesian4(minX, minY, maxX, maxY);
    this._camera = _camera;
  }

  removeArrayItem(arr, val) {
    let index = arr.indexOf(val);
    if (index > -1) {
      arr.splice(index, 1);
      return true;
    }
    return false;
  }
}

module.exports = TilesetEditBase;
