/**
 * @module browser
 * @private
 */

/**
 * Provides a function that outputs milliseconds: either performance.now()
 * or a fallback to Date.now()
 */
let now = (function() {
    if (window.performance &&
        window.performance.now) {
        return window.performance.now.bind(window.performance);
    } else {
        return Date.now.bind(Date);
    }
}());

const frameFn = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

let frame = function(fn) {
    return frameFn(fn);
};

const cancel = window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame;

let cancelFrame = function(id) {
    cancel(id);
};

let timed = function (fn, dur, ctx) {
    if (!dur) {
        fn.call(ctx, 1);
        return null;
    }

    let abort = false;
    const start = now();

    function tick(now1) {
        if (abort) return;
        now1 = now();

        if (now1 >= start + dur) {
            fn.call(ctx, 1);
        } else {
            fn.call(ctx, (now1 - start) / dur);
            frame(tick);
        }
    }

    frame(tick);

    return function() { abort = true; };
};

let getImageData = function (img) {
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0, img.width, img.height);
    return context.getImageData(0, 0, img.width, img.height);
};


//非2的次幂纹理外扩成2次幂
let createPowerOfTwoImageFromImage = function (image) {
    if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
        var canvas = window.document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(image.width);
        canvas.height = nextHighestPowerOfTwo(image.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, image.width, image.height);
        image = canvas;
    }

    return image;
};

function isPowerOfTwo(x) {
    return (x & (x - 1)) == 0;
}

function nextHighestPowerOfTwo(x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
}

/**
 * Test if the current browser supports Mapbox GL JS
 * @param {Object} options
 * @param {boolean} [options.failIfMajorPerformanceCaveat=false] Return `false`
 *   if the performance of Mapbox GL JS would be dramatically worse than
 *   expected (i.e. a software renderer would be used)
 * @return {boolean}
 */

let hardwareConcurrency = window.navigator.hardwareConcurrency || 4;

// Object.defineProperty(exports, 'devicePixelRatio', {
//     get: function() { return window.devicePixelRatio; }
// });
let devicePixelRatio = window.devicePixelRatio;

let supportsWebp = false;

const webpImgTest = window.document.createElement('img');
webpImgTest.onload = function() {
    supportsWebp = true;
};
webpImgTest.src = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=';

export default {now,frame,cancelFrame,timed,getImageData,createPowerOfTwoImageFromImage,hardwareConcurrency,
    supportsWebp,devicePixelRatio };