//This file is automatically rebuilt by the Cesium build process.
export default "uniform highp vec4 outline_color;\n\
uniform lowp float opacity;\n\
\n\
varying vec2 v_pos;\n\
\n\
void main() {\n\
    float dist = length(v_pos - gl_FragCoord.xy);\n\
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);\n\
    gl_FragColor = outline_color * (alpha * opacity);\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
