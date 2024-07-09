
varying vec2 v_extrude;
varying lowp float v_antialiasblur;

uniform highp vec4 color;
uniform mediump float radius;
uniform lowp float blur;
uniform lowp float opacity;
uniform vec4 stroke_color;
uniform mediump float stroke_width;
uniform lowp float stroke_opacity;

void main() {

    float extrude_length = length(v_extrude);
    float antialiased_blur = -max(blur, v_antialiasblur);

    float opacity_t = smoothstep(0.0, antialiased_blur, extrude_length - 1.0);

    float color_t = stroke_width < 0.01 ? 0.0 : smoothstep(
        antialiased_blur,
        0.0,
        extrude_length - radius / (radius + stroke_width)
    );

    gl_FragColor = opacity_t * mix(color * opacity, stroke_color * stroke_opacity, color_t);

    //gl_FragColor = vec4(1.0,0.0,0.0,1.0);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
