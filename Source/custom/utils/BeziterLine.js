import GridFilter from "./gistools/GridFilter";

/**
 * Created by kongjian on 2018/6/12.
 * 注记瓦片队列缓存工具类
 */
class BeziterLine{
    /**
     * 生成四阶贝塞尔曲线定点数据
     * @param p0 {Object}   起始点  { x : number, y : number, z : number }
     * @param p1 {Object}   控制点1 { x : number, y : number, z : number }
     * @param p2 {Object}   控制点2 { x : number, y : number, z : number }
     * @param p3 {Object}   终止点  { x : number, y : number, z : number }
     * @param num {Number}  线条精度
     * @param tick {Number} 绘制系数
     * @returns {Array}
     */
    static getLine(p0, p1, p2, p3, num, tick){
        let pointMum = num || 100;
        let _tick = tick || 1.0;
        let t = _tick / (pointMum - 1);
        let points = [];
        for (let i = 0; i < pointMum; i++) {
            let point = this.getBezierNowPoint(p0, p1, p2, p3, i, t);
            points.push(point);
        }

        return points;
    }

    /**
     * 获取四阶贝塞尔曲线中指定位置的点坐标
     * @param p0
     * @param p1
     * @param p2
     * @param p3
     * @param num
     * @param tick
     * @returns {{x, y, z}}
     */
    static getBezierNowPoint(p0, p1, p2, p3, num, tick) {
        return {
            x : this.bezier(p0.x, p1.x, p2.x, p3.x, num * tick),
            y : this.bezier(p0.y, p1.y, p2.y, p3.y, num * tick),
            z : this.bezier(p0.z, p1.z, p2.z, p3.z, num * tick),
        }
    }

    /**
     * 四阶贝塞尔曲线公式
     * @param p0
     * @param p1
     * @param p2
     * @param p3
     * @param t
     * @returns {*}
     * @constructor
     */
    static bezier(p0, p1, p2, p3, t) {
        let P0, P1, P2, P3;
        P0 = p0 * (Math.pow((1 - t), 3));
        P1 = 3 * p1 * t * (Math.pow((1 - t), 2));
        P2 = 3 * p2 * Math.pow(t, 2) * (1 - t);
        P3 = p3 * Math.pow(t, 3);

        return P0 + P1 + P2 + P3;
    }


}
export default BeziterLine;
