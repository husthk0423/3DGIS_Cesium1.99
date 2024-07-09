import decomp from 'poly-decomp';
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
class TilesetEditBase {
  //========== 构造方法 ==========
  constructor(viewer, options = {}) {
    this.options = options;
    this._map = viewer;
    this._areaList = []; //区域数组
    this._cache_id = 0;

    if (this.options.hasOwnProperty('tileset')) {
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


  /**
   * 需要分析的模型 对应的 Cesium3DTileset 对象
   * @type {Cesium.Cesium3DTileset}
   */
  get tileset() {
    return this._tileset;
  }
  set tileset(val) {
    this._tileset = val;
    this._tileset.multiClippingPlanes = new Cesium.MultiClippingPlaneCollection({
      collections: [],
      edgeColor: Cesium.Color.RED,
      edgeWidth:  2.0,
    });
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
    this._tileset.multiClippingPlanes.destroy();
    this._tileset.multiClippingPlanes = new Cesium.MultiClippingPlaneCollection({
      collections: [],
      edgeWidth: 0,
    });
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
      for(let i = 0;i< item.clippingPlaneCollections.length;i++){
        item.clippingPlaneCollections[i].enabled = false;
      }
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
      for(let i = 0;i< item.clippingPlaneCollections.length;i++){
        item.clippingPlaneCollections[i].enabled = true;
      }
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

      for(let i = 0;i< item.clippingPlaneCollections.length;i++){
         this._tileset.multiClippingPlanes.remove(item.clippingPlaneCollections[i]);
      }
    }
  }


  toConvexPolygon(positions){
    //确保面的点为逆时针
    decomp.makeCCW(positions);
    return decomp.quickDecomp(positions);
  }

  /**
   * 将面转成ClippingPlaneCollection
   * @param positions
   * @returns {ClippingPlaneCollection}
   */
  toClippingPlaneCollection(positions){
    const Cartesian3 = Cesium.Cartesian3;
    const pointsLength = positions.length;
    //所有的裁切面
    const clippingPlanes = [];
    //转换矩阵
    let inverseTransform = Cesium.Matrix4.inverseTransformation(
        this._tileset.root.transform,
        new Cesium.Matrix4()
    );

    for (let i = 0; i < pointsLength; ++i) {
      const nextIndex = (i + 1) % pointsLength;
      let pt = positions[nextIndex];
      let nextCar3 = new Cesium.Cartesian3.fromDegrees(pt[0],pt[1],pt[2]);

      let nowPt = positions[i];
      let nowCar3 = new Cesium.Cartesian3.fromDegrees(nowPt[0],nowPt[1],pt[2]);
      const next = Cesium.Matrix4.multiplyByPoint(
          inverseTransform,
          nextCar3,
          new Cesium.Cartesian3()
      );
      const now = Cesium.Matrix4.multiplyByPoint(
          inverseTransform,
          nowCar3,
          new Cesium.Cartesian3()
      );

      let midpoint = Cesium.Cartesian3.add(now, next, new Cesium.Cartesian3());
      midpoint = Cesium.Cartesian3.multiplyByScalar(midpoint, 15, midpoint);
      // 定义一个垂直向上的向量up
      let up = new Cesium.Cartesian3(0, 0,1);
      //得到指向下一个点的向量
      let right = Cartesian3.subtract(next, now, new Cartesian3());
      right = Cartesian3.normalize(right, right);

      let normal = Cartesian3.cross(right, up, new Cartesian3());
      Cartesian3.normalize(normal, normal);
      Cartesian3.negate(normal, normal);

      //由于已经获得了法向量和过平面的一点，因此可以直接构造Plane,并进一步构造ClippingPlane
      let planeTmp = Cesium.Plane.fromPointNormal(now, normal);
      const clipPlane = Cesium.ClippingPlane.fromPlane(planeTmp);
      clippingPlanes.push(clipPlane);
    }

    const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
      planes: clippingPlanes,
      edgeColor: Cesium.Color.RED,
      edgeWidth:  1.0,
      enabled: true,
      unionClippingRegions: false,
    });
    return clippingPlaneCollection;
  };


  /**
   * 将传入的Cartesian3对象转为经纬度和高度
   * @param positions
   */
  cartesian3ToLnglat(positions){
    for(let i = 0;i<positions.length;i++){
      let item = positions[i];
      if(item instanceof Cesium.Cartesian3){
        let cartographic= Cesium.Cartographic.fromCartesian(item);
        let lat=Cesium.Math.toDegrees(cartographic.latitude);
        let lng=Cesium.Math.toDegrees(cartographic.longitude);
        let alt=cartographic.height;
        positions[i] = [lng,lat,alt];
      }
    }
  }

  /**
   * 添加区域
   *
   * @param {Array[]} positions 坐标位置数组
   * @return {Object} 添加区域的记录对象
   */
  addPolygon(positions) {
    if (!positions || positions.length === 0) {
      return;
    }

    this.cartesian3ToLnglat(positions);

    let polygons = this.toConvexPolygon(positions);

    let clippingPlaneCollections = [];
    for(let i = 0;i<polygons.length;i++){
        let polygon = polygons[i];
        polygon=polygon.reverse();
        let clippingPlaneCollection = this.toClippingPlaneCollection(polygon);
        clippingPlaneCollections.push(clippingPlaneCollection);
        this._tileset.multiClippingPlanes.add(clippingPlaneCollection);
    }

    let areaObj = {
      show: true,
      id: ++this._cache_id,
      positions:positions,
      clippingPlaneCollections: clippingPlaneCollections,
    };
    this._areaList.push(areaObj);
    return areaObj;
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

export default TilesetEditBase;
