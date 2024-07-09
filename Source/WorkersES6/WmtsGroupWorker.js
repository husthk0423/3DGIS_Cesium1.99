import createCallBackWorker from './createCallBackWorker.js';
import Resource from '../Core/Resource.js';
import UPNG from './UPNG';
import JpegDecoder from './JPG';
import colorBlend from './colorBlend.js';
const normal = colorBlend.normal;

    /* global require */
  function createGeometry(parameters, transferableObjects,callBack) {
            // let deferred = defer();

            let imageDatas = [];
            let success = function(index,data){
                imageDatas[index] = data;
                let imageUint8Array = blendImages(imageDatas);
                if(imageUint8Array){
                    let imageBuffer = imageUint8Array.buffer;
                    transferableObjects.push(imageBuffer);
                    //     let cloneImageData = new Uint8Array(imageUint8Array.length);
                    //     for (let k = 0; k < imageUint8Array.length; k++) {
                    //         cloneImageData[k] = imageUint8Array[k];
                    //     }
                    //     let imageBuffer = cloneImageData.buffer;
                    //     transferableObjects.push(imageBuffer);

                    callBack(imageBuffer);
                    // deferred.resolve({index:imageArr.length,imageBuffer:imageBuffer});
                }else{
                    callBack({});
                    // deferred.reject({});
                }
            };

            for(let i = 0;i < parameters.urls.length; i++){
                imageDatas[i] = null;
                let url = parameters.urls[i];
                getOneTileData(url,success.bind(this,i));
            }
          return callBack;
            // return deferred.promise;
        }

        function getOneTileData(url,success){
            var resource = new Resource({url:url});
            resource.request.throttle = false;
            resource.request.throttleByServer = false;
            resource.request.type = 1;

            var jsonPromise = resource.fetchArrayBuffer();
            jsonPromise.then(function(imageData) {
                if(!imageData){
                    success(null);
                    return;
                }

                let data;
                let ut8Array = new Uint8Array(imageData);
                if(UPNG.isPNG(ut8Array)){
                    let img   = UPNG.decode(imageData);
                    data = UPNG.toRGBA8(img)[0];
                    data = new Uint8Array(data);
                }else{
                    let parser = new JpegDecoder();
                    parser.parse(ut8Array);
                    data = parser.getData(parser.width, parser.height).buffer;
                    data = new Uint8Array(data);
                    data = RGBToBRGA(data);
                }
                success(data);
            },function (e){
                success(null);
            });
        }

        function blendImages(imageDatas){
            let imageArr = [];
            for(let i = 0;i < imageDatas.length; i++){
                let imageData = imageDatas[i];
                if(imageData){
                    imageArr.push(imageData);
                }
            }

            if(imageArr.length == 0){
                return null;
            }

            let imageData = imageArr[0];
            let cloneImageData = new Uint8Array(imageData.length);
            for (let k = 0; k < imageData.length; k++) {
                cloneImageData[k] = imageData[k];
            }

            if(imageArr.length == 1) {
                return cloneImageData;
            }

            let blendImageData = cloneImageData;
            for(let j = 1; j< imageArr.length; j++){
                let secondImageData = imageArr[j];
                for(let m = 0; m < blendImageData.length; m ++){
                    let c1 = {r:blendImageData[m],g:blendImageData[m+1],b:blendImageData[m+2],a:blendImageData[m+3]/255};
                    let c2 = {r:secondImageData[m],g:secondImageData[m+1],b:secondImageData[m+2],a:secondImageData[m+3]/255};
                    // let c3 = rgbaSum(c1,c2);
                    let c3 = normal(c1,c2);
                    blendImageData[m] = c3.r;
                    blendImageData[m+1] = c3.g;
                    blendImageData[m+2] = c3.b;
                    blendImageData[m+3] = c3.a*255;
                    m = m + 3;
                }
            }

            //如果所有的瓦片加载完成，则销毁瓦片的内存data。
            if(imageDatas.length  == imageArr.length){
                imageDatas = [];
            }
            return blendImageData;
        }


        function RGBToBRGA(data){
            let newData = new Uint8Array(data.length * 4 / 3);
            let j = 0;
            for(let i = 0;i < data.length;i++){
                newData[j] = data[i];
                newData[j+1] = data[i+1];
                newData[j+2] = data[i+2];
                newData[j+3] = 255;
                i = i + 2;
                j = j + 4;
            }
            return newData;
        }

    function rgbaSum(c1, c2)
    {
        let a = c1.a + c2.a*(1-c1.a);
        return { r: (c1.r * c1.a + c2.r * c2.a * (1 - c1.a)) / a, g: (c1.g * c1.a + c2.g * c2.a * (1 - c1.a)) / a, b: (c1.b * c1.a + c2.b * c2.a * (1 - c1.a)) / a, a: a };
    }
var result = createCallBackWorker(createGeometry);
export default result;