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

import CesiumMath from '../Core/Math.js';
import ElevationTool from './ElevationTool.js';
/**
* 地形重采样工具类
*/
class TerrainUpsample {
    // static upsample(tilingScheme,dbMap,indexDbName,xyz,parentXYZ,width,height){
    //     let xyzStr = parentXYZ.x+'_'+parentXYZ.y+'_'+parentXYZ.z;
    //     let promise = ElevationTool.getElevation(dbMap,[indexDbName],xyzStr);
    //     return promise.then(function(terrainDataMap){
    //         for(let key in terrainDataMap){
    //             let terrainData = terrainDataMap[key];
    //             return TerrainUpsample.upsampleNow(tilingScheme,terrainData.data,width,height,parentXYZ.x,parentXYZ.y,parentXYZ.z,xyz.x,xyz.y,xyz.z);
    //         }
    //
    //         return null;
    //     });
    // }


    static upsample(tilingScheme,buffer,width,height,parentXYZ,xyz){
        // console.time('upsampleNow');
        var sourceRectangle = tilingScheme.tileXYToRectangle(parentXYZ.x, parentXYZ.y, parentXYZ.z);
        var destinationRectangle = tilingScheme.tileXYToRectangle(xyz.x, xyz.y, xyz.z);

        var stride = 1;
        var heightOffset = 0;
        var heightScale = 1;
        var elementsPerHeight = 1;
        var elementMultiplier = 256;
        var isBigEndian = false;

        let heights = new Int16Array(width*height);

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(destinationRectangle.north, destinationRectangle.south, j / (height - 1));
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(destinationRectangle.west, destinationRectangle.east, i / (width - 1));
                var heightSample = TerrainUpsample.interpolateHeight(buffer, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceRectangle, width, height, longitude, latitude);
                heightSample = heightSample * heightScale + heightOffset;

                heights[j * width + i] = heightSample;
            }
        }

        // console.timeEnd('upsampleNow');
        return heights;
    }


    static interpolateHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceRectangle, width, height, longitude, latitude) {
        var fromWest = (longitude - sourceRectangle.west) * (width - 1) / (sourceRectangle.east - sourceRectangle.west);
        var fromSouth = (latitude - sourceRectangle.south) * (height - 1) / (sourceRectangle.north - sourceRectangle.south);

        var westInteger = fromWest | 0;
        var eastInteger = westInteger + 1;
        if (eastInteger >= width) {
            eastInteger = width - 1;
            westInteger = width - 2;
        }

        var southInteger = fromSouth | 0;
        var northInteger = southInteger + 1;
        if (northInteger >= height) {
            northInteger = height - 1;
            southInteger = height - 2;
        }

        var dx = fromWest - westInteger;
        var dy = fromSouth - southInteger;

        southInteger = height - 1 - southInteger;
        northInteger = height - 1 - northInteger;

        var southwestHeight = TerrainUpsample.getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, southInteger * width + westInteger);
        var southeastHeight = TerrainUpsample.getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, southInteger * width + eastInteger);
        var northwestHeight = TerrainUpsample.getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, northInteger * width + westInteger);
        var northeastHeight = TerrainUpsample.getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, northInteger * width + eastInteger);

        return TerrainUpsample.triangleInterpolateHeight(dx, dy, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
    }

    static getHeight(heights, elementsPerHeight, elementMultiplier, stride, isBigEndian, index) {
        index *= stride;

        var height = 0;
        var i;

        if (isBigEndian) {
            for (i = 0; i < elementsPerHeight; ++i) {
                height = (height * elementMultiplier) + heights[index + i];
            }
        } else {
            for (i = elementsPerHeight - 1; i >= 0; --i) {
                height = (height * elementMultiplier) + heights[index + i];
            }
        }

        return height;
    }

    static triangleInterpolateHeight(dX, dY, southwestHeight, southeastHeight, northwestHeight, northeastHeight) {
        // The HeightmapTessellator bisects the quad from southwest to northeast.
        if (dY < dX) {
            // Lower right triangle
            return southwestHeight + (dX * (southeastHeight - southwestHeight)) + (dY * (northeastHeight - southeastHeight));
        }

        // Upper left triangle
        return southwestHeight + (dX * (northeastHeight - northwestHeight)) + (dY * (northwestHeight - southwestHeight));
    }
}
export default TerrainUpsample;
