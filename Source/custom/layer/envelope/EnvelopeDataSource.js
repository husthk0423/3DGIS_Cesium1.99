const Cartesian3 = Cesium.Cartesian3;
const Color = Cesium.Color;
const defined = Cesium.defined;
const CallbackProperty = Cesium.CallbackProperty;
const CesiumMath = Cesium.Math;
const PrimitivePipeline = Cesium.PrimitivePipeline;
const Matrix4 = Cesium.Matrix4;
const PrimitiveState = Cesium.PrimitiveState;
const BatchTable = Cesium.BatchTable;
const Cartesian4 = Cesium.Cartesian4;


const BEGIN = 1;
const LOADED = 2;
const ADDED = 3;
const REMOVED = 4;



class EnvelopeDataSource{
    constructor(name,results,level,viewer,options,lightMap) {
        this.name = name;
        this.level = level;
        this.viewer = viewer;
        this.options = options;
        this.type = 'envelope';
        this.state = BEGIN;

            this.polygonPrimitive =  new Cesium.ClassificationPrimitive({
                shadows : Cesium.ShadowMode.ENABLED,
                geometryInstances:[],
                undisplayable:true,
                classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
                // attributes: {
                //     color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                //         new Cesium.Color(1.0, 0.0, 0.0, 0.5)
                //     ),
                //     show: new Cesium.ShowGeometryInstanceAttribute(true),
                // },
                appearance : new Cesium.PerInstanceColorAppearance({
                    flat : false,
                    translucent : this.translucent,
                    closed:true
                })
            });
        this.load(results);
    }



    load(results) {
        let polygon = results.polygon;

        if(polygon){
            let primitiveOptions = this.polygonPrimitive.getDrawFunctionOptions();
            primitiveOptions.shadows = Cesium.ShadowMode.ENABLED;
            primitiveOptions.appearance = new Cesium.PerInstanceColorAppearance({
                flat : false,
                translucent : this.translucent,
                closed:true
            });
            primitiveOptions.undisplayable = true;
            primitiveOptions.geometryInstances = [];

            let primitive =  new Cesium.Primitive(primitiveOptions);
            this.setPrimitive(primitive,polygon);
            this.state =LOADED;
        }
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
        var scratchGetAttributeCartesian4 = new Cartesian4();

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
                // var pickId = context.createPickId(pickObject);
                // primitive._pickIds.push(pickId);
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
        if(this.polygonPrimitive && this.polygonPrimitive._primitive){
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
export default EnvelopeDataSource;