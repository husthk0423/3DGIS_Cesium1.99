const combine = Cesium.combine;
const Credit  = Cesium.Credit;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Event = Cesium.Event;
const isArray = Array.isArray;
const Rectangle = Cesium.Rectangle;
const Resource = Cesium.Resource;
const WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme;
const when = Cesium.when;
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const Cesium3DTile = Cesium.Cesium3DTile;
const Matrix4 = Cesium.Matrix4;

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
    class Quadtree3DTilesProvider{
        constructor(viewer,options,shaders) {
            this.viewer = viewer;
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this.id = Math.random();

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

            let tilesetUrl =options.url.split('{z}')[0]+'tileset.json';
            this.loadRootJson(tilesetUrl).then(function(tilesetJson){
                this.ready = {
                    value : true
                }
                this._readyPromise.resolve(true);
                this.tilesetJson = tilesetJson;
                var gltfUpAxis = defined(tilesetJson.asset.gltfUpAxis) ? Cesium.Axis.fromName(tilesetJson.asset.gltfUpAxis) : Cesium.Axis.Y;
                this._gltfUpAxis = gltfUpAxis;
            }.bind(this));

            this.cache = {};

            this.options = options;
            this.lightMap = {};

            this.showLevel = options.showLevel|| 16;
            this.image  = document.createElement('canvas');

            this.clippingPlanes = options.clippingPlanes;
            this._modelMatrix = defined(options.modelMatrix) ? Matrix4.clone(options.modelMatrix) : Matrix4.clone(Matrix4.IDENTITY);
            this._heatmap = new Cesium.Cesium3DTilesetHeatmap(options.debugHeatmapTilePropertyName);
            this._imageBasedLightingFactor = new Cesium.Cartesian2(1.0, 1.0);
            Cesium.Cartesian2.clone(options.imageBasedLightingFactor, this._imageBasedLightingFactor);
            this._gltfUpAxis = undefined;
        }


        get imageBasedLightingFactor(){
            return this._imageBasedLightingFactor;
        }

        set imageBasedLightingFactor(value) {
            Cesium.Cartesian2.clone(value, this._imageBasedLightingFactor);
        }

        loadRootJson(tilesetUrl){
            var resource = Resource.createIfNeeded(tilesetUrl);
            return resource.fetchJson();
        }



        draw(tilesToRender){
            let renderTileMap = this.getRenderTileMap(tilesToRender);
            let passOptions = {ignoreCommands: false,
                isRender: true,
                requestTiles: true};
            // 增加本次最新的瓦片去绘制
            for(let name in renderTileMap){
                let tile = this.cache[name];
                if(tile){
                    tile.update(this,this.viewer.scene._frameState,passOptions);
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
                let tileImagerys = renderTiles[i].data.imagery;
                for(let j = 0;j<tileImagerys.length;j++){
                    let tileImagery = tileImagerys[j];
                    let imagery = tileImagery.readyImagery;
                    // let loadingimagery = tileImagery.loadingImagery;
                    // if(loadingimagery){
                    //     console.log('================='+loadingimagery.x+'_'+loadingimagery.y+'_'+loadingimagery.level);
                    // }
                    if(imagery && imagery.imageryLayer._imageryProvider.id == this.id){
                        let key = imagery.x+'_'+imagery.y+'_'+imagery.level;
                        renderTileMap[key] = true;
                    }
                }
            }

            return renderTileMap;
        }

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

            let name = x+'_'+y+'_'+z;
            //如果缓存里有了，不需要再请求
            if(this.cache[name]){
                deferred.resolve(this.image);
                return deferred;
            }

            this.tilesetJson.root.content = {uri:y+'.b3dm'};
            var tile = new Cesium3DTile(this, url, this.tilesetJson.root, null);
            tile._depth =  1;

            var requested = tile.requestContent();
            if(!requested){
                return undefined;
            }


            tile._contentReadyToProcessPromise.then(function(deferred,xyz,level,request,content){
                // if(results == true){
                //     request.state = RequestState.CANCELLED;
                //     deferred.reject();
                //     return;
                // }
                this.cache[name] = tile;
                deferred.resolve(this.image);
            }.bind(this,deferred,xyz,level,request),function(error ){
                deferred.reject();
            });
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

        get modelMatrix(){
            return this._modelMatrix;
        }

        set modelMatrix(value){
            this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
        }
    }
module.exports =Quadtree3DTilesProvider;
