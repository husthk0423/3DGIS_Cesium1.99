import drawTile from './DrawVector';
import glMatrix from '../../../mapbox/gl-matrix';
const mat4 = glMatrix.mat4;
import browser from '../../../mapbox/Browser';

class DrawTilesFboVector {
    /**
     *  gpu数据上传
     * @param tile
     * @param painter
     * @param gl
     */
    static drawFboVector(vectorProvider,tiles,needDrawTilesMap,styleLevel,drawAll) {
        if(tiles.length  == 0){
            return;
        }
        const startTime = browser.now();
        const shouldPausePlacement = () => {
            const elapsedTime = browser.now() - startTime;
            return elapsedTime > 3;
        };

        const passState = vectorProvider.viewer.scene._view.passState;
        let framebuffer =null;
        if(passState.framebuffer){
            framebuffer = passState.framebuffer._framebuffer;
        }

        const viewport = passState.viewport;

        const gl = vectorProvider.viewer.scene.context._gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // for(let i = 0;i<tiles.length;i++){
        while(tiles.length > 0){
            let tile =tiles.shift();
            if(!styleLevel){
                styleLevel = tile.level;
            }
            let mapName = tile.name+'_'+vectorProvider._zoom+'_'+styleLevel;
            delete needDrawTilesMap[mapName];
            let key = tile.name;
            let buckets = tile.buckets;

            let styleScale = 1;
            if(styleLevel-tile.level ==1){
                styleScale = 2;
            }

            let texture = DrawTilesFboVector.initFramebufferObject(vectorProvider, gl,  vectorProvider.scale,styleScale);
                vectorProvider.textureQueue.add(key,vectorProvider._zoom,styleLevel, texture);

            let lineWidthScale = Math.pow(2,styleLevel)/Math.pow(2,tile.level);
            DrawTilesFboVector.drawRasterTile(vectorProvider,buckets,gl,styleScale,lineWidthScale);

            if (shouldPausePlacement() && !drawAll) {
                gl.disable(gl.BLEND);
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                gl.viewport(0, 0, viewport.width, viewport.height);
                // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                // gl.viewport(0, 0, vectorProvider.viewer._lastWidth, vectorProvider.viewer._lastHeight);
                return true;
            }
        }

        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, viewport.width, viewport.height);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.viewport(0, 0, vectorProvider.viewer._lastWidth, vectorProvider.viewer._lastHeight);
        return true;
    }


    static drawRasterTile(vectorProvider,buckets,gl,styleScale,lineWidthScale) {
        let m = mat4.identity(new Float32Array(16));
        mat4.translate(m, m, [-1, -1, 0]);
        mat4.scale(m, m, [2 / 8192, 2 /8192, 1]);

        DrawTilesFboVector.cleanViewPort(gl, vectorProvider._tileWidth * vectorProvider.ratio * vectorProvider.scale*styleScale, vectorProvider._tileWidth * vectorProvider.ratio *  vectorProvider.scale*styleScale);
        gl.clearColor(1.0, 1.0, 1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawTile(vectorProvider,buckets,m,false,lineWidthScale);
    }


    static initFramebufferObject(vectorProvider, gl, scale,styleScale) {
        let fbo = vectorProvider.viewportFbo;
        if (!fbo) {
            let fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            vectorProvider.viewportFbo = fbo;
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        }

        // 新建纹理对象作为帧缓冲区的颜色缓冲区对象
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, vectorProvider._tileWidth * vectorProvider.ratio * scale*styleScale, vectorProvider._tileWidth * vectorProvider.ratio * scale*styleScale, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        return texture;
    }

    static cleanViewPort(gl, width, height) {
        gl.viewport(0, 0, width, height);
    }
}

export default DrawTilesFboVector.drawFboVector;




