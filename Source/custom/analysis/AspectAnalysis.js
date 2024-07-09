import TerrainEditBase from '../terrain/TerrainEditBase';
import Poly from '../utils/Poly';
import PointUtil from '../utils/PointUtil';
import Measure from '../utils/Measure';
import BeziterLine from "../utils/BeziterLine";

const computeSurfacePoints = Poly.computeSurfacePoints;
const getEllipseOuterPositions = Poly.getEllipseOuterPositions;
const interPolygon = Poly.interPolygon;

const getOnLinePointByLen = PointUtil.getOnLinePointByLen;
const getAngle = Measure.getAngle;

/**
 * 坡向分析
 *
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 *
 * @param {Cesium.Cartesian3[]} [options.positions] 分析区域 坐标位置数组
 *
 * @param {Object} [options.arrow] 箭头线的样式，包括以下：
 * @param {Boolean} [options.arrow.show=true] 是否显示箭头线
 * @param {Number} [options.arrow.scale=0.3] 箭头长度的比例（网格大小），根据绘制区域的大小和插值数来计算实际长度值。
 * @param {Cesium.Color} [options.arrow.color=Cesium.Color.YELLOW] 颜色
 * @param {Number} [options.arrow.length=40] 分析单个点时，箭头长度值
 *
 * @param {Object} [options.point] 点的样式，包括以下：
 * @param {Boolean} [options.point.show=true] 是否显示点
 * @param {Number} [options.point.pixelSize=9]  像素大小
 * @param {Cesium.Color} [options.point.color=Cesium.Color.RED.withAlpha(0.5)] 颜色
 * @param {Object} [options.colorScheme ] 地表渲染配色方案,默认值为：
 * {
      step: [0.0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0],
      color: ['#000000', '#2747E0', '#D33B7D', '#D33038', '#FF9742', '#FF9742', '#ffd700'],
   }
 * @param {Function} [options.tooltip] 可以指定绑定tooltip
 * @param {Function} [options.popup] 可以指定绑定popup
 * @export
 * @class Slope
 * @extends {BaseThing}
 * @see [支持的事件类型]{@link Slope.EventType}
 */
class AspectAnalysis extends TerrainEditBase {
  //========== 构造方法 ==========
  constructor(viewer,options = {}) {
    super(viewer,options);
    //配色方案
    this.colorScheme = options.colorScheme || {
      step: [0.0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0],
      color: ['#000000', '#2747E0', '#D33B7D', '#D33038', '#FF9742', '#FF9742', '#ffd700'],
    };

    //箭头
    this.options.arrow = this.options.arrow || {};
    this.options.arrow.show = Cesium.defaultValue(this.options.arrow.show, true);
    this.options.arrow.scale = Cesium.defaultValue(this.options.arrow.scale, 0.3); //箭头长度的比例
    this.options.arrow.width = Cesium.defaultValue(this.options.arrow.width, 15); //箭头宽度
    this.options.arrow.color = Cesium.defaultValue(this.options.arrow.color, Cesium.Color.YELLOW);
    this.arrowLength = Cesium.defaultValue(this.options.arrow.length, 40);

    //point点
    this.options.point = this.options.point || {};
    this.options.point.show = Cesium.defaultValue(this.options.point.show, true);
    this.options.point.pixelSize = Cesium.defaultValue(this.options.point.pixelSize, 9);
    this.options.point.color = Cesium.defaultValue(this.options.point.color, Cesium.Color.RED.withAlpha(0.5));

    this.arrowPrimitives = [];

    if(this.options.arrow.show){
      this.pointInterPrimitives = new Cesium.PointPrimitiveCollection();
      this._map.scene.primitives.add(this.pointInterPrimitives);
    }
  }

  //========== 对外属性 ==========

  /**
   * 清除数据
   * @return {void}  无
   */
  clear() {
    super.clear();
    this._map.scene.globe.material = null;

    if (this.hasResetEnableLighting) {
      this._map.scene.globe.enableLighting = false;
      this._map.clock.currentTime = Cesium.JulianDate.now();
      delete this.hasResetEnableLighting;
    }

    if (this.pointInterPrimitives) {
      this.pointInterPrimitives.removeAll();
    }

    for (let i = 0, len = this.arrowPrimitives.length; i < len; i++) {
      this._map.scene.primitives.remove(this.arrowPrimitives[i]);
    }
    this.arrowPrimitives = [];
    this.instances = [];
    this.arrData = [];
    this.stateAll = 0;
    this.stateOkIndex = 0;
  }

  //=========地球渲染材质相关==========
  updateMaterial() {
    let material;
    let shadingUniforms;
    material = Cesium.Material.fromType("AspectRamp");
    shadingUniforms = material.uniforms;
    shadingUniforms.image = this.getColorRamp();

    if (!this._map.scene.globe.enableLighting) {
      this._map.scene.globe.enableLighting = true;
      let now = new Date();
      now.setHours(10);
      this._map.clock.currentTime = Cesium.JulianDate.fromDate(new Date(now));
      this.hasResetEnableLighting = true;
    }

    this._map.scene.globe.material = material;
  }

  addPolygon(positions, options) {
    let areaObj = super.addPolygon(positions,options);
    this.updateMaterial();
    if(this.options.arrow.show){
      this.add(positions,options);
    }
    return areaObj;
  }

  removePolygon(item) {
    super.removePolygon(item);
    if (this.pointInterPrimitives) {
      this.pointInterPrimitives.removeAll();
    }

    for (let i = 0, len = this.arrowPrimitives.length; i < len; i++) {
      this._map.scene.primitives.remove(this.arrowPrimitives[i]);
    }
    this.arrowPrimitives = [];
    this.instances = [];
    this.arrData = [];
    this.stateAll = 0;
    this.stateOkIndex = 0;
  }

  /**
   * 添加计算的 位置
   *
   * @param {Cesium.Cartesian3} positions 坐标数组 或 单个坐标
   * @param {Object} [options={}] 控制参数，包括：
   * @param {Number} [options.splitNum=8] 插值数，横纵等比分割的网格个数
   * @param {Number} [options.radius=2]  取样分析，点周边半径（单位：米）
   * @param {Number} [options.count=4] 取样分析，点周边象限内点的数量，共计算 count*4 个点
   * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
   * @return {void}  无，计算结果在 end事件中返回
   */
  add(positions, options = {}) {
    if (!positions || positions.length < 1) {
      return;
    }

    this.eventResult = { positions: positions };

    let splitNum = Cesium.defaultValue(options.splitNum, 8);
    if (positions.length > 2 && splitNum > 1) {
      //传入面边界时
      let resultInter = interPolygon({
        scene: this._map.scene,
        positions: positions,
        has3dtiles: false,
        onlyPoint: true, //true时只返回点，不返回三角网
        splitNum: splitNum, //splitNum插值分割的个数
      });
      this.arrowLength = Cesium.Math.chordLength(resultInter.granularity, this._map.scene.globe.ellipsoid.maximumRadius) * this.options.arrow.scale;

      this.eventResult.maxHeight = resultInter.maxHeight;
      this.eventResult.minHeight = resultInter.minHeight;

      positions = [];
      for (let k = 0; k < resultInter.list.length; k++) {
        positions.push(resultInter.list[k].pointDM);
      }
    }

    this.stateAll = positions.length;
    this.stateOkIndex = 0;
    this.instances = [];
    this.arrData = [];

    for (let i = 0; i < this.stateAll; i++) {
      this._fxOnePoint(positions[i], options);
    }
  }



//分析单个点的对应坡度
  _fxOnePoint(position, options) {
    if (!position) {
      return;
    }

    //返回该点的周边2米圆上的8个点
    let arcPoint = getEllipseOuterPositions({
      position: position,
      radius: Cesium.defaultValue(options.radius, 2), //半径
      count: Cesium.defaultValue(options.count, 4), //共返回 count*4 个点
    });
    arcPoint.push(position);

    let ellipsoid = this._map.scene.globe.ellipsoid;

    // 求出点的详细高度
    let that = this;
    computeSurfacePoints({
      scene: this._map.scene,
      positions: arcPoint,
      has3dtiles: options.has3dtiles,
      callback: (raisedPositions, noHeight) => {
        if (this.stateAll == 0) {
          return;
        }

        if (noHeight) {
          console.log("未获取到高度值，贴地高度计算存在误差");
        }

        let cartographicArray = ellipsoid.cartesianArrayToCartographicArray(raisedPositions);

        // 中心点
        let center = cartographicArray.pop();

        // 其余圆上点
        let maxIndex = 0;
        let maxHeight = cartographicArray[0].height;
        let minIndex = 0;
        let minHeight = cartographicArray[0].height;
        for (let i = 1; i < cartographicArray.length - 1; i++) {
          let item = cartographicArray[i];
          if (item.height > maxHeight) {
            maxHeight = item.height;
            maxIndex = i;
          }
          if (item.height < minHeight) {
            minHeight = item.height;
            minIndex = i;
          }
        }

        let maxPoint = cartographicArray[maxIndex]; //周边最高点
        let minPoint = cartographicArray[minIndex]; //周边最低点

        let slopeVal1 = that.getSlope(center, maxPoint);
        let slopeVal2 = that.getSlope(center, minPoint);

        if (slopeVal1 > slopeVal2) {
          that._fxOnePointOk(position, center, maxPoint, slopeVal1);
        } else {
          that._fxOnePointOk(position, center, minPoint, slopeVal2);
        }
      },
    });
  }

  //分析单个点的对应坡度完成后添加显示的箭头等
  _fxOnePointOk(position, center, maxPoint, slopeVal) {
    let centerCar = Cesium.Cartographic.toCartesian(center);
    let maxPointCar = Cesium.Cartographic.toCartesian(maxPoint);
    maxPointCar = getOnLinePointByLen(centerCar, maxPointCar, this.arrowLength);

    // 计算圆上的最高点和中心点的高度 判断箭头方向
    let arrArrowPt;
    if (center.height > maxPoint.height) {
      //中心点高于四周情况下
      arrArrowPt = [centerCar, maxPointCar];
    } else {
      //边缘指向中心
      arrArrowPt = [maxPointCar, centerCar];
    }

    //求方位角
    let slopeAngle = getAngle(arrArrowPt[0], arrArrowPt[1], true);

    let slopeValDou = (Math.atan(slopeVal) * 180) / Math.PI;
    slopeValDou = Number(slopeValDou.toFixed(2));

    // 度数法 【 α(坡度)=arc tan (高程差/水平距离)】 eg: 45°
    let text1 = slopeValDou + "°";
    // 百分比法 【 坡度 = (高程差/水平距离)x100%】 eg:30%
    let text2 = (slopeVal * 100).toFixed(2) + "%";

    let itemData = {
      position: position, //坐标位置
      slope: slopeValDou, //度数法值【 α(坡度)=arc tan (高程差/水平距离)】
      slopeStr1: text1, //度数法值字符串
      slopeStr2: text2, //百分比法值字符串【 坡度 = (高程差/水平距离)x100%】
      direction: slopeAngle, //坡向值（0-360度）
    };
    if (!this.arrData) {
      this.arrData = [];
    }
    this.arrData.push(itemData);

    // 构建箭头
    if (this.options.arrow.show) {
      let gs = new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: arrArrowPt,
          ...this.options.arrow,
        }),
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
        id: "polylinedashinstance",
      });
      this.instances.push(gs);
    }

    // 添加点 显示坡度
    if (this.options.point.show) {
      let primitive = this.pointInterPrimitives.add({
        position: centerCar,
        ...this.options.point,
      });

      primitive.attr = itemData;
      primitive.eventTarget = this;
      primitive.tooltip = Cesium.defaultValue(this.options.tooltip, `坡度: ${text1}  (${text2})<br />坡向: ${slopeAngle}°`); // 显示结果
      primitive.popup = this.options.popup;
    }

    // 全部计算完成
    this.stateOkIndex++;
    if (this.stateOkIndex >= this.stateAll) {
      if (this.options.arrow.show && this.instances.length > 0) {
        let arrowPrimitive = this._map.scene.primitives.add(
            new Cesium.Primitive({
              geometryInstances: this.instances,
              appearance: new Cesium.PolylineMaterialAppearance({
                material: Cesium.Material.fromType("PolylineArrow", {
                  color: this.options.arrow.color,
                }),
              }),
            })
        );
        this.arrowPrimitives.push(arrowPrimitive);
        this.instances = [];
      }
    }
  }


  /**
   * 计算两点之间的坡度
   *
   * @param { Cesium.Cartesian3} c1 点1
   * @param { Cesium.Cartesian3} c2 点2
   * @return {Number} 坡度值
   */
  getSlope(c1, c2) {
    if (!c1 || !c2) {
      return;
    }
    let differH = Math.abs(c1.height - c2.height); //高度差
    let differV = Cesium.Cartesian3.distance(
        Cesium.Cartographic.toCartesian(c1),
        Cesium.Cartesian3.fromRadians(c2.longitude, c2.latitude, c1.height)
    ); // 水平距离
    let value = differH / differV;
    return value;
  }

  getColorRamp() {
    let ramp = document.createElement("canvas");
    ramp.width = 100;
    ramp.height = 1;

    let ctx = ramp.getContext("2d");
    let grd = ctx.createLinearGradient(0, 0, 100, 0);

    let colorScheme = this.colorScheme;
    if (colorScheme.step.length > 0) {
      for (let i = 0, len = colorScheme.step.length; i < len; i++) {
        grd.addColorStop(colorScheme.step[i], colorScheme.color[i]);
      }
    }

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 100, 1);

    return ramp;
  }
}

export default AspectAnalysis;
