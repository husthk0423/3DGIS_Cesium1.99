
uniform sampler2D u_image;
uniform float u_sdfgamma;
uniform float u_mix;

varying vec2 v_normal;
varying vec2 v_width2;
varying vec2 v_tex_a;
varying vec2 v_tex_b;
varying float v_gamma_scale;


uniform highp vec4 color;
uniform lowp float blur;
uniform lowp float opacity;


void main() {
       // Calculate the distance of the pixel from the line in pixels.
    float dist = length(v_normal) * v_width2.s;

    // Calculate the antialiasing fade factor. This is either when fading in
    // the line in case of an offset line (v_width2.t) or when fading out
    // (v_width2.s)
    float blur2 = (blur + 1.0 / DEVICE_PIXEL_RATIO) * v_gamma_scale;
    float alpha = clamp(min(dist - (v_width2.t - blur2), v_width2.s - dist) / blur2, 0.0, 1.0);

    float sdfdist_a = texture2D(u_image, -v_tex_a).a;
    float sdfdist_b = texture2D(u_image, -v_tex_b).a;
    float sdfdist = mix(sdfdist_a, sdfdist_b, u_mix);
    alpha *= smoothstep(0.5 - u_sdfgamma, 0.5 + u_sdfgamma, sdfdist);

    gl_FragColor = color * (alpha * opacity);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
