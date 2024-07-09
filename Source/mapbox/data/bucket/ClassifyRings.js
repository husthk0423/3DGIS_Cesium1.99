import quickselect from '../../../ThirdParty/quickselect';

// classifies an array of rings into polygons with outer rings and holes

 function calculateSignedArea(ring){
    let sum = 0;
    for (let i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
    }
    return sum;
};

export default function classifyRings(rings, maxRings) {
    const len = rings.length;

    if (len <= 0) return [];

    const polygons = [];
    let polygon =[];
        // ccw;

    for (let i = 0; i < len; i++) {
        const area = calculateSignedArea(rings[i]);
        if (area === 0) continue;

        rings[i].area = Math.abs(area);

        // if (ccw === undefined) ccw = area < 0;
        //
        // if (ccw === area < 0) {
        //     if (polygon) polygons.push(polygon);
        //     polygon = [rings[i]];
        //
        // } else {
            polygon.push(rings[i]);
        // }
    }
    if (polygon) polygons.push(polygon);

    // Earcut performance degrages with the # of rings in a polygon. For this
    // reason, we limit strip out all but the `maxRings` largest rings.
    if (maxRings > 1) {
        for (let j = 0; j < polygons.length; j++) {
            if (polygons[j].length <= maxRings) continue;
            quickselect(polygons[j], maxRings, 1, polygons[j].length - 1, compareAreas);
            polygons[j] = polygons[j].slice(0, maxRings);
        }
    }

    return polygons;
};

function compareAreas(a, b) {
    return b.area - a.area;
}
