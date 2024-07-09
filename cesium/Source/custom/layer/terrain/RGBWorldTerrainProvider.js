const Credit =Cesium.Credit;
const defaultValue =Cesium.defaultValue;
const defined =Cesium.defined;
const DeveloperError =Cesium.DeveloperError;
const Ellipsoid =Cesium.Ellipsoid;
const Event =Cesium.Event;
const GeographicTilingScheme =Cesium.GeographicTilingScheme;
const HeightmapTerrainData =Cesium.HeightmapTerrainData;
const Resource =Cesium.Resource;
const TerrainProvider =Cesium.TerrainProvider;
const RequestState =Cesium.RequestState;
import md5 from 'md5-node';
const defer =Cesium.defer;

    // function DataRectangle(rectangle, maxLevel) {
    //     this.rectangle = rectangle;
    //     this.maxLevel = maxLevel;
    // }

    /**
     * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
     * retrieved from a {@link http://vr-theworld.com/|VT MÄK VR-TheWorld server}.
     *
     * @alias RGBWorldTerrainProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The URL of the VR-TheWorld TileMap.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.  If this parameter is not
     *                    specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     *
     *
     * @example
     * var terrainProvider = new Cesium.RGBWorldTerrainProvider({
     *   url : 'https://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/'
     * });
     * viewer.terrainProvider = terrainProvider;
     *
     * @see TerrainProvider
     */
    function RGBWorldTerrainProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this.name = 'RGBWorldTerrainProvider';
        this._tileMatrixLabels = options.tileMatrixLabels;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        var resource = Resource.createIfNeeded(options.url);

        this._resource = resource;

        this._errorEvent = new Event();
        this._ready = false;
        this._readyPromise = defer();

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        this._tilingScheme = undefined;
        this._rectangles = [];

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        this._maxLevel = defaultValue(options.maxLevel, 15);

        this._tilingScheme = defaultValue(options.tilingScheme,new GeographicTilingScheme({ellipsoid : ellipsoid}));

        this._width = parseInt(defaultValue(options.width, 65));
        // this.tileSize = Cesium.tileSize;
        this.tileSize = defaultValue(options.tileSize,512);
        var _levelZero = this.tileSize == 512?1:0;
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, 65, this._tilingScheme.getNumberOfXTilesAtLevel(_levelZero));
        this.processor =   new Cesium.TaskProcessor('TerrainWorker', Number.POSITIVE_INFINITY);

        if(options.url){
            this.url = options.url;
            this.indexDbName ='terrain_'+ md5(options.url);
        }


        let tilingSchemeName = this._tilingScheme instanceof GeographicTilingScheme?'GeographicTilingScheme':'WebMercatorTilingScheme';
        let promise =  this.processor.scheduleTask({init:true,w:this._width,indexDbName:this.indexDbName,tilingSchemeName:tilingSchemeName,maxLevel:this._maxLevel,tileSize:this.tileSize});
        promise.then(function(){
            this._ready = true;
            this._readyPromise.resolve(true);
        }.bind(this));
    }

    Object.defineProperties(RGBWorldTerrainProvider.prototype, {
        /**
         * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
         * the source of the terrain.  This function should not be called before {@link RGBWorldTerrainProvider#ready} returns true.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link RGBWorldTerrainProvider#ready} returns true.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {GeographicTilingScheme}
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Gets a value indicating whether or not the provider includes a water mask.  The water mask
         * indicates which areas of the globe are water rather than land, so they can be rendered
         * as a reflective surface with animated waves.  This function should not be
         * called before {@link RGBWorldTerrainProvider#ready} returns true.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Boolean}
         */
        hasWaterMask : {
            get : function() {
                return false;
            }
        },

        /**
         * Gets a value indicating whether or not the requested tiles include vertex normals.
         * This function should not be called before {@link RGBWorldTerrainProvider#ready} returns true.
         * @memberof RGBWorldTerrainProvider.prototype
         * @type {Boolean}
         */
        hasVertexNormals : {
            get : function() {
                return false;
            }
        }
    });

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link RGBWorldTerrainProvider#ready} returns true.  The result includes terrain
     * data and indicates that all child tiles are available.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    RGBWorldTerrainProvider.prototype.requestTileGeometry = function(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this.ready) {
            throw new DeveloperError('requestTileGeometry must not be called before ready returns true.');
        }
        //>>includeEnd('debug');


        var labels = this._tileMatrixLabels;
        var l = defined(labels) ? labels[0] : 0;
        var tileMatrix = level+ parseInt(l);
        var resource = this._resource.getDerivedResource({
            request : request
        });


        var templateValues = {
            z: tileMatrix,
            y: y,
            x: x
        };

        resource.setTemplateValues(templateValues);

        let xyz = {x:templateValues.x,y:templateValues.y,z:level};
        var parameters = {url:resource.url,xyz:xyz};
        if(level > this._maxLevel){
            parameters.resourceUrl = this.url;
        }
        let promise =  this.processor.scheduleTask(parameters);

        var deferred = defer();
        promise.then(function(deferred,request,data){
            if(!data){
                request.state = RequestState.CANCELLED;
                deferred.reject();
                return;
            }

            let heightmapTerrainData = new HeightmapTerrainData({
                buffer:data.sData,
                _minimumHeight:data._minimumHeight,
                _maximumHeight:data._maximumHeight,
                width : this._width,
                height : this._width,
            });

            deferred.resolve(heightmapTerrainData);
        }.bind(this,deferred,request),function(error){
            request.state = RequestState.CANCELLED;
            deferred.reject();
        }.bind(this,deferred,request));

        return deferred.promise;
    };

    function getImageData(img) {
        const canvas = window.document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        return context.getImageData(0, 0, img.width, img.height);
    };

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    RGBWorldTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this.ready) {
            throw new DeveloperError('requestTileGeometry must not be called before ready returns true.');
        }
        //>>includeEnd('debug');
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Determines whether data for a tile is available to be loaded.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Boolean} Undefined if not supported, otherwise true or false.
     */
    RGBWorldTerrainProvider.prototype.getTileDataAvailable = function(x, y, level) {
        return undefined;
    };

    /**
     * Makes sure we load availability data for a tile
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {undefined|Promise} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
     */
    RGBWorldTerrainProvider.prototype.loadTileDataAvailability = function(x, y, level) {
        return undefined;
    };

export default RGBWorldTerrainProvider;
