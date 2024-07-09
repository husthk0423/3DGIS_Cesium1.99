'use strict';


/**
 * The `Bucket` class is the single point of knowledge about turning vector
 * tiles into WebGL buffers.
 *
 * `Bucket` is an abstract class. A subclass exists for each style layer type.
 * Create a bucket via the `StyleLayer#createBucket` method.
 *
 * The concrete bucket types, using layout options from the style layer,
 * transform feature geometries into vertex and element data for use by the
 * vertex shader.  They also (via `ProgramConfiguration`) use feature
 * properties and the zoom level to populate the attributes needed for
 * data-driven styling.
 *
 * Buckets are designed to be built on a worker thread and then serialized and
 * transferred back to the main thread for rendering.  On the worker side, a
 * bucket's vertex, element, and attribute data is stored in `bucket.arrays:
 * ArrayGroup`.  When a bucket's data is serialized and sent back to the main
 * thread, is gets deserialized (using `new Bucket(serializedBucketData)`, with
 * the array data now stored in `bucket.buffers: BufferGroup`.  BufferGroups
 * hold the same data as ArrayGroups, but are tuned for consumption by WebGL.
 *
 * @private
 */
class Bucket {
    /**
     * @param options
     * @param {number} options.zoom Zoom level of the buffers being built. May be
     *     a fractional zoom level.
     * @param options.layer A Mapbox style layer object
     * @param {Object.<string, Buffer>} options.buffers The set of `Buffer`s being
     *     built for this tile. This object facilitates sharing of `Buffer`s be
           between `Bucket`s.
     */
    constructor (options) {
        this.style= options.style;
        this.type = options.type;
        this.tileSize = options.tileSize;
    }


    serialize(transferables) {

    }

    /**
     * Release the WebGL resources associated with the buffers. Note that because
     * buckets are shared between layers having the same layout properties, they
     * must be destroyed in groups (all buckets for a tile, or all symbol buckets).
     *
     * @private
     */
    destroy() {
    }
}

export default Bucket;
