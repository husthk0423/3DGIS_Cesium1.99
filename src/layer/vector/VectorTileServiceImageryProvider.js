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
const when = Cesium.when;
const ImageryProvider = Cesium.ImageryProvider;
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const RequestState = Cesium.RequestState;
const ProgramFactory = require('../shaders/ProgramFactory');
const TextureQueue = require('../../utils/TextureQueue');
const LineAtlas = require('./LineAtlas');
const DrawFboVector = require('./draw/DrawFboVector');
const DrawTilesFboVector = require('./draw/DrawTilesFboVector');
const VectorTile = require('./VectorTile');
const FillBucket = Cesium.FillBucket;
const LineBucket = Cesium.LineBucket;




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
    class VectorTileServiceImageryProvider {
        constructor(viewer,options,shaders) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this.id = Math.random();
            this.viewer = viewer;
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

            this._readyPromise = when.defer();

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


            this.parseUrl(options.url);
            this.cache = {};

            this.options = options;
            this.lightMap = {};

            this.showLevel = options.showLevel|| 16;

            this.dataType = 'binary';

            if(options.hasOwnProperty('dataType')){
                this.dataType = options['dataType'];
            }else{
                this.dataType = 'Json';
            }

            if(this.dataType == 'binary'){
                this.processor =   new Cesium.TaskProcessor('VectorBinaryWorker', Number.POSITIVE_INFINITY);
            }else{
                this.processor =   new Cesium.TaskProcessor('VectorWorker', Number.POSITIVE_INFINITY);
            }

            // this.image  = document.createElement('canvas');

            var canvas = document.createElement('canvas');
            this.image = canvas;

            this.ratio = 1;
            if(options.hasOwnProperty('ratio')){
                this.ratio = options.ratio;
            }

            this.textureQueue = new TextureQueue(this.viewer.scene.context._gl);
            this.lineAtlas = new LineAtlas(256, 512);

            //小数级别个数
            this.decimalLevel = 10;
            this.getDecimalLevel();
            this.viewer.scene.camera.moveEnd.addEventListener(this.getDecimalLevel.bind(this));


            //正在更新样式的瓦片Map
            this.changeStyleTilesMap = {};
            //需要绘制的瓦片Map
            this.needDrawTilesMap = {};
            //需要绘制的瓦片集合
            this.needDrawTiles = [];


            Promise.all(this.loadStyle()).then(function(){
                this.ready = {
                    value : true
                }
                this._readyPromise.resolve(true);
            }.bind(this));
        }


        draw(tilesToRender){
            let renderTileMap = this.getRenderTileMap(tilesToRender);
            let styleLevel = this.getStyleLevel();
            for(let name in renderTileMap){
                let tile = this.cache[name];
                if(tile){
                    let texture = this.textureQueue.getOne(tile.name,this._zoom,styleLevel);
                    if(!texture){
                        let key = tile.name+'_'+this._zoom+'_'+styleLevel;
                        if(this.needDrawTilesMap[key]){
                            continue;
                        }

                        this.needDrawTilesMap[key] = true;
                        if(styleLevel != tile.level){
                            this.changeStyle(tile,styleLevel,key);
                        }else{
                            this.needDrawTiles.push(tile);
                        }
                    }
                }
            }
            DrawTilesFboVector(this,this.needDrawTiles,this.needDrawTilesMap,styleLevel);
        }

        getStyleLevel(){
            let z = Math.round(this.viewer.camera.getLevel()) -1;
            let labels = this._tileMatrixLabels;
            let styleLevel = defined(labels) ? labels[z] : z.toString();
            return styleLevel;
        }

        changeStyle(tile,styleLevel,key){
            if(this.changeStyleTilesMap[key]){
                return;
            }

            this.changeStyleTilesMap[key] = true;
            let promise =  this.processor.scheduleTask({changeStyle:true,needDecode:this.options.needDecode,level:styleLevel,
                tileData:tile.tileData,filterLayerId:this.options.filterLayerId,dataType:this.dataType});
            promise.then(function(tile,key,buckets){
                this.createBuffer(buckets);
                tile.buckets = buckets;
                this.needDrawTiles.push(tile);
                delete this.changeStyleTilesMap[key];
            }.bind(this,tile,key),function(key,error ){
                delete this.changeStyleTilesMap[key];
            }.bind(this,key));
        }

        /**
         * 获取当前要显示的tile
         * @returns {{}}
         */
        getRenderTileMap(renderTiles){
            let renderTileMap ={};
            let labels = this._tileMatrixLabels;
            for(let i = 0;i<renderTiles.length;i++){
                let tileImagerys = renderTiles[i].data.imagery;
                for(let j = 0;j<tileImagerys.length;j++){
                    let tileImagery = tileImagerys[j];
                    let imagery = tileImagery.readyImagery;
                    if(imagery && imagery.imageryLayer._imageryProvider.id == this.id){
                        let level = defined(labels) ? labels[imagery.level] : imagery.level;
                        let key = imagery.x+'_'+imagery.y+'_'+level;
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

            let deferred = when.defer();
            let promise;
            when.all(promises, function(result) {
                let styleStr = result[0];
                let results = result[1];
                let options =  {init:true,styleStr:styleStr,tileSize:this._tileWidth,
                    return_type:this.return_type};

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

                let promise =  this.processor.scheduleTask(options);
                when.all(promise, function() {
                    deferred.resolve();
                });
            }.bind(this));

            return [deferred.promise];
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
            var deferred = when.defer();
            let xyz = {x:col,y:row,z:level};

            let tileLevel = resource._templateValues.z;
            let cameraLevel = this.viewer.camera.getLevel();
            if(tileLevel < this.showLevel){
                deferred.reject();
                return deferred.promise;
            }

            let success = this.requestJsonData(deferred,imageryProvider, resource,xyz,request);
            if(!success){
                return undefined;
            }
            return deferred.promise;
        }

        requestJsonData(deferred,imageryProvider, url,xyz,request){
            let x = xyz.x;
            let y = xyz.y;
            let z = xyz.z;
            let level = url._templateValues.z;

            let name = x+'_'+y+'_'+level;
            //如果缓存里有了，不需要再请求
            let vectorTile = this.cache[name];
            if(vectorTile){
                deferred.resolve({isTexture:true,texture:vectorTile.texture});
                return deferred;
            }

            // url.url = 'http://121.36.53.64:8091/mapserver/data/kjgh_fw0514/getData?x=425&y=91&l=10&styleId=kjgh_kx&tilesize=512';
            //     if(url.url == 'http://114.116.200.186:8091/mapserver/data/空间规划_城乡总体规划/getData?x=26711&y=5085&l=16&styleId=%E5%9F%8E%E4%B9%A1%E6%80%BB%E4%BD%93%E8%A7%84%E5%88%92&tilesize=512'){
            let promise =  this.processor.scheduleTask({url:url.url,needDecode:this.options.needDecode,level:level,
                        filterLayerId:this.options.filterLayerId});
                    promise.then(function(deferred,xyz,level,request,url,results){
                        if(results == true){
                            request.state = RequestState.CANCELLED;
                            deferred.reject();
                            return;
                        }
                        this.jsonPromiseResult(deferred,xyz,level,results);
                    }.bind(this,deferred,xyz,level,request,url.url),function(deferred,error ){
                        deferred.reject();
                    }.bind(this,deferred));
                // }

            return true;
        }

        jsonPromiseResult(deferred,xyz,level,results){
            let x = xyz.x;
            let y = xyz.y;

            let buckets = results.buckets;
            let tileData = results.tileData;
            let name = x+'_'+y+'_'+level;
            this.createBuffer(buckets);
            let _texture = this.drawFbo(buckets,name,level);
            let texture  = {_target:3553,_texture:_texture,destroy:this.destroyTexture};

            let vectorTile = new VectorTile(name,level,tileData,buckets,texture);
            this.cache[name] = vectorTile;
            deferred.resolve({isTexture:true,texture:texture});
        }

        destroyTexture(){

        }

        drawFbo(buckets,key,level){
            return DrawFboVector(this,buckets,key,level);
        }

        createBuffer(bucktes){
            for(let i= 0;i<bucktes.length;i++){
                let bucket = bucktes[i];
                if(bucket.type == 'fill'){
                    FillBucket.createBuffer(bucket);
                }

                if(bucket.type == 'line'){
                    LineBucket.createBuffer(bucket);
                }
            }
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



        destroy(){
            this.viewer.scene.camera.moveEnd.removeEventListener(this.getDecimalLevel.bind(this));
            for(let key in this.cache){
                let tile = this.cache[key];
                tile.destroy();
            }
            this.cache = {};
        };

        removeImageryFromCache(x,y,z){
            let labels = this._tileMatrixLabels;
            let level = defined(labels) ? labels[z] : z;
            let key = x+'_'+y+'_'+level;
            let tile = this.cache[key];
            if(tile){
                tile.destroy();
                this.textureQueue.remove(tile.name);
                delete this.cache[key];
            }
        }

        useProgram(name){
            return ProgramFactory.createProgram(this.viewer.scene.context._gl,name);
        }

        getTexture(imagery){
            let z = imagery.level;
            let labels = this._tileMatrixLabels;
            let tileMatrix = defined(labels) ? labels[z] : z.toString();
            let key = imagery.x + '_'+imagery.y+'_'+tileMatrix;

            let styleLevel = this.getStyleLevel();
            let _texture = this.textureQueue.get(key,this._zoom,styleLevel);
            if(_texture){
                let texture  = {_target:3553,_texture:_texture,destroy:this.destroyTexture};
                return texture;
            }
            return null;
        }


        //当矢量图层模式为帧贴图模式时，获取小数层级
        getDecimalLevel(){
            let scale = 1.0;
            //计算分几个小的等级
            let decimalLevel = this.decimalLevel;

            let _zoom = this.viewer.camera.getLevel();
            let arr = _zoom.toString().split('.');
            let a = arr[0];
            let b = '0.'+arr[1];

            a = Number(a);
            let currLevel = a;
            b = Number(b);


            if(b){
                let decimal =  Math.round(b*decimalLevel)/decimalLevel;
                currLevel = currLevel+decimal;
                scale = scale+ decimal;
            }

            //整数level
            this.zoom = a;
            //带小数level
            this._zoom = currLevel;
            this.scale = scale;
        }
    }
module.exports =VectorTileServiceImageryProvider;
