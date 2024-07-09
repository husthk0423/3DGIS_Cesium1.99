const { HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData } = window;

class MapboxTexture {
    constructor(gl, image, format, options) {
        this.gl = gl;
        this.format = format;
        this.texture = gl.createTexture();
        this.update(image, options);
    }

    update(image, options, position) {
        const {width, height} = image;
        const resize = (!this.size || this.size[0] !== width || this.size[1] !== height) && !position;
        const gl = this.gl;

        this.useMipmap = Boolean(options && options.useMipmap);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.format === gl.RGBA && (!options || options.premultiply !== false));

        if (resize) {
            this.size = [width, height];

            if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof HTMLVideoElement || image instanceof ImageData) {
                gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, gl.UNSIGNED_BYTE, image);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, gl.UNSIGNED_BYTE, image.data);
            }

        } else {
            const {x, y} = position || { x: 0, y: 0};
            if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof HTMLVideoElement || image instanceof ImageData) {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, image);
            } else {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
            }
        }

        if (this.useMipmap && this.isSizePowerOfTwo()) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }

    bind(filter, wrap, minFilter) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        if (minFilter === gl.LINEAR_MIPMAP_NEAREST && !this.isSizePowerOfTwo()) {
            minFilter = gl.LINEAR;
        }

        if (filter !== this.filter) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter || filter);
            this.filter = filter;
        }

        if (wrap !== this.wrap) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            this.wrap = wrap;
        }
    }

    isSizePowerOfTwo() {
        return this.size[0] === this.size[1] && (Math.log(this.size[0]) / Math.LN2) % 1 === 0;
    }

    destroy() {
        this.gl.deleteTexture(this.texture);
        this.texture = null;
    }
}
module.exports = MapboxTexture;
