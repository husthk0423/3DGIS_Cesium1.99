'use strict';
import createStructArrayType from './StructArray';
export default createVertexArrayType;

/**
 * A vertex array stores data for each vertex in a geometry. Elements are aligned to 4 byte
 * boundaries for best performance in WebGL.
 * @private
 */
function createVertexArrayType(members) {
    return createStructArrayType({
        members: members,
        alignment: 4
    });
}
