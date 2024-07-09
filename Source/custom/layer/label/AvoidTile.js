import GAnnoAvoid from './avoid/GAnnoAvoid';
import GCutLine from './avoid/GCutLine';
let tiles = [];
let labelAvoid = null;
let finished = true;

let styleMap;
//是否需要重新切割线注记
let needCutLine = false;

let z;
let viewer;

class AvoidTile {
    static init(ts,heading,sm,vr){
        finished = false;
        styleMap = sm;
        tiles = ts;
        viewer = vr;
        needCutLine = false;
        // let l = viewer.camera.getLevel();
        // if(!z || Math.abs(l -z)> 0.1){
        //     needCutLine = true;
        // }
        // z =l;
        labelAvoid = new GAnnoAvoid(null,null,heading);
    }

    static setTiles(ts,heading){
        finished = false;
        tiles = ts;

        labelAvoid = new GAnnoAvoid(null,null,heading);
    }

    static avoidTile(){
        const startTime = new Date().getTime();
        const shouldPausePlacement = () => {
            const elapsedTime = new Date().getTime() - startTime;
            return elapsedTime > 3;
        };

        let level = viewer.camera.getLevel();
        // console.time('avoidTile');
        while(tiles.length > 0){
            // console.log('+++++++++++++++++');
            let tile =tiles.shift();
            if(tile.isDestroy){
                continue;
            }

            //注记第一次参与避让，不用重新切线注记
            if(needCutLine){
                let scale = Math.pow(2,tile.level)/Math.pow(2,level)*0.5;
                AvoidTile.cutLine(tile,tile.features,scale);
            }

            //转换为屏幕坐标
            tile.updateScreenPt(tile.features);

            //计算避让box
            labelAvoid.GLabelBox.setBox(tile.features,tile.styleMap,true);
            //开始避让
            labelAvoid.defaultAvoid(tile.features,tile.styleMap,true, true, false);

            AvoidTile.updateLineLable(tile.features);
            //避让
            if(shouldPausePlacement()){
                // console.timeEnd('avoidTile');
                return;
            }
        }
        // console.timeEnd('avoidTile');
        finished = true;
    }

    static cutLine(tile,features,scale){
        for(let i =0;i<features.length;i++) {
            let feature = features[i];
            if(feature.lineType != 'text'){
                continue;
            }

            let f = GCutLine.createLineTextFeatrue(feature,styleMap[feature.styleId],0,scale).feature;

            feature.anglePositions = [];
                if(f){
                    for(let j = 0;j<f.sourceAngleData.length;j++){
                        let anglePosition = [];
                        let sourceAngleData = f.sourceAngleData[j];
                        let position = tile.toCartesian3([sourceAngleData[0][0],sourceAngleData[0][1]]);
                        anglePosition.push(position);
                        anglePosition.push(feature.sourceAngleData[j][1]);
                        feature.anglePositions.push(anglePosition);

                        let label = feature.labels[j];
                        if(feature.anglePositions[j][0]){
                            label.show =true;
                            label.position = feature.anglePositions[j][0];
                        }else{
                            label.show =false;
                        }
                    }
                }
        }
    }

    static screenToposition(x,y){
        let c = new Cesium.Cartesian2(x,y);
        let position = viewer.camera.pickEllipsoid(c, viewer.scene.globe.ellipsoid);
        return position;
    }

    //更新线注记的角度和是否反向
    static updateLineLable(features){
        for(let i =0;i<features.length;i++){
            let feature = features[i];
            if(!feature.hidden && feature.lineType == 'text' && feature.labels){
                for(let j = 0;j<feature.labels.length;j++){
                    let label = feature.labels[j];
                    if(feature.changeDirection){
                        label.text = feature.label.charAt(feature.labels.length -1 - j );
                    }else{
                        label.text = feature.label.charAt(j);
                    }

                    let angle = -feature.textPoints[j][2];
                    if(angle != label.angle){
                        label.angle = angle;
                        label.rotation = Cesium.Math.toRadians(angle);
                    }
                }
            }
        }
    }

    static isFinished(){
        return finished;
    }
}

export default  AvoidTile;
