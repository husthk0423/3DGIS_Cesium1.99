let versionStr = 'jssdk_bate@ cesium 2.0.2';
module.exports  = versionStr;
Cesium.setShowLevel=function(levelArray){
    Cesium.showLevelMap = {};
    Cesium.showLevelLength = levelArray.length;
    for(let i = 0;i<Cesium.showLevelLength;i++){
        let level = levelArray[i];
        Cesium.showLevelMap[level] = i;
    }
};
Cesium.tileSize = 256;
console.log(versionStr);