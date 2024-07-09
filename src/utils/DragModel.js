/**
 * Created by EDZ on 2021/12/1.
 */
class DragModel {
    constructor(viewer) {
        this._viewer = viewer
        this.entity = null
        this.handler = null
        this.moving = false

        this._leftDown = this._leftDownHandler.bind(this)
        this._leftUp = this._leftUpHandler.bind(this)
        this._move = this._moveHandler.bind(this)

        this.handler = new Cesium.ScreenSpaceEventHandler(this._viewer.canvas)
    }

    enable() {
        this.handler.setInputAction(this._leftDown, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        this.handler.setInputAction(this._leftUp, Cesium.ScreenSpaceEventType.LEFT_UP)

        this.handler.setInputAction(this._move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    disable() {
        this._viewer.scene.screenSpaceCameraController.enableRotate = true

        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        this.moving = false
        this.entity = null
    }

    _leftDownHandler(e) {
        this.entity = this._viewer.scene.pick(e.position)
        this.moving = true
        if (this.entity) {
            this._viewer.scene.screenSpaceCameraController.enableRotate = false
        }
    }

    _leftUpHandler() {
        this.moving = false
        this.entity = null
        this._viewer.scene.screenSpaceCameraController.enableRotate = true;
    }

    _moveHandler(e) {
        if (this.moving && this.entity && this.entity.primitive) {
            const ray = this._viewer.camera.getPickRay(e.endPosition);
            const cartesian = this._viewer.scene.globe.pick(ray, this._viewer.scene);

            // var m = Cesium.Matrix4.IDENTITY;
            // m = Cesium.Matrix4.setScale(m,new Cesium.Cartesian3(this.scale,this.scale,this.scale),new Cesium.Matrix4());
            // var modelM = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
            // modelM = Cesium.Matrix4.multiply( modelM,m, new Cesium.Matrix4());
            // this.entity.primitive.modelMatrix = modelM;


            this.entity.primitive.modelMatrix = Cesium.Matrix4.setTranslation(this.entity.primitive.modelMatrix,
                cartesian,new Cesium.Matrix4());

            if(this.entity.primitive.resetDrawCommands){
                this.entity.primitive.resetDrawCommands();
            }
        }
    }
}
module.exports = DragModel;