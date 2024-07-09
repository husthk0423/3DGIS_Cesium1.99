//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec2 a_pos;\n\
uniform mat4 u_matrix;\n\
void main() {\n\
    gl_Position = u_matrix * vec4(a_pos, 0, 1);\n\
    gl_Position.y =  - gl_Position.y;\n\
}\n\
";
