/**
 * Created by EDZ on 2020/6/11.
 */
import GeometryInstanceAttribute from '../Core/GeometryInstanceAttribute.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
import ColorGeometryInstanceAttribute from '../Core/ColorGeometryInstanceAttribute.js';
const FOCUS_VALUE = new Float32Array([2]);
const UNFOCUS_VALUE = new Float32Array([0]);
const DEFAULT_RATE_VALUE = new Float32Array([120.0]);
const DEFAULT_FOCUSCOLOR_VALUE = ColorGeometryInstanceAttribute.fromColor(255.0,255.0,255.0,255.0);
const BREATHE_VALUE = new Float32Array([1]);
const UNBREATHE_VALUE = new Float32Array([0]);
const DEFAULT_ANCHOR_FRAME_NUMBER_VALUE = new Float32Array([1]);


class FocusPluginCell{
    constructor(primitive){
        this.primitive = primitive;
        this._extraAttributeMap = {};
        this._extraAttributeMap = {};
        this._extraAttributeMap['focus'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : UNFOCUS_VALUE
        });
        this._extraAttributeMap['focusColor'] = ColorGeometryInstanceAttribute.fromColor(255.0,255.0,255.0,255.0);
        this._extraAttributeMap['rate'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : DEFAULT_RATE_VALUE
        });
        this._extraAttributeMap['anchorFrameNumberFocus'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : DEFAULT_ANCHOR_FRAME_NUMBER_VALUE
        });
        this._extraAttributeMap['anchorFrameNumberUnfocus'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : DEFAULT_ANCHOR_FRAME_NUMBER_VALUE
        });

        this._extraAttributeMap['breathe'] = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT ,
            componentsPerAttribute : 1,
            normalize : true,
            value : UNBREATHE_VALUE
        });

    }
    getExtraAttributeMap(){
        return this._extraAttributeMap;
    }
    addFSPart(fs){
        let focusFunction = []
        focusFunction.push("vec4 focusFunction(vec4 color){");
        focusFunction.push("    vec4 fcolor;");
        focusFunction.push("    if(v_czm_batchTable_focus > 1.0){");
        focusFunction.push("        fcolor = color + (0.5 + smoothstep(v_czm_batchTable_anchorFrameNumberFocus,v_czm_batchTable_anchorFrameNumberFocus + v_czm_batchTable_rate,czm_frameNumber) * 0.5) * (v_czm_batchTable_focusColor - color);");
        focusFunction.push("    }else{");
        focusFunction.push("        fcolor = color + (smoothstep(v_czm_batchTable_anchorFrameNumberFocus,v_czm_batchTable_anchorFrameNumberFocus + v_czm_batchTable_rate,czm_frameNumber) - smoothstep(v_czm_batchTable_anchorFrameNumberUnfocus,v_czm_batchTable_anchorFrameNumberUnfocus + v_czm_batchTable_rate/2.0,czm_frameNumber))* (v_czm_batchTable_focusColor - color);  ");
        focusFunction.push("    }");
        focusFunction.push("    return fcolor;");
        focusFunction.push("}");
        focusFunction.push("void main() {");
        focusFunction = focusFunction.join('\n');
        fs = fs.replace(/void\s+main\s*\(\s*(?:void)?\s*\)\s+\{/g, focusFunction);


      //  fs = fs.replace(/vec4\s+color\s+=\s+czm_gammaCorrect\s*\(\s*(?:v_color)?\s*\)\s+\;/g, focusFunction);
        let index_czm_gammaCorrect = fs.indexOf("czm_gammaCorrect");
        let pIndex = FocusPluginCell.findLineFeed(index_czm_gammaCorrect,fs);
        index_czm_gammaCorrect = index_czm_gammaCorrect + pIndex;
        fs = fs.substr(0,index_czm_gammaCorrect) + "  color = focusFunction(color);\n" + fs.substr(index_czm_gammaCorrect + 1);
        return fs;
    }

    static findLineFeed(index_czm_gammaCorrect,fs){
        let tmp = fs.substr(index_czm_gammaCorrect,fs.length);
        let length = 0;
        while(true){
            if(tmp.charAt(length) == '\n'){
                return length;
            }
            length++;
            if(length > 10000){
                break;
            }
        }

    }

    addVSPart(vs){
        return vs;
    }
    static focus(geometry,scene,focusColor,rate,breathe){
        geometry.display = new Float32Array([1])
        geometry.focusColor = focusColor.value;
        geometry.rate = rate;
      //  geometry.breathe = breathe;
        geometry.focus = FOCUS_VALUE;
        console.log(scene._frameState.frameNumber);
        geometry.anchorFrameNumberFocus = new Float32Array([scene._frameState.frameNumber]);
    }
    static unfocus(geometry,scene){
        geometry.focus = UNFOCUS_VALUE;
        console.log(scene._frameState.frameNumber);
        geometry.anchorFrameNumberUnfocus = new Float32Array([scene._frameState.frameNumber]);
    }
}
export default FocusPluginCell;

