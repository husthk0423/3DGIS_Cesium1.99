import Color from '../Core/Color.js';
import ColorGeometryInstanceAttribute from '../Core/ColorGeometryInstanceAttribute.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
import GeometryInstance from '../Core/GeometryInstance.js';
import PolygonGeometry from '../Core/PolygonGeometry.js';
import PolygonOutlineGeometry from '../Core/PolygonOutlineGeometry.js';
import EllipsoidSurfaceAppearance from '../Scene/EllipsoidSurfaceAppearance.js';
import PerInstanceColorAppearance from '../Scene/PerInstanceColorAppearance.js';
import GeometryInstanceAttribute from '../Core/GeometryInstanceAttribute.js';

import GeometryAttribute from '../Core/GeometryAttribute.js';
import GeometryAttributes from '../Core/GeometryAttributes.js';
import Geometry from '../Core/Geometry.js';
import defined from '../Core/defined.js';
import PrimitivePipeline from '../Scene/PrimitivePipeline.js';

import Matrix4 from '../Core/Matrix4.js';
import  Ellipsoid  from '../Core/Ellipsoid.js';
import GeographicProjection from '../Core/GeographicProjection.js';
import BoundingSphere from '../Core/BoundingSphere.js';

import BatchTable from '../Scene/BatchTable.js';
import defaultValue from '../Core/defaultValue.js';
import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';
import Cartesian4 from '../Core/Cartesian4.js';

import ContextLimits from '../Renderer/ContextLimits.js';


import GetRidingLanternGeometry from './GetRidingLanternGeometry.js';


let styleFun = undefined;
let tileSize = 512;
let return_type = '';
let geometryTypes = {
    MultiPolygon : processMultiPolygon,
    Polygon : processPolygon
};

let displayAttribute = new GeometryInstanceAttribute({
    componentDatatype : ComponentDatatype.FLOAT ,
    componentsPerAttribute : 1,
    normalize : true,
    value :new Float32Array([1])
});

let polygonInstances = [];
let waterInstances = [];
let outlineInstances = [];
let ridingLanternInstances = [];
let level = 0;
let options = {};
let idIndex = 2000000000;

ContextLimits._maximumTextureSize = 16384;
      function getPrimitiveData(featureMap,l,opts, transferableObjects) {
          polygonInstances = [];
          waterInstances = [];
          outlineInstances = [];
          level = l;
          options = opts;
          processTopology(featureMap);
          return triangulates(transferableObjects);
     }

        function processTopology(featureMap){
            for(let key in featureMap){
                if(options.ridingLanternLayerId && options.ridingLanternLayerId.indexOf(key) > -1){
                    let features = featureMap[key];
                    processRidingLantern(features);
                }else if(options.waterLayerId && options.waterLayerId.indexOf(key) > -1){
                    let features = featureMap[key];
                    processWater(features);
                } else{
                    let features = featureMap[key];
                    processFeatures(features);
                }
            }
        }

       function processRidingLantern(features){
            let polygons = [];
           for(let i = 0;i<features.length;i++){
               let feature = features[i];
               polygons = polygons.concat(feature.polygons);
           }

            if(polygons.length == 0){
                return;
            }

            let getRidingLanternGeometry = new GetRidingLanternGeometry({
                positions:polygons,//[世界坐标集合]
                height:options.ridingLanternHeight,//拉伸高度
                speed:options.ridingLanternSpeed,//扫描速度
                type :options.ridingLanternType,//扫描类型,1代表上下扫描，-1代表左右扫描
                direction:1,//扫描方向,1，-1代表不同方向
                // color:new Color(0.3,0.5,0.8,2.),
                color:Cesium.Color.fromAlpha(Cesium.Color.fromCssColorString(options.ridingLanternColor),options.ridingLanternAlpha),
                translucent:true
            });
           ridingLanternInstances = getRidingLanternGeometry.createGeometryInstances();
        }

        function processFeatures(features){
            if(features.length > 0){
                let feature = features[0];
                let typeHandler = geometryTypes[feature.type];
                typeHandler(features);
            }
        }

        function processWater(features){
            for(let i = 0;i<features.length;i++){
                let feature = features[i];
                for(let j =0;j<feature.polygons.length;j++){
                    let positions = feature.polygons[j];
                    let polygonInstance = createWaterGeometry(feature.id,feature.properties,positions);
                    waterInstances.push(polygonInstance);
                }
            }
        }

        function processPolygon(features) {
            let height = 0;
            let extrudedHeight = 0;
            for(let i = 0;i<features.length;i++){
                let feature = features[i];

                let style = feature.style;
                let fillAttributes,strokeColor,strokeAttributes;

                if(style){
                    let fillColor = getColor(style,'fillColor','fillOpacity');
                    fillAttributes = {color : ColorGeometryInstanceAttribute.fromColor(fillColor),display:displayAttribute};

                    if(style.stroke){
                        strokeColor = getColor(style,'strokeColor','strokeOpacity');
                        strokeAttributes = {color : ColorGeometryInstanceAttribute.fromColor(strokeColor),display:displayAttribute};
                    }
                }


                for(let j =0;j<feature.polygons.length;j++){
                    let positions = feature.polygons[j];
                    //房屋总高度
                    extrudedHeight = feature.totalHeight;
                    extrudedHeight = extrudedHeight?extrudedHeight:options.heightValue;
                    let polygonInstance = createPolygonGeometry(feature.id,feature.properties,positions,height,
                        extrudedHeight,fillAttributes);
                    polygonInstances.push(polygonInstance);

                    if(style && style.stroke){
                        let outlineInstance = createPolygonOutlineGeometry(feature.id,feature.properties,
                            positions,height,extrudedHeight,strokeAttributes);
                        outlineInstances.push(outlineInstance);
                    }
                }
            }
        }

        function processMultiPolygon(features) {
            processPolygon(features);
        }


        function createWaterGeometry(id,properties,positions) {
            let height = 0;
            id = id +'_' +level+ '_water';
            return  new GeometryInstance({
                id:id,
                geometry:PolygonGeometry.fromPositions({
                    height:height,
                    positions : positions,
                    vertexFormat :EllipsoidSurfaceAppearance.VERTEX_FORMAT
                }),
                attributes: {
                    display: displayAttribute
                },
                properties:properties
            });
        }


        function getColor(style,colorField,opacityField){
            let cf = style[colorField];
            if(options.hasOwnProperty('fillColor')){
                cf = options.fillColor;
            }

            let color;
            if (defined(cf)) {
                color = Color.fromCssColorString(cf);
                if(!defined(color)){
                    color = Color.fromCssColorString('#ffffff');
                }
                color.alpha = 1.0;
            }

            let opacity = style[opacityField];
            if(options.hasOwnProperty('opacity')){
                opacity = options.opacity;
            }

            if (defined(opacity) && opacity !== 1.0) {
                color.alpha = opacity;
            }
            return color;
        }

        function createPolygonGeometry(id,properties,positions,height,extrudedHeight,attributes) {
            id = id +'_' +level+ '_polygon';
            if(options.translucentMaterial){
                let geometryInstance = new GeometryInstance({
                    id:id,
                    geometry:PolygonGeometry.fromPositions({
                        height:height,
                        extrudedHeight:extrudedHeight,
                        positions : positions,
                    }),
                    properties:properties
                });

                if(attributes){
                    geometryInstance.attributes = attributes;
                }

                return geometryInstance;
            }else{
                let geometryInstance = new GeometryInstance({
                    id:id,
                    geometry:PolygonGeometry.fromPositions({
                        height:height,
                        extrudedHeight:extrudedHeight,
                        positions : positions,
                        vertexFormat :PerInstanceColorAppearance.VERTEX_FORMAT
                    }),
                    properties:properties
                });

                if(attributes){
                    geometryInstance.attributes = attributes;
                }
                return geometryInstance;
            }
        }

        function createPolygonOutlineGeometry(id,properties,positions,height,extrudedHeight,attributes){
            id = id +'_' +level+ '_polygonOutLine';
            let geometryInstance = new GeometryInstance({
                id:id,
                geometry:PolygonOutlineGeometry.fromPositions({
                    height:height,
                    extrudedHeight:extrudedHeight,
                    positions : positions,
                    vertexFormat :PerInstanceColorAppearance.VERTEX_FORMAT
                }),
                properties:properties
            });

            if(attributes){
                geometryInstance.attributes = attributes;
            }

            return geometryInstance;
        }

        //三角化
        function triangulate(instances,transferableObjects){
            let length = instances.length;
            if(length  == 0){
                return null;
            }

            var clonedInstances = new Array(length);
            var instanceIds = [];

            var instance;
            var i;

            var geometryIndex = 0;
            for (i = 0; i < length; i++) {
                instance = instances[i];
                var geometry = instance.geometry;

                var createdGeometry;
                if (defined(geometry.attributes) && defined(geometry.primitiveType)) {
                    createdGeometry = cloneGeometry(geometry);
                } else {
                    createdGeometry = geometry.constructor.createGeometry(geometry);
                }

                clonedInstances[geometryIndex++] = cloneInstance(instance, createdGeometry);
                instanceIds.push(instance.id);
            }

            clonedInstances.length = geometryIndex;


            var ellipsoid = Ellipsoid.WGS84;
            var projection = new GeographicProjection(ellipsoid);

            var result = PrimitivePipeline.combineGeometry({
                instances : clonedInstances,
                ellipsoid : projection.ellipsoid,
                projection : projection,
                elementIndexUintSupported :true,
                scene3DOnly : false,
                vertexCacheOptimize : false,
                compressVertices : true,
                modelMatrix : Matrix4.IDENTITY,
                createPickOffsets : undefined
            });
            return PrimitivePipeline.packCombineGeometryResults(result, transferableObjects);
        }

        function cloneInstance(instance, geometry) {
            return {
                geometry : geometry,
                attributes: instance.attributes,
                modelMatrix : Matrix4.clone(instance.modelMatrix),
                pickPrimitive : instance.pickPrimitive,
                id : instance.id
            };
        }

        function triangulates(transferableObjects){
            var polygonResults = triangulate(polygonInstances,transferableObjects);
            var waterResults = triangulate(waterInstances,transferableObjects);
            var outlineResults =  triangulate(outlineInstances,transferableObjects);
            var ridingLanternResults = triangulate(ridingLanternInstances,transferableObjects);

            let results = {};
            if(polygonResults){
                let table = createBatchTable(polygonInstances,transferableObjects);
                mergeAttributes(table,polygonResults);
                results.polygon = polygonResults;
            }
            if(waterResults){
                let table = createBatchTable(waterInstances,transferableObjects);
                mergeAttributes(table,waterResults);
                results.water = waterResults;
            }
            if(outlineResults){
                let table = createBatchTable(outlineInstances,transferableObjects);
                mergeAttributes(table,outlineResults);
                results.outline = outlineResults;
            }

            if(ridingLanternResults){
                let table = createBatchTable(ridingLanternInstances,transferableObjects);
                mergeAttributes(table,ridingLanternResults);
                results.ridingLantern = ridingLanternResults;
            }
            return results;
        }

        function mergeAttributes(table,result){
            result.attributes = table.attributes;
            result.attributeIndices = table.attributeIndices;
            result.batchValues = table.batchValues;
            result.propertiesMapBuffer = table.propertiesMapBuffer;
            result.pickId = table.pickId;
            result.ids = table.ids;
        }

        function cloneGeometry(geometry) {
            var attributes = geometry.attributes;
            var newAttributes = new GeometryAttributes();
            for (var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    newAttributes[property] = cloneAttribute(attributes[property]);
                }
            }

            var indices;
            if (defined(geometry.indices)) {
                var sourceValues = geometry.indices;
                if (Array.isArray(sourceValues)) {
                    indices = sourceValues.slice(0);
                } else {
                    indices = new sourceValues.constructor(sourceValues);
                }
            }

            return new Geometry({
                attributes : newAttributes,
                indices : indices,
                primitiveType : geometry.primitiveType,
                boundingSphere : BoundingSphere.clone(geometry.boundingSphere)
            });
        }

        function cloneAttribute(attribute) {
            var clonedValues;
            if (Array.isArray(attribute.values)) {
                clonedValues = attribute.values.slice(0);
            } else {
                clonedValues = new attribute.values.constructor(attribute.values);
            }
            return new GeometryAttribute({
                componentDatatype : attribute.componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize,
                values : clonedValues
            });
        }

    function createBatchTable(instances,transferableObjects) {
        /*************新增开始**************/
        /**
         * 往geometryInstances中增加需要的Plugin中默认的属性类型,并且检查是否是否含有Plugin中的属性
         */
        // primitive.primitivePlugin.checkAndAddAttributeIntoGeometryInstances(geometryInstances);
        /*************新增结束**************/
        var scratchGetAttributeCartesian2 = new Cartesian2();
        var scratchGetAttributeCartesian3 = new Cartesian3();
        var scratchGetAttributeCartesian4 = new Cartesian4();


        var context = {floatingPointTexture:true};
        var numberOfInstances = instances.length;
        var names = getCommonPerInstanceAttributeNames(instances);
        var length = names.length;

        var ids = [];

        var attributes = [];
        var attributeIndices = {};
        var boundingSphereAttributeIndices = {};
        var offset2DIndex;

        var firstInstance = instances[0];
        var instanceAttributes = firstInstance.attributes;

        var i;
        var name;
        var attribute;

        for (i = 0; i < length; ++i) {
            name = names[i];
            attribute = instanceAttributes[name];

            attributeIndices[name] = i;
            attributes.push({
                functionName : 'czm_batchTable_' + name,
                componentDatatype : attribute.componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize
            });
        }

        if (names.indexOf('distanceDisplayCondition') !== -1) {
            attributes.push({
                functionName : 'czm_batchTable_boundingSphereCenter3DHigh',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            }, {
                functionName : 'czm_batchTable_boundingSphereCenter3DLow',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            }, {
                functionName : 'czm_batchTable_boundingSphereCenter2DHigh',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            }, {
                functionName : 'czm_batchTable_boundingSphereCenter2DLow',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            }, {
                functionName : 'czm_batchTable_boundingSphereRadius',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 1
            });
            boundingSphereAttributeIndices.center3DHigh = attributes.length - 5;
            boundingSphereAttributeIndices.center3DLow = attributes.length - 4;
            boundingSphereAttributeIndices.center2DHigh = attributes.length - 3;
            boundingSphereAttributeIndices.center2DLow = attributes.length - 2;
            boundingSphereAttributeIndices.radius = attributes.length - 1;
        }

        if (names.indexOf('offset') !== -1) {
            attributes.push({
                functionName : 'czm_batchTable_offset2D',
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            });
            offset2DIndex = attributes.length - 1;
        }

        attributes.push({
            functionName : 'czm_batchTable_pickColor',
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true
        });

        var attributesLength = attributes.length;
        var batchTable = new BatchTable(context, attributes, numberOfInstances);

        let pickId = idIndex;
        let propertiesMap = {};
        let properties = false;
        for (i = 0; i < numberOfInstances; ++i) {
            var instance = instances[i];
            if(instance.properties){
                propertiesMap[instance.id] = instance.properties;
                properties = true;
            }
            instanceAttributes = instance.attributes;

            for (var j = 0; j < length; ++j) {
                name = names[j];
                attribute = instanceAttributes[name];
                var value = getAttributeValue(attribute.value,scratchGetAttributeCartesian2,scratchGetAttributeCartesian3,scratchGetAttributeCartesian4);
                var attributeIndex = attributeIndices[name];
                batchTable.setBatchedAttribute(i, attributeIndex, value);
            }

            ids.push(instance.id);
            idIndex++;
            var pickColor = Color.fromRgba(idIndex);
            var color = scratchGetAttributeCartesian4;
            color.x = Color.floatToByte(pickColor.red);
            color.y = Color.floatToByte(pickColor.green);
            color.z = Color.floatToByte(pickColor.blue);
            color.w = Color.floatToByte(pickColor.alpha);

            batchTable.setBatchedAttribute(i, attributesLength - 1, color);
        }


        var batchValues = batchTable._batchValues;
        transferableObjects.push(batchValues.buffer);

        var propertiesMapBuffer;
        if(properties){
            var str = JSON.stringify(propertiesMap);
            propertiesMapBuffer = strToArrayBuffer(str);
        }else{
            propertiesMapBuffer = new ArrayBuffer(0);
        }

        transferableObjects.push(propertiesMapBuffer);
        return {attributes,attributeIndices,batchValues,propertiesMapBuffer,ids,pickId};
    }

    function strToArrayBuffer(str){
        var buf = new ArrayBuffer(str.length * 2); // 每个字符占用2个字节
        var bufView = new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }


function getAttributeValue(value,scratchGetAttributeCartesian2,scratchGetAttributeCartesian3,scratchGetAttributeCartesian4) {
    var componentsPerAttribute = value.length;
    if (componentsPerAttribute === 1) {
        return value[0];
    } else if (componentsPerAttribute === 2) {
        return Cartesian2.unpack(value, 0, scratchGetAttributeCartesian2);
    } else if (componentsPerAttribute === 3) {
        return Cartesian3.unpack(value, 0, scratchGetAttributeCartesian3);
    } else if (componentsPerAttribute === 4) {
        return Cartesian4.unpack(value, 0, scratchGetAttributeCartesian4);
    }
}

    function getCommonPerInstanceAttributeNames(instances) {
        var length = instances.length;

        var attributesInAllInstances = [];
        var attributes0 = instances[0].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name) && defined(attributes0[name])) {
                var attribute = attributes0[name];
                var inAllInstances = true;

                // Does this same attribute exist in all instances?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i].attributes[name];

                    if (!defined(otherAttribute) ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllInstances = false;
                        break;
                    }
                }

                if (inAllInstances) {
                    attributesInAllInstances.push(name);
                }
            }
        }
        return attributesInAllInstances;
    }

    export default getPrimitiveData;