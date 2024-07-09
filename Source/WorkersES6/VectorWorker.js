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
import VectorDrawer from './VectorDrawer.js';
import uncompress from './snappyJs.js';

import FillBucket from '../mapbox/data/bucket/FillBucket';
import LineBucket from '../mapbox/data/bucket/LineBucket';
import Simplify from '../util/Simplify';
import Point from '../mapbox/data/point';
import ColorUtil from './ColorUtil';


let styleFun = undefined;
let tileSize = 512;
let return_type = '';
let options = {};

    /* global require */
  function createGeometry(parameters, transferableObjects) {
            //初始化
            if(parameters.init ==true){
                styleFun = new Function("drawer","level", parameters.styleStr);
                tileSize = parameters.tileSize;
                return_type = parameters.return_type;

                options = parameters;
                return true;
            }

            //更改样式
            if(parameters.changeStyle == true){
                let u8a = new Uint8Array(parameters.tileData);
                let str =  bufToStr(u8a);
                let data = JSON.parse(str);
                let featureMap =  parseData(data,parameters);
                return  createBuckets(featureMap,transferableObjects);
            }


            //初次请求url
            var url = parameters.url;
            var resource = new Resource({url:url});
            resource.request.throttle = false;
            resource.request.throttleByServer = true;
            resource.request.type = 1;

            var jsonPromise;
            if(return_type == 'stream_snappy'){
                jsonPromise = resource.fetchArrayBuffer();
            }else{
                jsonPromise = resource.fetchJson();
            }
            if(!jsonPromise){
                return true;
            }

            return jsonPromise.then(function(data){
                let tileData = null;
                if(return_type == 'stream_snappy'){
                    data = uncompress(data);
                    transferableObjects.push(data);

                    let u8a = new Uint8Array(data);
                    tileData = u8a.buffer;
                    let str =  bufToStr(u8a);
                    data = JSON.parse(str);
                }
               let featureMap =  parseData(data,parameters);

               let buckets =  createBuckets(featureMap,transferableObjects);
               return {tileData:tileData,buckets:buckets}
            });
        }

        function bufToStr(bytes){
            let out = [], pos = 0,c =0;
            while (pos < bytes.length) {
                let c1 = bytes[pos++];
                if (c1 < 128) {
                    out[c++] = c1;
                } else if (c1 > 191 && c1 < 224) {
                    let c2 = bytes[pos++];
                    out[c++] = (c1 & 31) << 6 | c2 & 63;
                } else if (c1 > 239 && c1 < 365) {
                    // Surrogate Pair
                    let c2 = bytes[pos++];
                    let c3 = bytes[pos++];
                    let c4 = bytes[pos++];
                    let u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
                        0x10000;
                    out[c++] = 0xD800 + (u >> 10);
                    out[c++] = 0xDC00 + (u & 1023);
                } else {
                    let c2 = bytes[pos++];
                    let c3 = bytes[pos++];
                    out[c++] = (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63;
                }
            }

            let a = [];
            let i = 0,offer=0,length=0;
            let count = 50000;
            let size = (out.length /  count) - 1;
            for(i = 0 ; i < size; i ++){
                offer = i * count;
                length = (i + 1) * count;
                a.push(String.fromCharCode.apply({},out.slice(offer,length)));
            }
            offer = i * count;
            length = out.length;
            a.push(String.fromCharCode.apply({},out.slice(offer,length)));

            a = a.join('');
            return a;
        }

        function parseData(data,parameters){
            if(data && data.layer){
                data = data.layer;
                decodeData(data,parameters.needDecode);
                //设置样式
                let featureMap = {};
                let drawer = new VectorDrawer([data], parameters.level, featureMap,parameters.controlVector,
                    parameters.highLightVector,parameters.filterLayerId);
                styleFun.call({}, drawer, parameters.level);
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


        function createBuckets(featureMap,transferableObjects){
            let buckets = [];
            for(let i =0;i<featureMap.keyArr.length;i++){
                let styleKey = featureMap.keyArr[i];
                let styleFeature = featureMap[styleKey];
                let style = styleFeature.style;
                formatStyleColor(style);

                if(styleFeature.lineFeatues.length > 0){
                    let lineBucket = new LineBucket({style:style,type:'line',tileSize:tileSize});
                    for (let feature of styleFeature.lineFeatues) {
                        //抽稀
                        sparsityFeature(feature,style,false);
                        //坐标转换
                        let featureGeometry = formatGeometry(feature);
                        lineBucket.addFeature(featureGeometry);
                    }
                    lineBucket = lineBucket.serialize(transferableObjects);
                    buckets.push(lineBucket);
                    continue;
                }
                if(styleFeature.fillFeatures.length > 0){
                    let fillBucket = new FillBucket({style:style,type:'fill',tileSize:tileSize});
                    //面边线
                    let lineBucket = new LineBucket({style:style,type:'line',tileSize:tileSize});
                    for (let feature of styleFeature.fillFeatures) {
                        //抽稀
                        sparsityFeature(feature,style,true);
                        //坐标转换
                        let featureGeometry = formatGeometry(feature);
                        fillBucket.addFeature(featureGeometry);

                        if(style.stroke){
                            lineBucket.addFeature(featureGeometry);
                        }
                    }

                    fillBucket = fillBucket.serialize(transferableObjects);
                    buckets.push(fillBucket);

                    if(style.stroke){
                        lineBucket = lineBucket.serialize(transferableObjects);
                        buckets.push(lineBucket);
                    }
                }
            }
            return buckets;
        }

        function sparsityFeature(feature,style,close){
            if(!style.sparsity){
                return;
            }
            let sparsity = parseFloat(style.sparsity);
            for(let i = 0;i<feature.data.length;i++){
                let points = feature.data[i];
                if (sparsity != null || sparsity != 1) {
                    feature.data[i] = Simplify(points, sparsity / 4, true);
                }
            }
        }

        function formatGeometry(feature){
            let n  = 256/tileSize*32;
            let geometry = [];
            for(let i = 0;i<feature.data.length;i++){
                geometry[i] = [];
                let ring = feature.data[i];
                for(let j =0;j<ring.length;j++){
                    if(j%2 == 0){
                        let x = ring[j]*n;
                        let y = ring[j+1]*n;
                        geometry[i].push(new Point(x,y));
                    }
                }
            }

            return geometry;
        }

    function formatStyleColor(style){
        let color = new ColorUtil();
        if(style.fillColor){
            color.fromHex(style.fillColor);
            let fillColor = [color.rgb[0]/255.0,color.rgb[1]/255.0,color.rgb[2]/255.0,1.0];
            style.fillColor = fillColor;
        }

        if(style.strokeColor){
            color = new ColorUtil();
            color.fromHex(style.strokeColor);
            let strokeColor = [color.rgb[0]/255.0,color.rgb[1]/255.0,color.rgb[2]/255.0,1.0];
            style.strokeColor = strokeColor;
        }
    }

    var result = createTaskProcessorWorker(createGeometry);
    export default result;