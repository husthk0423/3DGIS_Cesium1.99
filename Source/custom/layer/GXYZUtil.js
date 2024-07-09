/**
 * Created by kongjian on 2017/6/26.
 */
import es6Promise from '../utils/es6-promise';
const getJSON = es6Promise.getJSON;
import Filter from '../filter/Filter';
import FilterLayer from '../filter/FilterLayer';
import Version from '../ext/Version';
class GXYZUtil{
    constructor() {
        this.tileSize=256;
    }

    /**
     * 设置过滤条件
     */
    setFilter(filter,callback){
        for(var i = 0;i<filter.layers.length;i++){
            var filterLayer = filter.layers[i];
            if(!filterLayer.id){
                filter.layers.splice(i,1);
            }
        }

        var control = JSON.stringify(filter);
        if(this.isIE()){
            //设置过滤条件
            getJSON({type:'post',url:this.host + '/mapserver/vmap/'+this.servername+'/setControl',
                data:'control= '+ control,
                dataType:'json'}).then(function(result){
                result.isIE = true;
                callback(result);
            }.bind(this));
        }else{
            var result = {isIE:false,id:encodeURIComponent(control)};
            callback(result);
        }
    };


    /**
     * 解析url
     */
    parseUrl(url){
        var urlParts = url.split('?');
        // var urlPartOne = urlParts[0].split('/mapserver/vmap/');
        var urlPartOne = urlParts[0].split('/mapserver/');
        if(urlPartOne.length !=2){
            return;
        }
        this.host = urlPartOne[0];
        if(!urlParts[1]){
            return;
        }
        this.servername = urlPartOne[1].split('/')[1];
        var params = urlParts[1].split('&');
        for(var i = 0;i<params.length;i++){
            var param = params[i];
            var keyValue = param.split('=');
            if(keyValue[0] == 'styleId'){
                this.styleId = keyValue[1];
                return;
            }
        }
    };

    /**
     * 拾取要素
     * Parameters :
     * row - 要拾取的要素所在的行
     * col - 要拾取的要素所在的列
     * level - 要拾取的要素所在的层级
     * x - 要拾取的要素所在瓦片内的x坐标
     * y - 要拾取的要素所在瓦片内y坐标
     * control - 过滤的json对象
     * controlId - 过滤对象在服务器上存的key
     * callback - 拾取到要素后的回调函数
     */
    pickupFeatures(row,col,level,x,y,control,controlId,callback) {
        var url = this.host + '/mapserver/pickup/'+this.servername+'/getData?x='+col +'&y='+row+'&l='+level+
            '&pixelX='+x+'&pixelY='+y+'&styleId='+this.styleId+'&tilesize='+this.tileSize+'&clientVersion='+Version;
        if(control){
            url = url + '&control='+control;
        }
        if(controlId){
            url = url + '&controlId='+controlId;
        }

        getJSON({
            url:url,
            dataType: "json"}).then(function (features) {
            callback(features);
        },function(){
            callback([]);
        })
    };

    /**
     * 构造高亮的filter
     * Parameters :
     * features - 要素数组
     * style - 高亮样式 如：{color:"red",opacity:0.8};
     */
    // CreateHighlightFilter(layerFeatures,style){
    //     var filter = new Filter();
    //     filter.otherDisplay = false;
    //
    //     for(var layerId in layerFeatures){
    //         var fs = layerFeatures[layerId];
    //         var hasFid = false;
    //         for(var fid in fs){
    //             var filterLayer = new FilterLayer();
    //             filterLayer.id = layerId;
    //             filterLayer.idFilter = fid;
    //             filterLayer.color = style;
    //             filter.addFilterLayer(filterLayer);
    //             hasFid = true;
    //         }
    //         if(!hasFid){
    //             var filterLayer = new FilterLayer();
    //             filterLayer.id = layerId;
    //             filterLayer.color = style;
    //             filter.addFilterLayer(filterLayer);
    //         }
    //     }
    //     return filter;
    // };

    CreateHighlightFilter(layerFeatures,style){
        var filter = new Filter();
        filter.otherDisplay = false;

        for(var layerId in layerFeatures){
            var fs = layerFeatures[layerId];
            var filterLayer = new FilterLayer();
            filterLayer.id = layerId;
            filterLayer.color = style;

            var idFilter = '';
            for(var fid in fs){
                idFilter = idFilter+fid+',';
            }
            if(idFilter.length > 0){
                idFilter = idFilter.substr(0,idFilter.length -1);
                filterLayer.idFilter = idFilter;
            }
            filter.addFilterLayer(filterLayer);
        }
        return filter;
    };


    /**
     * 构造高亮的filter,每个要素都有高亮样式
     * Parameters :
     * layerFeatures - 要素数组
     */
    CreateEveryHighlightFilter(layerFeatures){
        var filter = new Filter();
        filter.otherDisplay = false;

        for(var layerId in layerFeatures){
            var fs = layerFeatures[layerId];
            var layerStyle = fs.style;
            var hasFid = false;
            for(var fid in fs){
                var style = fs[fid].style;
                // style.color = style.color.replace('#','%23');
                var filterLayer = new FilterLayer();
                filterLayer.id = layerId;
                filterLayer.idFilter = fid;
                filterLayer.color = style;
                filter.addFilterLayer(filterLayer);
                hasFid = true;
            }
            if(!hasFid && layerStyle){
                // layerStyle.color = layerStyle.color.replace('#','%23');
                var filterLayer = new FilterLayer();
                filterLayer.id = layerId;
                filterLayer.color = layerStyle;
                filter.addFilterLayer(filterLayer);
            }
        }
        return filter;
    };

    /**
     * 是否为ie浏览器,ie9 除外，ie9无法跨域发送post带数据的请求
     */
    isIE() {
        // return true;
        if (!!window.ActiveXObject || "ActiveXObject" in window){
            //ie9 除外，ie9无法跨域发送post带数据的请求
            var b_version=navigator.appVersion
            var version=b_version.split(";");
            if(version[1]){
                var trim_Version=version[1].replace(/[ ]/g,"");
                if(trim_Version == 'MSIE9.0'){
                    return false;
                }
            }
            return true;
        }
        else{
            return false;
        }
    };
}

export default GXYZUtil;
