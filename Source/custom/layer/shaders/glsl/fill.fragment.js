//This file is automatically rebuilt by the Cesium build process.
export default "uniform highp vec4 u_color;\n\
uniform lowp float u_opacity;\n\
void main() {\n\
    gl_FragColor = u_color * u_opacity;\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
