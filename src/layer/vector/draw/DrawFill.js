// @flow
const VertexArrayObject = require('../../../mapbox/VertexArrayObject');
function drawFill(vectorProvider,bucket,matrix,remove) {
    let style = bucket.style;
    if(style.fill){
        drawFillTiles(vectorProvider,bucket,matrix, false,remove);
    }

    // if(style.stroke){
    //     drawFillTiles(vectorProvider,bucket,matrix, true,remove);
    // }
}

function drawFillTiles(vectorProvider,bucket,matrix, isOutline,remove) {
    const gl = vectorProvider.viewer.scene.context._gl;
    const image = null;
    let drawMode, programName, uniformValues,layoutVertexBuffer, indexBuffer, segments;

    if (!isOutline) {
        programName = image ? 'fillPattern' : 'fill';
        drawMode = gl.TRIANGLES;
    } else {
        programName = image  ? 'fillOutlinePattern' : 'fillOutline';
        drawMode = gl.LINES;
    }


    // const programConfiguration = bucket.programConfigurations.get(layer.id);
    // const program = painter.useProgram(programName, programConfiguration);
    const program =  vectorProvider.useProgram(programName);

    if (image) {
        // painter.context.activeTexture.set(gl.TEXTURE0);
        // tile.imageAtlasTexture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);
        // programConfiguration.updatePaintBuffers(crossfade);
    }

    // const constantPattern = patternProperty.constantOr(null);
    // if (constantPattern && tile.imageAtlas) {
    //     const atlas = tile.imageAtlas;
    //     const posTo = atlas.patternPositions[constantPattern.to.toString()];
    //     const posFrom = atlas.patternPositions[constantPattern.from.toString()];
    //     if (posTo && posFrom) programConfiguration.setConstantPatternPositions(posTo, posFrom);
    // }

    if (!isOutline) {
        layoutVertexBuffer = bucket.layoutVertexBuffer;
        indexBuffer = bucket.indexBuffer;
        segments = bucket.segments;
        uniformValues = image ?
            // fillPatternUniformValues(tileMatrix, painter, crossfade, tile) :
            null:
            gl.uniformMatrix4fv(program.u_matrix, false,matrix);
        setUniforms(gl,program,bucket.style);

    } else {
        layoutVertexBuffer = bucket.layoutVertexBuffer2;
        indexBuffer = bucket.indexBuffer2;
        segments = bucket.segments2;
        const drawingBufferSize = [gl.drawingBufferWidth, gl.drawingBufferHeight];
        uniformValues = (programName === 'fillOutlinePattern' && image) ?
            // fillOutlinePatternUniformValues(tileMatrix, painter, crossfade, tile, drawingBufferSize) :
            null:
            fillOutlineUniformValues(program,gl,matrix, drawingBufferSize,vectorProvider,bucket.style);
    }

    const primitiveSize = {
        [gl.LINES]: 2,
        [gl.TRIANGLES]: 3,
        [gl.LINE_STRIP]: 1
    }[drawMode];

    for (let i = 0;i<segments.segments.length;i++) {
        const segment = segments.segments[i];
        if(!segment.vao){
            segment.vao = new VertexArrayObject();
        }

        segment.vao.bind(gl, program, layoutVertexBuffer,indexBuffer, null, segment.vertexOffset);
        gl.drawElements(drawMode, segment.primitiveLength * primitiveSize, gl.UNSIGNED_SHORT, segment.primitiveOffset * primitiveSize * 2);
        if(remove){
            segment.vao.destroy();
        }
    }
}

function fillOutlineUniformValues(program,gl,matrix,drawingBufferSize,vectorProvider,style){
    gl.uniformMatrix4fv(program.u_matrix, false,matrix);
    let w = vectorProvider._tileWidth * vectorProvider.ratio * vectorProvider.scale;
    gl.uniform2f(program.u_world,w , w);
    gl.uniform4fv(program.outline_color, style.strokeColor);
    gl.uniform1f(program.opacity, style.strokeOpacity);
}


function setUniforms(gl,program,style){
    gl.uniform4fv(program.u_color, style.fillColor);
    gl.uniform1f(program.u_opacity, style.fillOpacity);
}



module.exports = drawFill;
