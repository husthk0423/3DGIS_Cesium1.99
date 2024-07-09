//This file is automatically rebuilt by the Cesium build process.
export default "\n\
\n\
// the distance over which the line edge fades out.\n\
// Retina devices need a smaller distance to avoid aliasing.\n\
#define ANTIALIASING 1.0 / DEVICE_PIXEL_RATIO / 2.0\n\
\n\
// floor(127 / 2) == 63.0\n\
// the maximum allowed miter limit is 2.0 at the moment. the extrude normal is\n\
// stored in a byte (-128..127). we scale regular normals up to length 63, but\n\
// there are also \"special\" normals that have a bigger length (of up to 126 in\n\
// this case).\n\
// #define scale 63.0\n\
#define scale 0.015873016\n\
\n\
attribute vec2 a_pos;\n\
attribute vec4 a_data;\n\
attribute vec2 a_txy;\n\
\n\
uniform mat4 u_matrix;\n\
uniform mediump float u_ratio;\n\
uniform mediump float u_width;\n\
uniform vec2 u_gl_units_to_pixels;\n\
\n\
varying vec2 v_normal;\n\
varying vec2 v_width2;\n\
varying float v_gamma_scale;\n\
\n\
 uniform mediump float a_gapwidth;\n\
 uniform float a_offset;\n\
mediump  float gapwidth;\n\
lowp float offset;\n\
\n\
\n\
void main() {\n\
\n\
    vec2 a_extrude = a_data.xy - 128.0;\n\
    float a_direction = mod(a_data.z, 4.0) - 1.0;\n\
\n\
    // We store the texture normals in the most insignificant bit\n\
    // transform y so that 0 => -1 and 1 => 1\n\
    // In the texture normal, x is 0 if the normal points straight up/down and 1 if it's a round cap\n\
    // y is 1 if the normal points up, and -1 if it points down\n\
    mediump vec2 normal = a_txy;\n\
    normal.y = sign(normal.y - 0.5);\n\
    v_normal = normal;\n\
\n\
\n\
    // these transformations used to be applied in the JS and native code bases.\n\
    // moved them into the shader for clarity and simplicity.\n\
    gapwidth = a_gapwidth / 2.0;\n\
    float width = u_width / 2.0;\n\
    offset = -1.0 * a_offset;\n\
\n\
    float inset = gapwidth + (gapwidth > 0.0 ? ANTIALIASING : 0.0);\n\
    float outset = gapwidth + width * (gapwidth > 0.0 ? 2.0 : 1.0) + ANTIALIASING;\n\
\n\
    // Scale the extrusion vector down to a normal and then up by the line width\n\
    // of this vertex.\n\
    mediump vec2 dist = outset * a_extrude * scale;\n\
\n\
    // Calculate the offset when drawing a line that is to the side of the actual line.\n\
    // We do this by creating a vector that points towards the extrude, but rotate\n\
    // it when we're drawing round end points (a_direction = -1 or 1) since their\n\
    // extrude vector points in another direction.\n\
    mediump float u = 0.5 * a_direction;\n\
    mediump float t = 1.0 - abs(u);\n\
    mediump vec2 offset2 = offset * a_extrude * scale * normal.y * mat2(t, -u, u, t);\n\
\n\
    // Remove the texture normal bit to get the position\n\
//    vec2 pos = a_pos;\n\
\n\
    vec4 projected_extrude = u_matrix * vec4(dist / u_ratio, 0.0, 0.0);\n\
\n\
    gl_Position = u_matrix * vec4(a_pos + offset2 / u_ratio, 0.0, 1.0) + projected_extrude;\n\
    gl_Position.y =  - gl_Position.y;\n\
\n\
    // calculate how much the perspective view squishes or stretches the extrude\n\
    float extrude_length_without_perspective = length(dist);\n\
    float extrude_length_with_perspective = length(projected_extrude.xy / gl_Position.w * u_gl_units_to_pixels);\n\
    v_gamma_scale = extrude_length_without_perspective / extrude_length_with_perspective;\n\
\n\
    v_width2 = vec2(outset, inset);\n\
}\n\
";
