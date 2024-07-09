// @flow
const EXTENT = 8192;
import MapboxTexture from '../../../mapbox/MapboxTexture';
import RGBAImage from '../../../mapbox/RGBAImage';
import glMatrix from '../../../mapbox/gl-matrix';
const mat4 = glMatrix.mat4;
function drawHillshade(hillProvider,tile) {
    // const gl = hillProvider.viewer.scene.context._gl;
    // //关闭深度测试
    // gl.disable(gl.DEPTH_TEST);

    if(tile.needsHillshadePrepare){
        prepareHillshade(hillProvider, tile);
    }
    // renderHillshade(hillProvider,tile,matrix,frambuffer);
    //
    // gl.enable(gl.DEPTH_TEST);
}

function renderHillshade(hillProvider,tile,matrix) {
    const gl = hillProvider.viewer.scene.context._gl;
    const program = hillProvider.useProgram('hillshade');

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tile.renderTexture);

    hillshadeUniformValues(gl,program,hillProvider,tile,matrix);

    const buffer = hillProvider.rasterBoundsBuffer;
    const vao = hillProvider.rasterBoundsVAO;
    vao.bind(gl, program, buffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.length);
}

// hillshade rendering is done in two steps. the prepare step first calculates the slope of the terrain in the x and y
// directions for each pixel, and saves those values to a framebuffer texture in the r and g channels.
function prepareHillshade(hillProvider,tile) {
    const gl = hillProvider.viewer.scene.context._gl;
    // decode rgba levels by using integer overflow to convert each Uint32Array element -> 4 Uint8Array elements.
    // ex.
    // Uint32:
    // base 10 - 67308
    // base 2 - 0000 0000 0000 0001 0000 0110 1110 1100
    //
    // Uint8:
    // base 10 - 0, 1, 6, 236 (this order is reversed in the resulting array via the overflow.
    // first 8 bits represent 236, so the r component of the texture pixel will be 236 etc.)
    // base 2 - 0000 0000, 0000 0001, 0000 0110, 1110 1100
    if (tile.dem && tile.dem.data) {
        const tileSize = tile.dem.dim;
        const textureStride = tile.dem.stride;

        // const pixelData = tile.dem.getPixels();
        const pixelData = new RGBAImage({width: tile.dem.stride, height: tile.dem.stride}, new Uint8Array(tile.dem.data.buffer));
        gl.activeTexture(gl.TEXTURE1);

        // if UNPACK_PREMULTIPLY_ALPHA_WEBGL is set to true prior to drawHillshade being called
        // tiles will appear blank, because as you can see above the alpha value for these textures
        // is always 0
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        // tile.demTexture = tile.demTexture || painter.getTileTexture(textureStride);
        if (tile.demTexture) {
            const demTexture = tile.demTexture;
            demTexture.update(pixelData, { premultiply: false });
             tile.frambuffer = gl.createFramebuffer();
            demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        } else {
            tile.demTexture = new MapboxTexture(gl, pixelData, gl.RGBA, { premultiply: false });
            tile.demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        }

        gl.activeTexture(gl.TEXTURE2);
        let frambuffer = tile.frambuffer;

        if (!frambuffer) {
            const renderTexture = new MapboxTexture(gl, {width: tileSize, height: tileSize, data: null}, gl.RGBA);
            renderTexture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);

            frambuffer = tile.frambuffer = gl.createFramebuffer();
            tile.renderTexture = renderTexture.texture;

            gl.bindFramebuffer(gl.FRAMEBUFFER, frambuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture.texture, 0);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, frambuffer);
        gl.viewport(0, 0, tileSize, tileSize);

        const program =  hillProvider.useProgram('hillshadePrepare');
        const buffer = hillProvider.rasterBoundsBuffer;
        const vao = hillProvider.rasterBoundsVAO;

       hillshadeUniformPrepareValues(gl,program, tile);
        vao.bind(gl, program, buffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.length);
        tile.needsHillshadePrepare = false;
    }
}



function hillshadeUniformValues(gl,program,hillProvider,tile,matrix){
    const shadow = hillProvider.options["hillshade-shadow-color"];
    const highlight = hillProvider.options["hillshade-highlight-color"];
    const accent = hillProvider.options["hillshade-accent-color"];

    let azimuthal = hillProvider.options['hillshade-illumination-direction'] * (Math.PI / 180);
    // modify azimuthal angle by map rotation if light is anchored at the viewport
    if (hillProvider.options['hillshade-illumination-anchor'] === 'viewport') {
        azimuthal -= hillProvider.viewer.camera.heading;
    }
    // const align = !painter.options.moving;
    const align = true;
    gl.uniformMatrix4fv(program.u_matrix,false, matrix);
    gl.uniform1i(program.u_image, 2);
    gl.uniform2fv(program.u_latrange,tile.latrange);
    gl.uniform2f(program.u_light, hillProvider.options['hillshade-exaggeration'], azimuthal);
    gl.uniform4f(program.u_shadow, shadow[0],shadow[1],shadow[2],shadow[3]);
    gl.uniform4f(program.u_highlight, highlight[0],highlight[1],highlight[2],highlight[3]);
    gl.uniform4f(program.u_accent, accent[0],accent[1],accent[2],accent[3]);
}

function hillshadeUniformPrepareValues(gl,program,tile){
    const stride = tile.dem.stride;
    const matrix = mat4.create();
    // Flip rendering at y axis.
    mat4.ortho(matrix, 0, EXTENT, -EXTENT, 0, 0, 1);
    mat4.translate(matrix, matrix, [0, -EXTENT, 0]);

    gl.uniformMatrix4fv(program.u_matrix, false,matrix);
    gl.uniform1i(program.u_image, 1);
    gl.uniform2fv(program.u_dimension, [stride, stride]);
    gl.uniform1f(program.u_zoom, tile.level);
    gl.uniform1f(program.u_maxzoom, 22);
}
export default {drawHillshade,renderHillshade};