/**
 * 通视分析
 * @param {Object} options 参数对象，包括以下：
 * @param {String|Number} [options.id = uuid()] 对象的id标识
 * @param {Boolean} [options.enabled = true] 对象的启用状态
 * @param {Cesium.Color} [options.visibleColor =  new Cesium.Color(0, 1, 0, 1)] 可视区域颜色
 * @param {Cesium.Color} [options.hiddenColor =  new Cesium.Color(1, 0, 0, 1)] 不可视区域颜色
 * @param {Cesium.Color} [options.depthFailColor] 当线位于地形或被遮挡时的区域颜色
 *
 * @export
 * @class Sightline
 * @extends {BaseThing}
 * @see [支持的事件类型]{@link Sightline.EventType}
 */
class SightLineAnalysis{
    //========== 构造方法 ==========
    constructor(viewer,options = {}) {
        this._map = viewer;
        this._visibleColor = Cesium.defaultValue(options.visibleColor, new Cesium.Color(0, 1, 0, 1)); //可视区域
        this._hiddenColor = Cesium.defaultValue(options.hiddenColor, new Cesium.Color(1, 0, 0, 1)); //不可视区域
        this._depthFailColor = options.depthFailColor;
        this.origin = options.origin;
        this.target = options.target;
        this.offsetHeight = Cesium.defaultValue(options.offsetHeight,1.5);
        this.lines = [];

        this.add();
    }
    //========== 对外属性 ==========
    /**
     *  可视区域颜色
     * @type {Cesium.Color}
     */
    get visibleColor() {
        return this._visibleColor;
    }
    set visibleColor(val) {
        this._visibleColor = val;
    }

    /**
     *  不可视区域颜色
     * @type {Cesium.Color}
     */
    get hiddenColor() {
        return this._hiddenColor;
    }
    set hiddenColor(val) {
        this._hiddenColor = val;
    }

    /**
     *  当线位于地形或被遮挡时的区域颜色
     * @type {Cesium.Color}
     */
    get depthFailColor() {
        return this._depthFailColor;
    }
    set depthFailColor(val) {
        this._depthFailColor = val;
    }

    //激活绑定事件
    _bindMourseEvent(){
        this.handler = new Cesium.ScreenSpaceEventHandler(this._map.canvas);
        this.handler.setInputAction(this._onClickHandler.bind(this),Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.handler.setInputAction(this._onMouseMoveHandler.bind(this),Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    //解绑事件
    _unbindMourseEvent() {
        if(this.handler){
            this.handler.destroy();
            delete this.handler;
        }
    }

    _onClickHandler(event) {
        var position = event.position;
        var cartesian =  this._map.scene.pickPosition(position);
        if (!Cesium.defined(cartesian)) {
            return;
        }
        if (!this.origin) {
            if (this.offsetHeight) {
                cartesian = this.addPositionsHeight(cartesian, this.offsetHeight); //加人的身高
            }
            this.origin = cartesian;
        } else{
            this._unbindMourseEvent();
        }
    }
    _onMouseMoveHandler(event) {
        var position = event.endPosition;
        var cartesian =  this._map.scene.pickPosition(position);
        if (!Cesium.defined(cartesian)) {
            return;
        }

        if (this.origin) {
            this.target = cartesian;
            this.analysis(this.origin,this.target);
        }
    }

    //========== 方法 ==========
    /**
     * 添加通视分析
     *
     * @param { Cesium.Cartesian3} origin 起点（视点位置）
     * @param { Cesium.Cartesian3} target 终点（目标点位置）
     * @param {Object} [options={}] 控制参数，包括：
     * @param {Number} [offsetHeight=0] 在起点增加的高度值，比如加上人的身高
     * @return {Object} 分析结果
     */
    add() {
        if(this.origin && this.target){
            if (this.offsetHeight) {
                this.origin = this.addPositionsHeight(this.origin, this.offsetHeight); //加人的身高
            }
            this.analysis(this.origin,this.target);
        }else{
            this._bindMourseEvent();
        }
    }

    analysis(origin, target){
        this.clear();
        let old_depthTestAgainstTerrain = this._map.scene.globe.depthTestAgainstTerrain;
        this._map.scene.globe.depthTestAgainstTerrain = true;

        let currDir = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(target, origin, new Cesium.Cartesian3()), new Cesium.Cartesian3());
        let currRay = new Cesium.Ray(origin, currDir);
        let pickRes = this._map.scene.drillPickFromRay(currRay, 2, this.lines);

        if (Cesium.defined(pickRes) && pickRes.length > 0 && Cesium.defined(pickRes[0]) && Cesium.defined(pickRes[0].position)) {
            let position = pickRes[0].position;

            let distance = Cesium.Cartesian3.distance(origin, target);
            let distanceFx = Cesium.Cartesian3.distance(origin, position);
            if (distanceFx < distance) {
                this._map.scene.globe.depthTestAgainstTerrain = old_depthTestAgainstTerrain;
                //存在正常分析结果
                let arrEentity = this._showPolyline(origin, target, position);
                let result = {
                    block: true, //存在遮挡
                    position: position,
                    entity: arrEentity,
                };
                return result;
            }
        }

        this._map.scene.globe.depthTestAgainstTerrain = old_depthTestAgainstTerrain;
        let arrEentity = this._showPolyline(origin, target);
        let result = {
            block: false,
            entity: arrEentity,
        };
        return result;
    }


    /**
     * 对坐标（或坐标数组）增加 指定的海拔高度值
     *
     * @export
     * @param {Cartesian3|Cartesian3[]} positions 笛卡尔坐标数组
     * @param {number} [addHeight=0] 增加的海拔高度值
     * @return {Cartesian3|Cartesian3[]} 增加高度后的坐标（或坐标数组）
     */
    addPositionsHeight(positions, addHeight = 0) {
        addHeight = Number(addHeight);

        if (isNaN(addHeight) || addHeight == 0) {
            return positions;
        }

        if (Array.isArray(positions)) {
            let arr = [];
            for (let i = 0, len = positions.length; i < len; i++) {
                let car = Cesium.Cartographic.fromCartesian(positions[i]);
                let point = Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, car.height + addHeight);
                arr.push(point);
            }
            return arr;
        } else {
            let car = Cesium.Cartographic.fromCartesian(positions);
            return Cesium.Cartesian3.fromRadians(car.longitude, car.latitude, car.height + addHeight);
        }
    }

    _showPolyline(origin, target, position) {
        if (position) {
            //存在正常分析结果
            let entity1 = this._map.entities.add(
                new Cesium.Entity({
                    polyline: {
                        positions: [origin, position],
                        width: 2,
                        material: this._visibleColor,
                        depthFailMaterial: this._depthFailColor,
                    },
                })
            );
            this.lines.push(entity1);

            let entity2 = this._map.entities.add(
                new Cesium.Entity({
                    polyline: {
                        positions: [position, target],
                        width: 2,
                        material: this._hiddenColor,
                        depthFailMaterial: this._depthFailColor,
                    },
                })
            );
            this.lines.push(entity2);

            return [entity1, entity2];
        } else {
            //无正确分析结果时，直接返回
            let entity = this._map.entities.add(
                new Cesium.Entity({
                    polyline: {
                        positions: [origin, target],
                        width: 2,
                        material: this._visibleColor,
                        depthFailMaterial: this._depthFailColor,
                    },
                })
            );
            this.lines.push(entity);

            return [entity];
        }
    }

    /**
     *  清除分析
     * @return {void}  无
     */
    clear() {
        for (let i = 0, len = this.lines.length; i < len; i++) {
            this._map.entities.remove(this.lines[i]);
        }
        this.lines = [];
    }
}

export default SightLineAnalysis;
