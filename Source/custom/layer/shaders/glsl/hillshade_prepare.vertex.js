//This file is automatically rebuilt by the Cesium build process.
export default "uniform mat4 u_matrix;\n\
uniform vec2 u_dimension;\n\
\n\
attribute vec2 a_pos;\n\
attribute vec2 a_texture_pos;\n\
\n\
varying vec2 v_pos;\n\
\n\
void main() {\n\
    gl_Position = u_matrix * vec4(a_pos, 0, 1);\n\
\n\
    highp vec2 epsilon = 1.0 / u_dimension;\n\
    float scale = (u_dimension.x - 2.0) / u_dimension.x;\n\
    v_pos = (a_texture_pos / 32768.0) * scale + epsilon;\n\
}\n\
";
