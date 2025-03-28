/**
 * Created by kongjian on 2017/5/1.
 */
const LabelDrawer = require('./avoid/LabelDrawer');
const ParseLabelData = require('./avoid/ParseLabelData');
const GridFilterLabel = require('./avoid/GridFilterLabel');
const LabelCollectionExt = require('../../ext/LabelCollectionExt');

const BEGIN = 1;
const ADDED = 2;
const REMOVED = 3;
class LabelTile{
    constructor(defaultHeight,name,xyz,tileSize,rectangle,data,indexDbNames,styleFun,dataType,level,styleMap,
                textures,scene) {
        this.defaultHeight = defaultHeight;
        this.name = name;
        this.xyz = xyz;
        this.tileSize = tileSize;
        this.rectangle = rectangle;
        this.sourceData = data;
        this.indexDbNames = indexDbNames;
        this.styleFun = styleFun;
        this.dataType = dataType;
        this.level = level;
        this.styleMap = styleMap;
        this.textures = textures;
        this.scene = scene;

        this.labelCollection = new LabelCollectionExt({blendOption:Cesium.BlendOption.OPAQUE,enuEnabled:false});
        this.roadLabelCollection = new LabelCollectionExt({blendOption:Cesium.BlendOption.OPAQUE,enuEnabled:true});
        this.billboardCollection = new Cesium.BillboardCollection({blendOption:Cesium.BlendOption.OPAQUE});
        //全局是否开启避让
        this.ableAvoid = true;
        //全局是否开启权重排序
        this.ableWeight = true;
        //过滤格网大小
        this.cellsize = 4;
        //网格内保留点的个数
        this.maxPerCell = 1;

        this.state =BEGIN;
        this.ready = false;
        this.parse();
    }

    reset(){
        this.state =BEGIN;
        this.ready = false;
        this.parse();
    }

    parse(){
        // console.time('执行样式文件');
        if(this.dataType == 'Binary'){
            let drawer = new LabelDrawer(this.sourceData,this.styleMap,this.level);
            this.styleFun.call({}, drawer, this.level);
        }else{
            let render = new LabelDrawer(this.sourceData,this.styleMap,this.level);
            this.styleFun.call({}, render, this.level);
        }

        // console.timeEnd('执行样式文件');

        // console.time('注记解析');
        //转换瓦片坐标为屏幕坐标,并构造label数据
        let features = ParseLabelData.parseLayerDatas(
            this.sourceData,this.styleMap,this.textures,this.xyz,true);
        // console.timeEnd('注记解析');

        // console.time('去除瓦片外的注记');
        //移除瓦片外的点注记
        features.pointFeatures = GridFilterLabel.removeTileOutPointFeatures(features.pointFeatures,this.tileSize);
        // console.timeEnd('去除瓦片外的注记');
        // console.time('第一次过滤');
        //第一次格网过滤
        let labelFeatures = GridFilterLabel.fristFilter(features.pointFeatures,features.lineFeatures,
            this.styleMap,this.ableWeight,true, this.tileSize,this.cellsize,this.tileSize*0.5,this.maxPerCell);
        // console.timeEnd('第一次过滤');

        // console.time('第二次过滤');
        //第二次格网过滤
        this.features = GridFilterLabel.scendFilter(labelFeatures.pointFeatures,labelFeatures.lineFeatures,this.styleMap,this.ableWeight,true,this.tileSize, this.cellsize, this.tileSize*0.5);
        // console.timeEnd('第二次过滤');

        //构造需要绘制的label和Billboard对象
        this.toLabelBillboards(this.features);
        // console.timeEnd('转换为绘制对象参数');
    }

    updateElevationData(elevationDataMap){
        this.elevationDataMap = elevationDataMap;
        // console.time('转换为经纬度');
        //瓦片坐标转成经纬度坐标
        this.toCartesian3(this.features);
        // console.timeEnd('转换为经纬度');
        this.updateLabelPostion(this.features);
    }

    toCartesian3(features){
        for(let i =0;i<features.length;i++){
            let feature = features[i];
            feature.anglePositions = [];

            for(let j = 0;j<feature.sourceAngleData.length;j++){
                let anglePosition = [];
                let sourceAngleData = feature.sourceAngleData[j];
                let position = this.toLonLat([sourceAngleData[0][0],sourceAngleData[0][1]]);
                anglePosition.push(position);
                anglePosition.push(sourceAngleData[1]);
                feature.anglePositions.push(anglePosition);
            }
        }
    }

    toLonLat(pt){
        let x = pt[0];
        let y = pt[1];
        let lon = Cesium.Math.toDegrees(this.rectangle.west + this.rectangle.width/ this.tileSize* x);
        let lat = Cesium.Math.toDegrees(this.rectangle.north - this.rectangle.height/ this.tileSize* y);
        let height = this.getHeight(Math.round(x),Math.round(y));
        let position = Cesium.Cartesian3.fromDegrees(lon, lat,height);
        return position;
    }

    getHeight(x,y){
        x = x==this.tileSize?this.tileSize-1:x;
        y = y==this.tileSize?this.tileSize-1:y;

        //注记的高程只取注记层下一层的高程时，当没取到高程值时，接着取下一层的高程
        for(let i = this.indexDbNames.length -1;i>=0;i--){
            let indexDbName = this.indexDbNames[i];
            let terrainData = this.elevationDataMap[indexDbName];
            if(!terrainData){
                continue;
            }
            let index = y  * this.tileSize + x ;
            let h = terrainData.data[index];
            if(h!=0){
                return h;
            }
        }
        return this.defaultHeight;
    }



    /**
     * 将经世界坐标转成屏幕坐标
     */
    updateScreenPt(features){
        for(let i =0;i<features.length;i++) {
            let feature = features[i];
            feature.datas = [];
            for(let j = 0;j<feature.anglePositions.length;j++){
                let anglePostion = feature.anglePositions[j];
                if(!anglePostion[0]){
                    feature.datas.push([[-50,-50],anglePostion[1]]);
                    continue;
                }
                var pt = Cesium.SceneTransforms.wgs84ToWindowCoordinates(this.scene, anglePostion[0]);
                if(pt){
                    feature.datas.push([[pt.x,pt.y],anglePostion[1]]);
                }else{
                    //在视线外
                    feature.datas.push([[-50,-50],anglePostion[1]]);
                }
            }
        }
    }

    /**
     * 将要素转换成能绘制的label和Billboard对象
     * @param features
     */
    toLabelBillboards(features){
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            if(feature.type == 1){
                this.toPointLabelOption(feature);
            }
            if(feature.type == 2){
                this.toLineLabelOption(feature);
            }
        }
    }

    /**
     *  当高程数据更新后，更新注记的高程值
     * @param features
     */
    updateLabelPostion(features){
        for(let i = 0;i<features.length;i++){
            let feature = features[i];

            if(feature.labelOptions){
                for(let i = 0;i<feature.labelOptions.length;i++){
                    let labelOption = feature.labelOptions[i];
                    labelOption.position = feature.anglePositions[i][0];
                }
            }


            if(feature.billboardOption){
                feature.billboardOption.position = feature.anglePositions[0][0];
            }

            if(feature.labels){
                for(let j = 0;j<feature.labels.length;j++){
                    let label = feature.labels[j];
                    label.position = feature.anglePositions[j][0];
                }
            }

            if(feature.billboard){
                feature.billboard.position = feature.anglePositions[0][0];
            }
        }
    }


    /**
     *
     * @param feature
     */
    toPointLabelOption(feature){
        feature.labelOptions = [];
        let style = this.styleMap[feature.styleId];

        let iconWidth = feature.iconImg? feature.iconImg.width:0;
        let dis = style.graphicDistance + iconWidth *0.5;
        let option = {
            show:false,
            disableDepthTestDistance:Number.POSITIVE_INFINITY,
            text:feature.label+'',
            font:style.pointFillFont,
            style: Cesium.LabelStyle.FILL,
            verticalOrigin:Cesium.VerticalOrigin.CENTER,
            pixelOffset: new Cesium.Cartesian2(dis, 0),
            fillColor: Cesium.Color.fromCssColorString(style.pointFillStyle).withAlpha(style.pointFillAlpha)
        };

        //有背景框
        if (style.pointHashBackground == true){
            option.showBackground = true;
            option.backgroundColor =Cesium.Color.fromCssColorString(style.pointBackgroundColor).withAlpha(style.pointBackgroundAlpha);
            option.backgroundPadding = new Cesium.Cartesian2(style.pointBackgroundGap, style.pointBackgroundGap);
        }

        //有描边
        if (style.pointHashOutline == true){
            option.style =Cesium.LabelStyle.FILL_AND_OUTLINE;
            option.outlineColor = Cesium.Color.fromCssColorString(style.pointStrokeStyle).withAlpha(style.pointStrokeAlpha),
                option.outlineWidth = style.pointLineWidth+2;
        }

        feature.labelOptions.push(option);
        //有图标
        if(feature.iconImg){
            let option = this.toBillboardOption(feature.iconImg,style);
            feature.billboardOption = option;
        }
    }

    toLineLabelOption(feature){
        feature.labelOptions = [];
        let style = this.styleMap[feature.styleId];
        if(feature.lineType == 'text'){
            if(style.lineHashBackground == true){
                let index = Math.floor(feature.sourceAngleData.length/2);

                let option = {
                    show:false,
                    disableDepthTestDistance:Number.POSITIVE_INFINITY,
                    text:feature.label+'',
                    font:style.lineFillFont,
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin:Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                    fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
                };

                //有背景框
                option.showBackground = true;
                option.backgroundColor =Cesium.Color.fromCssColorString(style.backgroundColor).withAlpha(style.backgroundAlpha),
                    option.backgroundPadding = style.lineBackgroundGap;

                feature.labelOptions.push(option);
            }else if(feature.sourceAngleData.length == 1){
                let option = {
                    show:false,
                    disableDepthTestDistance:Number.POSITIVE_INFINITY,
                    text:feature.label+'',
                    font:style.lineFillFont,
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin:Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                    fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
                };

                feature.labelOptions.push(option);
            }else{
                for(let i = 0;i<feature.sourceAngleData.length;i++){
                    let sourceAnglePosition = feature.sourceAngleData[i];
                    let option = {
                        show:false,
                        disableDepthTestDistance:Number.POSITIVE_INFINITY,
                        text:(feature.label+'').charAt(i),
                        font:style.lineFillFont,
                        style: Cesium.LabelStyle.FILL,
                        verticalOrigin:Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                        rotation:Cesium.Math.toRadians(sourceAnglePosition[1]),
                        fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
                    };

                    //有描边
                    if (style.lineHashOutline == true){
                        option.style =Cesium.LabelStyle.FILL_AND_OUTLINE;
                        option.outlineColor = Cesium.Color.fromCssColorString(style.lineStrokeStyle).withAlpha(style.lineStrokeAlpha),
                            option.outlineWidth = style.lineLineWidth;
                    }

                    feature.labelOptions.push(option);
                }
            }
        }

        if(feature.lineType == 'code'){
            let style = this.styleMap[feature.styleId];

            let option = {
                show:false,
                disableDepthTestDistance:Number.POSITIVE_INFINITY,
                text:feature.label+'',
                font:style.codeLineFillFont,
                style: Cesium.LabelStyle.FILL,
                verticalOrigin:Cesium.VerticalOrigin.CENTER,
                horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                fillColor: Cesium.Color.fromCssColorString(style.codeLineFillStyle).withAlpha(style.codeLineFillAlpha)
            };

            //背景框
            option.showBackground = true;
            option.backgroundColor =Cesium.Color.fromCssColorString(style.codeBackgroundColor).withAlpha(style.codeBackgroundAlpha);
            option.backgroundPadding = new Cesium.Cartesian2(style.codeLineBackgroundGap, style.codeLineBackgroundGap);

            //有描边
            if(style.codeLineHashOutline == true){
                option.style =Cesium.LabelStyle.FILL_AND_OUTLINE;
                option.outlineColor = Cesium.Color.fromCssColorString(style.codeLineStrokeStyle).withAlpha(style.codeLineStrokeAlpha),
                    option.outlineWidth = style.codeLineLineWidth+2;
            }

            feature.labelOptions.push(option);
        }
    }

    /**
     *
     * @param feature
     */
    toBillboardOption(image,style) {
        let width = style.graphicWidth;
        let height = style.graphicHeight;

        if(!width || !height){
            width = image.width;
            height = image.height;
        }

        let billboardOption = {
            show:false,
            disableDepthTestDistance:Number.POSITIVE_INFINITY,
            image:image,
            width:width,
            height:height
        };
        return billboardOption;
    }



    addToMap(){
        // console.time('构建绘制对象并添加到绘制列表中');
        if(this.state == BEGIN){
            this.toDrawLabel();
        }

        if(this.labelCollection._labels.length >0){
            this.scene.primitives.add(this.labelCollection);
        }

        if(this.roadLabelCollection._labels.length >0) {
            this.scene.primitives.add(this.roadLabelCollection);
        }
        if(this.billboardCollection._billboards.length >0) {
            this.scene.primitives.add(this.billboardCollection);
        }

        this.updateNow();
        // console.timeEnd('构建绘制对象并添加到绘制列表中');
        // console.log('注记个数：'+this.features.length);

        this.state = ADDED;
    }

    toDrawLabel(){
        for(let i =0;i<this.features.length;i++){
            let feature  = this.features[i];
            feature.labels = [];
            if(feature.type == 1){
                for(let j = 0;j<feature.labelOptions.length;j++){
                    feature.labels.push(this.labelCollection.add(feature.labelOptions[j]));
                }
                if(feature.iconImg){
                    feature.billboard = this.billboardCollection.add(feature.billboardOption);
                }
            }

            if(feature.type == 2){
                if(feature.lineType == 'text'){
                    for(let k = 0;k<feature.labelOptions.length;k++){
                        feature.labels.push(this.roadLabelCollection.add(feature.labelOptions[k]));
                    }
                }

                if(feature.lineType == 'code'){
                    for(let m = 0;m<feature.labelOptions.length;m++){
                        feature.labels.push(this.labelCollection.add(feature.labelOptions[m]));
                    }
                }
            }
        }
    }

    updateNow(){
        if(this.labelCollection._labels.length >0){
            this.labelCollection.update(this.scene._frameState);
        }

        if(this.roadLabelCollection._labels.length >0) {
            this.roadLabelCollection.update(this.scene._frameState);
        }
        if(this.billboardCollection._billboards.length >0) {
            this.billboardCollection.update(this.scene._frameState);
        }

    }

    remove(){
        if(this.state ==ADDED){
            this.scene.primitives.remove(this.labelCollection);
            this.scene.primitives.remove(this.roadLabelCollection);
            this.scene.primitives.remove(this.billboardCollection);
            this.state = REMOVED;
        }
    }

    show(){
        if(this.state == BEGIN || this.state == REMOVED){
            this.addToMap();
        }
    }

    destroy(){
        this.remove();
        this.labelCollection.destroy();
        this.roadLabelCollection.destroy();
        this.billboardCollection.destroy();
        this.isDestroy = true;
    }

}

module.exports = LabelTile;

