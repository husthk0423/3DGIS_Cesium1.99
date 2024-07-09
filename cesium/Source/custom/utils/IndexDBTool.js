const defer =Cesium.defer;
/**
* 编码工具类
*/
class IndexDBTool {
    /**
     * 根据数据库名创建数据库
     * @param dbName
     * @returns {Promise | Promise<unknown>}
     */
    static createDB(dbName){
        let deferred = defer();

        let request = indexedDB.open(dbName,1);
        request.onerror = function(){
            console.log(dbName+"数据库创建失败或者异常~");
            deferred.reject();
        };
        request.onsuccess = function(e){
            console.log(dbName+"数据库连接成功~");
            let db = e.target.result;
            deferred.resolve(db);
        };
        request.onupgradeneeded = function(e){
            let db = e.target.result;
            deferred.resolve(db);
        };
        return deferred.promise;
    }

    /**
     *  创建表和索引
     * @param db 数据库实例
     * @param tName 表名
     * @param pKey 表的主键字段名
     * @param autoIncrement 是否主键自增长
     * @param indexName 索引名称
     * @param indexFiled 索引指定的字段名
     */
    static createTable(db,tName,pKey,autoIncrement,indexName,indexFiled){
        let objectStore = db.createObjectStore(tName,{keyPath:pKey,autoIncrement: autoIncrement});
        objectStore.createIndex(indexName, indexFiled, { unique: true });
    }

    /**
     *  根据数据库实例和表名获取表的操作句柄
     * @param db 数据库实例
     * @param tName 表名
     * @returns {IDBObjectStore}
     */
    static getObjectStore(db,tName){
        let transaction = db.transaction([tName],'readwrite');
        let objectStore = transaction.objectStore(tName);
        return objectStore;
    }

    /**
     * 根据查询句柄对象和查询的主键查询数据
     * @param objectStore 被查询表的句柄
     * @param key 主键
     *  @returns {Promise | Promise<unknown>}
     */
    static getByPkey(objectStore,key){
        let deferred = defer();
        let request = objectStore.get(key);
        request.onerror = function(event) {
            deferred.resolve(null);
            // console.log(indexDbname + '_'+key + '数据查询报错');
        };

        request.onsuccess = function( event) {
            if (request.result) {
                deferred.resolve(request.result);
            } else {
                deferred.resolve(null);
                // console.log(indexDbname + '_'+key + '数据查询为空！');
            }
        };
        return deferred.promise;
    }

    /**
     *
     * 根据被操作表的句柄和key更新数据
     * @param objectStore 操作表的句柄
     * @param key 主键
     * @param data
     * @returns {Promise | Promise<unknown>}
     */
    static setByKey(objectStore,key,data){
        let deferred = defer();
        let request = objectStore.put({ key: key,data: data});

        request.onsuccess = function (event) {
            // console.log(indexDbName+'_'+key+'数据入库成功');
            deferred.resolve(true);
        };

        request.onerror = function (event) {
            // console.log(indexDbName+'_'+key + '数据入库失败');
            deferred.reject();
        };
        return deferred.promise;
    }
}

export default IndexDBTool;
