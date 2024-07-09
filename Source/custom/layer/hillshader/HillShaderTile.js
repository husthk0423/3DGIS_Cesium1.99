class HillShaderTile{
    constructor(name,gl,dem,texture,latrange,level) {
        this.name = name;
        this.gl = gl;
        this.dem = dem;
        this.texture = texture;
        this.latrange = latrange;
        this.level = level;
        this.needsHillshadePrepare = true;

        this.renderTexture = null;
    }


    //销毁
    destroy(){
        if(this.renderTexture){
            this.gl.deleteTexture(this.renderTexture);
        }
    }
}
export default HillShaderTile;