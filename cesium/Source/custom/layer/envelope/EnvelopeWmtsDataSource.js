const defined = Cesium.defined;
const PrimitivePipeline = Cesium.PrimitivePipeline;
const Matrix4 = Cesium.Matrix4;
const PrimitiveState = Cesium.PrimitiveState;
const BatchTable = Cesium.BatchTable;

const BEGIN = 1;
const LOADED = 2;
const ADDED = 3;
const REMOVED = 4;

class EnvelopeWmtsDataSource{
    constructor(name,results,rectangle,tileSize,level,viewer,options) {
        this.name = name;
        this.level = level;
        this.viewer = viewer;
        this.options = options;
        this.type = 'envelopeWmts';
        this.state = BEGIN;

        var polygonHierarchy = {
            //外圈
            positions: Cesium.Cartesian3.fromDegreesArray(
            //     [
            //     114.293789487477, 35.71498152596116,
            //     114.298789487477, 35.71498152596116,
            //     114.298789487477, 35.71098152596116,
            //     114.293789487477, 35.71098152596116,
            // ]
                this.getWmtsPositions(rectangle,tileSize)
            ),
        };

        let geometry =new Cesium.PolygonGeometry({
            height:-9000,
            extrudedHeight:10000,
            polygonHierarchy: polygonHierarchy,
        });


        const textureCoordinateRotationPoints = [0,0,0,1,1,0];
        const frameState = viewer.scene.frameState;
        const ellipsoid = frameState.mapProjection.ellipsoid;

        let attributes = Cesium.ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(
            rectangle,
            textureCoordinateRotationPoints,
            ellipsoid,
            frameState.mapProjection,
            10000);

        this.polygonPrimitive =  new Cesium.ClassificationPrimitive({
            asynchronous:false,
            shadows : Cesium.ShadowMode.ENABLED,
            geometryInstances: new Cesium.GeometryInstance({
                geometry: geometry,
                attributes:attributes,
            }),

            // geometryInstances:[],
            // undisplayable:true,
            classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,

            appearance : new Cesium.MaterialAppearance({
                material: Cesium.Material.fromType('Image', {
                    image: results
                })
            })
        });

        // let geometrie = results.primitiveData.polygon.geometries[0];
        // for(let name in attributes){
        //     geometrie.attributes[name] = attributes[name];
        // }
        // results.primitiveData.polygon.attributes = results.primitiveData.polygon.attributes.concat(attributes);
        // this.load(results);
        this.state =LOADED;
    }

    getWmtsPositions(rectangle,tileSize){
        let geometry = [0,0,tileSize,0,tileSize,tileSize,0,tileSize];
        let positions = [];
        for (let i = 0; i < geometry.length; i++) {
            let pt = this.formatToDegrees(geometry[i],geometry[i+1],rectangle,tileSize);
            positions.push(pt[0]);
            positions.push(pt[1]);
            i++;
        }
        return positions;
    }

    formatToDegrees(x,y,rectangle,tileSize){
        var lon = this.toDegrees(rectangle.west + rectangle.width/ tileSize* x);
        var lat = this.toDegrees(rectangle.north - rectangle.height/ tileSize* y);
        lon = Number(lon.toFixed(6));
        lat = Number(lat.toFixed(6));
        return [lon,lat];
    }

    toDegrees (radians) {
        return radians * 180.0 / Math.PI;
    }

    load(results) {
        let primitiveData = results.primitiveData;
        let imageData = results.imageData;
        let polygon = primitiveData.polygon;
        let primitiveOptions = this.polygonPrimitive.getDrawFunctionOptions();
        primitiveOptions.shadows = Cesium.ShadowMode.ENABLED;
        // primitiveOptions.appearance =  new Cesium.MaterialAppearance({
        //     material: Cesium.Material.fromType('Image', {
        //         image: imageData
        //     })
        // });
        primitiveOptions.undisplayable = true;
        primitiveOptions.geometryInstances = [];

        let primitive =  new Cesium.Primitive(primitiveOptions);
        this.setPrimitive(primitive,polygon);
        this.state =LOADED;
    }


    setPrimitive(primitive,results){
        // console.time('setPrimitive');
        // console.time('unpackCombineGeometryResults');
        let result = PrimitivePipeline.unpackCombineGeometryResults(results);
        // console.timeEnd('unpackCombineGeometryResults');
        primitive.isExt = true;
        primitive._geometries = result.geometries;
        primitive._attributeLocations = result.attributeLocations;
        primitive.modelMatrix = Matrix4.clone(result.modelMatrix, primitive.modelMatrix);
        primitive._pickOffsets = result.pickOffsets;
        primitive._offsetInstanceExtend = result.offsetInstanceExtend;
        primitive._instanceBoundingSpheres = result.boundingSpheres;
        primitive._instanceBoundingSpheresCV = result.boundingSpheresCV;
        primitive.propertiesMapBuffer = results.propertiesMapBuffer;


        if (defined(primitive._geometries) && primitive._geometries.length > 0) {
            primitive._recomputeBoundingSpheres = true;
            primitive._state = PrimitiveState.COMBINED;
        } else {
            // setReady(primitive, frameState, PrimitiveState.FAILED, undefined);
        }

        // console.time('createBatchTable');
        this.createBatchTable(primitive,results);
        // console.timeEnd('createBatchTable');
        // console.timeEnd('setPrimitive');

        primitive.appearance = this.polygonPrimitive.appearance;
        // this.polygonPrimitive.appearance = primitive.appearance;
        this.polygonPrimitive._primitive = primitive;
        // this.polygonPrimitive._hasPerColorAttribute = true;
    }

    createBatchTable(primitive,result){
        let attributes = result.attributes;
        let attributesLength = attributes.length;
        let ids  = result.ids;
        let batchValues = result.batchValues;
        let numberOfInstances = ids.length;
        let pickId = result.pickId;

        let context = this.viewer.scene.frameState.context;
        let batchTable = new BatchTable(context, attributes, numberOfInstances);
        batchTable._batchValues = batchValues;

        if(primitive._allowPicking){
            for (let i = 0; i < numberOfInstances; ++i) {
                var pickObject = {
                    primitive :  primitive
                };

                let id = ids[i];
                if (defined(id)) {
                    pickObject.id = id;
                }
                pickId ++;
                context._pickObjects[pickId] =pickObject;
            }
        }

        primitive._instanceIds  = ids;
        primitive._batchTable = batchTable;
        primitive._batchTableAttributeIndices = result.attributeIndices;
    }

    //移除
    remove(){
        if(this.polygonPrimitive){
            this.viewer.scene.primitives.remove(this.polygonPrimitive);
        }
        this.state = REMOVED;
    }

    //销毁
    destroy(){
        this.remove();
        if(this.polygonPrimitive && !this.polygonPrimitive.isDestroyed()){
            this.polygonPrimitive.destroy();
        }

        this.destroyed= true;
    }

    addToPrimitives(){
        //先加入的后画
        if(this.polygonPrimitive
            // && this.polygonPrimitive._primitive
        ){
            this.viewer.scene.primitives.add(this.polygonPrimitive);
        }
        this.state = ADDED;
    }


    showPrimitive(primitive){
        for(let i = 0;i<primitive._instanceIds.length;i++){
            primitive._batchTable.setBatchedAttribute(i, 1, 1);
        }
    }

    show(styleFun){
        if(this.state == REMOVED || this.state == LOADED){
            this.addToPrimitives();
        }
    }
}
export default EnvelopeWmtsDataSource;