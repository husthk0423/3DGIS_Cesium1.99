// @flow
// DEMData is a data structure for decoding, backfilling, and storing elevation data for processing in the hillshade shaders
// data can be populated either from a pngraw image tile or from serliazed data sent back from a worker. When data is initially
// loaded from a image tile, we decode the pixel values using the appropriate decoding formula, but we store the
// elevation data as an Int32 value. we add 65536 (2^16) to eliminate negative values and enable the use of
// integer overflow when creating the texture used in the hillshadePrepare step.
import turf from './turf.min';
import Cartesian3 from '../Core/Cartesian3.js';
// DEMData also handles the backfilling of data from a tile's neighboring tiles. This is necessary because we use a pixel's 8
// surrounding pixel values to compute the slope at that pixel, and we cannot accurately calculate the slope at pixels on a
// tile's edge without backfilling from neighboring tiles.
class PolygonBuffer {
    static buffer(featuremap,distance){
        for(let key in featuremap){
            let features = featuremap[key];
            features.map((item) => {
                for(let i =0;i<item.geometrys.length;i++){
                    if (item.geometrys[i].length < 8) {//少于8个坐标点直接返回直接返回
                        continue;
                    }
                    let convertedPolygon = PolygonBuffer.convertGeometory(item.geometrys[i])
                    let tmpGeo = turf.polygon(convertedPolygon)//暂不考虑多地块要素
                    let bufferedGeo = turf.buffer(tmpGeo, distance, { units: 'kilometers' });
                    item.geometrys[i] = bufferedGeo.geometry.coordinates[0].flat();
                }
            })
        }
    }

    static convertGeometory(dots){
        if (!(dots[0] == dots[dots.length - 2] && dots[1] == dots[dots.length - 1])) {
            //如果收尾不相接则接起来
            dots.push(dots[0], dots[1])
        }
        let newdots = []
        for (let i = 0; i < dots.length; i = i + 2) {
            const element = dots[i];
            newdots.push([dots[i], dots[i + 1]])
        }
        return [newdots];
    }

}
export default PolygonBuffer;

