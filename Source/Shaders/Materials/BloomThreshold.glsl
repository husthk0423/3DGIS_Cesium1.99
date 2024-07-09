uniform sampler2D colorTexture;
uniform float threshold;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;
    float brightness = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    if(brightness > threshold)
        gl_FragColor = vec4(rgb, 1.0);
    else
        gl_FragColor = vec4(0., 0., 0., 1.);
}
