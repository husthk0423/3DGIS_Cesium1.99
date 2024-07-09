/**
 * Created by EDZ on 2020/6/15.
 */
function mapPosition (){
    let camera = Cesium.camera;
    let cartographic =  camera.positionCartographic;
    let lon =  Cesium.Math.toDegrees(cartographic.longitude);
    let lat = Cesium.Math.toDegrees(cartographic.latitude);
    console.log('经纬度 : [' + lon+','+lat+']');
    console.log('地图高度 : '+ cartographic.height);
    console.log('heading :'+ Cesium.Math.toDegrees(camera.heading));
    console.log('pitch :'+ Cesium.Math.toDegrees(camera.pitch));
    console.log('roll :'+ Cesium.Math.toDegrees(camera.roll));
}

export default mapPosition;