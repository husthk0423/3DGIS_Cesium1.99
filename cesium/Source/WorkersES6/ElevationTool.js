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

import defer from "../Core/defer.js";
/**
* 编码工具类
*/
class ElevationTool {

    /**
     *  获取多个指定的数据库名的数据库连接
     * @param indexDbNames
     * @param dbMap
     * @returns {*|Deferred}
     */
    static getDBMap(indexDbNames,dbMap) {
        let deferred = defer();
        let promises = [];
        for(let i = 0;i<indexDbNames.length;i++){
            let indexDbname = indexDbNames[i];
            let defer1 = defer();
            let request = indexedDB.open(indexDbname,1);
            request.onerror = function(){
                console.log(indexDbname+"数据库创建失败或者异常~");
                defer1.reject();
            };
            request.onsuccess = function(e){
                console.log(indexDbname+"数据库连接成功~");
                dbMap[indexDbname] = e.target.result;
                defer1.resolve(true);
            };
            request.onupgradeneeded = function(e){
                let db = e.target.result;
                dbMap[indexDbname] = db;
                let objectStore = db.createObjectStore(indexDbname,{keyPath:"key",autoIncrement: false});
                objectStore.createIndex('key', 'key', { unique: true });
                defer1.resolve(true);
            }
            promises.push(defer1.promise);
        }


        Promise.all(promises).then(function() {
            deferred.resolve(true);
        });

        return deferred;
    }


    /**
     * 根据多个指定的数据库名，key的对应的高程数据集合
     * @param dbMap
     * @param indexDbNames
     * @param key
     * @returns {*|Deferred}
     */
    static getElevation(dbMap,indexDbNames,key) {
        let deferred = defer();
        let promises = [];
        let elevationDataMap = [];
        for(let i = 0;i<indexDbNames.length;i++){
            let indexDbname = indexDbNames[i];
            let db = dbMap[indexDbname];
            let transaction = db.transaction([indexDbname]);
            let objectStore = transaction.objectStore(indexDbname);

            let defer1 = defer();
            let request = objectStore.get(key);
            request.onerror = function(event) {
                elevationDataMap[indexDbname] = null;
                defer1.resolve(null);
                // console.log(indexDbname + '_'+key + '数据查询报错');
            };

            request.onsuccess = function( event) {
                if (request.result) {
                    elevationDataMap[indexDbname] = request.result;
                    defer1.resolve(request.result);
                } else {
                    elevationDataMap[indexDbname] = null;
                    defer1.resolve(null);
                    // console.log(indexDbname + '_'+key + '数据查询为空！');
                }
            };

            promises.push(defer.promise);
        }


        Promise.all(promises).then(function() {
            deferred.resolve(elevationDataMap);
        });

        return deferred.promise;
    }

    static updateElevation(db,indexDbName,key,data) {
        let deferred = defer();
        let request = db.transaction([indexDbName], 'readwrite')
            .objectStore(indexDbName)
            .put({ key: key,data: data});

        request.onsuccess = function (event) {
            // console.log(indexDbName+'_'+key+'数据入库成功');
            deferred.resolve(true);
        };

        request.onerror = function (event) {
            // console.log(indexDbName+'_'+key + '数据入库失败');
            deferred.reject();
        };

        return deferred.promise;
    }
}
export default ElevationTool;
