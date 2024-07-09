uniform mat4 u_matrix;
uniform bool u_pitch_with_map;
uniform vec2 u_extrude_scale;


uniform lowp float u_devicepixelratio;
//uniform highp vec4 color;
uniform mediump float radius;
//uniform lowp float blur;
//uniform lowp float opacity;
//uniform vec4 stroke_color;
uniform mediump float stroke_width;
//uniform lowp float stroke_opacity;

attribute vec2 a_pos;

varying vec2 v_extrude;
varying lowp float v_antialiasblur;
void main(void) {

    // unencode the extrusion vector that we snuck into the a_pos vector
    v_extrude = vec2(mod(a_pos, 2.0) * 2.0 - 1.0);

    vec2 extrude = v_extrude * (radius + stroke_width) * u_extrude_scale;
    // multiply a_pos by 0.5, since we had it * 2 in order to sneak
    // in extrusion data
    

    if (u_pitch_with_map) {
        gl_Position = u_matrix * vec4(floor(a_pos * 0.5 + extrude), 0, 1);
        //gl_Position.xy += extrude;
    } else {
        gl_Position = u_matrix * vec4(floor(a_pos * 0.5), 0, 1);
        gl_Position.xy += extrude * gl_Position.w;
        gl_Position.z = 0.0;
    }
    // This is a minimum blur distance that serves as a faux-antialiasing for
    // the circle. since blur is a ratio of the circle's size and the intent is
    // to keep the blur at roughly 1px, the two are inversely related.
    v_antialiasblur = 1.0 / u_devicepixelratio / (radius + stroke_width);
}









