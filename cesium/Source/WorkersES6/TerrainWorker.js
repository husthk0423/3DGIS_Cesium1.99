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

import Resource from '../Core/Resource.js';
import GeographicTilingScheme from '../Core/GeographicTilingScheme.js';
import WebMercatorTilingScheme from '../Core/WebMercatorTilingScheme.js';
import UPNG from './UPNG';

import ElevationTool from './ElevationTool.js';
import TerrainUpsample from './TerrainUpsample.js';
import Cache from './Cache.js';
import defer from "../Core/defer.js";



//采样后的地形瓦片宽度
let w =65;
let dbMap ={};

let indexDbName;
let tilingScheme;
let maxLevel =16;
let tileSize =512;
//地形最大一级的缓存
let cache = new Cache(100);
//正在发送请求的map
let loadingMap = {};


import createTaskProcessorWorker from './createTaskProcessorWorker.js';
    function init(parameters){
        w = parameters.w;
        indexDbName = parameters.indexDbName;
        tileSize = parameters.tileSize;
        if(parameters.tilingSchemeName == 'GeographicTilingScheme'){
            tilingScheme = new GeographicTilingScheme();
        }else{
            tilingScheme = new WebMercatorTilingScheme();
        }
        maxLevel = parameters.maxLevel;

        return ElevationTool.getDBMap([indexDbName],dbMap);
    }

    function getTile(parameters,transferableObjects){
        if(parameters.init == true){
            return init(parameters);
        }

        let deferred = defer();
        parameters.xyzStr =  parameters.xyz.x+'_'+parameters.xyz.y+'_'+parameters.xyz.z;

        let promise = ElevationTool.getElevation(dbMap,[indexDbName],parameters.xyzStr);
        promise.then(function(terrainDataMap){
            for(let key in terrainDataMap){
                let terrainData = terrainDataMap[key];
                if(terrainData){
                    let resampleData = resample(terrainData.data,tileSize,transferableObjects);
                    deferred.resolve(resampleData);
                    return;
                }
            }

            if(parameters.xyz.z > maxLevel){
                //取父级数据重采样
                upSample(parameters,maxLevel,deferred,transferableObjects);
                return deferred.promise;
            }else{
                //发送请求
                requestTile(parameters,deferred,transferableObjects);
            }
        });
        return deferred.promise;
    }

    function upSample(parameters,maxLevel,deferred,transferableObjects){
        let scale = Math.pow(2,parameters.xyz.z-maxLevel);
        let parentXYZ = {x:Math.floor(parameters.xyz.x/scale),y:Math.floor(parameters.xyz.y/scale),z:maxLevel};
        let xyz = parameters.xyz;
        let xyzStr = parentXYZ.x+'_'+parentXYZ.y+'_'+parentXYZ.z;
        let cacheTerrainData = cache.get(xyzStr);
        if(cacheTerrainData){
            let data =TerrainUpsample.upsample(tilingScheme,cacheTerrainData,tileSize,tileSize,parentXYZ,xyz);
            let resampleData = resample(data,tileSize,transferableObjects);

            let promise = ElevationTool.updateElevation(dbMap[indexDbName],indexDbName,parameters.xyzStr,data);
            promise.finally(function(e){
                deferred.resolve(resampleData);
            });
            // promise.then(function(e){
            //     deferred.resolve(resampleData);
            // },function(e){
            //     deferred.resolve(resampleData);
            // });
        }else{
            //请求父级的最大层级的瓦片
            let resourceUrl = parameters.resourceUrl;
            resourceUrl = resourceUrl.replace('{x}',parentXYZ.x);
            resourceUrl = resourceUrl.replace('{y}',parentXYZ.y);
            resourceUrl = resourceUrl.replace('{z}',parentXYZ.z);
            parameters.url = resourceUrl;
            parameters.xyz =  parentXYZ;
            parameters.xyzStr =  parameters.xyz.x+'_'+parameters.xyz.y+'_'+parameters.xyz.z;

            if(loadingMap[resourceUrl]){//如果父级瓦片正在请求中
                deferred.reject(null);
            }else{
                let deferred1 = defer();
                requestTile(parameters,deferred1,transferableObjects);
                loadingMap[resourceUrl] = true;
                deferred1.promise.then(function(){
                    let cacheTerrainData = cache.get(parameters.xyzStr);
                    let data =TerrainUpsample.upsample(tilingScheme,cacheTerrainData,tileSize,tileSize,parentXYZ,xyz);
                    let resampleData = resample(data,tileSize,transferableObjects);

                    let key = xyz.x+'_'+xyz.y+'_'+xyz.z;
                    let promise = ElevationTool.updateElevation(dbMap[indexDbName],indexDbName,key,data);
                    promise.finally(function(e){
                        delete loadingMap[resourceUrl];
                        deferred.resolve(resampleData);
                    });
                    // promise.then(function(e){
                    //     delete loadingMap[resourceUrl];
                    //     deferred.resolve(resampleData);
                    // },function(e){
                    //     delete loadingMap[resourceUrl];
                    //     deferred.resolve(resampleData);
                    // });

                },function(){
                    delete loadingMap[resourceUrl];
                    deferred.reject(null);
                });
            }
        }
    }

    function requestTile(parameters,deferred,transferableObjects){
        var url = parameters.url;
        var resource = new Resource({url:url});
        resource.request.throttle = false;
        resource.request.throttleByServer = true;
        resource.request.type = 1;

        var jsonPromise = resource.fetchArrayBuffer();

        if(!jsonPromise){
            deferred.reject(null);
            return;
        }

        jsonPromise.then(function(deferred,arraybuffer){
            let img   = UPNG.decode(arraybuffer);
            let rgba = UPNG.toRGBA8(img)[0];
            let pixels = new Uint8Array(rgba);
            //解码高程
            let data = decode(pixels,img.width);

            //将地形最后一级数据放入缓存中
            if(parameters.xyz.z == maxLevel){
                cache.set(parameters.xyzStr,data);
            }

            let resampleData = resample(data,img.width,transferableObjects);
            //将地形数据存入indexdb
            let promise = ElevationTool.updateElevation(dbMap[indexDbName],indexDbName,parameters.xyzStr,data);
            promise.then(function(e){
                deferred.resolve(resampleData);
            },function(e){
                deferred.resolve(resampleData);
            })
        }.bind(this,deferred));
    }

    /* global require */
  function decode(pixels,width) {
      let data = new Int16Array(width * width);
      const dim = width;

      //解码高程
      for (let y = 0; y < dim; y++) {
          for (let x = 0; x < dim; x++) {
              const i = y * dim + x;
              const j = i * 4;
              let index = y  * dim + x ;
              data[index] = unpack(pixels[j], pixels[j + 1], pixels[j + 2]);
          }
      }
      return data;
  }

 //重采样
  function resample(data,width, transferableObjects){
      let gap = Math.floor(width/(w -1));
      let sData = new Int16Array(w*w);
      let _minimumHeight = 10000;
      let _maximumHeight = -20000

      for (let y = 0; y < w; y++)
      {
          let yIndex = y * gap * width;
          if(y == w -1){
              yIndex = width * width -width;
          }
          //当前行的最大值
          let maxI = yIndex +width -1;

          for (let x = 0; x < w; x++)
          {
              let i = x * gap + yIndex;
              if(x == w-1){
                  i = maxI;
              }
              let index = x + y * w;
              sData[index] = data[i];

              if(_minimumHeight > data[i]){
                  _minimumHeight = data[i];
              }

              if(_maximumHeight < data[i]){
                  _maximumHeight = data[i];
              }
          }
      }
      transferableObjects.push(sData.buffer);
      return {sData:sData,_minimumHeight:_minimumHeight,_maximumHeight:_maximumHeight};
  }

    function unpack(r, g, b) {
        return Math.round((r * 256 * 256 + g * 256.0 + b) / 10.0 - 10000.0);
    }

    var result = createTaskProcessorWorker(getTile);
    export default result;