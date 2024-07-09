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


import Buffer from './Buffer';
import VarintReader from './VarintReader';
        function parseBinaryData(data,layerFieldMap,serverInfo){
            let buf = toBuffer(data);
            let vant = new VarintReader(buf, 4, layerFieldMap);
            let layerNameArr = vant.getAllLayerNames();
            let layers = {};
            for (let i = 0; i < layerNameArr.length; i++) {
                let layerName = layerNameArr[i];
                layers[layerName] = {
                    features: [],
                    fieldsConfig: serverInfo[layerName] ? serverInfo[layerName].fieldsConfig : {},
                    type: 1
                };

                let geometryType =vant.getGeometryType(layerName);
                let props = vant.getLayerPro(layerName);
                if (geometryType.toLowerCase() == "point") {
                    layers[layerName].type = 1;
                } else if (geometryType.toLowerCase() == "line" ||
                    geometryType.toLowerCase() == "linestring" || geometryType.toLowerCase() == "multilinestring") {
                    layers[layerName].type = 2;
                }
                if (props && props.length > 0) {
                    for (let k = 0; k < props.length; k++) {
                        let tDataArr = [];
                        tDataArr.push(geometryType);
                        tDataArr.push(props[k]);
                        tDataArr.push(vant.getCoordinatesByIndex(layerName, k, 10));
                        layers[layerName].features.push(tDataArr);
                    }
                }
            }
            return layers;
        }

        function toBuffer(ab) {
            var buf = new Buffer(ab.byteLength);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buf.length; ++i) {
                buf[i] = view[i];
            }
            return buf;
        }


    export default parseBinaryData;