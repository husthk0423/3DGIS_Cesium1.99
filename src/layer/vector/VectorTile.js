class VectorTile{
    constructor(name,level,tileData,buckets,texture) {
        this.name = name;
        this.level = level;
        this.tileData = tileData;
        this.buckets = buckets;
        this.texture = texture;
    }


    //销毁
    destroy(){
        for(let i = 0;i<this.buckets.length;i++){
            let bucket = this.buckets[i];
            bucket.layoutVertexBuffer.destroy();
            if(bucket.layoutVertexBuffer2)
                bucket.layoutVertexBuffer2.destroy();

            bucket.indexBuffer.destroy();

            if (bucket.indexBuffer2) {
                bucket.indexBuffer2.destroy();
            }
            for (let i = 0;i<bucket.segments.segments.length;i++) {
                const segment = bucket.segments.segments[i];
                if(segment.vao){
                    segment.vao.destroy();
                    segment.vao = null;
                }
            }

            if (bucket.segments2) {
                for (let i = 0; i < bucket.segments2.segments.length; i++) {
                    const segment = bucket.segments2.segments[i];
                    if (segment.vao) {
                        segment.vao.destroy();
                        segment.vao = null;
                    }
                }
            }
        }
    }
}
module.exports = VectorTile;