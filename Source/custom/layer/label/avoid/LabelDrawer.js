/**
 * Created by kongjian on 2017/5/1.
 */
class LabelDrawer{
    constructor(layerDataMap,styleMap,control,level) {
        this.layerDataMap = layerDataMap;
        this.level = level;
        this.styleMap = styleMap;
        this.control = control;
        this.propertyGetterMap = {};
    }

    getLayer(layername){
        this.layerDatas = {};
        let data = this.layerDataMap[layername];
        if(data == null || data.features == null){
            return this;
        }

        //判断其他图层是否显示Control otherDisplay,如果是其他图层不显示，则需要在这里处理
        if(this.control) {
            if (this.control.controlObj.otherDisplay == false) {
                if (this.control.controlObj.controlLayersArr.indexOf(layername) == -1) {
                    return this;
                }
            }
        }


        this.propertyGetterMap[layername] = this.getProperty(data.fieldsConfig);
        this.layerDatas[layername] = data;
        return this;
    }

    getAllLayer(){
        this.layerDatas = this.layerDataMap;
        for(let layername in this.layerDataMap){
            this.propertyGetterMap[layername] = this.getProperty(this.layerDataMap[layername].fieldsConfig);
        }
        return this;
    }


    getGroupLayer(layername,value){
        this.layerDatas = {};
        let valueArr = value.split(',');
        let length = valueArr.length;
        if(length == 0){
            return this;
        }

        let data = this.layerDataMap[layername];
        if(data == null || data.features == null){
            return this;
        }
        this.propertyGetterMap[layername] = this.getProperty(data.fieldsConfig);
        this.layerDatas[layername] = data;
        return this;
    }



    _getPoints(data){
        return data[2];
    }
    _getType(data){
        return data[0];
    }

    //过滤数据
    _filterByStyle (gjson,styleLayerID) {
        let type = this._getType(gjson);
        let points = this._getPoints(gjson);

        let propertyGetter = this.propertyGetterMap[styleLayerID];
        if(points == null){
            throw "绘制失败,数据中缺少Geometry";
        }
        if(type == null){
            type = "POLYGON";
        }
        let controlRes = {};

        let get = function(key){
            return gjson[1][propertyGetter.propertyConfig[key]];
        };

        if(this.control) {
            if(typeof this.control.controlFn == "function") {
                let id = get('id');
                controlRes = this.control.controlFn.call({}, id, get, styleLayerID);
                if (controlRes == false || controlRes == null) {
                    return false;
                }
            }
        }

        return true;
    }

    getProperty(fieldsConfig){
        let propertyConfig = {};
        let idIndex = 0;
        for(var i = 0 ;i < fieldsConfig.length; i ++){
            if(fieldsConfig[i].id == 'true' || fieldsConfig[i].id == true){
                idIndex = fieldsConfig[i].index;
            }
            propertyConfig[fieldsConfig[i].name] = parseInt(fieldsConfig[i].index);
        }
        return {propertyConfig:propertyConfig,idIndex:idIndex};
    }

    setStyle(fn){
		for(let layername in  this.layerDatas){
		    let layerData = this.layerDatas[layername];
		    let propertyGetter = this.propertyGetterMap[layername];
		    for(let i =0;i<layerData.features.length;i++){
                let feature = layerData.features[i];

                //过滤数据
                if(!this._filterByStyle(feature,layername)){
                    continue;
                }

                let get = function(key){
                    return feature[1][propertyGetter.propertyConfig[key]]
                };

                let style = fn.call({},this.level,get);

                if(style && style.show == true){
                    if(!this.styleMap[style._id]){
                        this.styleMap[style._id] = style;
                    }
                    feature.avoidWeight = this.getWeight(style,feature,propertyGetter);
                    feature.styleId = style._id;
                }

            }
        }
    }

    setGlobalStyle(fn){
        this.globalStyle = fn.call({});
    }

    getWeight(style,feature,propertyGetter){

        let weight = feature[1][propertyGetter.propertyConfig[style.avoidField]];
        if (weight) {
            weight = parseInt(weight);
            if (isNaN(weight)) {
                weight = 0;
            }
        }else{
            weight =  0;
        }

        if(weight ==0){
            if(style.avoidWeight){
                return style.avoidWeight;
            }
        }
        return weight;
    }

    draw(){

    }
}

export default LabelDrawer;

