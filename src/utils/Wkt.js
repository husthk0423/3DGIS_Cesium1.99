/**
 * Created by user on 2020/3/16.
 */
class Wkt{
    constructor() {
        this.ingest ={
            /**
             * Return point feature given a point WKT fragment.
             * @param   str {String}    A WKT fragment representing the point
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            point: function (str) {
                var coords = this.trim(str).split(this.regExes.spaces);
                // In case a parenthetical group of coordinates is passed...
                return [{ // ...Search for numeric substrings
                    x: parseFloat(this.regExes.numeric.exec(coords[0])[0]),
                    y: parseFloat(this.regExes.numeric.exec(coords[1])[0])
                }];
            },

            /**
             * Return a multipoint feature given a multipoint WKT fragment.
             * @param   str {String}    A WKT fragment representing the multipoint
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            multipoint: function (str) {
                var i, components, points;
                components = [];
                points = this.trim(str).split(this.regExes.comma);
                for (i = 0; i < points.length; i += 1) {
                    components.push(this.ingest.point.apply(this, [points[i]]));
                }
                return components;
            },

            /**
             * Return a linestring feature given a linestring WKT fragment.
             * @param   str {String}    A WKT fragment representing the linestring
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            linestring: function (str) {
                var i, multipoints, components;

                // In our x-and-y representation of components, parsing
                //  multipoints is the same as parsing linestrings
                multipoints = this.ingest.multipoint.apply(this, [str]);

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
            multilinestring: function (str) {
                var i, components, line, lines;
                components = [];

                lines = this.trim(str).split(this.regExes.doubleParenComma);
                if (lines.length === 1) { // If that didn't work...
                    lines = this.trim(str).split(this.regExes.parenComma);
                }

                for (i = 0; i < lines.length; i += 1) {
                    line = this._stripWhitespaceAndParens(lines[i]);
                    components.push(this.ingest.linestring.apply(this, [line]));
                }

                return components;
            },

            /**
             * Return a polygon feature given a polygon WKT fragment.
             * @param   str {String}    A WKT fragment representing the polygon
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            polygon: function (str) {
                var i, j, components, subcomponents, ring, rings;
                rings = this.trim(str).split(this.regExes.parenComma);
                components = []; // Holds one or more rings
                for (i = 0; i < rings.length; i += 1) {
                    ring = this._stripWhitespaceAndParens(rings[i]).split(this.regExes.comma);
                    subcomponents = []; // Holds the outer ring and any inner rings (holes)
                    for (j = 0; j < ring.length; j += 1) {
                        // Split on the empty space or '+' character (between coordinates)
                        var split = ring[j].split(this.regExes.spaces);
                        if (split.length > 2) {
                            //remove the elements which are blanks
                            split = split.filter(function (n) {
                                return n != ""
                            });
                        }
                        if (split.length === 2) {
                            var x_cord = split[0];
                            var y_cord = split[1];

                            //now push
                            subcomponents.push({
                                x: parseFloat(x_cord),
                                y: parseFloat(y_cord)
                            });
                        }
                    }
                    components.push(subcomponents);
                }
                return components;
            },

            /**
             * Return box vertices (which would become the Rectangle bounds) given a Box WKT fragment.
             * @param   str {String}    A WKT fragment representing the box
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            box: function (str) {
                var i, multipoints, components;

                // In our x-and-y representation of components, parsing
                //  multipoints is the same as parsing linestrings
                multipoints = this.ingest.multipoint.apply(this, [str]);

                // However, the points need to be joined
                components = [];
                for (i = 0; i < multipoints.length; i += 1) {
                    components = components.concat(multipoints[i]);
                }

                return components;
            },

            /**
             * Return a multipolygon feature given a multipolygon WKT fragment.
             * @param   str {String}    A WKT fragment representing the multipolygon
             * @memberof this.Wkt.Wkt.ingest
             * @instance
             */
            multipolygon: function (str) {
                var i, components, polygon, polygons;
                components = [];
                polygons = this.trim(str).split(this.regExes.doubleParenComma);
                for (i = 0; i < polygons.length; i += 1) {
                    polygon = this._stripWhitespaceAndParens(polygons[i]);
                    components.push(this.ingest.polygon.apply(this, [polygon]));
                }
                return components;
            }
        };
        this.regExes = {
            'typeStr': /^\s*(\w+)\s*\(\s*(.*)\s*\)\s*$/,
            'spaces': /\s+|\+/, // Matches the '+' or the empty space
            'numeric': /-*\d+(\.*\d+)?/,
            'comma': /\s*,\s*/,
            'parenComma': /\)\s*,\s*\(/,
            'coord': /-*\d+\.*\d+ -*\d+\.*\d+/, // e.g. "24 -14"
            'doubleParenComma': /\)\s*\)\s*,\s*\(\s*\(/,
            'ogcTypes': /^(multi)?(point|line|polygon|box)?(string)?$/i, // Captures e.g. "Multi","Line","String"
            'crudeJson': /^{.*"(type|coordinates|geometries|features)":.*}$/, // Attempts to recognize JSON strings
            'collectionParse':/,(?=[a-zA-Z])/  //解析GEOMETRYCOLLECTION成多个单一的geomtry
        };
        this.components = undefined;
    }

    read(str){
        var matches;
        matches = this.regExes.typeStr.exec(str);
        if (matches) {
            this.type = matches[1].toLowerCase();
            this.base = matches[2];
            if (this.ingest[this.type]) {
                this.components = this.ingest[this.type].apply(this, [this.base]);
            }else{
                this.base = this.base.split(this.regExes.collectionParse);
            }
        }

        return this;
    }

    readToPrimitives(str,option){
        option = option?option:{};
        option.asynchronous = option.asynchronous?option.asynchronous:false;
        option.clampToGround = option.clampToGround?option.clampToGround:false;
        option.fillColor = option.fillColor?option.fillColor:'#ff0000';
        option.fillOpacity = option.fillOpacity?option.fillOpacity:1.0;
        option.pixelSize = option.pixelSize?option.pixelSize:10;
        option.strokeColor = option.strokeColor?option.strokeColor:'#ff0000';
        option.strokeOpacity = option.strokeOpacity?option.strokeOpacity:1.0;
        option.lineWidth = option.lineWidth?option.lineWidth:2.0;
        option.outlineWidth = option.outlineWidth?option.outlineWidth:0;

        let geometryArray = [str];
        let m = this.regExes.typeStr.exec(str);
        if(m){
            let geometryType = m[1].toLowerCase();
            if(geometryType == 'geometrycollection'){
                geometryArray = m[2].split(this.regExes.collectionParse);
            }
        }


        let pointInstances = [];
        let lineInstances =[];
        let polygonInstances =[];
        for(let i=0;i<geometryArray.length;i++){
            var matches = this.regExes.typeStr.exec(geometryArray[i]);
            if (matches) {
                this.type = matches[1].toLowerCase();
                this.base = matches[2];
                if (this.ingest[this.type]) {
                    this.components = this.ingest[this.type].apply(this, [this.base]);
                }
            }

            pointInstances = pointInstances.concat(this.getPointInstances(option));
            lineInstances = lineInstances.concat(this.getLineInstances(option));
            polygonInstances = polygonInstances.concat(this.getPolygonInstances(option));
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


    getPointInstances(option){
        if(this.type != 'point'){
            return [];
        }

        return this.components;
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


    getLineInstances(option){
        let ls = [];
        if(this.type == "linestring"){
            ls.push(this.createLine(this.components));
        }

        if(this.type == "multilinestring"){
            for(let i =0;i<this.components.length;i++){
                ls.push(this.createLine(this.components[i]));
            }
        }


        let geometryInstances = [];
        for(let j = 0;j<ls.length;j++){
            let geometryInstance = null;
            if(option.clampToGround){
                geometryInstance = new Cesium.GeometryInstance({
                    geometry: new Cesium.GroundPolylineGeometry({
                        positions:Cesium.Cartesian3.fromDegreesArray(ls[j]),
                        width:option.lineWidth
                    }),
                    attributes : {
                        color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(option.strokeColor).withAlpha(option.strokeOpacity))
                    }
                });
            }else{
                geometryInstance = new Cesium.GeometryInstance({
                    geometry: new Cesium.PolylineGeometry({
                        positions:Cesium.Cartesian3.fromDegreesArray(ls[j]),
                        width:option.lineWidth
                    }),
                    attributes : {
                        color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(option.strokeColor).withAlpha(option.strokeOpacity))
                    }
                });
            }

            geometryInstances.push(geometryInstance);
        }
        return geometryInstances;
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
                    translucent : false
                }),
            });
        }else{
            primitive = new Cesium.Primitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance:  new Cesium.PolylineColorAppearance({
                    flat : true,
                    translucent : false
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


    getPolygonInstances(option){
        let ps = [];
        if(this.type == "polygon"){
            ps.push(this.createPolygon(this.components));
        }

        if(this.type == "multipolygon"){
            for(let i = 0;i<this.components.length;i++){
                ps.push(this.createPolygon(this.components[i]));
            }
        }

        let geometryInstances = [];
        for(let j = 0;j<ps.length;j++){
            let py = ps[j];
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

            geometryInstances.push(polygonInstance);
        }

        return geometryInstances;
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
                    translucent : false,
                    closed : true
                })
            });
        }else{
            primitive = new Cesium.Primitive({
                asynchronous:option.asynchronous,
                geometryInstances : geometryInstances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : false,
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

    _stripWhitespaceAndParens(fullStr){
        var trimmed = fullStr.trim();
        var noParens = trimmed.replace(/^\(?(.*?)\)?$/, '$1');
        return noParens;
    }
}
module.exports =  Wkt;