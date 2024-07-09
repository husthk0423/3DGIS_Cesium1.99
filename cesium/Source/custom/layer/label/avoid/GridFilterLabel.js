import GridFilter from './../../../utils/gistools/GridFilter';
import Util from './Util';
import GisTools from '../../../utils/gistools/GisTools';
class GridFilterLabel{
    /**
     *  第一次初步过滤
     * @param pointFeatures 点注记集合
     * @param lineFeatures 线注记集合
     * @param styleMap 样式map
     * @param ableWeight 全局是否权重避让
     * @param needSort 第一次过滤是否需要排序
     * @param tilesize 瓦片大小
     * @param cellsize 每个小网格宽度
     * @param buffer 外扩多大像素
     * @param maxPerCell 每个网格内最多放多少个点
     * @returns {{pointFeatures: Array, lineFeatures: Array, importantFeatures: Array}}
     */
    static fristFilter(pointFeatures,lineFeatures,styleMap,ableWeight,needSort,tilesize, cellsize, buffer,maxPerCell){
        if(ableWeight && needSort){
            Util.sort(pointFeatures);
            Util.sort(lineFeatures);
        }

        //第一次过滤
         pointFeatures = GridFilterLabel.fristFilterStart(pointFeatures,tilesize, cellsize, buffer,maxPerCell);
         lineFeatures = GridFilterLabel.fristFilterStart(lineFeatures,tilesize, cellsize, buffer,maxPerCell);
        return {pointFeatures:pointFeatures,lineFeatures:lineFeatures};
    }


    /**
     *  第二次初步过滤
     * @param pointFeatures 点注记集合
     * @param lineFeatures 线注记集合
     * @param styleMap 样式map
     * @param ableWeight 全局是否权重避让
     * @param needSort 第二次过滤是否需要排序
     * @param tilesize 全局画布最大宽
     * @param cellsize 每个小网格宽度
     * @param buffer 外扩多大像素
     * @param maxPerCell 每个网格内最多放多少个点
     * @returns {{pointFeatures: Array, lineFeatures: Array, importantFeatures: Array}}
     */
    static scendFilter(pointFeatures,lineFeatures,styleMap,ableWeight,needSort,tilesize, cellsize, buffer,maxPerCell){
        if(ableWeight && needSort){
            Util.sort(pointFeatures);
            Util.sort(lineFeatures);
        }
        //第二次过滤
         pointFeatures = GridFilterLabel.scendFilterStart(pointFeatures,tilesize, 16, buffer);
         lineFeatures = GridFilterLabel.scendFilterStart(lineFeatures,tilesize, 16, buffer);

        let returnFeatures = [];
        returnFeatures = returnFeatures.concat(pointFeatures);
        returnFeatures = returnFeatures.concat(lineFeatures);
        return returnFeatures;
    }


    /**
     *  移除瓦片外的点注记
     * @param features
     * @param tilesize
     */
    static removeTileOutPointFeatures(features,tileSize){
        let newFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let pt =feature .centerPoint;
            if(pt[0] >= 0 && pt[0] <= tileSize && pt[1] >= 0 && pt[1] <= tileSize){
                newFeatures.push(feature);
            }
        }
        return newFeatures;
    }

    /**
     *  移除瓦片外的线注记
     * @param features
     * @param tilesize
     */
    static removeTileOutLineFeatures(features,tileSize){
        let newFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            for(let j = 0;j<feature.datas.length;j++){
                let pt = feature.datas[j][0];
                if(pt[0] >= 0 && pt[0] <= tileSize && pt[1] >= 0 && pt[1] <= tileSize){
                    newFeatures.push(feature);
                    break;
                }
            }
        }
        return newFeatures;
    }

    /**
     *  注记第一次初步格网过滤
     * @param features
     * @param tilesize 瓦片大小
     * @param cellsize 小正方形网格的宽
     * @param buffer  外扩多少像素
     * @param maxPerCell  小正方形中允许放多小个注记
     * @returns {Array}
     */
    static fristFilterStart(features,tilesize, cellsize, buffer,maxPerCell){
        let gridFilter = new GridFilter(tilesize, cellsize, buffer,maxPerCell);
        let returnFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let bool = gridFilter.filter(feature.centerPoint[0],feature.centerPoint[1]);
            if(bool){
                returnFeatures.push(feature);
            }
        }
        return returnFeatures;
    }

    /**
     *  注记第二次box格网过滤
     * @param features
     * @param tilesize 瓦片大小
     * @param cellsize 小正方形网格的宽
     * @param buffer  外扩多少像素
     * @param maxPerCell  小正方形中允许放多小个注记
     * @returns {Array}
     */
    static scendFilterStart(features,tilesize, cellsize, buffer){
        let gridFilter = new GridFilter(tilesize, cellsize, buffer,1);
        let returnFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let bool = gridFilter.filterByBox(feature.filterBox);
            if(bool){
                returnFeatures.push(feature);
            }
        }
        return returnFeatures;
    }



    /**
     *  第三次过滤，注记去重
     * @param features
     * @param tileSize
     * @returns {Array}
     */
    static threeFilter(features,tileSize, cellsize, buffer,styleMap){
        let fs= GridFilterLabel.getImportantOtherFeatures(features,styleMap);

        let labelMap = Util.groupByLabel(fs.otherFeatures);
        let returnFeatures = [];

        for(let label in labelMap){
            let labelArr = labelMap[label];
            if(labelArr.length == 1){
                returnFeatures.push(labelArr[0]);
            }else{
                returnFeatures = returnFeatures.concat(GridFilterLabel.distinctFeatures(labelArr, tileSize, cellsize, buffer,styleMap));
            }
        }

        returnFeatures = returnFeatures.concat(fs.importantFeatures);
        return returnFeatures;
    }


    static distinctFeatures(features,tileSize, cellsize, buffer,styleMap){
        let feature = features[0];
        let field = '';
        if(feature.type == 1){
            field = 'distance';
        }
        if(feature.type == 2){
            if(feature.lineType == 'text'){
                field = 'lineTextDistance';
            }
            if(feature.lineType == 'code'){
                field = 'lineCodeDistance';
            }
        }

        let style = styleMap[feature.styleId];
        let distance = style[field]?style[field]:0;

        let fs = [];
        let gridFilter = new GridFilter(tileSize, cellsize, buffer,1);
        for(let i = 0;i<features.length -1;i++){
            let feature = features[i];
            let box = GisTools.boxScale(feature.filterBox,distance);
            let bool = gridFilter.filterByBox(box);
            if(bool){
                fs.push(feature);
            }
        }
        return fs;
    }


    /**
     *  将注记分为重要注记和非重要注记
     * @param features
     * @param styleMap
     */
    static getImportantOtherFeatures(features,styleMap){
        let importantFeatures =[];
        let otherFeatures = [];

        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let style = styleMap[feature.styleId];
            if(style.isImportant){
                importantFeatures.push(feature);
            }else{
                otherFeatures.push(feature);
            }
        }

        return {otherFeatures:otherFeatures,importantFeatures:importantFeatures};
    }

}

export default GridFilterLabel;