const chinese = "\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300b\x3a-\x40,\x5b-\x60,\x7b-\x7e,\x80-\xff,\u3000-\u3002,\u300a,\u300b,\u300e-\u3011,\u2014,\u2018,\u2019,\u201c,\u201d,\u2026,\u203b,\u25ce,\uff01-\uff5e,\uffe5";
let patt1 = new RegExp( "[\\w]+_[0-9a-zA-Z\u0391-\uFFE5]+_[\\w]+_[\\w]+=(([A-Za-z0-9/\\.\\?"+chinese+"]*([,|\\.|\\-|\\_|\\[|\\]][A-Za-z0-9/\\.\\?"+chinese+"]*)+)|([\\w]+\\(['|[A-Za-z0-9/\\?"+chinese+"]*|']+\\))|(\\d+)\\.(\\d+)|(\\([A-Za-z0-9/\\?"+chinese+"]*\\))|('|[A-Za-z0-9/\\?"+chinese+"]*|')+)","g");
let numberPat = new RegExp("^\\d{1,13}$");
"use strict";

class QueryToJs{

    _dealWithString (value){
        if (value.indexOf("\\") != -1){//如果值中包含转义字符，需要对转义字符做转义
            value = value.replace(/(?!\\")(?!\\')\\/g, "\\\\");
        }
        return '"' + value + '"';
    }
    _dealWithNumber(value){
        if(value.toLowerCase() == "null"){
            return null;
        }

        return value;
    }
    _dealWithDate(value){
        if (!value){
            return null;
        }
        if (numberPat.test(value)){
            value = Number(value);
        }else {
            if (value.indexOf('GMT') == -1){//如果字符串中没指定时区，默认为中国时区，避免系统自动转换时区造成的时间戳数值变化
                value += " GMT+0800";
            }
        }
        //应该写成与1970年的差别
        let date = new Date(value);
        value = date.getTime();
        return value;
    }
    _dealWithDateFloat(value){
        return value;
    }

    _convertType(type,value,defaultTyle){
        switch (type) {
            case 'S':
                value = this._dealWithString(value);
                break;
            case 'N':
                value = this._dealWithNumber(value);
                break;
            case 'L':
                value = this._dealWithNumber(value);
                break;
            case 'FT':
                value = this._dealWithDateFloat(value);
                break;
            case 'D':
                value = this._dealWithDate(value);
                break;
        }

        return value;
    }
    _convertTypeIn(type,value){
        let typeStr
        switch (type) {
            case 'S':
                typeStr = 'S';
                break;
            case 'N':
                typeStr = 'N';
                break;
            case 'L':
                typeStr = 'N';
                break;
            case 'FT':
                typeStr = 'N';
                break;
            default:
                typeStr = 'S';
                break;
        }
        let values = value.split(',')
        let valueArr = [];
        for(let i = 0; i < values.length ; i ++){
            if(typeStr == 'S'){
                valueArr.push("\"" + values[i] + "\"");
            }else{
                valueArr.push(values[i]);
            }
        }
        return "[" + valueArr.join(',') + "]";

    }

    /**
     * 处理片段，将filter片段转换成JS
     * @param queryPath
     * @returns {{str: string, field: *}}
     * @private
     */
    _queryPathToJs(queryPath, para){
        let str = "";

        let queryArr = queryPath.split('=');
        if (para != null){
            queryArr[1] = para;
        }
        let queryfilter = queryArr[0];
        let compareValue = queryArr[1];
        var filterCell = {};
        let info = queryfilter.split('_');
        filterCell['field'] = "v_" + info[1];
        filterCell['type'] = info[2];
        filterCell['operation'] = info[3];
        switch (filterCell.operation.toUpperCase()) {
            case 'LT':
                compareValue = this._convertType(filterCell.type, compareValue);
                str =  filterCell['field'] + " < " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'NE':
                compareValue = this._convertType(filterCell.type, compareValue);
                str =  filterCell['field'] + " != " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'GT':
                compareValue = this._convertType(filterCell.type, compareValue,"N");
                str =  filterCell['field'] + " > " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'LE':
                compareValue = this._convertType(filterCell.type, compareValue,"N");
                str =  filterCell['field'] + " <= " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };

            case 'GE':
                compareValue = this._convertType(filterCell.type, compareValue,"N");
                str =  filterCell['field'] + " >= " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'NULL':
                str =  filterCell['field'] +" == null";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'NOTNULL':
                str =  filterCell['field'] +" != null";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'LK':
                compareValue = this._convertType(filterCell.type, compareValue,"S");
                str = "(" + filterCell['field'] + " != null && " + filterCell['field'] + ".indexOf(" + compareValue + ") != -1)";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'LFK':
                compareValue = this._convertType(filterCell.type, compareValue,"S");
                str = "(" + filterCell['field'] + " != null && " + filterCell['field'] + ".endsWith(" + compareValue + "))";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'RHK':
                compareValue = this._convertType(filterCell.type, compareValue,"S");
                str = "(" + filterCell['field'] + " != null && " + filterCell['field'] + ".startsWith(" + compareValue + "))";
                return {
                    str:str,
                    field:filterCell['field']
                };

            case 'IN':
                compareValue = this._convertTypeIn(filterCell['type'],compareValue);
                str = compareValue + ".indexOf(" + filterCell['field'] + ") != -1";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'NOTIN':
                compareValue = this._convertTypeIn(filterCell['type'],compareValue);
                str = compareValue + ".indexOf(" + filterCell['field'] + ") == -1";
                return {
                    str:str,
                    field:filterCell['field']
                };
            case 'EQ':
                compareValue = this._convertType(filterCell['type'], compareValue);
                str =  filterCell['field'] + " == " +  compareValue;
                return {
                    str:str,
                    field:filterCell['field']
                };
        }
    }

    queryToJs(query){
        query = query.replace(/=''/g, "=");

        let strParamPatt = new RegExp(/'(.*?[^\\])'/);
        let paras = this._extractParameterValues(strParamPatt, query);
        if (paras.length != 0){
            let placeholderQuery = query.replace(/'(.*?[^\\])'/g, "?");
            let jsObj = this._queryToJs(placeholderQuery, paras);
            let jsStr = jsObj.js;
            for (let i = 0; i < paras.length; i++) {
                jsStr = jsStr.replace("?", paras[i]);
            }
            jsObj.js = jsStr;
            return jsObj;
        }else {
            return this._queryToJs(query);
        }

    }

    _extractParameterValues(strParamPatt, query) {
        let paras = [];
        while (true) {
            let result = strParamPatt.exec(query);
            if (result != null) {
                let para = result[0];
                paras.push(para.substring(1, para.length - 1));
                query = query.substring(result.index + para.length)
            } else {
                break;
            }
        }
        return paras;
    }

    /**
     * 将filter转换成js
     * @param placeholderQuery
     * @returns {{js: js字符串, fields: Set 所有用到的字段set}}
     */
    _queryToJs(placeholderQuery, paras){
        let map = {};
        let result = null;
        let fields = new Set();
        let index = 0;
        while(true) {
            result = patt1.exec(placeholderQuery);
            if(result != null) {
                let queryPath = result[0];
                let para = null;
                if (queryPath.endsWith("?")){
                    para = paras[index++];
                }
                let path = this._queryPathToJs(queryPath, para);
                map[queryPath] = path.str;
                fields.add(path.field);

            }else{
                break;
            }
        }
        let keyList = [];
        for(let key in map){
            keyList.push(key);
        }
        keyList.sort();
        keyList.reverse();
        for (let i = 0; i < keyList.length; i++) {
            let key = keyList[i];
            placeholderQuery = placeholderQuery.split(key).join(map[key]);
        }
/*        for(let key in keyList){
        //    query = query.replace(new RegExp(key,"g"),map[key]);
        }*/
        placeholderQuery = placeholderQuery.replace(new RegExp(/( AND )/g)," && ");
        placeholderQuery = placeholderQuery.replace(new RegExp(/( and )/g)," && ");
        placeholderQuery = placeholderQuery.replace(new RegExp(/( OR )/g)," || ");
        placeholderQuery = placeholderQuery.replace(new RegExp(/( or )/g)," || ");
        placeholderQuery = placeholderQuery.replace(new RegExp(/(not )/g)," ! ");
        placeholderQuery = placeholderQuery.replace(new RegExp(/(NOT )/g)," ! ");


        return {
            js:placeholderQuery,
            fields:fields
        };
    }
}
export default new QueryToJs();



