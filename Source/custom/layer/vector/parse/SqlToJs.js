import SqlToQuery from './SqlToQuery';
import QueryToJs from './QueryToJs';

class SqlToJS{
    static SqlToJs(sql,fields){
        let query = SqlToQuery.sqlToQuery(sql,fields);
        //console.log(query)
        return QueryToJs.queryToJs(query);
    }
}
export default SqlToJS;

//console.log(SqlToJS.SqlToJs("newName='西城区'",{newName:{type:'string'}}));
//"newName='西城区"
//console.log(SqlToJS.SqlToJs("dlbm > 1624870544000",{dlbm:{type:'timestamp'}}))
