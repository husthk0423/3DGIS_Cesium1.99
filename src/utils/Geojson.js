/**
 * Created by user on 2020/3/16.
 */
class Geojson{
    constructor() {
        this.ingest ={
            FeatureCollection:function(json){
                let features = json.features;
                for (let i = 0, len = features.length; i < len; i++) {
                    let feature  = features[i];
                    if (!feature.geometry) {
                        return;
                    }

                    var geometryType = feature.geometry.type;

                    if (this.ingest[geometryType]) {
                        let components = this.ingest[geometryType].apply(this, [feature]);
                        this.pushComponents(components,feature.properties,geometryType);
                    }else{
                        throw new RuntimeError('Unknown geometry type: ' + geometryType);
                    }
                }
            },

            Feature:function(json){
                let feature  = json;
                if (!feature.geometry) {
                    return;
                }

                var geometryType = feature.geometry.type;

                if (this.ingest[geometryType]) {
                    let components = this.ingest[geometryType].apply(this, [feature]);
                    this.pushComponents(components,feature.properties,geometryType);
                }else{
                    throw new RuntimeError('Unknown geometry type: ' + geometryType);
                }
            },

            GeometryCollection:function(geometryCollection){
                var geometries = geometryCollection.geometries;
                for (var i = 0, len = geometries.length; i < len; i++) {
                    var geometry = geometries[i];
                    var geometryType = geometry.type;
                    if (this.ingest[geometryType]) {
                        let components = this.ingest[geometryType].apply(this, [feature]);
                        this.pushComponents(components,geometry.properties,geometryType);
                    }else{
                        throw new RuntimeError('Unknown geometry type: ' + geometryType);
                    }
                }
            },
            /**
             * Return point feature given a point WKT fragment.
             * @param   str {String}    A WKT fragment representing the point
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            Point: function (feature) {
                var coordinate = feature.geometry.coordinates;
                // In case a parenthetical group of coordinates is passed...
                return [{ // ...Search for numeric substrings
                    x: parseFloat(coordinate[0]),
                    y: parseFloat(coordinate[1])
                }];
            },

            /**
             * Return a multipoint feature given a multipoint WKT fragment.
             * @param   str {String}    A WKT fragment representing the multipoint
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            MultiPoint: function (feature) {
                var coordinates = feature.geometry.coordinates;
                var components = [];
                for (var i = 0; i < coordinates.length; i += 1) {
                    components.push(this.ingest.Point.apply(this, [{geometry:{coordinates:coordinates[i]}}]));
                }
                return components;
            },

            /**
             * Return a linestring feature given a linestring WKT fragment.
             * @param   str {String}    A WKT fragment representing the linestring
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            LineString: function (feature) {
                var i, multipoints, components;

                // In our x-and-y representation of components, parsing
                //  multipoints is the same as parsing linestrings
                multipoints = this.ingest.MultiPoint.apply(this, [feature]);

                // However, the points need to be joined
                components = [];
                for (i = 0; i < multipoints.length; i += 1) {
                    components = components.concat(multipoints[i]);
                }
                return components;
            },

            /**
             * Return a multilinestring feature given a multilinestring WKT fragment.
             * @param   str {String}    A WKT fragment representing the multilinestring
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            MultiLineString: function (feature) {
                var components = [];
                var coordinates = feature.geometry.coordinates;
                for (var i = 0; i < coordinates.length; i += 1) {
                    components.push(this.ingest.LineString.apply(this, [{geometry:{coordinates:coordinates[i]}}]));
                }

                return components;
            },

            /**
             * Return a polygon feature given a polygon WKT fragment.
             * @param   str {String}    A WKT fragment representing the polygon
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            Polygon: function (feature) {
                var i, j, components;
                var coordinates = feature.geometry.coordinates;
                components = []; // Holds one or more rings
                for (i = 0; i < coordinates.length; i += 1) {
                    var coordinate = coordinates[i];
                    var subcomponents = []; // Holds the outer ring and any inner rings (holes)
                    for (j = 0; j < coordinate.length; j += 1) {
                        var pt = coordinate[j];
                        var x_cord = pt[0];
                        var y_cord = pt[1];

                        //now push
                        subcomponents.push({
                            x: parseFloat(x_cord),
                            y: parseFloat(y_cord)
                        });
                    }
                    components.push(subcomponents);
                }
                return components;
            },


            /**
             * Return a multipolygon feature given a multipolygon WKT fragment.
             * @param   str {String}    A WKT fragment representing the multipolygon
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            MultiPolygon: function (feature) {
                var i, components, polygon;
                components = [];
                var coordinates = feature.geometry.coordinates;
                for (i = 0; i < coordinates.length; i += 1) {
                    var coordinate = coordinates[i];
                    components.push(this.ingest.Polygon.apply(this, [{geometry:{coordinates:coordinate}}]));
                }
                return components;
            }
        };
        // this.components = undefined;
    }

    read(geojson){
        this.pointArray = [];
        this.lineArray = [];
        this.polygonArray = [];
        this.ingest[geojson.type].apply(this, [geojson]);
        return this;
    }

    readToPrimitives(geojson,option){
        this.read(geojson);
        return this.componentsToPrimitives(option);
    }

    pushComponents(components,properties,geometryType){
        if(geometryType == 'Point' || geometryType == 'MultiPoint'){
            // this.pointArray.push(components);
            return;
        }

        if(geometryType == "LineString"){
            let line = {properties:properties,geometry:this.createLine(components)};
            this.lineArray.push(line);
            return;
        }

        if(geometryType == "MultiLineString"){
            for(let i =0;i<components.length;i++){
                let line = {properties:properties,geometry:this.createLine(components[i])};
                this.lineArray.push(line);
            }
            return;
        }

        if(geometryType == "Polygon"){
            let polygon = {properties:properties,geometry:this.createPolygon(components)};
            this.polygonArray.push(polygon);
            return;
        }

        if(geometryType == "MultiPolygon"){
            for(let i = 0;i<components.length;i++){
                let polygon = {properties:properties,geometry:this.createPolygon(components[i])};
                this.polygonArray.push(polygon);
            }
            return;
        }
    }

    componentsToPrimitives(option){
        option = option?option:{};
        option.asynchronous = option.asynchronous?option.asynchronous:false;
        option.clampToGround = option.clampToGround?option.clampToGround:false;
        option.fillColor = option.fillColor?option.fillColor:'#ff0000';
        option.fillOpacity = option.hasOwnProperty('fillOpacity')?option.fillOpacity:1.0;
        option.pixelSize = option.pixelSize?option.pixelSize:10;
        option.strokeColor = option.strokeColor?option.strokeColor:'#ff0000';
        option.strokeOpacity = option.hasOwnProperty('strokeOpacity')?option.strokeOpacity:1.0;
        option.lineWidth = option.hasOwnProperty('lineWidth')?option.lineWidth:2.0;
        option.outlineWidth = option.hasOwnProperty('outlineWidth')?option.outlineWidth:0;
        option.translucent = false;
        if(option.fillOpacity != 1.0 || option.strokeOpacity != 1.0){
            option.translucent = true;
        }

        let pointInstances = [];
        let lineInstances = [];
        let polygonInstances = [];

        for(let i =0;i< this.pointArray.length;i++){
            let item = this.pointArray[i].geometry;
            pointInstances.push(this.getPointInstance(item,option));
        }

        for(let i =0;i< this.lineArray.length;i++){
            let item = this.lineArray[i].geometry;
            lineInstances.push(this.getLineInstance(item,option));
        }

        for(let i =0;i< this.polygonArray.length;i++){
            let item = this.polygonArray[i].geometry;
            polygonInstances.push(this.getPolygonInstance(item,option));
        }

        let pointPrimitive = this.getPointPrimitive(pointInstances,option);
        let linePrimitive = this.getLinePrimitive(lineInstances,option);
        let polygonPrimitive = this.getPolygonPrimitive(polygonInstances,option);

        let primitives = [];
        if(pointPrimitive){
            primitives.push(pointPrimitive);
        }
        if(linePrimitive){
            primitives.push(linePrimitive);
        }
        if(polygonPrimitive){
            primitives.push(polygonPrimitive);
        }

        return primitives;
    }

    getPointInstance(components,option,geometryType){
        return components;
    }

    getPointPrimitive(instances,option){
        if(instances.length == 0){
            return null;
        }
        let pointPrimitives = new Cesium.PointPrimitiveCollection();
        for(let i =0;i<instances.length;i++){
            pointPrimitives.add({
                pixelSize: option.pixelSize,
                color: Cesium.Color.fromCssColorString(option.fillColor).withAlpha(option.fillOpacity),
                outlineColor: Cesium.Color.fromCssColorString(option.strokeColor).withAlpha(option.strokeOpacity),
                outlineWidth: option.outlineWidth,
                position: Cesium.Cartesian3.fromDegrees(instances[i].x, instances[i].y, 0)
            });
        }

        return pointPrimitives;
    }


    getLineInstance(data,option){
        let geometryInstance = null;
        if(option.clampToGround){
            geometryInstance = new Cesium.GeometryInstance({
                geometry: new Cesium.GroundPolylineGeometry({
                    positions:Cesium.Cartesian3.fromDegreesArray(data),
                    width:option.lineWidth
                }),
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(option.strokeColor).withAlpha(option.strokeOpacity))
                }
            });
        }else{
            geometryInstance = new Cesium.GeometryInstance({
                geometry: new Cesium.PolylineGeometry({
                    positions:Cesium.Cartesian3.fromDegreesArray(data),
                    width:option.lineWidth
                }),
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(option.strokeColor).withAlpha(option.strokeOpacity))
                }
            });
        }

        return geometryInstance;
    }

    getLinePrimitive(geometryInstances,option){
        if(geometryInstances.length == 0){
            return null;
        }

        let primitive = null;
        if(option.clampToGround){
            primitive = new Cesium.GroundPolylinePrimitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance: new Cesium.PolylineColorAppearance({
                    flat : true,
                    translucent : option.translucent
                }),
            });
        }else{
            primitive = new Cesium.Primitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance:  new Cesium.PolylineColorAppearance({
                    flat : true,
                    translucent : option.translucent
                }),
            });
        }

        return primitive;
    }

    createLine(components){
        let lpts=[];
        for(let i = 0;i<components.length;i++){
            let pt = components[i];
            lpts.push(pt.x);
            lpts.push(pt.y);
        }
        return lpts;
    }


    getPolygonInstance(py,option){
        let positions = Cesium.Cartesian3.fromDegreesArray(py.pts);
        let holes = [];
        for(let m = 0;m<py.holes.length;m++){
            holes.push({positions:Cesium.Cartesian3.fromDegreesArray(py.holes[m])});
        }

        let polygonInstance = new Cesium.GeometryInstance({
            geometry : new Cesium.PolygonGeometry({
                polygonHierarchy : {
                    positions:positions,
                    holes:holes
                },
                vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                height : 0
            }),
            attributes : {
                color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(option.fillColor).withAlpha(option.fillOpacity))
            }
        });

        return polygonInstance;
    }

    getPolygonPrimitive(geometryInstances,option){
        if(geometryInstances.length == 0){
            return null;
        }

        let primitive = null;
        if(option.clampToGround){
            primitive = new Cesium.GroundPrimitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : option.translucent,
                    closed : true
                })
            });
        }else{
            primitive = new Cesium.Primitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : option.translucent,
                    closed : true
                })
            });
        }

        return primitive;
    }

    createPolygon(components){
        let pts = [];
        let holes = [];
        let polygon = {pts:pts,holes:holes};
        for(let i = 0;i<components.length;i++){
            let component = components[i];
            if(i == 0){ //外环
                for(let j = 0;j<component.length;j++){
                    let item = component[j];
                    pts.push(item.x);
                    pts.push(item.y);
                }

            }else{//内环
                let hpts = [];
                for(let m = 0;m<component.length;m++){
                    let pt = component[m];
                    hpts.push(pt.x);
                    hpts.push(pt.y);
                }
                holes.push(hpts);
            }
        }
        return polygon;
    }

    beginsWith(str, sub){
        return str.substring(0, sub.length) === sub;
    }

    endsWith(str, sub){
        return str.substring(str.length - sub.length) === sub;
    }

    trim(str, sub){
        sub = sub || ' '; // Defaults to trimming spaces
        // Trim beginning spaces
        while (this.beginsWith(str, sub)) {
            str = str.substring(1);
        }
        // Trim ending spaces
        while (this.endsWith(str, sub)) {
            str = str.substring(0, str.length - 1);
        }
        return str;
    }
}
module.exports =  Geojson;