//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef GL_ES\n\
precision highp float;\n\
#else\n\
\n\
#if !defined(lowp)\n\
#define lowp\n\
#endif\n\
\n\
#if !defined(mediump)\n\
#define mediump\n\
#endif\n\
\n\
#if !defined(highp)\n\
#define highp\n\
#endif\n\
\n\
#endif\n\
\n\
float evaluate_zoom_function_1(const vec4 values, const float t) {\n\
    if (t < 1.0) {\n\
        return mix(values[0], values[1], t);\n\
    } else if (t < 2.0) {\n\
        return mix(values[1], values[2], t - 1.0);\n\
    } else {\n\
        return mix(values[2], values[3], t - 2.0);\n\
    }\n\
}\n\
vec4 evaluate_zoom_function_4(const vec4 value0, const vec4 value1, const vec4 value2, const vec4 value3, const float t) {\n\
    if (t < 1.0) {\n\
        return mix(value0, value1, t);\n\
    } else if (t < 2.0) {\n\
        return mix(value1, value2, t - 1.0);\n\
    } else {\n\
        return mix(value2, value3, t - 2.0);\n\
    }\n\
}\n\
\n\
// Unpack a pair of values that have been packed into a single float.\n\
// The packed values are assumed to be 8-bit unsigned integers, and are\n\
// packed like so:\n\
// packedValue = floor(input[0]) * 256 + input[1],\n\
vec2 unpack_float(const float packedValue) {\n\
    int packedIntValue = int(packedValue);\n\
    int v0 = packedIntValue / 256;\n\
    return vec2(v0, packedIntValue - v0 * 256);\n\
}\n\
\n\
\n\
// To minimize the number of attributes needed in the mapbox-gl-native shaders,\n\
// we encode a 4-component color into a pair of floats (i.e. a vec2) as follows:\n\
// [ floor(color.r * 255) * 256 + color.g * 255,\n\
//   floor(color.b * 255) * 256 + color.g * 255 ]\n\
vec4 decode_color(const vec2 encodedColor) {\n\
    return vec4(\n\
        unpack_float(encodedColor[0]) / 255.0,\n\
        unpack_float(encodedColor[1]) / 255.0\n\
    );\n\
}\n\
\n\
// Unpack a pair of paint values and interpolate between them.\n\
float unpack_mix_vec2(const vec2 packedValue, const float t) {\n\
    return mix(packedValue[0], packedValue[1], t);\n\
}\n\
\n\
// Unpack a pair of paint values and interpolate between them.\n\
vec4 unpack_mix_vec4(const vec4 packedColors, const float t) {\n\
    vec4 minColor = decode_color(vec2(packedColors[0], packedColors[1]));\n\
    vec4 maxColor = decode_color(vec2(packedColors[2], packedColors[3]));\n\
    return mix(minColor, maxColor, t);\n\
}\n\
\n\
// The offset depends on how many pixels are between the world origin and the edge of the tile:\n\
// vec2 offset = mod(pixel_coord, size)\n\
//\n\
// At high zoom levels there are a ton of pixels between the world origin and the edge of the tile.\n\
// The glsl spec only guarantees 16 bits of precision for highp floats. We need more than that.\n\
//\n\
// The pixel_coord is passed in as two 16 bit values:\n\
// pixel_coord_upper = floor(pixel_coord / 2^16)\n\
// pixel_coord_lower = mod(pixel_coord, 2^16)\n\
//\n\
// The offset is calculated in a series of steps that should preserve this precision:\n\
vec2 get_pattern_pos(const vec2 pixel_coord_upper, const vec2 pixel_coord_lower,\n\
    const vec2 pattern_size, const float tile_units_to_pixels, const vec2 pos) {\n\
\n\
    vec2 offset = mod(mod(mod(pixel_coord_upper, pattern_size) * 256.0, pattern_size) * 256.0 + pixel_coord_lower, pattern_size);\n\
    return (tile_units_to_pixels * pos + offset) / pattern_size;\n\
}\n\
";
