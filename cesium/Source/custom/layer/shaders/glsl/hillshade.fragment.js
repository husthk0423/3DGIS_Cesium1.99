//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D u_image;\n\
varying vec2 v_pos;\n\
\n\
uniform vec2 u_latrange;\n\
uniform vec2 u_light;\n\
uniform vec4 u_shadow;\n\
uniform vec4 u_highlight;\n\
uniform vec4 u_accent;\n\
\n\
#define PI 3.141592653589793\n\
\n\
void main() {\n\
    vec4 pixel = texture2D(u_image, v_pos);\n\
\n\
    vec2 deriv = ((pixel.rg * 2.0) - 1.0);\n\
\n\
    // We divide the slope by a scale factor based on the cosin of the pixel's approximate latitude\n\
    // to account for mercator projection distortion. see #4807 for details\n\
    float scaleFactor = cos(radians((u_latrange[0] - u_latrange[1]) * (1.0 - v_pos.y) + u_latrange[1]));\n\
    // We also multiply the slope by an arbitrary z-factor of 1.25\n\
    float slope = atan(1.25 * length(deriv) / scaleFactor);\n\
    float aspect = deriv.x != 0.0 ? atan(deriv.y, -deriv.x) : PI / 2.0 * (deriv.y > 0.0 ? 1.0 : -1.0);\n\
\n\
    float intensity = u_light.x;\n\
    // We add PI to make this property match the global light object, which adds PI/2 to the light's azimuthal\n\
    // position property to account for 0deg corresponding to north/the top of the viewport in the style spec\n\
    // and the original shader was written to accept (-illuminationDirection - 90) as the azimuthal.\n\
    float azimuth = u_light.y + PI;\n\
\n\
    // We scale the slope exponentially based on intensity, using a calculation similar to\n\
    // the exponential interpolation function in the style spec:\n\
    // https://github.com/mapbox/mapbox-gl-js/blob/master/src/style-spec/expression/definitions/interpolate.js#L217-L228\n\
    // so that higher intensity values create more opaque hillshading.\n\
    float base = 1.875 - intensity * 1.75;\n\
    float maxValue = 0.5 * PI;\n\
    float scaledSlope = intensity != 0.5 ? ((pow(base, slope) - 1.0) / (pow(base, maxValue) - 1.0)) * maxValue : slope;\n\
\n\
    // The accent color is calculated with the cosine of the slope while the shade color is calculated with the sine\n\
    // so that the accent color's rate of change eases in while the shade color's eases out.\n\
    float accent = cos(scaledSlope);\n\
    // We multiply both the accent and shade color by a clamped intensity value\n\
    // so that intensities >= 0.5 do not additionally affect the color values\n\
    // while intensity values < 0.5 make the overall color more transparent.\n\
    vec4 accent_color = (1.0 - accent) * u_accent * clamp(intensity * 2.0, 0.0, 1.0);\n\
    float shade = abs(mod((aspect + azimuth) / PI + 0.5, 2.0) - 1.0);\n\
    vec4 shade_color = mix(u_shadow, u_highlight, shade) * sin(scaledSlope) * clamp(intensity * 2.0, 0.0, 1.0);\n\
    gl_FragColor = accent_color * (1.0 - shade_color.a) + shade_color;\n\
\n\
#ifdef OVERDRAW_INSPECTOR\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
}\n\
";
