/**
 * Created by EDZ on 2020/10/14.
 */
import shaders from './Shaders';
const cache ={};
class ProgramFactory{
    static createProgram(gl,name){
        let result = cache[name];
        if (!result) {
            let shader = shaders[name];

            let definesSource = `#define MAPBOX_GL_JS\n#define DEVICE_PIXEL_RATIO ${window.devicePixelRatio.toFixed(1)}\n`;
            if(shader.definePragma)
                definesSource += shader.definePragma;
            // shader = ProgramFactory.compile(shaders.prelude.fragmentSource+shader.fragmentSource, shaders.prelude.vertexSource+shader.vertexSource);

            let vertexShader = ProgramFactory.makeShader(gl,definesSource + shaders.prelude.fragmentSource+shader.fragmentSource, gl.FRAGMENT_SHADER);
            let fragmentShader = ProgramFactory.makeShader(gl,definesSource + shaders.prelude.vertexSource+shader.vertexSource, gl.VERTEX_SHADER);
            //create program
            let program = gl.createProgram();

            //attach and link shaders to the program
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
            result = {program, numAttributes};

            for (let i = 0; i < numAttributes; i++) {
                const attribute = gl.getActiveAttrib(program, i);
                result[attribute.name] = gl.getAttribLocation(program, attribute.name);
            }
            const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < numUniforms; i++) {
                const uniform = gl.getActiveUniform(program, i);
                result[uniform.name] = gl.getUniformLocation(program, uniform.name);
            }

            cache[name] = result;
        }

        gl.useProgram(result.program);
        return result;
    }

    static compile(fragmentSource, vertexSource) {
    const re = /#pragma mapbox: ([\w]+) ([\w]+) ([\w]+) ([\w]+)/g;

    const staticAttributes = vertexSource.match(/attribute ([\w]+) ([\w]+)/g);
    const fragmentUniforms = fragmentSource.match(/uniform ([\w]+) ([\w]+)([\s]*)([\w]*)/g);
    const vertexUniforms = vertexSource.match(/uniform ([\w]+) ([\w]+)([\s]*)([\w]*)/g);
    const staticUniforms = vertexUniforms ? vertexUniforms.concat(fragmentUniforms) : fragmentUniforms;

    const fragmentPragmas = {};

    fragmentSource = fragmentSource.replace(re, (match, operation, precision, type, name) => {
        fragmentPragmas[name] = true;
        if (operation === 'define') {
            return `
#ifndef HAS_UNIFORM_u_${name}
varying ${precision} ${type} ${name};
#else
uniform ${precision} ${type} u_${name};
#endif
`;
        } else /* if (operation === 'initialize') */ {
            return `
#ifdef HAS_UNIFORM_u_${name}
    ${precision} ${type} ${name} = u_${name};
#endif
`;
        }
    });

    vertexSource = vertexSource.replace(re, (match, operation, precision, type, name) => {
        const attrType = type === 'float' ? 'vec2' : 'vec4';
        const unpackType = name.match(/color/) ? 'color' : attrType;

        if (fragmentPragmas[name]) {
            if (operation === 'define') {
                return `
#ifndef HAS_UNIFORM_u_${name}
uniform lowp float u_${name}_t;
attribute ${precision} ${attrType} a_${name};
varying ${precision} ${type} ${name};
#else
uniform ${precision} ${type} u_${name};
#endif
`;
            } else /* if (operation === 'initialize') */ {
                if (unpackType === 'vec4') {
                    // vec4 attributes are only used for cross-faded properties, and are not packed
                    return `
#ifndef HAS_UNIFORM_u_${name}
    ${name} = a_${name};
#else
    ${precision} ${type} ${name} = u_${name};
#endif
`;
                } else {
                    return `
#ifndef HAS_UNIFORM_u_${name}
    ${name} = unpack_mix_${unpackType}(a_${name}, u_${name}_t);
#else
    ${precision} ${type} ${name} = u_${name};
#endif
`;
                }
            }
        } else {
            if (operation === 'define') {
                return `
#ifndef HAS_UNIFORM_u_${name}
uniform lowp float u_${name}_t;
attribute ${precision} ${attrType} a_${name};
#else
uniform ${precision} ${type} u_${name};
#endif
`;
            } else /* if (operation === 'initialize') */ {
                if (unpackType === 'vec4') {
                    // vec4 attributes are only used for cross-faded properties, and are not packed
                    return `
#ifndef HAS_UNIFORM_u_${name}
    ${precision} ${type} ${name} = a_${name};
#else
    ${precision} ${type} ${name} = u_${name};
#endif
`;
                } else /* */{
                    return `
#ifndef HAS_UNIFORM_u_${name}
    ${precision} ${type} ${name} = unpack_mix_${unpackType}(a_${name}, u_${name}_t);
#else
    ${precision} ${type} ${name} = u_${name};
#endif
`;
                }
            }
        }
    });

    return {fragmentSource, vertexSource, staticAttributes, staticUniforms};
}

    static makeShader(gl,src, type) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
        }
        return shader;
    }
}

export default ProgramFactory;