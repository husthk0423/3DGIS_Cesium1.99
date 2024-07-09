const Cartesian3 = Cesium.Cartesian3;
const Color = Cesium.Color;
const defined = Cesium.defined;
const CallbackProperty = Cesium.CallbackProperty;
const CesiumMath = Cesium.Math;
const Matrix4 = Cesium.Matrix4;
const Cartesian4 = Cesium.Cartesian4;

const defer =Cesium.defer;


const BEGIN = 1;
const LOADED = 2;
const ADDED = 3;
const REMOVED = 4;

class ModelDataSource{
    constructor(name,results,level,viewer,options,lightMap) {
        this.name = name;
        this.level = level;
        this.viewer = viewer;
        this.options = options;
        this.type = 'model';
        this.state = BEGIN;

        this.modelArray = [];

        this.urlMap = options.urlTypeLevelMap;

        this.readyPromise = defer();
        this.ready = false;
        this.load(results);
    }

    load(results) {
        let instancesMap = {};
        for(let layerName in results){
            let layerDatas = results[layerName];
            for(let i = 0;i<layerDatas.length;i++){
                let data = layerDatas[i];
                let type = data.properties[this.options.modelTypeField];
                type = type?type:'1';
                if(!instancesMap[type]){
                    instancesMap[type] = [];
                }

                let heading = Number(data.properties[this.options.headingField]);
                let scale = Number(data.properties[this.options.scaleField]);
                let lon = Number(data.properties[this.options.lonField]);
                let lat = Number(data.properties[this.options.latField]);
                let addHeight = this.options.hasOwnProperty('addHeight') ?Number(this.options.addHeight):0;
                let height = Number(data.properties[this.options.heightField]);
                height = height?height:0;
                height = height+ addHeight;
                let position = Cesium.Cartesian3.fromDegrees(lon,lat,height);

                if(!scale){
                    scale =1;
                }
                let modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
                    position,
                    new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), Cesium.Math.toRadians(0), Cesium.Math.toRadians(0))
                );
                Cesium.Matrix4.multiplyByUniformScale(
                    modelMatrix,
                    scale,
                    modelMatrix
                );
                instancesMap[type].push({
                    modelMatrix: modelMatrix,
                });
            }
        }

        let promises = [];
        for(let type in instancesMap){
            let instances = instancesMap[type];
            if(!this.urlMap[type] || !this.urlMap[type][this.level]){
                continue;
            }
            let url = this.urlMap[type][this.level];
            for(let i = 0;i<instances.length;i++){
                let instance = instances[i];
                let model =Cesium.Model.fromGltf({
                    asynchronous:false,
                    gltf : url,
                    modelMatrix: instance.modelMatrix,
                });

                this.modelArray.push(model);
                model.update(this.viewer.scene.frameState);
                promises.push(model.readyPromise);
            }
            // let modelInstanceCollection= new Cesium.ModelInstanceCollection({url:url,instances:instances});
            // this.modelInstanceCollectionArray.push(modelInstanceCollection);
            // this.viewer.scene.primitives.add(modelInstanceCollection);
            // modelInstanceCollection.mName = this.name;
            // promises.push(modelInstanceCollection.readyPromise);
        }
        this.state =LOADED;
        this.readyPromise.resolve();
        this.ready = true;
    }

    //移除
    remove(){
        for(let i = 0;i<this.modelArray.length;i++){
            this.viewer.scene.primitives.remove(this.modelArray[i]);
        }
        this.state = REMOVED;
    }

    //销毁
    destroy(){
        this.remove();
        for(let i = 0;i<this.modelArray.length;i++){
            let model = this.modelArray[i];
            if(!model.finishedDestroy){
                model.destroy();
                model.finishedDestroy = true;
            }
        }

        this.modelArray = [];
        this.destroyed= true;
    }

    addToPrimitives(){
        for(let i = 0;i<this.modelArray.length;i++){
            this.viewer.scene.primitives.add(this.modelArray[i]);
        }
        this.state = ADDED;
    }


    showPrimitive(primitive){
    }

    show(styleFun){
       if(this.state ==LOADED || this.state == REMOVED){
            this.addToPrimitives();
        }
    }
}
export default ModelDataSource;