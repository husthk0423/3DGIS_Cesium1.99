'use strict';
const fs = require('fs');

module.exports = {
    prelude: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/_prelude.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/_prelude.vertex.glsl', 'utf8')
    },
    circle: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/circle.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/circle.vertex.glsl', 'utf8')
    },
    fill: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/fill.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/fill.vertex.glsl', 'utf8')
    },
    fillOutline: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/fill_outline.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/fill_outline.vertex.glsl', 'utf8')
    },
    fillOutlinePattern: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/fill_outline_pattern.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/fill_outline_pattern.vertex.glsl', 'utf8')
    },
    fillPattern: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/fill_pattern.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/fill_pattern.vertex.glsl', 'utf8')
    },
    line: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/line.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/line.vertex.glsl', 'utf8')
    },
    linePattern: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/line_pattern.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/line_pattern.vertex.glsl', 'utf8')
    },
    lineSDF: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/line_sdf.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/line_sdf.vertex.glsl', 'utf8')
    },
    hillshade: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/hillshade.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/hillshade.vertex.glsl', 'utf8')
    },
    hillshadePrepare: {
        fragmentSource: fs.readFileSync('./src/layer/shaders/hillshade_prepare.fragment.glsl', 'utf8'),
        vertexSource: fs.readFileSync('./src/layer/shaders/hillshade_prepare.vertex.glsl', 'utf8')
    }
};
