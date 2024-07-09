const hillshade = require('./DrawHillshade');
const {vec4, mat4, mat2, vec2} = require('../../../mapbox/gl-matrix');
class DrawFboHillShade {
    static drawFboHillShade(hillProvider,tile,key) {
        const gl = hillProvider.viewer.scene.context._gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        //查找
        let texture = hillProvider.textureQueue.getOne(key,hillProvider._zoom);
        if(!texture){
            hillshade.drawHillshade(hillProvider,tile);

            texture = DrawFboHillShade.initFramebufferObject(hillProvider, gl,  hillProvider.scale);
            hillProvider.textureQueue.add(key,hillProvider._zoom, texture);
            DrawFboHillShade.drawRasterTile(hillProvider,tile,gl);
        }

        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, hillProvider.viewer._lastWidth, hillProvider.viewer._lastHeight);
        return texture;
    }


    static drawRasterTile(hillProvider,tile,gl) {
        let m = mat4.identity(new Float32Array(16));
        mat4.translate(m, m, [-1, -1, 0]);
        mat4.scale(m, m, [2 / 8192, 2 /8192, 1]);

        DrawFboHillShade.cleanViewPort(gl, hillProvider._tileWidth * hillProvider.ratio * hillProvider.scale, hillProvider._tileWidth * hillProvider.ratio *  hillProvider.scale);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        hillshade.renderHillshade(hillProvider,tile,m);
    }


    static initFramebufferObject(hillProvider, gl, scale) {
        let fbo = hillProvider.viewportFbo;
        if (!fbo) {
            let fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            hillProvider.viewportFbo = fbo;
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        }

        gl.activeTexture(gl.TEXTURE0);
        // 新建纹理对象作为帧缓冲区的颜色缓冲区对象
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, hillProvider._tileWidth * hillProvider.ratio * scale, hillProvider._tileWidth * hillProvider.ratio * scale, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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

module.exports = DrawFboHillShade.drawFboHillShade;




