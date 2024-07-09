import GeometryInstanceAttribute from '../Core/GeometryInstanceAttribute.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
const DISPLAY_VALUE = new Float32Array([1]);
const HIDDEN_VALUE = new Float32Array([0]);
class UndisplayablePluginCell{
    constructor(primitive){
        this.primitive = primitive;
        this._extraAttributeMap = {};
        this._extraAttributeMap['display'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : DISPLAY_VALUE
        });
    }
    getExtraAttributeMap(){
        return this._extraAttributeMap;
    }
    addFSPart(fs){
        // var fs = ShaderSource.replaceMain(fs, 'czm_non_pick_main');
        //let mark =  "void main()\n{";
        //let length = fs.indexOf(mark) + mark.length + 1;

        let displayPart = "void main() \n" +
            "{\n" +
            "    if(v_czm_batchTable_display == 0.0)\n" +
            "    {\n" +
            "         discard;\n" +
            "    }\n";
        fs = fs.replace(/void\s+main\s*\(\s*(?:void)?\s*\)\s+\{/g, displayPart);

        return fs;
    }

    addVSPart(vs){
        return vs;
    }
    static display(geometry,display){
        if(display){
            geometry.display = DISPLAY_VALUE;
        }else{
            geometry.display = HIDDEN_VALUE;
        }
    }
    static isDisplay(geometry){

        if(geometry.display.equals(HIDDEN_VALUE)){
            return false;
        }else{
            return true;
        }
    }
}
export default UndisplayablePluginCell;
