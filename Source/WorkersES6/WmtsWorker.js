import createTaskProcessorWorker from './createTaskProcessorWorker.js';
import Resource from '../Core/Resource.js';
import defer from "../Core/defer.js";
import UPNG from './UPNG';
import JpegDecoder from './JPG';
import PixelFormat from '../Core/PixelFormat';

    /* global require */
  function createGeometry(parameters, transferableObjects) {
            let url = parameters.url;
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
                transferableObjects.push(data);
              deferred.resolve({data,pixelFormat});
          },function (e){
              deferred.reject(e);
          });
          return deferred.promise;
        }

var result = createTaskProcessorWorker(createGeometry);
export default result;