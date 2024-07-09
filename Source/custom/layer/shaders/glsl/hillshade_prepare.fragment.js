//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
\n\
uniform sampler2D u_image;\n\
varying vec2 v_pos;\n\
uniform vec2 u_dimension;\n\
uniform float u_zoom;\n\
uniform float u_maxzoom;\n\
\n\
float getElevation(vec2 coord, float bias) {\n\
    // Convert encoded elevation value to meters\n\
    vec4 data = texture2D(u_image, coord) * 255.0;\n\
    return (data.r + data.g * 256.0 + data.b * 256.0 * 256.0) / 4.0;\n\
}\n\
\n\
void main() {\n\
    vec2 epsilon = 1.0 / u_dimension;\n\
\n\
    // queried pixels:\n\
    // +-----------+\n\
    // |   |   |   |\n\
    // | a | b | c |\n\
    // |   |   |   |\n\
    // +-----------+\n\
    // |   |   |   |\n\
    // | d | e | f |\n\
    // |   |   |   |\n\
    // +-----------+\n\
    // |   |   |   |\n\
    // | g | h | i |\n\
    // |   |   |   |\n\
    // +-----------+\n\
\n\
    float a = getElevation(v_pos + vec2(-epsilon.x, -epsilon.y), 0.0);\n\
    float b = getElevation(v_pos + vec2(0, -epsilon.y), 0.0);\n\
    float c = getElevation(v_pos + vec2(epsilon.x, -epsilon.y), 0.0);\n\
    float d = getElevation(v_pos + vec2(-epsilon.x, 0), 0.0);\n\
    float e = getElevation(v_pos, 0.0);\n\
    float f = getElevation(v_pos + vec2(epsilon.x, 0), 0.0);\n\
    float g = getElevation(v_pos + vec2(-epsilon.x, epsilon.y), 0.0);\n\
    float h = getElevation(v_pos + vec2(0, epsilon.y), 0.0);\n\
    float i = getElevation(v_pos + vec2(epsilon.x, epsilon.y), 0.0);\n\
\n\
    // here we divide the x and y slopes by 8 * pixel size\n\
    // where pixel size (aka meters/pixel) is:\n\
    // circumference of the world / (pixels per tile * number of tiles)\n\
    // which is equivalent to: 8 * 40075016.6855785 / (512 * pow(2, u_zoom))\n\
    // which can be reduced to: pow(2, 19.25619978527 - u_zoom)\n\
    // we want to vertically exaggerate the hillshading though, because otherwise\n\
    // it is barely noticeable at low zooms. to do this, we multiply this by some\n\
    // scale factor pow(2, (u_zoom - u_maxzoom) * a) where a is an arbitrary value\n\
    // Here we use a=0.3 which works out to the expression below. see \n\
    // nickidlugash's awesome breakdown for more info\n\
    // https://github.com/mapbox/mapbox-gl-js/pull/5286#discussion_r148419556\n\
    float exaggeration = u_zoom < 2.0 ? 0.4 : u_zoom < 4.5 ? 0.35 : 0.3;\n\
\n\
    vec2 deriv = vec2(\n\
        (c + f + f + i) - (a + d + d + g),\n\
        (g + h + h + i) - (a + b + b + c)\n\
    ) /  pow(2.0, (u_zoom - u_maxzoom) * exaggeration + 19.2562 - u_zoom);\n\
\n\
    gl_FragColor = clamp(vec4(\n\
        deriv.x / 2.0 + 0.5,\n\
        deriv.y / 2.0 + 0.5,\n\
        1.0,\n\
        1.0), 0.0, 1.0);\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
