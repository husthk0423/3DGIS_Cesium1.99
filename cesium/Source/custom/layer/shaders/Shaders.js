import _preludeFragment from './glsl/_prelude.fragment';
import _preludeVertex from './glsl/_prelude.vertex';

import circleFragment from './glsl/circle.fragment';
import circleVertex from './glsl/circle.vertex';

import fillFragment from './glsl/fill.fragment';
import fillVertex from './glsl/fill.vertex';

import fill_outlineFragment from './glsl/fill_outline.fragment';
import fill_outlineVertex from './glsl/fill_outline.vertex';

import fill_outline_patternFragment from './glsl/fill_outline_pattern.fragment';
import fill_outline_patternVertex from './glsl/fill_outline_pattern.vertex';

import fill_patternFragment from './glsl/fill_pattern.fragment';
import fill_patternVertex from './glsl/fill_pattern.vertex';

import lineFragment from './glsl/line.fragment';
import lineVertex from './glsl/line.vertex';

import line_patternFragment from './glsl/line_pattern.fragment';
import line_patternVertex from './glsl/line_pattern.vertex';

import line_sdfFragment from './glsl/line_sdf.fragment';
import line_sdfVertex from './glsl/line_sdf.vertex';

import hillshadeFragment from './glsl/hillshade.fragment';
import hillshadeVertex from './glsl/hillshade.vertex';

import hillshade_prepareFragment from './glsl/hillshade_prepare.fragment';
import hillshade_prepareVertex from './glsl/hillshade_prepare.vertex';
export default {
    prelude: {
        fragmentSource: _preludeFragment,
        vertexSource: _preludeVertex
    },
    circle: {
        fragmentSource: circleFragment,
        vertexSource: circleVertex
    },
    fill: {
        fragmentSource: fillFragment,
        vertexSource: fillVertex
    },
    fillOutline: {
        fragmentSource: fill_outlineFragment,
        vertexSource: fill_outlineVertex
    },
    fillOutlinePattern: {
        fragmentSource: fill_outline_patternFragment,
        vertexSource: fill_outline_patternVertex
    },
    fillPattern: {
        fragmentSource: fill_patternFragment,
        vertexSource: fill_patternVertex
    },
    line: {
        fragmentSource: lineFragment,
        vertexSource: lineVertex
    },
    linePattern: {
        fragmentSource: line_patternFragment,
        vertexSource: line_patternVertex
    },
    lineSDF: {
        fragmentSource: line_sdfFragment,
        vertexSource: line_sdfVertex
    },
    hillshade: {
        fragmentSource: hillshadeFragment,
        vertexSource: hillshadeVertex
    },
    hillshadePrepare: {
        fragmentSource: hillshade_prepareFragment,
        vertexSource: hillshade_prepareVertex
    }
};
