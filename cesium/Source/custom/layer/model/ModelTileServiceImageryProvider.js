const combine = Cesium.combine;
const Credit  = Cesium.Credit;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Event = Cesium.Event;
const freezeObject = Cesium.freezeObject;
const isArray = Array.isArray;
const Rectangle = Cesium.Rectangle;
const Resource = Cesium.Resource;
const WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme;
const ImageryProvider = Cesium.ImageryProvider;
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const RequestState = Cesium.RequestState;
import ModelDataSource from './ModelDataSource';
import ElevationImageryProvider from '../ElevationImageryProvider';
const defer =Cesium.defer;

    var defaultParameters = {
        service : 'WMTS',
        version : '1.0.0',
        request : 'GetTile'
    };


    /**
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see UrlTemplateImageryProvider
     */
    class ModelTileServiceImageryProvider extends ElevationImageryProvider{
        constructor(viewer,options,shaders) {
            super(viewer,options);
            this.options = options;
            this.indexDbName = 'house_'+this.indexDbName;
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this.id = Math.random();
            this.needDecode = defaultValue(options.needDecode, false);

            //>>includeStart('debug', pragmas.debug);
            if (!defined(options.url)) {
                throw new DeveloperError('options.url is required.');
            }
            //>>includeEnd('debug');

            var resource = Resource.createIfNeeded(options.url);

            var style = options.style;
            var tileMatrixSetID = options.tileMatrixSetID;
            var url = resource.url;
            if (url.indexOf('{') >= 0) {
                var templateValues = {
                    style: style,
                    Style: style,
                    TileMatrixSet: tileMatrixSetID
                };

                resource.setTemplateValues(templateValues);
                this._useKvp = false;
            } else {
                resource.setQueryParameters(defaultParameters);
                this._useKvp = true;
            }

            this._resource = resource;
            this._layer = options.layer;
            this._style = style;
            this._tileMatrixSetID = tileMatrixSetID;
            this._tileMatrixLabels = options.tileMatrixLabels;
            this._format = defaultValue(options.format, 'image/jpeg');
            this._tileDiscardPolicy = options.tileDiscardPolicy;

            this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ellipsoid: options.ellipsoid});
            this._tileWidth = defaultValue(options.tileWidth, 256);
            this._tileHeight = defaultValue(options.tileHeight, 256);

            this._minimumLevel = defaultValue(options.minimumLevel, 0);
            this._maximumLevel = options.maximumLevel;

            this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
            this._dimensions = options.dimensions;

            var that = this;
            this._reload = undefined;
            if (defined(options.times)) {
                this._timeDynamicImagery = new TimeDynamicImagery({
                    clock: options.clock,
                    times: options.times,
                    requestImageFunction: function (x, y, level, request, interval) {
                        return requestImage(that, x, y, level, request, interval);
                    },
                    reloadFunction: function () {
                        if (defined(that._reload)) {
                            that._reload();
                        }
                    }
                });
            }

            this._readyPromise = defer();

            // Check the number of tiles at the minimum level.  If it's more than four,
            // throw an exception, because starting at the higher minimum
            // level will cause too many tiles to be downloaded and rendered.
            var swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
            var neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
            var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
            //>>includeStart('debug', pragmas.debug);
            if (tileCount > 4) {
                throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
            }
            //>>includeEnd('debug');

            this._errorEvent = new Event();

            var credit = options.credit;
            this._credit = typeof credit === 'string' ? new Credit(credit) : credit;

            this._subdomains = options.subdomains;
            if (isArray(this._subdomains)) {
                this._subdomains = this._subdomains.slice();
            } else if (defined(this._subdomains) && this._subdomains.length > 0) {
                this._subdomains = this._subdomains.split('');
            } else {
                this._subdomains = ['a', 'b', 'c'];
            }


            this.dataType = 'binary';

            if(options.hasOwnProperty('dataType')){
                this.dataType = options['dataType'];
            }else{
                this.dataType = 'Json';
            }

            this.hasTerrain = false;
            if(viewer.terrainProvider.name == 'RGBWorldTerrainProvider'){
                this.hasTerrain = true;
            }

            if(this.dataType == 'binary'){
                this.processor =   new Cesium.TaskProcessor('ModelPointBinaryWorker', Number.POSITIVE_INFINITY);
            }else{
                this.processor =   new Cesium.TaskProcessor('ModelPointWorker', Number.POSITIVE_INFINITY);
            }

            Cesium.FeatureDetection.supportsWebP.initialize();
            this.parseUrl(options.url);
            let result = this.parseModelUrlMap();

            let promiseArr = result.promiseArr;
            promiseArr.push(this.loadStyle());

            Promise.all(promiseArr).finally(function(){
                for(let i =0;i<result.modelArr.length;i++){
                    viewer.scene.primitives.remove(result.modelArr[i]);
                }
                this.ready = {
                    value : true
                };
                this._readyPromise.resolve(true);
            }.bind(this));

            this.cache = {};
            this.lightMap = {};
            this.showLevel = options.showLevel|| 16;
            this.image  = document.createElement('canvas');
            this.showTilesMap = {};
        }

        parseModelUrlMap(){
            let urlArray = [];
            if(this.options.urlMap){
                let urlTypeLevelMap = {};
                for(let key in this.options.urlMap){
                    let obj = this.options.urlMap[key];
                    let urlLevelMap = {};
                    for(let levelKey in obj){
                        let levelArr = levelKey.split('-');
                        let startLevel = levelArr[0];
                        let endLevel = levelArr[1];
                        for(let i = startLevel;i<= endLevel;i++){
                            urlLevelMap[i] = obj[levelKey];
                        }
                        urlArray.push(obj[levelKey]);
                    }

                    urlTypeLevelMap[key] = urlLevelMap;
                }

                this.options['urlTypeLevelMap'] = urlTypeLevelMap;
            }


            let modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
                Cesium.Cartesian3.fromDegrees(0,0, 0),
                new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(0), Cesium.Math.toRadians(0), Cesium.Math.toRadians(0))
            );

            let promiseArr = [];
            let modelArr = [];
            for(let i = 0;i<urlArray.length;i++){
                let model =  Cesium.Model.fromGltf({
                        asynchronous:false,
                        gltf : urlArray[i],
                        modelMatrix: modelMatrix,
                    });

                promiseArr.push(model.readyPromise);
                modelArr.push(model);
                viewer.scene.primitives.add(model);
            }
            return {promiseArr:promiseArr,modelArr:modelArr};
        }


        draw(tilesToRender){
            if(Cesium.cleanScreenTiles){
                this.showTilesMap = {};
                Cesium.cleanScreenTiles = false;
            }
            let renderTileMap = this.getRenderTileMap(tilesToRender);

            //移除不是当前屏幕要显示的瓦片
            for(let key in this.cache) {
                if (!renderTileMap[key]) {
                    let tile = this.cache[key];
                    tile.remove();
                }
            }

            // 增加本次最新的瓦片去绘制
            for(let name in renderTileMap){
                let ds = this.cache[name];
                if(ds){
                   ds.show(this.styleFun);
                   if(!this.showTilesMap[name]){
                       this.showTilesMap[name] = true;
                       // console.log('show:' + name);
                   }
                }
            }
        }

        /**
         * 获取当前要显示的tile
         * @returns {{}}
         */
        getRenderTileMap(renderTiles){
            let renderTileMap ={};
            for(let i = 0;i<renderTiles.length;i++){
                let tile = renderTiles[i];
                let tileImagerys = tile.data.imagery;
                for(let j = 0;j<tileImagerys.length;j++){
                    let tileImagery = tileImagerys[j];
                    let imagery = tileImagery.readyImagery;
                    if(imagery && imagery.imageryLayer._imageryProvider.id == this.id){
                        let key = imagery.x+'_'+imagery.y+'_'+imagery.level;
                        renderTileMap[key] = true;
                    }
                }
            }

            return renderTileMap;
        }

        /**
         * 解析url
         */
        parseUrl(url){
            let urlParts = url.split('?');
            let urlPartOne = urlParts[0].split('/mapserver/');

            this.host = urlPartOne[0];
            if(this._subdomains.length > 0){
                this.host = this.host.replace('{s}',this._subdomains[0]);
            }

            this.servername = urlPartOne[1].split('/')[1];
            this.queryParam = urlParts[1];
            let params = this.queryParam.split('&');
            for(let i = 0;i<params.length;i++){
                let param = params[i];
                let keyValue = param.split('=');
                if(keyValue[0] == 'styleId'){
                    this.styleId = keyValue[1];
                }

                if(keyValue[0] == 'return_type'){
                    this.return_type = keyValue[1];
                }
            }
        };

        loadStyle(){
            let promises = [];
            // let styleUrl = this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/layer/style.js?'+Math.random();
            let styleUrl = this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/layer/style.js?'+Math.random();
            let resource = Resource.createIfNeeded(styleUrl);
            let promise1 = resource.fetchText();
            promises.push(promise1);


            let promise2 = null;
            if(this.dataType == 'binary'){

                let styleUrl = this.host + '/mapserver/serverInfo/'+this.servername+'.json?'+Math.random();
                let resource = Resource.createIfNeeded(styleUrl);
                promise2 = resource.fetchJson();
                promises.push(promise2);
            }

            let deferred = defer();
            Promise.all(promises).then(function(result) {
                let styleStr = result[0];
                let results = result[1];
                let options =  {init:true,styleStr:styleStr,tileSize:this._tileWidth,
                    return_type:this.return_type,hasTerrain:this.hasTerrain};

                if (results && results.layerMap) {
                    this.serverInfo = {};
                    this.layerFieldMap = {};
                    for (let key in results.layerMap) {
                        this.serverInfo[key] = {
                            geometryType: results.layerMap[key].geometryType,
                            fieldsConfig: results.layerMap[key].fields
                        };
                        if (!this.layerFieldMap[key]) {
                            this.layerFieldMap[key] = results.layerMap[key].fields.length;
                        }
                    }

                    options.serverInfo = this.serverInfo;
                    options.layerFieldMap = this.layerFieldMap;
                }

                options.indexDbNames = this.getBottomProviderIndexDbNames();
                options.indexDbName = this.indexDbName;

                let promise =  this.processor.scheduleTask(options);
                promise.then(function() {
                    deferred.resolve();
                });
            }.bind(this));

            return deferred.promise;
        };

        requestImageNow(imageryProvider, col, row, level, request, interval) {
            var labels = imageryProvider._tileMatrixLabels;
            var tileMatrix = defined(labels) ? labels[level] : level.toString();
            var subdomains = imageryProvider._subdomains;
            var staticDimensions = imageryProvider._dimensions;
            var dynamicIntervalData = defined(interval) ? interval.data : undefined;

            var resource;
            if (!imageryProvider._useKvp) {
                var templateValues = {
                    z: tileMatrix,
                    y: row.toString(),
                    x: col.toString(),
                    s: subdomains[(col + row + level) % subdomains.length]
                };

                resource = imageryProvider._resource.getDerivedResource({
                    request: request
                });
                resource.setTemplateValues(templateValues);

                if (defined(staticDimensions)) {
                    resource.setTemplateValues(staticDimensions);
                }

                if (defined(dynamicIntervalData)) {
                    resource.setTemplateValues(dynamicIntervalData);
                }
            } else {
                // build KVP request
                var query = {};
                query.tilematrix = tileMatrix;
                query.layer = imageryProvider._layer;
                query.style = imageryProvider._style;
                query.tilerow = row;
                query.tilecol = col;
                query.tilematrixset = imageryProvider._tileMatrixSetID;
                query.format = imageryProvider._format;

                if (defined(staticDimensions)) {
                    query = combine(query, staticDimensions);
                }

                if (defined(dynamicIntervalData)) {
                    query = combine(query, dynamicIntervalData);
                }
                resource = imageryProvider._resource.getDerivedResource({
                    queryParameters: query,
                    request: request
                });
            }
            var deferred = defer();
            let xyz = {x:col,y:row,z:level};

            let tileLevel = resource._templateValues.z;
            if(tileLevel < this.showLevel || level < 1){
                deferred.reject();
                return deferred.promise;
            }

            this.requestJsonData(deferred,imageryProvider, resource,xyz,request);
            // if(!success){
            //     return undefined;
            // }
            return deferred.promise;
        }

        requestJsonData(deferred,imageryProvider, url,xyz,request){
            let x = xyz.x;
            let y = xyz.y;
            let z = xyz.z;
            let level = url._templateValues.z;

            let name = x+'_'+y+'_'+z;
            //如果缓存里有了，不需要再请求,或者为第0级
            if(this.cache[name] || z == 0){
                deferred.resolve(this.image);
                return deferred;
            }
            let rectangle = this._tilingScheme.tileXYToRectangle(xyz.x, xyz.y, xyz.z);
            let rectangleObj = {west:rectangle.west,north:rectangle.north,width:rectangle.width,height:rectangle.height};

            // let styleLevel = Math.round(this.viewer.camera.getLevel());
            let xyzStr = xyz.x+'_'+xyz.y+'_'+xyz.z;
            let promise =  this.processor.scheduleTask({url:url.url,xyz:xyzStr,needDecode:this.options.needDecode,level:level,
                filterLayerId:this.options.filterLayerId,
                ridingLanternLayerId:this.options.ridingLanternLayerId,ridingLanternHeight:this.ridingLanternHeight,
                ridingLanternColor:this.ridingLanternColor,ridingLanternAlpha:this.ridingLanternAlpha,ridingLanternType:this.ridingLanternType,
                ridingLanternSpeed:this.ridingLanternSpeed,
                waterLayerId:this.options.waterLayerId,
                rectangle:rectangleObj});

            promise.then(function(deferred,xyz,level,request,results){
                if(results == true){
                    request.state = RequestState.CANCELLED;
                    deferred.reject();
                    return;
                }
                this.jsonPromiseResult(deferred,xyz,level,results);
                this.updateOtherProviderElevation(xyz);
            }.bind(this,deferred,xyz,level,request),function(error ){
                deferred.reject();
                // let x = xyz.x;
                // let y = xyz.y;
                // let z = xyz.z;
                // let name = x+'_'+y+'_'+z;
                // console.log('error222: '+name);
            });
            return true;
        }

        jsonPromiseResult(deferred,xyz,level,results){
            let x = xyz.x;
            let y = xyz.y;
            let z = xyz.z;

            let name = x+'_'+y+'_'+z;
            let tile = new ModelDataSource(name,results,level,this.viewer,this.options,this.lightMap);
            this.cache[tile.name] = tile;

            tile.readyPromise.promise.then(function(){
                deferred.resolve(this.image);
            }.bind(this),function(){
                deferred.reject();
            });
        }

        updateTileElevation(xyz,tileSize){
            // var labels = this._tileMatrixLabels;
            // var tileMatrix = defined(labels) ? labels[xyz.z] : xyz.z;
            let name = xyz.x+'_'+xyz.y+'_'+xyz.z;
            if(!this.cache[name]){
                return false;
            }

            return true;
        }

        get url() {
            return this._resource.url;
        }

        get proxy() {
            return this._resource.proxy;
        }

        get tileWidth() {
            return this._tileWidth;
        }

        get tileHeight() {
            return this._tileHeight;
        }

        get maximumLevel() {
            return this._maximumLevel;
        }

        get minimumLevel() {
            return this._minimumLevel;
        }

        get tilingScheme() {
            return this._tilingScheme;
        }

        get rectangle() {
            return this._rectangle;
        }

        get tileDiscardPolicy() {
            return this._tileDiscardPolicy;
        }

        get errorEvent() {
            return this._errorEvent;
        }

        get format() {
            return this._format;
        }

        get readyPromise() {
            return this._readyPromise;
        }

        get credit() {
            return this._credit;
        }

        get hasAlphaChannel() {
            return true;
        }

        get clock() {
            return this._timeDynamicImagery.clock;
        }

        set clock(value) {
            this._timeDynamicImagery.clock = value;
        }

        get times() {
            return this._timeDynamicImagery.times;
        }

        set times(value) {
            this._timeDynamicImagery.times = value;
        }

        get dimensions() {
            return this._dimensions;
        }

        set dimensions(value){
            if (this._dimensions !== value) {
                this._dimensions = value;
                if (defined(this._reload)) {
                    this._reload();
                }
            }
        }

        getTileCredits(x, y, level) {
            return undefined;
        };

        requestImage(x, y, level, request) {
            var result;
            var timeDynamicImagery = this._timeDynamicImagery;
            var currentInterval;

            // Try and load from cache
            if (defined(timeDynamicImagery)) {
                currentInterval = timeDynamicImagery.currentInterval;
                result = timeDynamicImagery.getFromCache(x, y, level, request);
            }

            // Couldn't load from cache
            if (!defined(result)) {
                result = this.requestImageNow(this, x, y, level, request, currentInterval);
            }

            // If we are approaching an interval, preload this tile in the next interval
            if (defined(result) && defined(timeDynamicImagery)) {
                timeDynamicImagery.checkApproachingInterval(x, y, level, request);
            }

            return result;
        };

        pickFeatures(x, y, level, longitude, latitude) {
            return undefined;
        };


        updateLightShader(light){
            this.lightMap[light.type] = light;
            this.updateLightMap();
        }

        removeLightShader(type){
            delete this.lightMap[type];
            this.updateLightMap();
        };

        updateLightMap(){
            for(let key  in this.cache){
                let houseDataSource = this.cache[key];
                houseDataSource.setLightMap(this.lightMap);
            }
        }

        destroy(){
            for(let key in this.cache){
                let tile = this.cache[key];
                tile.destroy();
            }
            this.cache = {};
        };


        removeImageryFromCache(x,y,z){
            let key = x+'_'+y+'_'+z;
            let tile = this.cache[key];
            if(tile){
                tile.destroy();
                delete this.cache[key];
            }
        }


        //测试用
        removeTile(xyzStr){
            let tile = this.cache[xyzStr];
            if(tile){
                tile.remove();
            }
        }
    }
export default ModelTileServiceImageryProvider;
