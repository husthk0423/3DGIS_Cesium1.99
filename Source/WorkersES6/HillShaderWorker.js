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
import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';

import DEMData from './DemData.js';


    /* global require */
  function createGeometry(parameters, transferableObjects) {
        let dem = new DEMData(parameters.rawImageData, 'mapbox');
        transferableObjects.push(dem.data.buffer);
        return dem;
  }


    var result = createTaskProcessorWorker(createGeometry);
    export default result;