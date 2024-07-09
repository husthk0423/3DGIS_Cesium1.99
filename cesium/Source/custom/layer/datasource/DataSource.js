/**
 * Created by kongjian on 2017/6/30.
 */
import UUID from '../../utils/uuid';
class DataSource{
    constructor() {
        //数据源id
        this.id = new UUID().valueOf();
        //数据源类型
        this.type = "";
        //key为文件名，value为image对象
        this.textures = {};
    }
};

export default DataSource;