//This file is automatically rebuilt by the Cesium build process.
export default "\n\
\n\
varying vec2 v_width2;\n\
varying vec2 v_normal;\n\
varying float v_gamma_scale;\n\
uniform highp vec4 color;\n\
uniform lowp float blur;\n\
uniform lowp float opacity;\n\
void main() {\n\
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
    gl_FragColor = color * (alpha * opacity);\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
