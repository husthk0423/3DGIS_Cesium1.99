// @flow

import SegmentVector from '../segment';
import Bucket from './Bucket';
import classifyRings from './ClassifyRings';
// import earcut from './earcut';
import Tess2 from './tess2';
// import turf from '@turf/turf';

import BufferUtil from '../../util/BufferUtil';
import createElementArrayType from '../../util/ElementArrayType';
import createVertexArrayType from '../../util/VertexArrayType';

const layoutAttributes = [{name: 'a_pos', components: 2, type: 'Float32'}];
const FillLayoutArrayType = createVertexArrayType(layoutAttributes);
const IndexArrayType = createElementArrayType(3);
const IndexArrayType2= createElementArrayType(2);

const EARCUT_MAX_RINGS = 1500;
class FillBucket extends Bucket{
    constructor(options) {
        super(options);
        this.overscaling = options.overscaling;
        this.layoutVertexArray = new FillLayoutArrayType();
        this.layoutVertexArray2 = new FillLayoutArrayType();
        this.indexArray = new IndexArrayType();
        this.indexArray2 = new IndexArrayType2();
        this.segments = new SegmentVector();
        this.segments2 = new SegmentVector();
    }

    isEmpty() {
        return this.layoutVertexArray.length === 0;
    }

    destroy() {
        this.segments.destroy();
        this.segments2.destroy();
    }

    addFeature(feature) {
        for (const polygon of classifyRings(feature, EARCUT_MAX_RINGS)) {
            let numVertices = 0;
            let flatteneds = [];
            const holeIndices = [];


            for (const ring of polygon) {
                const flattened = [];
                if (ring.length === 0) {
                    continue;
                }

                if (ring !== polygon[0]) {
                    holeIndices.push(flattened.length / 2);
                }

                const lineSegment = this.segments2.prepareSegment(ring.length, this.layoutVertexArray2, this.indexArray2);
                const lineIndex = lineSegment.vertexLength;

                this.layoutVertexArray2.emplaceBack(ring[0].x, ring[0].y);
                this.indexArray2.emplaceBack(lineIndex + ring.length - 1, lineIndex);
                flattened.push(ring[0].x);
                flattened.push(ring[0].y);


                for (let i = 1; i < ring.length; i++) {
                    this.layoutVertexArray2.emplaceBack(ring[i].x, ring[i].y);
                    this.indexArray2.emplaceBack(lineIndex + i - 1, lineIndex + i);
                    flattened.push(ring[i].x);
                    flattened.push(ring[i].y);
                }

                lineSegment.vertexLength += ring.length;
                lineSegment.primitiveLength += ring.length;

                flatteneds.push(flattened);
            }


            var res = Tess2.tesselate({
                contours:flatteneds,
                windingRule: Tess2.WINDING_ODD,
                elementType: Tess2.POLYGONS,
                polySize: 3,
                vertexSize: 2
            });

            numVertices = res.vertices.length/2;


            const triangleSegment = this.segments.prepareSegment(numVertices, this.layoutVertexArray, this.indexArray);
            const triangleIndex = triangleSegment.vertexLength;
            for(let j = 0;j<res.vertices.length;j+=2){
                this.layoutVertexArray.emplaceBack(res.vertices[j], res.vertices[j+1]);
            }


            const indices = res.elements;
            for (let i = 0; i < indices.length; i += 3) {
                this.indexArray.emplaceBack(
                    triangleIndex + indices[i],
                    triangleIndex + indices[i + 1],
                    triangleIndex + indices[i + 2]);
            }

            triangleSegment.vertexLength += numVertices;
            triangleSegment.primitiveLength += indices.length / 3;



            // let numVertices = 0;
            // for (const ring of polygon) {
            //     numVertices += ring.length;
            // }
            //
            // const triangleSegment = arrays.prepareSegment(numVertices);
            // const triangleIndex = triangleSegment.vertexLength;
            //
            // const flattened = [];
            // const holeIndices = [];
            //
            // for (const ring of polygon) {
            //     if (ring.length === 0) {
            //         continue;
            //     }
            //
            //     if (ring !== polygon[0]) {
            //         holeIndices.push(flattened.length / 2);
            //     }
            //
            //     const lineSegment = arrays.prepareSegment2(ring.length);
            //     const lineIndex = lineSegment.vertexLength;
            //
            //     arrays.layoutVertexArray.emplaceBack(ring[0].x, ring[0].y);
            //     arrays.layoutVertexArray2.emplaceBack(ring[0].x, ring[0].y);
            //     arrays.elementArray2.emplaceBack(lineIndex + ring.length - 1, lineIndex);
            //     flattened.push(ring[0].x);
            //     flattened.push(ring[0].y);
            //
            //     for (let i = 1; i < ring.length; i++) {
            //         arrays.layoutVertexArray.emplaceBack(ring[i].x, ring[i].y);
            //         arrays.layoutVertexArray2.emplaceBack(ring[i].x, ring[i].y);
            //         arrays.elementArray2.emplaceBack(lineIndex + i - 1, lineIndex + i);
            //         flattened.push(ring[i].x);
            //         flattened.push(ring[i].y);
            //     }
            //
            //     lineSegment.vertexLength += ring.length;
            //     lineSegment.primitiveLength += ring.length;
            // }
            //
            // const indices = earcut(flattened, holeIndices);
            //
            // for (let i = 0; i < indices.length; i += 3) {
            //     arrays.elementArray.emplaceBack(
            //         triangleIndex + indices[i],
            //         triangleIndex + indices[i + 1],
            //         triangleIndex + indices[i + 2]);
            // }
            //
            // triangleSegment.vertexLength += numVertices;
            // triangleSegment.primitiveLength += indices.length / 3;


            // console.log('顶点个数：'+ triangleSegment.vertexLength + '   三角形个数: '+triangleSegment.primitiveLength );
        }

        // for (const polygon of classifyRings(geometry, EARCUT_MAX_RINGS)) {
        //     let numVertices = 0;
        //     for (const ring of polygon) {
        //         numVertices += ring.length;
        //     }
        //
        //     const triangleSegment = this.segments.prepareSegment(numVertices, this.layoutVertexArray, this.indexArray);
        //     const triangleIndex = triangleSegment.vertexLength;
        //
        //     const flattened = [];
        //     const holeIndices = [];
        //
        //     for (const ring of polygon) {
        //         if (ring.length === 0) {
        //             continue;
        //         }
        //
        //         if (ring !== polygon[0]) {
        //             holeIndices.push(flattened.length / 2);
        //         }
        //
        //         const lineSegment = this.segments2.prepareSegment(ring.length, this.layoutVertexArray, this.indexArray2);
        //         const lineIndex = lineSegment.vertexLength;
        //
        //         this.layoutVertexArray.emplaceBack(ring[0].x, ring[0].y);
        //         this.indexArray2.emplaceBack(lineIndex + ring.length - 1, lineIndex);
        //         flattened.push(ring[0].x);
        //         flattened.push(ring[0].y);
        //
        //         for (let i = 1; i < ring.length; i++) {
        //             this.layoutVertexArray.emplaceBack(ring[i].x, ring[i].y);
        //             this.indexArray2.emplaceBack(lineIndex + i - 1, lineIndex + i);
        //             flattened.push(ring[i].x);
        //             flattened.push(ring[i].y);
        //         }
        //
        //         lineSegment.vertexLength += ring.length;
        //         lineSegment.primitiveLength += ring.length;
        //     }
        //
        //     const indices = earcut(flattened, holeIndices);
        //
        //     for (let i = 0; i < indices.length; i += 3) {
        //         this.indexArray.emplaceBack(
        //             triangleIndex + indices[i],
        //             triangleIndex + indices[i + 1],
        //             triangleIndex + indices[i + 2]);
        //     }
        //
        //     triangleSegment.vertexLength += numVertices;
        //     triangleSegment.primitiveLength += indices.length / 3;
        // }
    }

    serialize(transferables) {
        return {
            type:this.type,
            style:this.style,
            tileSize: this.tileSize,
            layoutVertexArray: this.layoutVertexArray.serialize(transferables),
            layoutVertexArray2: this.layoutVertexArray2.serialize(transferables),
            indexArray:  this.indexArray.serialize(transferables),
            indexArray2: this.indexArray2.serialize(transferables),
            segments: this.segments,
            segments2: this.segments2
        };
    }

    static createBuffer(bucket){
        bucket.layoutVertexBuffer = new BufferUtil(bucket.layoutVertexArray,
            FillLayoutArrayType.serialize(), BufferUtil.BufferType.VERTEX);
        bucket.layoutVertexBuffer2 = new BufferUtil(bucket.layoutVertexArray2,
            FillLayoutArrayType.serialize(), BufferUtil.BufferType.VERTEX);
        bucket.indexBuffer = new BufferUtil(bucket.indexArray,
            IndexArrayType.serialize(), BufferUtil.BufferType.ELEMENT);
        bucket.indexBuffer2 = new BufferUtil(bucket.indexArray2,
            IndexArrayType2.serialize(), BufferUtil.BufferType.ELEMENT);
    }
}

export default FillBucket;
