// @flow
const VertexArrayObject = require('../../../mapbox/VertexArrayObject');
 function drawLine(vectorProvider,bucket,matrix,remove,lineWidthScale) {
    let style = bucket.style;
    const width = style.strokeWidth;
    const opacity = style.strokeOpacity;
    if(opacity == 0 || width == 0) return;

    const dasharray = style['dash'];
    const image = null;
    const gradient = null;

    const programId =
        image ? 'linePattern' :
        dasharray ? 'lineSDF' :
        gradient ? 'lineGradient' : 'line';

    const gl = vectorProvider.viewer.scene.context._gl;
    const program = vectorProvider.useProgram(programId);

    const uniformValues = image ? null :
        dasharray ? lineSDFUniformValues(gl,program,matrix,vectorProvider,dasharray,style) :
        gradient ? null :
        lineUniformValues(gl,program,matrix,vectorProvider._tileWidth);
    if(image){

    } else if (dasharray) {

    } else if (gradient) {

    }

    setUniforms(gl,program,style,lineWidthScale);

    for (let i = 0;i<bucket.segments.segments.length;i++) {
        const segment = bucket.segments.segments[i];
        if(!segment.vao){
            segment.vao = new VertexArrayObject();
        }

        segment.vao.bind(gl, program, bucket.layoutVertexBuffer,bucket.indexBuffer, null, segment.vertexOffset);
        gl.drawElements(gl.TRIANGLES, segment.primitiveLength * 3, gl.UNSIGNED_SHORT, segment.primitiveOffset * 3 * 2);
        if(remove){
            segment.vao.destroy();
        }
    }
}

function lineSDFUniformValues(gl,program,matrix,vectorProvider,dasharray,style){
    gl.uniformMatrix4fv(program.u_matrix, false,matrix);
    gl.uniform1f(program.u_ratio, vectorProvider._tileWidth/8192);
    gl.uniform2f(program.u_gl_units_to_pixels, 1 / (2 / gl.drawingBufferWidth),1 / ( -2 / gl.drawingBufferHeight));

    let posA, posB, imagePosA, imagePosB;
    const tileRatio = vectorProvider._tileWidth /8192;
    posA = vectorProvider.lineAtlas.getDash(dasharray, style['lineCap'] === 'round');
    posB = vectorProvider.lineAtlas.getDash(dasharray, style['lineJoin'] === 'round');

    const widthA = posA.width * 2;
    const widthB = posB.width * 1;

    gl.uniform2f(program.u_patternscale_a, tileRatio / widthA, -posA.height / 2);
    gl.uniform2f(program.u_patternscale_b, tileRatio / widthB, -posB.height / 2);
    gl.uniform1f(program.u_sdfgamma, vectorProvider.lineAtlas.width / (Math.min(widthA, widthB) * 256 * 1.25) / 2);

    gl.uniform1i(program.u_image, 0);
    gl.activeTexture(gl.TEXTURE0);
    vectorProvider.lineAtlas.bind(gl);

    gl.uniform1f(program.u_tex_y_a, posA.y);
    gl.uniform1f(program.u_tex_y_b, posB.y);
    gl.uniform1f(program.u_mix, 1.0);
}

function lineUniformValues(gl,program,matrix,tileSize){
    gl.uniformMatrix4fv(program.u_matrix, false,matrix);
    gl.uniform1f(program.u_ratio, tileSize/8192);
    gl.uniform2f(program.u_gl_units_to_pixels, 1 / (2 / gl.drawingBufferWidth),1 / ( -2 / gl.drawingBufferHeight));
}

function setUniforms(gl,program,style,lineWidthScale){
    let w = style.strokeWidth;
    if(lineWidthScale){
       w =  w/lineWidthScale;
    }
    gl.uniform1f(program.u_width,w);
    gl.uniform4fv(program.color, style.strokeColor);
    gl.uniform1f(program.opacity, style.strokeOpacity);
    gl.uniform1f(program.blur, 0);

    gl.uniform1f(program.a_gapwidth, 0);
    gl.uniform1f(program.a_offset, 0);

    // gl.uniform4fv(program.u_color, style.strokeColor);
    // gl.uniform1f(program.u_opacity, style.strokeOpacity);
    // gl.uniform1f(program.u_width,style.strokeWidth);
    // gl.uniform1f(program.u_blur, 0);
    // gl.uniform1f(program.u_gapwidth, 0);
    // gl.uniform1f(program.u_offset, 0);
}


module.exports = drawLine;