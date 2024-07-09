import Poly from '../utils/Poly';
import LatLngPoint from '../utils/LatLngPoint';
const computeStepSurfaceLine = Poly.computeStepSurfaceLine;
/**
 * 剖面分析，测量线插值点的高程数据
 * @param {Object} viewer 控制参数
 * @param {Number} [options.splitNum=10]  插值数，将线段分割的个数
 * @param  [options.minDistance=null] 插值最小间隔(单位：米)，优先级高于splitNum
 * @param {Boolean} [options.has3dtiles=auto]  是否在3dtiles模型上分析（模型分析较慢，按需开启）,默认内部根据点的位置自动判断（但可能不准）
 *
 * @return {MeasureDistanceSection} 剖面分析控制类 对象
 */
class SectionAnalysis {
    //========== 构造方法 ==========
    constructor(viewer,options = {}) {
        this._map = viewer;
        this.options = options;
        this.options.splitNum = Cesium.defaultValue(this.options.splitNum,10);
    }

    /**
     * 计算剖面
     * @param {Cesium.Cartesian3[]} positions 坐标数组
     * @param callback 分析完成的回调函数
     */
    sectionForTerrain(positions,callback) {
        if (positions.length < 2) {
            return;
        }

        let all_distance = 0;
        let arrLen = [];
        let arrHB = [];
        // let arrLX = [];
        let arrPoint = [];

        computeStepSurfaceLine({
            map: this._map,
            positions: positions,
            splitNum: this.options.splitNum,
            has3dtiles: this.options.has3dtiles,
            minDistance:this.options.minDistance,
            //计算每个分段后的回调方法
            endItem: (raisedPositions, noHeight, index) => {
                if (!positions || !positions[index] || !positions[index + 1]) {
                    //异步结束时，对象已经被释放
                    return;
                }
                let h1 = Cesium.Cartographic.fromCartesian(positions[index])?.height;
                let h2 = Cesium.Cartographic.fromCartesian(positions[index + 1])?.height;
                let hstep = (h2 - h1) / raisedPositions.length;

                let this_distance = 0;
                for (let i = 0; i < raisedPositions.length; i++) {
                    //长度
                    if (i != 0) {
                        let templen = Cesium.Cartesian3.distance(raisedPositions[i], raisedPositions[i - 1]);
                        all_distance += templen;
                        this_distance += templen;
                    }
                    arrLen.push(Number(all_distance.toFixed(1)));

                    //海拔高度
                    let point = LatLngPoint.fromCartesian(raisedPositions[i]);
                    arrHB.push(point.alt);
                    arrPoint.push(point);

                    //路线高度
                    // let fxgd = Number((h1 + hstep * i).toFixed(1));
                    // arrLX.push(fxgd);
                }

                index++;
            },
            //计算全部完成的回调方法
            end: () => {
                let result = {
                    distance: all_distance,
                    arrLen: arrLen, //线路长度
                    arrHB: arrHB, //每个点的海波高度
                    arrPoint: arrPoint, //每个点的坐标和高程值
                };
                callback(result);
            }
        });
    }
}

export default SectionAnalysis;
