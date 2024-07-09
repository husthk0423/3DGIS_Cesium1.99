let versionStr = 'version=3.1.8 base cesium1.99';
Cesium.setShowLevel=function(levelArray){
    Cesium.showLevelMap = {};
    Cesium.showLevelLength = levelArray.length;
    for(let i = 0;i<Cesium.showLevelLength;i++){
        let level = levelArray[i];
        Cesium.showLevelMap[level] = i;
    }
};
Cesium.tileSize = 256;
Cesium.processorMap = {};
console.log(versionStr);

export default versionStr;