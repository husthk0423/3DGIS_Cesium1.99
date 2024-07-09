//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec2 u_pattern_size_a;\n\
uniform vec2 u_pattern_size_b;\n\
uniform vec2 u_pattern_tl_a;\n\
uniform vec2 u_pattern_br_a;\n\
uniform vec2 u_pattern_tl_b;\n\
uniform vec2 u_pattern_br_b;\n\
uniform vec2 u_texsize;\n\
uniform float u_fade;\n\
\n\
uniform sampler2D u_image;\n\
\n\
varying vec2 v_normal;\n\
varying vec2 v_width2;\n\
varying float v_linesofar;\n\
varying float v_gamma_scale;\n\
\n\
#pragma mapbox: define lowp float blur\n\
#pragma mapbox: define lowp float opacity\n\
\n\
void main() {\n\
    #pragma mapbox: initialize lowp float blur\n\
    #pragma mapbox: initialize lowp float opacity\n\
\n\
    // Calculate the distance of the pixel from the line in pixels.\n\
    float dist = length(v_normal) * v_width2.s;\n\
\n\
    // Calculate the antialiasing fade factor. This is either when fading in\n\
    // the line in case of an offset line (v_width2.t) or when fading out\n\
    // (v_width2.s)\n\
    float blur2 = (blur + 1.0 / DEVICE_PIXEL_RATIO) * v_gamma_scale;\n\
    float alpha = clamp(min(dist - (v_width2.t - blur2), v_width2.s - dist) / blur2, 0.0, 1.0);\n\
\n\
    float x_a = mod(v_linesofar / u_pattern_size_a.x, 1.0);\n\
    float x_b = mod(v_linesofar / u_pattern_size_b.x, 1.0);\n\
    float y_a = 0.5 + (v_normal.y * v_width2.s / u_pattern_size_a.y);\n\
    float y_b = 0.5 + (v_normal.y * v_width2.s / u_pattern_size_b.y);\n\
    vec2 pos_a = mix(u_pattern_tl_a / u_texsize, u_pattern_br_a / u_texsize, vec2(x_a, y_a));\n\
    vec2 pos_b = mix(u_pattern_tl_b / u_texsize, u_pattern_br_b / u_texsize, vec2(x_b, y_b));\n\
\n\
    vec4 color = mix(texture2D(u_image, pos_a), texture2D(u_image, pos_b), u_fade);\n\
\n\
    gl_FragColor = color * alpha * opacity;\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
