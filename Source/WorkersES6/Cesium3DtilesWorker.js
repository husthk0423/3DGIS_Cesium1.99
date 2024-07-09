/**
 * 请求3dtiles瓦片，并将瓦片存到indexdb中
 */
import createTaskProcessorWorker from './createTaskProcessorWorker.js';
import Resource from '../Core/Resource.js';
import IndexDBTool from '../util/IndexDBTool';
import defer from "../Core/defer.js";

let isDbError = true;
let keyMap = {};
let db = null;
let tName = '';

//清理缓存后，重新获取indexdb的promise对象
let catchPromise = null;
//清理缓存后，出现indexdb异常的次数
let catchCount = 0;

/* global require */
function request3dTiles(parameters, transferableObjects) {
    //初始化
    if(parameters.init == true){
        tName = parameters.tName;
        let defer1 = defer();
        let useIndexDB = parameters.useIndexDB;
        if(!useIndexDB){
            isDbError = true;
            defer1.resolve();
            return defer1.promise;
        }
        let promise = IndexDBTool.createDB(tName,'key',false,'keyIndex','key');
        promise.then(function(dbItem){
            db = dbItem;
            keyMap = {};
            isDbError = false;
            defer1.resolve();
        },function(e){
            isDbError = true;
            defer1.resolve();
        });
        return defer1.promise;
    }

    if(parameters.type == '3dtile'){
        //初次请求url
        let url = parameters.url;
        let resource = new Resource({url:url});
        resource.request.throttle = false;
        resource.request.throttleByServer = parameters.throttleByServer;
        resource.request.type = 2;
        resource.request.priorityFunction = createPriorityFunction(parameters.priority);

        return getTileData(resource,'arrayBuffer',transferableObjects);
    }

    if(parameters.type == 'image'){
        //初次请求url
        let url = parameters.url;
        let resource = new Resource({url:url});
        resource.request.throttle = false;
        resource.request.throttleByServer = true;
        resource.request.type = 2;
        return getTileData(resource,'image',transferableObjects);
    }
}

function createPriorityFunction(priority) {
    return function () {
        return priority;
    };
}

function getUrlKey(url){
    let urlArr = url.split('//');
    //协议头
    let protocolHeader = urlArr[0];
    //协议头后面的地址
    let otherUrl = urlArr[1];
    let start = otherUrl.indexOf('/');
    return otherUrl.substring(start+1);
}


function getTileData(resource,type,transferableObjects){
    let urlKey = getUrlKey(resource._url);
    let defer1 = defer();

    if(isDbError){
        return fetchArrayBufferAndSaveIndexDB(resource,urlKey,defer1,type,transferableObjects).promise;
    }

    if(keyMap[urlKey]){// indexdb中没找到
        return fetchArrayBufferAndSaveIndexDB(resource,urlKey,defer1,type,transferableObjects).promise;
    }

    let defer2 = defer();
    try{
        defer2.promise = IndexDBTool.getByPkey(db,tName,urlKey);
    }catch (e) {
        let promise1 = catchIndexError();
        promise1.then(function (){
            catchCount--;
            if(catchCount == 0){
                catchPromise = null;
            }
            defer2.promise = IndexDBTool.getByPkey(db,tName,urlKey);
        });
    }

    defer2.promise.then(function(result){
        if(result){
            //返回从indexdb中取到的数据
            transferableObjects.push(result.data);
            // console.log('找到瓦片');
            defer1.resolve(result.data);
        }else{
            fetchArrayBufferAndSaveIndexDB(resource,urlKey,defer1,type,transferableObjects);
        }
    });

    return defer1.promise;
}


function fetchArrayBufferAndSaveIndexDB(resource,urlKey,defer1,type,transferableObjects){
    let promise1;
    if(type == 'image'){
        promise1 = resource.fetchImage({
            skipColorSpaceConversion: true,
            preferImageBitmap: true,
            inWorker:true
        });
    }

    if(type == 'arrayBuffer'){
        promise1 = resource.fetchArrayBuffer();
    }

    if (!promise1) {
        defer1.resolve(null);
        keyMap[urlKey] = true;
        // console.log('重新请求： '+resource._url);
        return defer1;
    }

    // console.log('请求==========： '+resource._url);
    promise1.then(function(result1){
        if(isDbError){
            delete keyMap[urlKey];
            //返回从网络请求到的数据
            transferableObjects.push(result1);
            defer1.resolve(result1);
            return;
        }

        // let promise2 = IndexDBTool.setByKey(db,tName,resource._url,result1);

        let defer2 = defer();
        try{
            defer2.promise = IndexDBTool.setByKey(db,tName,urlKey,result1);
        }catch (e) {
            let promise1 = catchIndexError();
            promise1.then(function (){
                catchCount--;
                if(catchCount == 0){
                    catchPromise = null;
                }
                defer2.promise = IndexDBTool.setByKey(db,tName,urlKey,result1);
            });
        }

        defer2.promise.finally(function(){
            delete keyMap[urlKey];
            //返回从网络请求到的数据
            transferableObjects.push(result1);
            defer1.resolve(result1);
        });
    },function(e){
        defer1.reject(e);
    });

    return defer1;
}


function catchIndexError(){
    catchCount++;
    if (catchPromise){
        return catchPromise;
    }
    catchPromise = IndexDBTool.createDB(tName,'key',false,'keyIndex','key');
    catchPromise.then(function(dbItem){
        db = dbItem;
        keyMap = {};
    });
    return catchPromise;
}

var result = createTaskProcessorWorker(request3dTiles);
export default result;
