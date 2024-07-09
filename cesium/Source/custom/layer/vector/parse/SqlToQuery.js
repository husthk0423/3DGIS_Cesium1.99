/**
 * Created by matt on 2017/6/26.
 */

const parse = require('node-sqlparser').parse;
class SqlToQuery{
     _getType(column,fieldInfo){
        var info = fieldInfo[column];
        if(info == null){
            throw "类型中没有找到[" + column + "]的类型，请检查"
        }
        var type = info.type
        switch (type) {
            case 'String':
                return 'S';
            case 'Integer':
                return 'N';
            case 'Long':
                return 'L';
            case 'Float':
                return 'FT';
            case 'java.math.BigDecimal':
                return 'L';
            case 'Double':
                return 'FT';
            case 'java.sql.Timestamp':
                return 'D';
            case 'java.util.Date':
                return 'D';
            case 'string':
                return 'S';
            case 'integer':
                return 'N';
            case 'long':
                return 'L';
            case 'float':
                return 'FT';
            case 'bigdecimal':
                return 'L';
            case 'double':
                return 'FT';
            case 'timestamp':
                return 'D';
            case 'java.util.date':
                return 'D';
        }
        return "S"
    }
    _getCode(expression,type) {



        let operator = expression.operator;
        switch (operator) {
            case '<':
                if(type == "S"){
                    throw "字符串不能比对大小";
                }
                return 'LT';
            case '!=':

                return "NE";
            case ">":
                if(type == "S"){
                    throw "字符串不能比对大小";
                }
                return 'GT';
            case '<=':
                if(type == "S"){
                    throw "字符串不能比对大小";
                }
                return "LE";

            case '>=':
                if(type == "S"){
                    throw "字符串不能比对大小";
                }
                return "GE";

            case 'IS':
                return "NULL";
            /* case 'NOTNULL':
             str = "value_" + filterCell['field'] + " != null";
             return str;*/
            case 'LIKE':
                let value = expression.right.value;
                if(value.startsWith("%") && value.endsWith("%")){
                    return "LK";
                }
                if(value.startsWith("%")){
                    return "LFK";
                }
                if(value.endsWith("%")){
                    return "RHK";
                }


            case 'IN':

                return 'IN';
            case 'NOT IN':

                return 'NOTIN';
            case '=':
                return "EQ";
        }
    }
    _doExpression(fields,expression,vstring,parent){
        let operator = expression.operator;

        let leftstr = "";
        let rightstr = "";
        if(expression.left) {

            leftstr = this._doExpression(fields,expression.left,vstring,expression);
        }
        if(expression.right) {
            rightstr = this._doExpression(fields,expression.right,vstring,expression);
        }
        if(expression.type == "binary_expr") {
            if(operator.toLowerCase() == "or") {

                vstring = leftstr + " " +  operator + " " + rightstr;

            }
            else if(operator.toLowerCase() == "and") {
                vstring = leftstr + " " + operator + " " + rightstr;

            }else{
                vstring = leftstr + "=" + rightstr
            }
            if(expression.paren){
                vstring = "(" + vstring + ")";
            }

            return vstring;
        }
        if(expression.type == "column_ref"){
            var type = this._getType(expression.column,fields)

            let code = this._getCode(parent,type);

            return "Q_" + expression.column + "_" + type + "_" + code;
        }
        if(expression.type == "expr_list"){

            var valueArr = [];
            for(var i = 0 ; i < expression.value.length; i ++){
                valueArr.push(expression.value[i].value)
            }
            return valueArr.join(",");
        }
        if(expression.type == "string"){
            if(parent.operator == 'LIKE'){
                return  expression.value.replace(new RegExp(/(%)/g),'');
            }else{
                return  expression.value  ;
            }
        }
        if(expression.type == "number"){
            return  expression.value   ;
        }
        if(expression.type == "null"){
            return "NULL";
        }
        if(expression.type == "unary_expr"){
            let exprstr = this._doExpression(fields,expression.expr,vstring,expression);
            vstring = "NOT " + exprstr;
            if(expression.paren){
                vstring = "(" + vstring + ")";
            }
            return vstring;
        }
    }
    sqlToQuery(sql,fields){
        let vstring = "";
        var sql = 'select * from t where ' + sql;
        var astObj = parse(sql);
        vstring = this._doExpression(fields,astObj.where,vstring);
        return vstring;
    }
}

export default new SqlToQuery();



