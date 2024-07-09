//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec2 u_pattern_tl_a;\n\
uniform vec2 u_pattern_br_a;\n\
uniform vec2 u_pattern_tl_b;\n\
uniform vec2 u_pattern_br_b;\n\
uniform vec2 u_texsize;\n\
uniform float u_mix;\n\
\n\
uniform sampler2D u_image;\n\
\n\
varying vec2 v_pos_a;\n\
varying vec2 v_pos_b;\n\
\n\
#pragma mapbox: define lowp float opacity\n\
\n\
void main() {\n\
    #pragma mapbox: initialize lowp float opacity\n\
\n\
    vec2 imagecoord = mod(v_pos_a, 1.0);\n\
    vec2 pos = mix(u_pattern_tl_a / u_texsize, u_pattern_br_a / u_texsize, imagecoord);\n\
    vec4 color1 = texture2D(u_image, pos);\n\
\n\
    vec2 imagecoord_b = mod(v_pos_b, 1.0);\n\
    vec2 pos2 = mix(u_pattern_tl_b / u_texsize, u_pattern_br_b / u_texsize, imagecoord_b);\n\
    vec4 color2 = texture2D(u_image, pos2);\n\
\n\
    gl_FragColor = mix(color1, color2, u_mix) * opacity;\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
