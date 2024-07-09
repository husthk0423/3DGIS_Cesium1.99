let ControlSchema = {
    //是否其他图层显隐，作废
    cmdAll:Boolean,
    //替代cmdAll控制其他图层显隐，默认true
    otherDisplay:Boolean,
    //控制图层，可以控制图层的显隐和高亮，覆盖顺序 样式》图层显隐过滤》高亮
    layers:[{
        //图层ID，可以通过接口/styleInfo/:serverName/:styleId/layer.json获得，如果是旧样式，则为数据源图层ID
        id:String,
        //ID过滤器，通过逗号隔开
        idFilter:String,
        //样式组，只能是AND关系，没有括号
        filters:Object,
        //样式组，可以编写复杂样式，例如(NOT (Q_name_S_LFK=12) OR Q_fclass_S_EQ=1) AND Q_code_S_NE=10012这样类似样式,如果与filters同时存在，以此项为准
        filterStr:String,
        //样式组，sql写法，优先于filterStr
        sqlFilterStr:String,
        //是否过滤
        display:Boolean,
        //高亮，注记，拾取图层该属性无效
        color:{
            //颜色
            color:String,
            //高亮透明度
            opacity:Number,
            textureOpacity:Number,
            strokeColor:String,
            strokeOpacity:Number,
            strokeWidth:Number,
            isMask:Boolean
        }
    }]
}

import json5 from 'json5';
import QueryToJs from './QueryToJs';
import SqlToJs from './SqlToJs';

const _defaultOpacity = 0.8;
class Control{
    constructor(propertyConfigMap){
        this.tabIndex = 0;
        this.stringLineBuffer = [];
        this.allLayerData = true;
        this.propertyConfigMap = propertyConfigMap;
    }
//传入参数 id ,get,layerId
    strToFilterControl(str){
        let control = json5.parse(str);
        if(str.length != 0 && control == ""){
            console.log("Control字符串转换失败请检查,如果有特殊例如#@等,需要将其转换成转义符");
        }
        let controlObj = control;
        if(control.otherDisplay == null || "" === control.otherDisplay){
            control.otherDisplay = !control.cmdAll;
        }
        if(control.otherDisplay == null || "" === control.otherDisplay){
            control.otherDisplay = true;
        }else {
            control.otherDisplay = Boolean(control.otherDisplay);
        }
        delete control.cmdAll;
        this._begin(control.otherDisplay);
        this.controlLayersArr = [];
        if(control.layers == null){
            return null;
        }
        for(var i = 0 ; i < control.layers.length ; i ++ ){
            let layer = control.layers[i];
            let layerId = layer.id;
            if(layerId == null){
                continue;
            }
            this.controlLayersArr.push(layerId);
            //写函数主体
            this._beginIsInLayer(layerId);
            //如果idFilter存在，首先过滤
            let idFilter = layer.idFilter;
            if(idFilter != null &&  idFilter != ""){
                this.allLayerData = false;
                this._beginDoIdFilter(idFilter);
                //如果是不显示
                if(layer.display == false){
                    this._push("return false;");
                }else{
                    //然后判断color
                    if(layer.color != null){
                        this._push("color = {}");
                        if (layer.color.isMask){
                            this._push("color.isMask = true");
                        }

                        if (layer.color.color){
                            this._push("color.color = \"" + layer.color.color + "\"");
                        }

                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }

                        if(layer.color.textureOpacity != null){
                            this._push("color.textureOpacity = " + layer.color.textureOpacity);
                        }


                        if(layer.color.strokeColor != null){
                            this._push("color.strokeColor = \"" +  layer.color.strokeColor + "\"");
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeOpacity = " + _defaultOpacity);
                            }else{
                                this._push("color.strokeOpacity = " + layer.color.strokeOpacity);
                            }
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeWidth = " + 1);
                            }else{
                                this._push("color.strokeWidth = " + layer.color.strokeWidth);
                            }
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }
                }
                this._endDoIdFilter(idFilter);
            }
            //看filterStr是否存在
            let filterStr = layer.filterStr;
            if(filterStr == null || "" == filterStr){
                if(typeof layer.filters == "object"){
                    let filterArr = [];
                    for(let index in layer.filters){
                        filterArr.push(index + "=" + layer.filters[index]);
                    }
                    filterStr = filterArr.join(" and ");
                }
            }

            if((filterStr != null && "" != filterStr) || (layer.sqlFilterStr != null && layer.sqlFilterStr != "")){
                this.allLayerData = false;
                if (layer.sqlFilterStr != null && layer.sqlFilterStr != ""){//有sqlFilter的，以sqlFilter为准
                    this._beginSqlFilter(layer.sqlFilterStr, this.propertyConfigMap[layer.id].fields);
                }else {
                    this._beginFilter(filterStr);
                }

                if(layer.display == false){
                    this._push("return false;");
                }else{
                    //然后判断color
                    if(layer.color != null){
                        this._push("color = {}");
                        if (layer.color.isMask){
                            this._push("color.isMask = true");
                        }

                        if (layer.color.color) {
                            this._push("color.color = \"" + layer.color.color + "\"");
                        }

                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }
                        if(layer.color.strokeColor != null){
                            this._push("color.strokeColor = \"" +  layer.color.strokeColor + "\"");
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeOpacity = " + _defaultOpacity);
                            }else{
                                this._push("color.strokeOpacity = " + layer.color.strokeOpacity);
                            }
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeWidth = " + 1);
                            }else{
                                this._push("color.strokeWidth = " + layer.color.strokeWidth);
                            }
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }
                }
                this._endFilter();


            }

            if(this.allLayerData == true){
                if(layer.display == false){
                    this._push("return false;");
                }else{
                    if(layer.color != null){
                        this._push("color = {}");
                        if (layer.color.isMask){
                            this._push("color.isMask = true");
                        }

                        if (layer.color.color) {
                            this._push("color.color = \"" + layer.color.color + "\"");
                        }

                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }
                        if(layer.color.strokeColor != null){
                            this._push("color.strokeColor = \"" +  layer.color.strokeColor + "\"");
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeOpacity = " + _defaultOpacity);
                            }else{
                                this._push("color.strokeOpacity = " + layer.color.strokeOpacity);
                            }
                            if(layer.color.strokeOpacity == null){
                                this._push("color.strokeWidth = " + 1);
                            }else{
                                this._push("color.strokeWidth = " + layer.color.strokeWidth);
                            }
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }

                }
            }

            this._endIsInLayer(layerId);
        }
        this._end();
        try {
            controlObj.controlLayersArr = this.controlLayersArr;
            let controlFn = new Function("id","get","layerId",this.stringLineBuffer.join('\n'));
            return {
                controlObj:controlObj,
                controlFn:controlFn,
                propertyConfigMap:this.propertyConfigMap,
                getSqlFilter:this.getSqlFilter
            }
        }catch(e){
            throw "创建过滤器失败" + e + "请检查过滤语句";
        }
    }


    getSqlFilter(styleOperator){
        let filter = {};
        for (let key in this.controlObj.layers){
            let layer = this.controlObj.layers[key];
            let data = styleOperator.getDataByLayer(layer.id);
            if (data == null){//默认样式获取到data，直接使用layer.id即可
                data = layer.id;
            }
            let filterArr = [];
            let idFilter = layer.idFilter;
            let layerFields = this.propertyConfigMap[data];
            if (idFilter && layerFields != null){
                if (layerFields.idFieldType == 'string'){
                    idFilter = "'" +  idFilter.replace(',',"','") + "'";
                }
                filterArr.push(layerFields.idField + ' in (' + idFilter + ')');
            }

            if (layer.sqlFilterStr){
                filterArr.push(layer.sqlFilterStr);
            }

            if (filterArr.length){
                filter[layer.id] = filterArr.join(' and ');
            }else if (this.controlObj.otherDisplay){
                filter[layer.id] = 'all';
            }

        }
        return JSON.stringify(filter);
    }



    _end(){
        this._push("return color;");

    }
    _begin(otherDisplay){
        if(otherDisplay){
            this._push("var color = true;")
        }else{
            this._push("var color = false;")
        }

    }
    _endFilter(){

        this.tabIndex --;
        this._push("}");


    }
    _beginFilter(filter){
        let queryObj = null;
        try {
            //过滤器处理filter
            queryObj = QueryToJs.queryToJs(filter);
        }catch(e){
            throw "filter: " +  filter + " 解析失败，错误：" + e;
        }

        let jsStr = queryObj.js;
        //取出所有需要获得的字段
        for(let field of queryObj.fields){
            //加入获得字段的函数
            this._push("var " + field + " = get(\"" + field.substr(2,field.length) + "\");");
        }
        this._push("if(" + jsStr + "){")
        this.tabIndex ++;

    }

    _beginSqlFilter(filter, fieldsArr){
        let len = fieldsArr.length;
        let fieldsMap = {};
        for (let i = 0; i < len; i++) {
            let f = fieldsArr[i];
            fieldsMap[f.name] = {type: f.type};
        }
        let queryObj = null;
        try {
            //过滤器处理filter
            queryObj = SqlToJs.SqlToJs(filter, fieldsMap);
        }catch(e){
            throw "filter: " +  filter + " 解析失败，错误：" + e;
        }

        let jsStr = queryObj.js;
        //取出所有需要获得的字段
        for(let field of queryObj.fields){
            //加入获得字段的函数
            this._push("var " + field + " = get(\"" + field.substr(2,field.length) + "\");");
        }
        this._push("if(" + jsStr + "){")
        this.tabIndex ++;

    }
    _beginDoIdFilter(idFilter){

        let str = "if(\"" + idFilter + "\".split(',').indexOf(id.toString()) != -1){";
        this._push(str);
        this.tabIndex ++;
    }
    _endDoIdFilter(idFilter){

        this.tabIndex --;
        this._push("}");
    }
    _beginIsInLayer(layerId){

        let str = "if(layerId == \"" + layerId + "\"){";
        this._push(str);
        this.tabIndex ++;
    }
    _endIsInLayer(layerId){
        this._push("return false;");
        this.tabIndex --;
        let str = "}";
        this._push(str);
    }
    _push(str){
        for(var i = 0 ; i < this.tabIndex ; i ++){
            str = "    " + str;
        }
        this.stringLineBuffer.push(str);
    }
}
// strokeColor:String,
//             strokeOpacity:Number,
//             strokeWidth:Number
export default Control;
/*let aaa = '{ cmdAll:false, layers:[{ id:"面状水系", filters:{Q_fcode_S_EQ:2101010500}, idFilter:"818009",display:false},{ id:"面状水系", idFilter:"818009",color:{color:"#666666",strokeColor:"#666666",strokeOpacity:1,strokeWidth:1}}]}'

let control = new Control();
console.log(control.strToFilterControl(aaa));*/
