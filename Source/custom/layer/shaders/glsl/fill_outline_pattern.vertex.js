//This file is automatically rebuilt by the Cesium build process.
export default "uniform mat4 u_matrix;\n\
uniform vec2 u_world;\n\
uniform vec2 u_pattern_size_a;\n\
uniform vec2 u_pattern_size_b;\n\
uniform vec2 u_pixel_coord_upper;\n\
uniform vec2 u_pixel_coord_lower;\n\
uniform float u_scale_a;\n\
uniform float u_scale_b;\n\
uniform float u_tile_units_to_pixels;\n\
\n\
attribute vec2 a_pos;\n\
\n\
varying vec2 v_pos_a;\n\
varying vec2 v_pos_b;\n\
varying vec2 v_pos;\n\
\n\
#pragma mapbox: define lowp float opacity\n\
\n\
void main() {\n\
    #pragma mapbox: initialize lowp float opacity\n\
\n\
    gl_Position = u_matrix * vec4(a_pos, 0, 1);\n\
    gl_Position.y =  - gl_Position.y;\n\
\n\
    v_pos_a = get_pattern_pos(u_pixel_coord_upper, u_pixel_coord_lower, u_scale_a * u_pattern_size_a, u_tile_units_to_pixels, a_pos);\n\
    v_pos_b = get_pattern_pos(u_pixel_coord_upper, u_pixel_coord_lower, u_scale_b * u_pattern_size_b, u_tile_units_to_pixels, a_pos);\n\
\n\
    v_pos = (gl_Position.xy / gl_Position.w + 1.0) / 2.0 * u_world;\n\
}\n\
";
