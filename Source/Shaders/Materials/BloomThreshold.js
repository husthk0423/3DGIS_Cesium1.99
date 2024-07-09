//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform float threshold;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;\n\
    float brightness = dot(rgb, vec3(0.2126, 0.7152, 0.0722));\n\
    if(brightness > threshold)\n\
        gl_FragColor = vec4(rgb, 1.0);\n\
    else\n\
        gl_FragColor = vec4(0., 0., 0., 1.);\n\
}\n\
";
