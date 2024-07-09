/**
 * toolTip
 */
class ToolTip {
    //========== 构造方法 ==========
    constructor(viewer,options = {}) {
        this._map = viewer;
        this.options = options;

        this.parentContainerId = this._map?.container?.id;
        let el = document.createElement("div");
        el.className = "custom-popup";
        this._container = el;

        this._container.id = "custom-tooltip-view";
        this._container.style.display = "none";

        this.options.cacheTime = Cesium.defaultValue(this.options.cacheTime, 20);
    }

    get show() {
        return this._show;
    }
    set show(show) {
        if (this._show == show) {
            return;
        }
        this._show = show;

        if (this._container) {
            this._container.style.display = show ? "block" : "none";
        }
        this._showHook && this._showHook(show);
    }


    _bindMourseEvent(){
        this.handler = new Cesium.ScreenSpaceEventHandler(this._map.canvas);
        this.handler.setInputAction(this._mouseDownHandler.bind(this),Cesium.ScreenSpaceEventType.LEFT_DOWN);
        this.handler.setInputAction(this._mouseUpHandler.bind(this),Cesium.ScreenSpaceEventType.LEFT_UP);
        this.handler.setInputAction(this._mouseMoveHandler.bind(this),Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    //解绑事件
    _unbindMourseEvent() {
        if(this.handler){
            this.handler.destroy();
            delete this.handler;
        }
    }

    /**
     * 开启toolTip功能
     */
    start() {
        if (this._container) {
            this._map?.container.appendChild(this._container);
        }
        this._bindMourseEvent();
    }

    /**
     * 销毁toolTip
     */
    destroy(){
        if (this._container) {
            this._map?.container.removeChild(this._container);
            this._container = null;
        }
        this._unbindMourseEvent();
    }

    _mouseDownHandler(event) {
        this._isMouseUpdownPressed = true;
        this.close();
    }
    _mouseUpHandler(event) {
        this._isMouseUpdownPressed = false;
    }

    _mouseMoveHandler(event) {
        if (this.moveTimer) {
            clearTimeout(this.moveTimer);
            delete this.moveTimer;
        }

        if (
            this._isMouseUpdownPressed ||
            this._map.scene.screenSpaceCameraController.enableRotate == false ||
            this._map.scene.screenSpaceCameraController.enableTilt == false ||
            this._map.scene.screenSpaceCameraController.enableTranslate == false
        ) {
            this.close();
            return;
        }

        this.moveTimer = setTimeout(() => {
            delete this.moveTimer;
            let pickedFeature = this._map.scene.pick(event.endPosition);
            if(Cesium.defined(pickedFeature)) {
                event.target = pickedFeature;
                this._mouseMoveWork(event);
            }else{
                this.close();
            }
        }, this.options.cacheTime);
    }


    //鼠标移动事件
    _mouseMoveWork(event) {
        if (this._openByMove(event.target, event)) {
            return;
        }
        this.close();
    }
    _openByMove(target, event) {
        if(target.primitive){
            target = target.primitive;
        }else{
            target = null;
        }

        if (!target || !Cesium.defined(target.tooltip)) {
            return false;
        }
        if (target.tooltip == false) {
            //false时关闭右键，不再往上冒泡
            return true;
        }

        this.open(target, {
            windowPosition: event.endPosition,
            event: event,
        });
        return true;
    }

    _showHook() {
        if (!this._show) {
            if (this.moveTimer) {
                clearTimeout(this.moveTimer);
                delete this.moveTimer;
            }
            if (this.onRemove) {
                this.onRemove(this._last_eventResult);
                delete this.onRemove;
            }
        }
    }

    close() {
        this.show = false;
    }

    open(target, options = {}) {
        // if (this._lastTooltipEntity != target) {
        let eventResult = options.event || {};
        delete options.event;

        eventResult.target = target;
        this._last_eventResult = eventResult;

        //避免鼠标移动时重复构造DOM
        //显示内容
        let inhtml;
        let onAdd;
        if (typeof target.tooltip == "object") {
            inhtml = target.tooltip.html;
            onAdd = target.tooltip.onAdd;
            this.onRemove = target.tooltip.onRemove;

            if (typeof target.tooltip.show == "function") {
                if (!target.tooltip.show(eventResult)) {
                    this.close();
                    return;
                }
            }
        } else {
            inhtml = target.tooltip;
        }

        if (typeof inhtml == "function") {
            inhtml = inhtml(eventResult); //回调方法
        }
        if (!inhtml) {
            this.close();
            return;
        }

        this.show = true;

        if (Cesium.defaultValue(target.tooltip?.template, true)) {
            this._container.innerHTML = `
            <div class="custom-popup-content-wrapper  custom-popup-background">
                <div id="${this.parentContainerId}-custom-tooltip-content" class="custom-popup-content custom-popup-color">${inhtml}</div>
            </div>
            <div class="custom-popup-tip-container"><div class="custom-popup-tip  custom-popup-background"></div></div>
            `;
        } else {
            this._container.innerHTML = inhtml;
        }

        //tooltip的DOM添加到页面的回调方法
        if (onAdd) {
            onAdd(eventResult);
        }

        //定位位置
        let x = options.windowPosition.x - this._container.offsetWidth / 2;
        let y = options.windowPosition.y - this._container.offsetHeight;

        let tooltip = target.tooltip;
        if (tooltip && typeof tooltip == "object" && tooltip.anchor) {
            x += tooltip.anchor[0];
            y += tooltip.anchor[1];
        } else {
            y -= 3; //默认偏上3像素
        }

        this._container.style.left = x + "px";
        this._container.style.top = y + "px";
    }


}

export default ToolTip;
