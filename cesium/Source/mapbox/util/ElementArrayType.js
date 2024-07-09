'use strict';
import createStructArrayType from './StructArray';

export default createElementArrayType;

/**
 * An element array stores Uint16 indicies of vertexes in a corresponding vertex array. With no
 * arguments, it defaults to three components per element, forming triangles.
 * @private
 */
function createElementArrayType(components) {
    return createStructArrayType({
        members: [{
            type: 'Uint16',
            name: 'vertices',
            components: components || 3
        }]
    });
}
