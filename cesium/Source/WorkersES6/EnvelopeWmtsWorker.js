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
import HouseDrawer from './HouseDrawer.js';
import uncompress from './snappyJs.js';
import getPrimitiveData from './GetPrimitiveData.js';
import Cache from './Cache.js';
import PolygonBuffer from './PolygonBuffer.js';
import defer from "../Core/defer.js";
import UPNG from './UPNG';
import JpegDecoder from './JPG';
import PixelFormat from '../Core/PixelFormat';

let options = {};
let tileSize = 512;
//默认当前屏幕最多10万个房屋缓存
let cache = new Cache(100000);

    function init(parameters){
        let deferred = defer();
        options = parameters;
        tileSize = parameters.tileSize;
        deferred.resolve({});
        return deferred.promise;
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


            let deferred = defer();
            jsonPromise.then(function(imageData) {
                if(!imageData){
                    deferred.resolve({});
                    return;
                }

                // let t = new Date().getTime();
                let data;
                let pixelFormat;
                let ut8Array = new Uint8Array(imageData);
                if(UPNG.isPNG(ut8Array)){
                    pixelFormat = PixelFormat.RGBA;
                    let img   = UPNG.decode(imageData);
                    data = UPNG.toRGBA8(img)[0];
                }else{
                    pixelFormat = PixelFormat.RGB;
                    let parser = new JpegDecoder();
                    parser.parse(ut8Array);
                    data = parser.getData(parser.width, parser.height).buffer;
                }
                // console.log(new Date().getTime() -t);
             //    let featureMap = {wmts:[{type:'Polygon',geometrys:[[0,0,tileSize,0,tileSize,tileSize,0,tileSize]]}]};
             // //将瓦片内坐标转为地心坐标
             //  featureMapToLonLat(featureMap,parameters);
             //  toCartesian3(featureMap);
              // let primitiveData = getPrimitiveData(featureMap, parameters.level, options, transferableObjects);
              //   transferableObjects.push(imageData);
                transferableObjects.push(data);
              deferred.resolve({data,pixelFormat});
          },function (e){
              deferred.reject(e);
          });
          return deferred.promise;
        }


        function featureMapToLonLat(featureMap,parameters){
            for(let key in featureMap){
                let features = featureMap[key];
                for(let i = 0;i<features.length;i++){
                    let feature = features[i];
                    feature.polygons = [];
                    for(let j =0;j<feature.geometrys.length;j++){
                        let geometry = feature.geometrys[j];
                        let positions = geometryToLonLat(geometry,parameters);
                        feature.polygons.push(positions);
                    }
                    feature.geometrys = feature.polygons;
                }
            }
        }

        function geometryToLonLat(geometry,parameters){
            let rectangle = parameters.rectangle ;
            var positions = [];
            for (var i = 0; i < geometry.length; i++) {
                var pt = formatToDegrees(geometry[i],geometry[i+1],rectangle);
                positions.push(pt[0]);
                positions.push(pt[1]);
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


        function toCartesian3(featureMap){
            for(let key in featureMap){
                let features = featureMap[key];
                features.map((item) => {
                    let polygons = [];
                    for(let i =0;i<item.geometrys.length;i++){
                        let geometry = item.geometrys[i];
                        let positions = [];
                        for(let j = 0;j<geometry.length;j++){
                            let lon = geometry[j];
                            let lat = geometry[j+1];
                            let cartesian3 =Cartesian3.fromDegrees(lon, lat);
                            positions.push(cartesian3);
                            j++;
                        }
                        polygons.push(positions);
                    }
                    item.polygons = polygons;
                    delete item.geometrys;
                })
            }
        }

    var result = createTaskProcessorWorker(createGeometry);
    export default result;