const combine = Cesium.combine;
const Credit  = Cesium.Credit;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Event = Cesium.Event;
const Rectangle = Cesium.Rectangle;
const Resource = Cesium.Resource;
const WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme;
const ImageryProvider = Cesium.ImageryProvider;
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const RequestState = Cesium.RequestState;
const defer =Cesium.defer;


function WmtsGroupImageryProvider(viewer,options) {
    this.viewer = viewer;
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ellipsoid : options.ellipsoid});
    this._tileWidth = defaultValue(options.tileWidth, 256);
    this._tileHeight = defaultValue(options.tileHeight, 256);

    this._minimumLevel = defaultValue(options.minimumLevel, 0);
    this._maximumLevel = options.maximumLevel;

    this._rectangle = defaultValue(
        options.rectangle,
        this._tilingScheme.rectangle
    );

    this._readyPromise = Promise.resolve(true);

    this.subProviders = [];
    this.processor =   new Cesium.TaskCallBackProcessor('WmtsGroupWorker', Number.POSITIVE_INFINITY);




}

function requestImage(imageryProvider, col, row, level, request, interval,imagery) {
    let urls = [];
    for(let i = 0;i < imageryProvider.subProviders.length; i++){
        let subProvider = imageryProvider.subProviders[i];
        let url = subProvider.buildUrl(col, row, level, request);
        urls.push(url);
    }

    var deferred = defer();
    requestImageDataGroup(deferred,imageryProvider, urls,request,imagery);
    return deferred.promise;
    // return ImageryProvider.loadImage(imageryProvider, resource);
}

function requestImageDataGroup(deferred,imageryProvider, urls,request,imagery){
    function callback(type,results){
        if(type == 'error'){
            deferred.reject();
        }
        if(type == 'success'){
            let texture = new Cesium.Texture({
                context: imageryProvider.viewer.scene.frameState.context,
                pixelFormat: Cesium.PixelFormat.RGBA,
                width: imageryProvider.tileWidth,
                height: imageryProvider.tileWidth,
                source: {
                    arrayBufferView: new Uint8Array(results),
                },
            });

            let image  = {isTexture:true,texture:texture};
            imagery.texture = texture;
            imagery.state = Cesium.ImageryState.READY;
            deferred.resolve(image);
        }
    }

    imageryProvider.processor.scheduleTask({urls:urls},urls.length,callback);
    return true;
}

Object.defineProperties(WmtsGroupImageryProvider.prototype, {
    /**
     * Gets the width of each tile, in pixels. This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    tileWidth : {
        get : function() {
            return this._tileWidth;
        }
    },

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    tileHeight : {
        get : function() {
            return this._tileHeight;
        }
    },

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    maximumLevel : {
        get : function() {
            return this._maximumLevel;
        }
    },

    /**
     * Gets the minimum level-of-detail that can be requested.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    minimumLevel : {
        get : function() {
            return this._minimumLevel;
        }
    },

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {TilingScheme}
     * @readonly
     */
    tilingScheme: {
        get: function () {
            return this._tilingScheme;
        },
    },

    /**
     * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Rectangle}
     * @readonly
     */
    rectangle: {
        get: function () {
            return this._rectangle;
        },
    },

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Boolean}
     * @readonly
     */
    ready : {
        value : true
    },

    /**
     * Gets a promise that resolves to true when the provider is ready for use.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Promise.<Boolean>}
     * @readonly
     */
    readyPromise : {
        get : function() {
            return this._readyPromise;
        }
    },

});

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 *
 * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
 */
WmtsGroupImageryProvider.prototype.getTileCredits = function(x, y, level) {
    return undefined;
};

/**
 * 添加子的wmts数据源
 */
WmtsGroupImageryProvider.prototype.addSubProvider = function(subProvider) {
    subProvider.parentProvider = this;
    this.subProviders.push(subProvider);
    this.redraw();
};

/**
 * 更改子数据源的顺序
 */
WmtsGroupImageryProvider.prototype.changeSubProviderIndex = function(subProvider,newIndex) {
    let index = this.subProviders.indexOf(subProvider);

    if(index == -1){
        return;
    }

    if(newIndex < 0){
        newIndex = 0;
    }

    if(newIndex > this.subProviders.length -1){
        newIndex = this.subProviders.length -1;
    }

    if(newIndex == index){
        return;
    }

    let temp = this.subProviders[newIndex];
    this.subProviders[newIndex] = subProvider;
    this.subProviders[index] = temp;
    this.redraw();
};


/**
 * 移除子的wmts数据源
 */
WmtsGroupImageryProvider.prototype.removeSubProvider = function(subProvider) {
    let index = this.subProviders.indexOf(subProvider);

    if(index != -1){
        this.subProviders.splice(index,1);
        subProvider.parentProvider = null;
    }
    this.redraw();
};
/**
 * Requests the image for a given tile.  This function should
 * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request
 *          should be retried later.  The resolved image may be either an
 *          Image or a Canvas DOM object.
 *
 * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
 */
WmtsGroupImageryProvider.prototype.requestImage = function(x, y, level, request,imagery) {
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
        result = requestImage(this, x, y, level, request, currentInterval,imagery);
    }

    // If we are approaching an interval, preload this tile in the next interval
    if (defined(result) && defined(timeDynamicImagery)) {
        timeDynamicImagery.checkApproachingInterval(x, y, level, request);
    }

    return result;
};

/**
 * Picking features is not currently supported by this imagery provider, so this function simply returns
 * undefined.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Number} longitude The longitude at which to pick features.
 * @param {Number} latitude  The latitude at which to pick features.
 * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
 *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
 *                   instances.  The array may be empty if no features are found at the given location.
 *                   It may also be undefined if picking is not supported.
 */
WmtsGroupImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
    return undefined;
};


/**
 * 图层重新请求
 */
WmtsGroupImageryProvider.prototype.redraw = function() {
    let layers = this.viewer.imageryLayers._layers;
    let imagerLayer =null;
    let index = -1;
    for(let i =0;i<layers.length;i++){
        let layer = layers[i];
        if(layer.imageryProvider == this){
            imagerLayer = layer;
            index = i;
        }
    }

    if(imagerLayer){
        this.viewer.imageryLayers.layerShownOrHidden.raiseEvent(
            imagerLayer,
            index,
            false
        );
        this.viewer.imageryLayers.layerShownOrHidden.raiseEvent(
            imagerLayer,
            index,
            true
        );
    }
};


export default WmtsGroupImageryProvider;
