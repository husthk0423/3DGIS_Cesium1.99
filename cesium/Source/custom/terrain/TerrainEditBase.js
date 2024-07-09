const TerrainEditVS = `attribute vec3 position;
void main()
{
    vec4 pos = vec4(position.xyz,1.0);
    gl_Position = czm_projection*pos;
}`;
const TerrainEditFS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
void main()
{
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

/**
 * 地形开挖、淹没等分析 基础类
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 * @param {Cesium.Cartesian3[]} [options.positions] 坐标位置数组，只显示单个区域【单个区域场景时使用】
 *
 * @export
 * @class TerrainEditBase
 * @extends {BaseThing}
 */
class TerrainEditBase {
  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    this.options = options;
    //裁剪区域相关
    this.floodVar = Cesium.defaultValue(options.floodVar, [0, 0, 0, 500]); //[基础淹没高度，当前淹没高度，最大淹没高度,默认高度差(最大淹没高度 - 基础淹没高度)]

    this._map = viewer;
    this._maxCanvasSize = Cesium.defaultValue(options.maxCanvasSize, 4096); // 数值越大，剪裁越精确，占用显存越高
    this._areaList = []; //区域数组
    this._cache_id = 0;
  }

  //========== 对外属性 ==========

  //分析参数
  get terrainEditCtl() {
    return this._map.scene.globe._surface.tileProvider._floodAnalysis || {};
  }

  /**
   * 区域 列表
   * @type {Object[]}
   * @readonly
   */
  get list() {
    return this._areaList;
  }

  /**
   * 是否显示区域外的地图
   * @type {Boolean}
   */
  get showElseArea() {
    return this.terrainEditCtl.showElseArea;
  }
  set showElseArea(val) {
    this.terrainEditCtl.showElseArea = val;
  }

  /**
   * 坐标位置数组，只显示单个区域【单个区域场景时使用】
   * @type {Array[]|String[]|LatLngPoint[]|Cesium.Cartesian3[]}
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
   * 清除所有区域
   * @return {void}  无
   */
  clear() {
    this._map.scene.globe.material = null;
    this._map.scene.globe._surface.tileProvider.resetFloodAnalysis();
    this._map.scene.globe._surface.tileProvider.resetExcavateAnalysis();

    this._areaList = [];

    if (this.tailorTex) {
      this.tailorTex.destroy();
    }
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
    let areaObj = this.getPolygonById(id);
    if (areaObj) {
      areaObj.show = false;
      if (areaObj.pitPrimitive) {
        areaObj.pitPrimitive.show = false;
      }
      this.drawPolygon();
    }
  }

  /**
   * 显示单个区域
   * @param {Number} id 区域id值
   * @return {void}  无
   */
  showPolygon(id) {
    let areaObj = this.getPolygonById(id);
    if (areaObj) {
      areaObj.show = true;
      if (areaObj.pitPrimitive) {
        areaObj.pitPrimitive.show = true;
      }
      this.drawPolygon();
    }
  }


  /**
   * 移除单个区域
   * @param {Number|Object} item 区域的id值，或 addPolygon返回的区域对象
   * @return {void}  无
   */
  removePolygon(item) {
    if (!item) {
      return;
    }
    this.removeArrayItem(this._areaList, item);
    this.drawPolygon();
  }

  /**
   * 添加单个区域
   *
   * @param {String[]|Array[]|LatLngPoint[]|Cesium.Cartesian3[]} positions 坐标位置数组
   * @param {Object} [options={}] 控制的参数
   * @param {Object} [options.diffHeight] 开挖深度（地形开挖时，可以控制单个区域的开挖深度）
   * @return {Object} 添加区域的记录对象
   */
  addPolygon(positions, options) {
    if (!positions || positions.length == 0) {
      return;
    }

    let areaObj = {
      show: true,
      id: ++this._cache_id,
      positions_original: this.clonePositions(positions), //原始的，用于井
      positions: positions,
    };
    this._areaList.push(areaObj);

    this.computedCenter();
    this._prepareFlood();

    this.prepareCamera();
    this.prepareFBO();
    this.drawPolygon();
    this.beginTailor();

    return areaObj;
  }

  clonePositions(positions){
    let newPositions = [];
    for(let i = 0;i<positions.length;i++){
      let c3 = positions[i];
      newPositions.push(c3.clone());
    }
    return newPositions;
  }

  computedCenter() {
    let total = new Cesium.Cartesian3();

    this._areaList.forEach((areaObj) => {
      let arr = areaObj.positions;
      if (!arr) {
        return;
      }
      let boundingSphere = Cesium.BoundingSphere.fromPoints(arr);
      Cesium.Cartesian3.add(total, boundingSphere.center, total);
    });

    this.totalCenter = Cesium.Cartesian3.multiplyByScalar(total, 1 / this._areaList.length, new Cesium.Cartesian3());
  }

  //与处理顶点数组
  _prepareFlood() {
    const context = this._map.scene.context;
    this.trans = Cesium.Transforms.eastNorthUpToFixedFrame(this.totalCenter);
    this.inverTrans = Cesium.Matrix4.inverse(this.trans, new Cesium.Matrix4());

    let minX = 99999999;
    let minY = 99999999;
    let maxX = -99999999;
    let maxY = -99999999;

    this._areaList.forEach((areaObj) => {
      let arr = areaObj.positions;

      let polygon = new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(arr),
      });
      polygon = Cesium.PolygonGeometry.createGeometry(polygon);
      let indexs = polygon.indices;
      let positionVal = polygon.attributes.position.values;
      let lenV = positionVal.length;

      let localPos = [];
      let localVertex = [];
      for (let i = 0; i < lenV; i += 3) {
        let currx = positionVal[i];
        let curry = positionVal[i + 1];
        let currz = positionVal[i + 2];
        let currCar = new Cesium.Cartesian3(currx, curry, currz);

        let localp = Cesium.Matrix4.multiplyByPoint(this.inverTrans, currCar, new Cesium.Cartesian3());
        localp.z = 0;
        localPos.push(localp);
        localVertex.push(localp.x);
        localVertex.push(localp.y);
        localVertex.push(localp.z);
        if (minX >= localp.x) {
          minX = localp.x;
        }
        if (minY >= localp.y) {
          minY = localp.y;
        }
        if (maxX <= localp.x) {
          maxX = localp.x;
        }
        if (maxY <= localp.y) {
          maxY = localp.y;
        }
      }

      areaObj.localPos = localPos;

      let lps = new Float64Array(localVertex);
      let bs = Cesium.BoundingSphere.fromVertices(lps);
      let localGeo = new Cesium.Geometry({
        attributes: {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: lps,
          }),
        },
        indices: indexs,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: bs,
      });

      let sp = Cesium.ShaderProgram.fromCache({
        context,
        vertexShaderSource: TerrainEditVS,
        fragmentShaderSource: TerrainEditFS,
        attributeLocations: {
          position: 0,
        },
      });
      let vao = Cesium.VertexArray.fromGeometry({
        context,
        geometry: localGeo,
        attributeLocations: sp._attributeLocations,
        bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
        interleave: true,
      });

      let rs = new Cesium.RenderState();
      rs.depthRange.near = -1000000.0;
      rs.depthRange.far = 1000000.0;

      areaObj.drawAreaCommand = new Cesium.DrawCommand({
        boundingVolume: bs,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        vertexArray: vao,
        shaderProgram: sp,
        renderState: rs,
        pass: Cesium.Pass.TRANSLUCENT,
      });
    });

    this.ratio = (maxY - minY) / (maxX - minX);
    this.totalRect = [minX, minY, maxX, maxY];
  }

  prepareCamera() {
    let maxDis = 120000;
    this.ortCamera = {
      viewMatrix: Cesium.Matrix4.IDENTITY,
      inverseViewMatrix: Cesium.Matrix4.IDENTITY,
      frustum: new Cesium.OrthographicOffCenterFrustum(),
      positionCartographic: {
        height: 0,
        latitude: 0,
        longitude: 0,
      },
      positionWC: new Cesium.Cartesian3(0, 0, maxDis / 2),
      directionWC: new Cesium.Cartesian3(0, 0, -1),
      upWC: new Cesium.Cartesian3(0, 1, 0),
      rightWC: new Cesium.Cartesian3(1, 0, 0),
      viewProjectionMatrix: Cesium.Matrix4.IDENTITY,
    };

    this.ortCamera.frustum.left = this.totalRect[0];
    this.ortCamera.frustum.top = this.totalRect[3];
    this.ortCamera.frustum.right = this.totalRect[2];
    this.ortCamera.frustum.bottom = this.totalRect[1];
    this.ortCamera.frustum.near = 0.1;
    this.ortCamera.frustum.far = -maxDis;
    this.floodRect = new Cesium.Cartesian4(
      this.totalRect[0],
      this.totalRect[1],
      this.totalRect[2] - this.totalRect[0],
      this.totalRect[3] - this.totalRect[1]
    );
  }

  prepareFBO() {
    let width;
    let height;
    if (this.ratio > 1) {
      width = this._maxCanvasSize / this.ratio;
      height = this._maxCanvasSize;
    } else {
      width = this._maxCanvasSize;
      height = width * this.ratio;
    }

    let context = this._map.scene.context;
    let tailorTex = new Cesium.Texture({
      context,
      width: width,
      height: height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.HALF_FLOAT,
      flipY: false,
    });
    this.tailorTex = tailorTex;
    this.yanmoFbo = new Cesium.Framebuffer({
      context,
      colorTextures: [tailorTex],
      destroyAttachments: false,
    });
    this._fboClearCommand = new Cesium.ClearCommand({
      color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
      framebuffer: this.yanmoFbo,
    });
  }

  drawPolygon() {
    let context = this._map.scene.context;

    let width;
    let height;
    if (this.ratio > 1) {
      width = this._maxCanvasSize / this.ratio;
      height = this._maxCanvasSize;
    } else {
      width = this._maxCanvasSize;
      height = width * this.ratio;
    }

    let passState = new Cesium.PassState(context);
    passState.viewport = new Cesium.BoundingRectangle(0, 0, width, height);
    let us = context.uniformState;
    us.updateCamera(this.ortCamera);
    this._fboClearCommand.execute(context);

    this._areaList.forEach((areaObj) => {
      const command = areaObj.drawAreaCommand;
      if (command && areaObj.show) {
        us.updatePass(command.pass);
        command.framebuffer = this.yanmoFbo;
        command.execute(context, passState);
      }
    });
  }

  beginTailor() {
    this.terrainEditCtl.inverFloodCenterMat = this.inverTrans;
    this.terrainEditCtl.floodArea = this.yanmoFbo;
    this.terrainEditCtl.enableFlood = true;
    this.terrainEditCtl.floodRect = this.floodRect;
    this.terrainEditCtl.globe = false;
  }

  //设置高度
  _setFloodVar() {
    this.floodVar = [this.minHeight, this.minHeight, this.maxHeight, this.maxHeight - this.minHeight];
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

export default TerrainEditBase;
