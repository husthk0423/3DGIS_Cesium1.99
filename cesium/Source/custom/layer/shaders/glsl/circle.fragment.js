//This file is automatically rebuilt by the Cesium build process.
export default "\n\
varying vec2 v_extrude;\n\
varying lowp float v_antialiasblur;\n\
\n\
uniform highp vec4 color;\n\
uniform mediump float radius;\n\
uniform lowp float blur;\n\
uniform lowp float opacity;\n\
uniform vec4 stroke_color;\n\
uniform mediump float stroke_width;\n\
uniform lowp float stroke_opacity;\n\
\n\
void main() {\n\
\n\
    float extrude_length = length(v_extrude);\n\
    float antialiased_blur = -max(blur, v_antialiasblur);\n\
\n\
    float opacity_t = smoothstep(0.0, antialiased_blur, extrude_length - 1.0);\n\
\n\
    float color_t = stroke_width < 0.01 ? 0.0 : smoothstep(\n\
        antialiased_blur,\n\
        0.0,\n\
        extrude_length - radius / (radius + stroke_width)\n\
    );\n\
\n\
    gl_FragColor = opacity_t * mix(color * opacity, stroke_color * stroke_opacity, color_t);\n\
\n\
    //gl_FragColor = vec4(1.0,0.0,0.0,1.0);\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
