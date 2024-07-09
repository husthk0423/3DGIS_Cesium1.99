//This file is automatically rebuilt by the Cesium build process.
export default "uniform mat4 u_matrix;\n\
\n\
attribute vec2 a_pos;\n\
attribute vec2 a_texture_pos;\n\
\n\
varying vec2 v_pos;\n\
\n\
void main() {\n\
    gl_Position = u_matrix * vec4(a_pos, 0, 1);\n\
    gl_Position.y =  - gl_Position.y;\n\
    v_pos = a_texture_pos / 32768.0;\n\
}\n\
";
