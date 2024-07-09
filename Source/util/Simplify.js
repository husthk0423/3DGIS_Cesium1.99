/*
 (c) 2017, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

// to suit your point format, run search/replace for '.x' and '.y';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

// square distance between 2 points
    function getSqDist(p1X,p1Y, p2X,p2Y) {

        var dx = p1X - p2X,
            dy = p1Y - p2Y;

        return dx * dx + dy * dy;
    }

// square distance from a point to a segment
    function getSqSegDist(pX,pY,p1X,p1Y,p2X,p2Y) {

        var x = p1X,
            y = p1Y,
            dx = p2X - x,
            dy = p2Y - y;

        if (dx !== 0 || dy !== 0) {

            var t = ((pX - x) * dx + (pY - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = p2X;
                y = p2Y;

            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = pX - x;
        dy = pY - y;

        return dx * dx + dy * dy;
    }
// rest of the code doesn't care about point format

// basic distance-based simplification
    function simplifyRadialDist(points, sqTolerance) {

        var prevPointX = points[0];
        var prevPointY = points[1];
        var newPoints = [points[0],points[1]];
        var pointX;
        var pointY;
        var len = points.length / 2;
        for (var i = 1 ; i < len; i++) {
            pointX = points[i * 2];
            pointY = points[i * 2 + 1];

            if (getSqDist(pointX,pointY, prevPointX,prevPointY) > sqTolerance) {
                newPoints.push(pointX);
                newPoints.push(pointY);
                prevPointX = pointX;
                prevPointY = pointY;
            }
        }

        if (prevPointX !== pointX && prevPointY !== pointY) {
            newPoints.push(pointX);
            newPoints.push(pointY);

        }

        return newPoints;
    }

    function simplifyDPStep(points, first, last, sqTolerance, simplified) {
        var maxSqDist = sqTolerance,
            index;

        for (var i = first + 1; i < last; i++) {
            var sqDist = getSqSegDist(points[i * 2] , points[i * 2 + 1] , points[first * 2] , points[first * 2 + 1] , points[last * 2] , points[last * 2 + 1]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            if (index - first > 1) {
                simplifyDPStep(points, first, index, sqTolerance, simplified);
            }

            simplified.push(points[index * 2]);
            simplified.push(points[index * 2 + 1]);

            if (last - index > 1) {
                simplifyDPStep(points, index, last, sqTolerance, simplified);
            }
        }
    }

// simplification using Ramer-Douglas-Peucker algorithm
    function simplifyDouglasPeucker(points, sqTolerance) {
        var last = points.length / 2 - 1;

        var simplified = [points[0],points[1]];

        simplifyDPStep(points, 0, last, sqTolerance , simplified);
        simplified.push(points[last * 2] , points[last * 2 + 1]);

        return simplified;
    }

// both algorithms combined for awesome performance
    function simplify(points, tolerance, highestQuality) {

        if (points.length <= 4) return points;

        var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

        points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
        points = simplifyDouglasPeucker(points, sqTolerance);

        return points;
    }

export default simplify;