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
const DrawFboHillShade = require('./draw/DrawFboHillShade');
// const DrawTilesFboVector = require('./draw/DrawTilesFboVector');

const HillShaderTile = require('./HillShaderTile');


const BufferUtil = Cesium.BufferUtil;
const RasterBoundsArray = require('../../mapbox/RasterBoundsArray');
const VertexArrayObject = require('../../mapbox/VertexArrayObject');
const Browser = require('../../mapbox/Browser');
const CesiumMath = Cesium.Math;
const EXTENT = 8192;


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
    class HillShaderTileServiceImageryProvider {
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


            this.ready = {
                value : true
            };
            this._readyPromise.resolve(true);

            this.cache = {};

            this.options = options;
            this.lightMap = {};

            this.showLevel = options.showLevel|| 16;

            this.processor =   new Cesium.TaskProcessor('HillShaderWorker', Number.POSITIVE_INFINITY);
            var canvas = document.createElement('canvas');
            this.image = canvas;

            this.ratio = 1;
            if(options.hasOwnProperty('ratio')){
                this.ratio = options.ratio;
            }

            this.textureQueue = new TextureQueue(this.viewer.scene.context._gl);
            //小数级别个数
            this.decimalLevel = 10;
            this.getDecimalLevel();
            this.viewer.scene.camera.moveEnd.addEventListener(this.getDecimalLevel.bind(this));

            this.encoding = 'mapbox';

            const rasterBoundsArray = new RasterBoundsArray();
            rasterBoundsArray.emplaceBack(0, 0, 0, 0, 0, 0);
            rasterBoundsArray.emplaceBack(EXTENT, 0, 32767, 0, 0, 0);
            rasterBoundsArray.emplaceBack(0, EXTENT, 0, 32767, 0, 0);
            rasterBoundsArray.emplaceBack(EXTENT, EXTENT, 32767, 32767, 0, 0);
            this.rasterBoundsBuffer = BufferUtil.fromStructArray(rasterBoundsArray, BufferUtil.BufferType.VERTEX);
            this.rasterBoundsVAO = new VertexArrayObject();

            if(this.options['hillshade-shadow-color']){
                this.options['hillshade-shadow-color'] =this.formatColor(this.options['hillshade-shadow-color'],1);
            }else{
                this.options['hillshade-shadow-color'] =this.formatColor('#000000',1);
            }
            if(this.options['hillshade-highlight-color']){
                this.options['hillshade-highlight-color'] =this.formatColor(this.options['hillshade-highlight-color'],1);
            }else{
                this.options['hillshade-highlight-color'] =this.formatColor('#00FF00',1);
            }
            if(this.options['hillshade-accent-color']){
                this.options['hillshade-accent-color'] = this.formatColor(this.options['hillshade-accent-color'],1);
            }else{
                this.options['hillshade-accent-color'] = this.formatColor('#000000',1);
            }
            if(!this.options['hillshade-illumination-direction']){
                this.options['hillshade-illumination-direction'] = 335;
            }
            if(!this.options['hillshade-illumination-anchor']){
                this.options['hillshade-illumination-anchor'] = 'viewport';
            }
            if(!this.options['hillshade-exaggeration']){
                this.options['hillshade-exaggeration'] = 0.5;
            }
        }


        //十六进制颜色值转为rgba
        formatColor(hexColor,alpha){
            let rgbColor = this.fromHex(hexColor);
            let rgba = [rgbColor[0]/255.0,rgbColor[1]/255.0,rgbColor[2]/255.0,alpha];
            return rgba;
        }

        fromHex(color)
        {
            color = color.toUpperCase();
            var regexpHex=/^#[0-9a-fA-F]{3,6}$/;//Hex

            if(regexpHex.test(color)){

                var hexArray = [];
                var count=1;

                for(var i=1;i<=3;i++){

                    if(color.length-2*i>3-i){
                        hexArray.push(Number("0x"+color.substring(count,count+2)));
                        count+=2;

                    }else{
                        hexArray.push(Number("0x"+color.charAt(count)+color.charAt(count)));
                        count+=1;
                    }
                }

                return hexArray;
            }
        }

        draw(tilesToRender){
            // let renderTileMap = this.getRenderTileMap(tilesToRender);
            // let tiles = [];
            // for(let name in renderTileMap){
            //     let tile = this.cache[name];
            //     if(tile){
            //         let texture = this.textureQueue.getOne(tile.name,this._zoom);
            //         if(!texture){
            //             tiles.push(tile);
            //         }
            //     }
            // }
            // DrawTilesFboVector(this,tiles);
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

        requestJsonData(deferred,imageryProvider, resource,xyz,request){
            let x = xyz.x;
            let y = xyz.y;
            let z = xyz.z;
            let level = resource._templateValues.z;

            let name = x+'_'+y+'_'+z;
            //如果缓存里有了，不需要再请求
            let hillShaderTile = this.cache[name];
            if(hillShaderTile){
                deferred.resolve({isTexture:true,texture:hillShaderTile.texture});
                return deferred;
            }

            let imagePromise = resource.fetchImage();
            if(!imagePromise){
                return false;
            }

            imagePromise.then(function(deferred,xyz,level,request,image){
               let rawImageData =  Browser.getImageData(image);
                let promise =  this.processor.scheduleTask({rawImageData:rawImageData});
                promise.then(function(deferred,xyz,level,request,results){
                    if(results == true){
                        request.state = RequestState.CANCELLED;
                        deferred.reject();
                        return;
                    }
                    this.jsonPromiseResult(deferred,xyz,level,results);
                }.bind(this,deferred,xyz,level,request),function(e,e1){
                    deferred.reject();
                }.bind());
            }.bind(this,deferred,xyz,level,request),function(deferred){
                deferred.reject();
            }.bind(this,deferred));



            // url.url = 'http://121.36.53.64:8091/mapserver/data/kjgh_fw0514/getData?x=425&y=91&l=10&styleId=kjgh_kx&tilesize=512';
            //     if(url.url == 'http://ditu1.zjzwfw.gov.cn/mapserver/data/zjvmap25/getData?x=27316&y=5434&l=16&styleId=tdt_biaozhunyangshi_2017&tilesize=512'){

                // }

            return true;
        }

        jsonPromiseResult(deferred,xyz,level,dem){
            let x = xyz.x;
            let y = xyz.y;

            let name = x+'_'+y+'_'+xyz.z;

            let rectangle = this._tilingScheme.tileXYToRectangle(xyz.x, xyz.y, xyz.z);
            let rectangle1 = this._tilingScheme.tileXYToRectangle(xyz.x, xyz.y+1, xyz.z);
            let lat = CesiumMath.toDegrees(rectangle.north - rectangle.height/2);
            let lat1 = CesiumMath.toDegrees(rectangle1.north - rectangle1.height/2);

            let latrange = [lat,lat1];
            let hillShaderTile = new HillShaderTile(name,this.viewer.scene.context._gl,dem,null,latrange,level);
            this.cache[name] = hillShaderTile;

            let _texture = this.drawFbo(hillShaderTile,name);
            let texture  = {_target:3553,_texture:_texture,destroy:this.destroyTexture};
            hillShaderTile.texture = texture;
            deferred.resolve({isTexture:true,texture:texture});
        }

        destroyTexture(){

        }

        drawFbo(tile,key,zoom){
            return DrawFboHillShade(this,tile,key);
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
            let key = x+'_'+y+'_'+z;
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
            // return null;
            // let z = imagery.level;
            // let labels = this._tileMatrixLabels;
            // let tileMatrix = defined(labels) ? labels[z] : z.toString();
            // let key = imagery.x + '_'+imagery.y+'_'+tileMatrix;
            // let _texture = this.textureQueue.get(key,this._zoom);
            // if(_texture){
            //     let texture  = {_target:3553,_texture:_texture,destroy:this.destroyTexture};
            //     return texture;
            // }
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
module.exports =HillShaderTileServiceImageryProvider;
