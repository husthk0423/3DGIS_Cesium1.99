/**
 * Created by EDZ on 2021/6/18.
 */
import md5 from 'md5-node';
class ElevationImageryProvider {
    constructor(viewer,options) {
        this.viewer = viewer;
        this.indexDbName = md5(options.url);
        this.viewer.imageryLayers.layerAdded.addEventListener(this.onLayerAdded, this);
        this.viewer.imageryLayers.layerRemoved.addEventListener(this.onLayerRemoved, this);
        this.viewer.imageryLayers.layerMoved.addEventListener(this.onLayerMoved, this);
        this.isElevation = true;
    }

    /**
     * 当有新的高程图层添加时，执行本方法
     * @param layer
     * @param index
     */
    onLayerAdded(layer, index){

    }

    /**
     * 当有高程图层移除时，执行本方法
     * @param layer
     * @param index
     */
    onLayerRemoved(layer, index){

    }

    /**
     * 当有高程图层顺序改变时，执行本方法
     * @param layer
     * @param newIndex
     * @param oldIndex
     */
    onLayerMoved(layer, newIndex, oldIndex){

    }

    /**
     *  获取当前图层的所有上层图层
     */
    getTopProviders(){
        let elevationProviders = this.viewer.imageryLayers.elevationProviders;
        let index = 0;
        for(let i =0;i<elevationProviders.length;i++){
            let imageryProvider = elevationProviders[i];
            if(imageryProvider == this){
                index = i;
                break;
            }
        }

        //如果是最上面的一个图层
        if(index == elevationProviders.length -1){
            return [];
        }

        return elevationProviders.slice(index -1);
    }

    /**
     *  获取当前图层的所有下层图层的名称
     */
    getBottomProviderIndexDbNames(){
        let elevationProviders = this.viewer.imageryLayers.elevationProviders;
        let names = [];

        if(this.viewer.terrainProvider.name =='RGBWorldTerrainProvider'){
            names.push(this.viewer.terrainProvider.indexDbName);
        }

        for(let i =0;i<elevationProviders.length;i++){
            let imageryProvider = elevationProviders[i];
            names.push(imageryProvider.indexDbName);
            if(imageryProvider == this){
                break;
            }
        }

       return names;
    }

    /**
     *  获取指定index和index之上的图层。
     *  添加，删除指定图层时，根据index获取上层的需要更新的图层
     */
    getTopProvidersByIndex(index){
        return this.viewer.imageryLayers.elevationProviders.slice(index);
    }

    /**
     *  更新其它图层的指定瓦片的xyz值
     * @param xyz
     */
    updateOtherProviderElevation(xyz){
        let providers = this.getTopProviders();
        for(let i =0;i<providers.length;i++){
            let provider = providers[i];
            //如果本图层的上一层图层的xyz数据没有准备好，则不用再更新更上层级图层的高程数据
            if(!provider.updateTileElevation(xyz)){
                break;
            }
        }
    }

    /**
     * 更新指定瓦片的高程数据,子类需要实现本方法
     * @param xyz
     */
    updateTileElevation(xyz,tileSize){

    }

    /**
     *  更新本图层视口内所有的瓦片的高程数据,子类需要实现本方法
     */
    updateAllTileElevation(tileSize){

    }

}
export default ElevationImageryProvider;