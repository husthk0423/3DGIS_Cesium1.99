//This file is automatically rebuilt by the Cesium build process.
export default "uniform mat4 u_matrix;\n\
uniform bool u_pitch_with_map;\n\
uniform vec2 u_extrude_scale;\n\
\n\
\n\
uniform lowp float u_devicepixelratio;\n\
//uniform highp vec4 color;\n\
uniform mediump float radius;\n\
//uniform lowp float blur;\n\
//uniform lowp float opacity;\n\
//uniform vec4 stroke_color;\n\
uniform mediump float stroke_width;\n\
//uniform lowp float stroke_opacity;\n\
\n\
attribute vec2 a_pos;\n\
\n\
varying vec2 v_extrude;\n\
varying lowp float v_antialiasblur;\n\
void main(void) {\n\
\n\
    // unencode the extrusion vector that we snuck into the a_pos vector\n\
    v_extrude = vec2(mod(a_pos, 2.0) * 2.0 - 1.0);\n\
\n\
    vec2 extrude = v_extrude * (radius + stroke_width) * u_extrude_scale;\n\
    // multiply a_pos by 0.5, since we had it * 2 in order to sneak\n\
    // in extrusion data\n\
    \n\
\n\
    if (u_pitch_with_map) {\n\
        gl_Position = u_matrix * vec4(floor(a_pos * 0.5 + extrude), 0, 1);\n\
        //gl_Position.xy += extrude;\n\
    } else {\n\
        gl_Position = u_matrix * vec4(floor(a_pos * 0.5), 0, 1);\n\
        gl_Position.xy += extrude * gl_Position.w;\n\
        gl_Position.z = 0.0;\n\
    }\n\
    // This is a minimum blur distance that serves as a faux-antialiasing for\n\
    // the circle. since blur is a ratio of the circle's size and the intent is\n\
    // to keep the blur at roughly 1px, the two are inversely related.\n\
    v_antialiasblur = 1.0 / u_devicepixelratio / (radius + stroke_width);\n\
}\n\
\n\
\n\
\n\
\n\
\n\
\n\
\n\
\n\
\n\
";
