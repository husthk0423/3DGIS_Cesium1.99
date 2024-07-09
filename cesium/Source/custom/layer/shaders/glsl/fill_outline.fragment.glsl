uniform highp vec4 outline_color;
uniform lowp float opacity;

varying vec2 v_pos;

void main() {
    float dist = length(v_pos - gl_FragCoord.xy);
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    gl_FragColor = outline_color * (alpha * opacity);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
