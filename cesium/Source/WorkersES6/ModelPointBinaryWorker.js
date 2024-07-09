/**
 * Cesium - https://github.com/AnalyticalGraphicsInc/cesium
 *
 * Copyright 2011-2017 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md for full licensing details.
 */

import createTaskProcessorWorker from './createTaskProcessorWorker.js';
import Resource from '../Core/Resource.js';
import Cartesian3 from '../Core/Cartesian3.js';
import ModelPointDrawer from './ModelPointDrawer.js';
import parseBinaryData from './ParseBinaryData';
import scanLine from './ScanLine.js';
import ElevationTool from './ElevationTool.js';
import Cache from './Cache.js';
import defer from "../Core/defer.js";


let indexDbNames;
let indexDbName;
let dbMap ={};


let styleFun = undefined;
let tileSize = 512;
let return_type = '';
let options = {};

let serverInfo = {};
let layerFieldMap = {};

//默认当前屏幕最多10万个房屋缓存
let cache = new Cache(100000);

    function init(parameters){
        styleFun = new Function("render","level", parameters.styleStr);
        tileSize = parameters.tileSize;
        return_type = parameters.return_type;
        options = parameters;
        indexDbNames = parameters.indexDbNames;
        indexDbName = parameters.indexDbName;

        serverInfo = parameters.serverInfo;
        layerFieldMap = parameters.layerFieldMap;
        return ElevationTool.getDBMap(indexDbNames,dbMap);
    }

    /* global require */
    function createGeometry(parameters, transferableObjects) {
            if(parameters.init ==true){
                init(parameters);
                return;
            }

            var url = parameters.url;
            var resource = new Resource({url:url});
            resource.request.throttle = false;
            resource.request.throttleByServer = true;
            resource.request.type = 1;

            var jsonPromise = resource.fetchArrayBuffer();

            if(!jsonPromise){
                return true;
            }


            let promises =[];
            promises.push(jsonPromise);

            //获取本图层下面的图层indexDbNames
            let names = indexDbNames.slice(0,indexDbNames.length-1);
            promises.push(ElevationTool.getElevation(dbMap,names,parameters.xyz));

            let deferred = defer();

            Promise.all(promises).then(function(result) {
                let data = result[0];
                if(!data){
                    // data = {};
                    deferred.resolve({});
                    return;
                }
                let layers =  parseBinaryData(data,layerFieldMap,serverInfo);
                let featureMap =  parseData(layers,parameters);

                if(options.hasTerrain){
                    updateMaxHeight(featureMap,result[1]);
                }

                //扫描线算法，计算出房屋的像素点的高程值
                // console.time('scanLine');
                let elevationData = toBitmapData(featureMap,tileSize);
                // console.timeEnd('scanLine');

                //将瓦片内坐标转为地心坐标
                featureMapToLonLat(featureMap,parameters);
                let promise = ElevationTool.updateElevation(dbMap[indexDbName],indexDbName,parameters.xyz,elevationData);
                promise.finally(function(e){
                    deferred.resolve(featureMap);
                });
            },function (e){
                deferred.reject(e);
            });
            return deferred.promise;
        }


        function parseData(data,parameters){
            if(data){
                decodeData(data,parameters.needDecode);
                //设置样式
                let featureMap = {};
                let drawer = new ModelPointDrawer([data], parameters.level, featureMap,parameters.controlVector,
                    parameters.highLightVector,parameters.filterLayerId);
                styleFun.call({}, drawer, parameters.level);
                formatGeometrys(featureMap);
                return featureMap;
            }
            return {};
        }

        /**
         *  解码数据，包括点坐标偏移，正方形F的解码等
         * @param data
         */
        function decodeData(data,needDecode){
            for(let layername in data){
                let features = data[layername].features;
                if(!features){
                    features = data[layername].datas;
                }
                for(let i = 0;i<features.length;i++){
                    recursiveDecode(features[i][2],needDecode);
                }
            }
        }

        function recursiveDecode(components,needDecode){
            if(components[0] == 'F'){
                components[0] = formatF();
                return;
            }

            if (Array.isArray(components[0])) {
                let len = components.length;
                for (let i = 0; i < len; i++) {
                    let component = components[i];
                    recursiveDecode(component,needDecode);
                }
            } else {
                if(needDecode){
                    recoveryData(components);
                }
            }
        }

        function recoveryData(components){
            let prevPoint = [components[0],components[1]];
            for(let j =2;j<components.length;j++){
                let x = prevPoint[0]+components[j];
                let y = prevPoint[1]+components[j+1];
                components[j] = x;
                components[j+1] = y;
                prevPoint = [x,y];
                j++;
            }
        }

        function formatF(){
            return [-tileSize*0.05,-tileSize*0.05,tileSize*1.05,-tileSize*0.05,
                tileSize*1.05,tileSize*1.05,-tileSize*0.05,tileSize*1.05];
        }


        function toBitmapData(featureMap,tileSize){
            let bitmapData = new Int32Array(tileSize*tileSize);
            for(let key in featureMap) {
                let features = featureMap[key];
                for (let i = 0; i < features.length; i++) {
                    let feature = features[i];
                    let minMaxY = getMaxYMinY(feature.geometrys);
                    scanLine(bitmapData,feature,tileSize,minMaxY.ymax,minMaxY.ymin);
                }
            }

            return bitmapData;
        }

        function getMaxYMinY(polygons){
            let ymin=1000;
            let ymax=0;
            for(let i =0;i<polygons.length;i++){
                let points = polygons[i];
                for(let j =0;j<points.length-1;j++){
                    let y = Math.round(points[j+1]);
                    if(y<ymin){
                        ymin = y;
                    }
                    if(y>ymax){
                        ymax = y;
                    }
                    j++;
                }
            }

            return {ymax:ymax,ymin:ymin};
        }


        /**
         *  解析多面
         * @param featureMap
         */
        function formatGeometrys(featureMap){
            for(let key in featureMap){
                let features = featureMap[key];
                for(let i = 0;i<features.length;i++){
                    let feature = features[i];
                    let geometrys = [];
                    recursiveFormat(geometrys,feature.data);
                    delete feature.data;
                    feature.geometrys = geometrys;


                    let height = 0;
                    if(options.hasOwnProperty('heightProperty')){
                        let heightProperty = options.heightProperty;
                        height = feature.properties[heightProperty];
                        if(options.hasOwnProperty('heightScale')){
                            height = height * parseFloat(options.heightScale);
                        }
                    }
                    //不考虑地形，房子的本身高度
                    feature.height = height;
                    feature.totalHeight = height;
                }
            }
        }

        function recursiveFormat(geometrys,components){
            if (Array.isArray(components[0])) {
                let len = components.length;
                for (let i = 0; i < len; i++) {
                    let component = components[i];
                    recursiveFormat(geometrys,component);
                }
            } else {
                geometrys.push(components);
            }
        }


        //计算每个房屋的最大高程,并算出最大，最小y坐标
        function updateMaxHeight(featureMap,elevationDataMap){
            var ymin=1000;
            var ymax=0;
            for(let key in featureMap){
                let features = featureMap[key];
                for(let i =0;i<features.length;i++){
                    let feature = features[i];

                    let terrainHeight =-20000;
                    let cacheHeight = cache.get(feature.properties.id);
                    if(cacheHeight){
                        terrainHeight = cacheHeight;
                    }else{
                        for(let j = 0;j<feature.geometrys.length;j++){
                            let geometry = feature.geometrys[j];
                            for(let k = 0;k<geometry.length-1;k++){
                                let x = Math.round(geometry[k]);
                                let y = Math.round(geometry[k+1]);

                                if(y<ymin){
                                    ymin = y;
                                }
                                if(y>ymax){
                                    ymax = y;
                                }

                                k++;

                                if(x <0 || x > tileSize -1 || y<0 || y>tileSize -1){
                                    continue;
                                }

                                let index = y  * tileSize + x ;
                                let h = 0;
                                for(let key in elevationDataMap){
                                    let terrainData = elevationDataMap[key];
                                    h = h+terrainData.data[index];
                                }

                                if(h > terrainHeight){
                                    terrainHeight = h;
                                }
                            }
                        }

                        if(terrainHeight == -20000){
                            terrainHeight = 0;
                        }

                        cache.set(feature.properties.id,terrainHeight);
                    }

                    //房子在地形距离水平线的最大高度
                    feature.terrainHeight = terrainHeight;
                    //总高度
                    feature.totalHeight = terrainHeight + feature.height;
                }
            }

            return {ymax:ymax,ymin:ymin};
        }


        function featureMapToLonLat(featureMap,parameters){
            for(let key in featureMap){
                let features = featureMap[key];
                for(let i = 0;i<features.length;i++){
                    let feature = features[i];
                    feature.points = [];
                    for(let j =0;j<feature.geometrys.length;j++){
                        let geometry = feature.geometrys[j];
                        let positions = geometryToLonLat(geometry,parameters);
                        feature.points.push(positions);
                    }
                    delete feature.geometrys;
                }
            }
        }

        function geometryToLonLat(geometry,parameters){
            let rectangle = parameters.rectangle ;
            var positions = [];
            for (var i = 0; i < geometry.length; i++) {
                var pt = formatToDegrees(geometry[i],geometry[i+1],rectangle);
                var cartesian3 =Cartesian3.fromDegrees(pt[0], pt[1]);
                positions.push(cartesian3);
                i++;
            }
            return positions;
        }

        function formatToDegrees(x,y,rectangle){
            var lon = toDegrees(rectangle.west + rectangle.width/ tileSize* x);
            var lat = toDegrees(rectangle.north - rectangle.height/ tileSize* y);
            lon = Number(lon.toFixed(6));
            lat = Number(lat.toFixed(6));
            return [lon,lat];
        }

        function toDegrees (radians) {
            return radians * 180.0 / Math.PI;
        };

    var result = createTaskProcessorWorker(createGeometry);
    export default result;