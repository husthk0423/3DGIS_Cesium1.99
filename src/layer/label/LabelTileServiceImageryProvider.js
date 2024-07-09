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
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const LabelTile = require('./LabelTile');
const GlyphSource = require('./glyph/GlyphSource');
const AvoidTile = require('./AvoidTile');
const Buffer = require('../../utils/Buffer');
const VarintReader = require('../../utils/VarintReader');

const ElevationImageryProvider = require('../ElevationImageryProvider');
const ElevationTool = require('../../utils/ElevationTool');

    let defaultParameters = {
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
    class LabelTileServiceImageryProvider extends ElevationImageryProvider{
        constructor(viewer,options) {
            super(viewer,options);
            this.indexDbName = 'house_'+this.indexDbName;
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this.id = Math.random();
            this.scene = viewer.scene;
            this.needDecode = defaultValue(options.needDecode, false);
            this.defaultHeight = defaultValue(options.defaultHeight, 0);

            //>>includeStart('debug', pragmas.debug);
            if (!defined(options.url)) {
                throw new DeveloperError('options.url is required.');
            }
            //>>includeEnd('debug');

            let resource = Resource.createIfNeeded(options.url);

            let style = options.style;
            let tileMatrixSetID = options.tileMatrixSetID;
            let url = resource.url;
            if (url.indexOf('{') >= 0) {
                let templateValues = {
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

            let that = this;
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
            let swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
            let neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
            let tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
            //>>includeStart('debug', pragmas.debug);
            if (tileCount > 4) {
                throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
            }
            //>>includeEnd('debug');

            this._errorEvent = new Event();

            let credit = options.credit;
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


            this.needDecode = options.needDecode;
            this.parseUrl(options.url);

            let promises = this.loadStyle();

            if(this.dataType == 'binary'){
                let styleUrl = this.host + '/mapserver/serverInfo/'+this.servername+'.json?'+Math.random();
                let resource = Resource.createIfNeeded(styleUrl);
                let promise2 = resource.fetchJson();
                promises.push(promise2);
            }

            this.hasTerrain = false;
            if(viewer.terrainProvider.name == 'RGBWorldTerrainProvider'){
                this.hasTerrain = true;
            }

            this.dbMap = {};
            //获取本图层下面的图层indexDbNames
            this.indexDbNames = this.getBottomProviderIndexDbNames();
            let promise3 = ElevationTool.getDBMap(this.indexDbNames,this.dbMap).promise;
            promises.push(promise3);

            Promise.all(promises).then(function(data){
                let results = data[2];
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
                };

                this.ready = {
                    value : true
                }
                this._readyPromise.resolve(true);
            }.bind(this));


            this.cache = {};
            //纹理
            this.textures = {};
            //样式
            this.styleMap = {};


            if(options.glyphUrl  && options.fontName){
                this.fontName = options.fontName;
                if(!this.viewer.glyphSource){
                    this.viewer.glyphSource = new GlyphSource(options.glyphUrl);
                }
            }


            //上一次的坐标点
            this.prevPosition = null;
            //上一次渲染的瓦片个数
            this.prevRenderTilesLength = -1;
            this.image  = document.createElement('canvas');
        }



        updateStle(url){
            let resource = Resource.createIfNeeded(url);
            let style = this._style;
            let tileMatrixSetID = this.tileMatrixSetID;
            url = resource.url;
            if (url.indexOf('{') >= 0) {
                let templateValues = {
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
            this.parseUrl(url);

            Promise.all(this.loadStyle()).then(function(){
                for(let key in this.cache){
                    let labelTile = this.cache[key];
                    labelTile.reset();
                }
            }.bind(this));

            //纹理
            this.textures = {};
            //样式
            this.styleMap = {};
        }

        draw(tilesToRender){
            let renderTileMap = this.getRenderTileMap(tilesToRender);

            //移除不是当前屏幕要显示的瓦片
            for(let key in this.cache){
                if (!renderTileMap[key]){
                    let tile = this.cache[key];
                    tile.remove();
                }
            }


            let renderTiles = [];
            //增加本次最新的瓦片去绘制
            for(let name in renderTileMap){
                let labelTile = this.cache[name];
                if(labelTile && labelTile.ready){
                    renderTiles.push(labelTile);
                    labelTile.show(this.styleFun);
                }
            }

            this.avoid(renderTiles);
        }

        avoid(renderTiles){
            let position = this.scene.camera.position;
            let dis = 100;
            if(this.prevPosition){
                dis = Cesium.Cartesian3.distance(position,this.prevPosition);
            }

            let heading = Cesium.Math.toDegrees(this.viewer.camera.heading).toFixed(2);
            if(heading > 180){
                heading = heading - 360;
            }


            if(dis >10){
                AvoidTile.init(renderTiles,heading,this.styleMap,this.viewer);
                this.prevPosition = new Cesium.Cartesian3(position.x,position.y,position.z);
            }else{
                if(heading !=this.prevHeading || this.prevRenderTilesLength !=renderTiles.length && renderTiles.length  > 0){
                    AvoidTile.setTiles(renderTiles,heading);
                    this.prevRenderTilesLength = renderTiles.length;
                }
                this.prevHeading = heading;
            }

            if(!AvoidTile.isFinished()){
                AvoidTile.avoidTile();
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
                    return;
                }
            }
        };

        loadStyle(){
            let styleUrl = this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/label/style.js?'+Math.random();
            let resource = Resource.createIfNeeded(styleUrl);
            let promise1 = resource.fetchText().then(function(result){
                if(this.dataType == 'binary'){
                    this.styleFun = new Function("render","level", result);
                }else{
                    this.styleFun = new Function("drawer","level", result);
                }
            }.bind(this));


            let deferred = when.defer();
            let imageUrl = this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/label/texture.js?'+Math.random();
            let imageResource = Resource.createIfNeeded(imageUrl);
            imageResource.fetchText().then(function(deferred,result){
                let textures = JSON.parse(result);
                let totalCount = 0;
                for(let i in textures){
                    totalCount++;
                }

                if(totalCount == 0){
                    deferred.resolve();
                    return;
                }

                let count = 0;
                for(let key in textures){
                    let img = new Image();
                    img.name = key;
                    img.onload = function(data) {
                        count++;
                        let name = data.target.name;
                        this.textures[name] =data.target;
                        if(count == totalCount){
                            deferred.resolve();
                        }
                    }.bind(this);
                    img.src = textures[key];
                }
            }.bind(this,deferred));

            return [promise1,deferred.promise];
        };

        requestImageNow(imageryProvider, col, row, level, request, interval) {
            let labels = imageryProvider._tileMatrixLabels;
            let tileMatrix = defined(labels) ? labels[level] : level.toString();
            let subdomains = imageryProvider._subdomains;
            let staticDimensions = imageryProvider._dimensions;
            let dynamicIntervalData = defined(interval) ? interval.data : undefined;

            let resource;
            if (!imageryProvider._useKvp) {
                let templateValues = {
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
                let query = {};
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
            let deferred = when.defer();
            let xyz = {x:col,y:row,z:level};
            let success = this.requestJsonData(deferred,imageryProvider, resource,xyz);
            if(!success){
                return undefined;
            }
            return deferred.promise;
        }

        requestJsonData(deferred,imageryProvider, url,xyz){
            let resource = Resource.createIfNeeded(url);
            let promises =[];
            let jsonPromise = null;
            if(this.dataType == 'binary'){
                jsonPromise = resource.fetchArrayBuffer();
            }else{
                jsonPromise = resource.fetchJson();
            }

            if(!jsonPromise){
                return false;
            }

            promises.push(jsonPromise);

            let level = url._templateValues.z;

            when.all(promises,function(deferred,xyz,level,result){
                let data = result[0];
                let labelTile = this.jsonPromiseResult(xyz,level,data);
                let stacks = this.getStacks(labelTile.features);

                let xyzStr = xyz.x+'_'+xyz.y+'_'+xyz.z;
                let promise = ElevationTool.getElevation(this.dbMap,this.indexDbNames,xyzStr);
                promise.then(function(deferred,labelTile,xyzStr,elevationDataMap){
                    labelTile.updateElevationData(elevationDataMap);
                    this.getGlyphs(stacks,function(deferred,labelTile,glyphs){
                        labelTile.labelCollection.setGlyphs(glyphs);
                        labelTile.roadLabelCollection.setGlyphs(glyphs);
                        labelTile.ready = true;
                        deferred.resolve(this.image);
                    }.bind(this,deferred,labelTile));
                }.bind(this,deferred,labelTile,xyzStr));
            }.bind(this,deferred,xyz,level));
            return true;
        }

        jsonPromiseResult(xyz,level,data){
            if(this.dataType == 'binary'){
                data = this.toBuffer(data);
                data = this.parseBinaryData(data);
            }

            let labelData =  data.label? data.label:data;

            if(data !={}){
                let x = xyz.x;
                let y = xyz.y;
                let z = xyz.z;

                let rectangle = this._tilingScheme.tileXYToRectangle(x, y, z);
                let name = x+'_'+y+'_'+z;
                let labelTile = this.cache[name];
                if(!labelTile){
                    labelTile = new LabelTile(this.defaultHeight,name,xyz,this.tileWidth,rectangle,labelData,this.indexDbNames,this.styleFun,this.dataType,
                        level,this.styleMap,this.textures,this.scene);
                    this.cache[labelTile.name] = labelTile;
                }

                return labelTile;
            }
        }

        toBuffer(ab) {
            let buf = new Buffer(ab.byteLength);
            let view = new Uint8Array(ab);
            for (let i = 0; i < buf.length; ++i) {
                buf[i] = view[i];
            }
            return buf;
        }

        parseBinaryData(buf){
            let vant = new VarintReader(buf, 4, this.layerFieldMap);
            let layerNameArr = vant.getAllLayerNames();
            let layers = {};
            for (let i = 0; i < layerNameArr.length; i++) {
                let layerName = layerNameArr[i];
                layers[layerName] = {
                    features: [],
                    fieldsConfig: this.serverInfo[layerName] ? this.serverInfo[layerName].fieldsConfig : {},
                    type: 1
                };

                let geometryType =vant.getGeometryType(layerName);
                let props = vant.getLayerPro(layerName);
                if (geometryType.toLowerCase() == "point") {
                    layers[layerName].type = 1;
                } else if (geometryType.toLowerCase() == "line" ||
                    geometryType.toLowerCase() == "linestring" || geometryType.toLowerCase() == "multilinestring") {
                    layers[layerName].type = 2;
                }
                if (props && props.length > 0) {
                    for (let k = 0; k < props.length; k++) {
                        let tDataArr = [];
                        tDataArr.push(geometryType);
                        tDataArr.push(props[k]);
                        tDataArr.push(vant.getCoordinatesByIndex(layerName, k, 10));
                        layers[layerName].features.push(tDataArr);
                    }
                }
            }
            return layers;
        }

        //获取文字的code码,默认只支持一种字体
        getStacks(features){
            let stack = [];
            let statcks = {};
            statcks[this.fontName] = stack;
            let index = 0;
            for(let i = 0;i<features.length;i++){
                let label = features[i].label;
                if(label){
                    for (let j = 0; j < label.length; j++) {
                        stack[index] = label.charCodeAt(j);
                        index++;
                    }
                }
            }

            //多加个？号
            stack[index] = '?'.charCodeAt(0);
            return statcks;
        }

        // 获取字体
        getGlyphs(stacks, callback) {
            let remaining = Object.keys(stacks).length;
            const allGlyphs = {};

            for (const fontName in stacks) {
                this.viewer.glyphSource.getSimpleGlyphs(fontName, stacks[fontName],  done);
            }

            function done(err, glyphs, fontName) {
                if (err) console.error(err);

                allGlyphs[fontName] = glyphs;
                remaining--;

                if (remaining === 0)
                    callback(allGlyphs);
            }
        }



        updateTileElevation(xyz,tileSize){
            // var labels = this._tileMatrixLabels;
            // var tileMatrix = defined(labels) ? labels[xyz.z] : xyz.z;
            let name = xyz.x+'_'+xyz.y+'_'+xyz.z;
            let tile = this.cache[name];

            //如果label瓦片还没，或者瓦片已经存在，并且已经有高程值了
            if(!tile){
                return false;
            }

            console.log('label图层重设高程：'+name);

            let key =  xyz.x+'_'+xyz.y+'_'+xyz.z;
            let promise = ElevationTool.getElevation(this.dbMap,this.indexDbNames,key);
            promise.then(function(name,elevationDataMap){
                tile = this.cache[name];
                if(tile){
                    tile.updateElevationData(elevationDataMap);
                }
            }.bind(this,name));
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
            let result;
            let timeDynamicImagery = this._timeDynamicImagery;
            let currentInterval;

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
    }
module.exports =LabelTileServiceImageryProvider;
