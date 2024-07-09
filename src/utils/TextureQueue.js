'use strict';

class TextureQueue {
    constructor(gl,size)
    {
        this.gl = gl;
        this.queue = [];
        this.map = {};
        this.intZoomMap = {};
        this.intZoomCountMap = {};
        this.size = 2000;
        if(size || size == 0){
            this.size = size;
        }
    }

    add(key,zoom,styleZoom,item){
        let id = zoom+'_'+styleZoom+'_'+key;
        if(!this.map[id]){
            if(this.queue.length == this.size){
                let obj = this.queue.shift();
                delete this.map[obj.id];
                this.gl.deleteTexture(obj.value);

                this.intZoomCountMap[obj.key] = this.intZoomCountMap[obj.key] -1;
                if(!this.intZoomCountMap[obj.key]){
                    delete this.intZoomMap[obj.key];
                }
            }
            this.queue.push({id:id,key:key,value:item});
            this.map[id] = item;

            this.intZoomMap[key] = item;

            let count = this.intZoomCountMap[key];
            if(!count){
                this.intZoomCountMap[key] = 1;
            }else{
                this.intZoomCountMap[key] = count +1;
            }
        }
    }

    getOne(key,zoom,styleZoom)
    {
        let id = zoom+'_'+styleZoom+'_'+key;
        if(this.map[id]){
            return this.map[id];
        }
        return null;
    }

    get(key,zoom,styleZoom)
    {
        let id = zoom+'_'+styleZoom+'_'+key;
        if(this.map[id]){
            return this.map[id];
        }else{
           return this.intZoomMap[key];
        }
    }


    remove(key){
        let removeObjs = [];
        for(let i =0;i<this.queue.length;i++){
            let  item = this.queue[i];
            if(key == item.key){
                this.queue.splice(i,1);
                removeObjs.push(item);
            }
        }

        for(let j = 0;j< removeObjs.length;j++){
            let obj = removeObjs[j];
            delete this.map[obj.id];
            this.gl.deleteTexture(obj.value);
        }

        this.intZoomCountMap[key] = 0;
        delete this.intZoomMap[key];
    }

    //更改size大小时，会清空队列
    setSize(size)
    {
        this.size = size;
        this.empty();
    }

    //清空队列
    empty(){
        for(let i = 0;i<this.queue.length;i++){
            let obj = this.queue[i];
            this.gl.deleteTexture(obj.value);
        }

        for(let key in this.intZoomMap){
            let item = this.intZoomMap[key];
            this.gl.deleteTexture(item);
        }

        this.queue = [];
        this.map = {};
        this.intZoomMap ={};
        this.intZoomCountMap = {};
    }
}

module.exports = TextureQueue;