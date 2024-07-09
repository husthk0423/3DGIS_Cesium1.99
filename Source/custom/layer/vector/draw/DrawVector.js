import drawFill from './DrawFill';
import drawLine from './DrawLine';

const draw = {
    fill: drawFill,
    line:drawLine
};

let drawTile =  function (vectorProvider,buckets,m,remove,lineWidthScale) {
    const gl = vectorProvider.viewer.scene.context._gl;
    //关闭深度测试
    gl.disable(gl.DEPTH_TEST);
    for (let j = 0; j < buckets.length; j++) {
        let bucket = buckets[j];
         draw[bucket.type](vectorProvider,bucket,m,remove,lineWidthScale);
    }

    gl.enable(gl.DEPTH_TEST);
}
export default drawTile;
