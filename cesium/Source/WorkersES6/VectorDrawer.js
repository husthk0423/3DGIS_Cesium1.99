import ModelPointDrawer from "./ModelPointDrawer";

/**
 * Constructs a worker pool.
 * @private
 */
    function VectorDrawer(layerDataMapArr,level,featureMap,control,highLighStr,filterLayerId){
        this.layerDataMapArr = layerDataMapArr;
        this.level = level;
        this.control =control;
        this.highLight = highLighStr;
        this.featureMap = featureMap;
        this.featureMap.keyArr = [];
        this.filterLayerId = filterLayerId;
        this.index = 0;
    }

    VectorDrawer.prototype.getBackgroundDrawer = function(){
        this.vectorDatas = [];
        return this;
    }

    VectorDrawer.prototype.getBackground = function(){
        this.vectorDatas = [];
        return this;
    }

    VectorDrawer.prototype.getTypeString = function(type){
        if(type == 1 || type == 'POINT'){
            return 'Point';
        }
        if(type == 2 || type == 'LINESTRING'){
            return 'LineString';
        }

        if(type == 3 || type == 'POLYGON'){
            return 'Polygon';
        }

        if(type == 4 || type == 'MULTIPOINT'){
            return 'MultiPoint';
        }

        if(type ==5 || type == 'MULTILINESTRING'){
            return 'MultiLineString';
        }

        if(type == 6 || type == 'MULTIPOLYGON'){
            return 'MultiPolygon';
        }

        if(type == 7 || type == 'FEATURECOLLECTION'){
            return 'FeatureCollection';
        }
    }

    VectorDrawer.prototype.getLayer = function(dataLayerID,styleLayerID){
        this.index++;
        this.vectorDatas = [];
        // if(this.filterLayerId && dataLayerID !=this.filterLayerId){
        //     return this;
        // }

        let bool = false;
        if(this.filterLayerId){
            for(let i =0;i<this.filterLayerId.length;i++){
                let fid = this.filterLayerId[i];
                if(dataLayerID == fid){
                    bool = true;
                    break;
                }
            }
        }else{
            bool = true;
        }

        if(bool == false){
            return this;
        }


        //判断其他图层是否显示Control otherDisplay,如果是其他图层不显示，则需要在这里处理
        if(this.control) {
            if (this.control.controlObj.otherDisplay == false) {
                if (this.control.controlObj.controlLayersArr.indexOf(styleLayerID) == -1) {
                    return this;
                }
            }
        }

        for(let i = 0;i<this.layerDataMapArr.length;i++){
            let data = this.layerDataMapArr[i][dataLayerID];
            if(data == null){
                continue;
            }

            if(!data.features){
                data.features = data.datas;
            }

            if(!data.features){
                continue;
            }

            for(let j=0;j<data.features.length;j++){
                let vectorData = data.features[j];
                vectorData.layerName = dataLayerID;
                vectorData.type = this.getTypeString(vectorData[0]);
                if(!vectorData.properties){
                    vectorData.properties = this.getFieldValueMap(data,vectorData);
                }

                //过滤数据
                if(this._filterByStyle(vectorData,styleLayerID)){
                    //高亮
                    let controlRes = this._highLightByStyle(vectorData,styleLayerID)
                    if(controlRes['color'] != null){
                        vectorData.customeColor = controlRes;
                    }
                    this.vectorDatas.push(vectorData);
                }
            }
        }
        return this;
    }

    VectorDrawer.prototype.getGroupLayer = function(dataLayerID,value,styleLayerID){
        this.index++;
        this.vectorDatas = [];

        // if(this.filterLayerId && dataLayerID !=this.filterLayerId){
        //     return this;
        // }
        let bool = false;
        if(this.filterLayerId){
            for(let i =0;i<this.filterLayerId.length;i++){
                let fid = this.filterLayerId[i];
                if(dataLayerID == fid){
                    bool = true;
                    break;
                }
            }
        }

        if(bool == false){
            return this;
        }

        let valueArr = value.split(',');
        let length = valueArr.length;
        if(length == 0){
            return this;
        }

        //判断其他图层是否显示Control otherDisplay,如果是其他图层不显示，则需要在这里处理
        if(this.control) {
            if (this.control.controlObj.otherDisplay == false) {
                if (this.control.controlObj.controlLayersArr.indexOf(styleLayerID) == -1) {
                    return this;
                }
            }
        }

        for(let i = 0;i<this.layerDataMapArr.length;i++){
            let data = this.layerDataMapArr[i][dataLayerID];
            if(data == null){
                continue;
            }

            if(!data.features){
                data.features = data.datas;
            }

            if(!data.features){
                continue;
            }

            for(let j = 0 ; j < length ; j ++){
                let dataArr = data.features[valueArr[j]];
                if(dataArr == null){
                    continue;
                }

                let vectorData = data.features[i];
                vectorData.layerName = dataLayerID;
                vectorData.type = data.type;
                if(!vectorData.properties){
                    vectorData.properties = this.getFieldValueMap(data,vectorData);
                }

                //过滤数据
                if(this._filterByStyle(vectorData,styleLayerID)){
                    let controlRes = this._highLightByStyle(vectorData,styleLayerID)
                    if(controlRes['color'] != null){
                        vectorData.customeColor = controlRes;
                    }
                    this.vectorDatas.push(vectorData);
                }
            }
        }
        return this;
    }

    VectorDrawer.prototype.setStyle = function(fn){
        for(let i=0;i<this.vectorDatas.length;i++){
            let item = this.vectorDatas[i];
            let vectorData = {};
            vectorData.id = Math.random();
            vectorData.layerName = item.layerName;
            vectorData.customeColor = item.customeColor;
            vectorData.type = item.type;
            vectorData.properties = item.properties;
            if(!Array.isArray(item[2][0])){
                vectorData.data = [item[2]];
            }else{
                vectorData.data = item[2];
            }

            vectorData.index = this.index;

            let get = function(key){
                return vectorData.properties[key];
            };

            let style = fn.call({},this.level,get);
            if(vectorData.type == 'MultiLineString' || vectorData.type == 'LineString'){
                if(style && style.stroke == false){
                    continue;
                }
            }

            if(style && style.display != false){
                vectorData.style = style;

                if(vectorData.customeColor){
                    vectorData.style._id = vectorData.customeColor._id;
                    if(vectorData.style.hasOwnProperty('fillColor')){
                        vectorData.style.fillColor = vectorData.customeColor['color'];
                        vectorData.style.fillOpacity = vectorData.customeColor['opacity'];
                    }else{
                        vectorData.style.strokeColor = vectorData.customeColor['color'];
                        vectorData.style.strokeOpacity = vectorData.customeColor['opacity'];
                    }
                }

                let key = style._id;
                if(!this.featureMap[key]){
                    this.featureMap.keyArr.push(key);
                    let features = {};
                    features.style = style;
                    //面要素
                    features.fillFeatures = [];
                    //线要素
                    features.lineFeatues = [];
                    this.featureMap[key] = features;
                }

                if(vectorData.type == 'MultiLineString' || vectorData.type == 'LineString'){
                    this.featureMap[key].lineFeatues.push(vectorData);
                    continue;
                }

                if(vectorData.type == 'Polygon' || vectorData.type == 'MultiPolygon'){
                    this.featureMap[key].fillFeatures.push(vectorData);
                }
            }
        }
    }

    VectorDrawer.prototype.getFieldValueMap = function(data,vectorData){
        let  fieldValueMap=  {};
        for(let i = 0;i<data.fieldsConfig.length;i++){
            let fieldName = data.fieldsConfig[i]['name'];
            let index = data.fieldsConfig[i]['index'];
            let id = data.fieldsConfig[i]['id'];
            if(id == true){
                //图层名和数据的主键构成唯一id
                fieldValueMap['primaryId'] =vectorData.layerName+vectorData[1][index];
                fieldValueMap['id'] =vectorData[1][index];
            }
            fieldValueMap[fieldName] = vectorData[1][index];
        }
        return fieldValueMap;
    }

    VectorDrawer.prototype.getWaterMark = function(){
        this.vectorDatas = [];
        return this;
    }

    VectorDrawer.prototype.draw = function(){
    }

    VectorDrawer.prototype._getProperty = function(data){
        return data[1];
    }

    VectorDrawer.prototype._getPoints = function(data){
        return data[2];
    }
    VectorDrawer.prototype._getType = function(data){
        return data[0];
    }
    VectorDrawer.prototype._filterByStyle = function(gjson,styleLayerID){
        let type = this._getType(gjson);
        let points = this._getPoints(gjson);
        let property = this._getProperty(gjson);
        if(points == null){
            throw "绘制失败,数据中缺少Geometry";
        }
        if(type == null){
            type = "POLYGON";
        }
        let style = null;
        let controlRes = {};

        var get = function(fieldName){
            return gjson.properties[key];
        }
        if(this.control) {
            if(typeof this.control.controlFn == "function") {
                let id = gjson.properties['id'];
                controlRes = this.control.controlFn.call({}, id, get, styleLayerID);
                if (controlRes == false || controlRes == null) {
                    return false;
                }
            }
        }

        return true;
    }
    VectorDrawer.prototype._highLightByStyle = function(gjson,styleLayerID){
        let type = this._getType(gjson);
        let points = this._getPoints(gjson);
        let property = this._getProperty(gjson);
        if(points == null){
            throw "绘制失败,数据中缺少Geometry";
        }
        if(type == null){
            type = "POLYGON";
        }
        let style = null;
        let controlRes = {};

        var get = function(fieldName){
            return gjson.properties[key];
        }
        if(this.highLight) {
            if(typeof this.highLight.controlFn == "function") {
                let id = gjson.properties['id'];
                controlRes = this.highLight.controlFn.call({}, id, get, styleLayerID);
                if (controlRes == false || controlRes == null) {
                    return false;
                }
            }
        }
        return controlRes;
    }

    export default VectorDrawer;


