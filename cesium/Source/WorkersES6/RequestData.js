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
import Transforms from '../Core/Transforms.js';
import Resource from '../Core/Resource.js';

function request(parameters, transferableObjects) {

    var url = parameters.url;
    var methodName = parameters.methodName;
    var headers = parameters.headers;
    var resource = new Resource({url:url});
    resource.request.throttle = false;
    resource.request.throttleByServer = true;
    resource.request.type = 1;
    resource.headers = headers;

    var jsonPromise= resource[methodName].call(resource);
    // var jsonPromise= resource.fetchArrayBuffer();

    if(!jsonPromise){
        return false;
    }
    return jsonPromise.then(function(result){
        transferableObjects.push(result);
        return {
            result : result
        };
    });
}

var result = createTaskProcessorWorker(request);
export default result;
