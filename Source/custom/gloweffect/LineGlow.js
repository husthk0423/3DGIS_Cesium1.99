/**
 * Created by user on 2020/3/16.
 */

class LineGlow{
    static createLines(geometryInstances,materialOption,PrimitiveType,asynchronous,modelMatrix,classificationType){
        let img = new Image();
        img.src = 'data:image/png;base64,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';

        materialOption.glowImage = img;
        let m = createDynamicLineAppearance(materialOption);

        return new Cesium[PrimitiveType]({
            geometryInstances:geometryInstances,
            appearance:m,
            asynchronous: asynchronous,
            modelMatrix:modelMatrix,
            classificationType:classificationType||0
        });
    }
}

let LineShader = {};
function createDynamicLineAppearance(options){
    return new Cesium.PolylineMaterialAppearance({
        material:new Cesium.Material({
            translucent:options.translucent||false,
            fabric:{
                uniforms:{
                    //baseColor:options.color||baseColor,
                    odColor:options.odColor||Cesium.Color.YELLOW,
                    rate:options.rate||0.05,
                    t_rate:options.t_rate||120.,
                    glint:options.glint||false,
                    glowImage:options.glowImage,
                },
                source:LineShader[options.type](),
            }
        }),
    });
}


LineShader.TwinkleLineShader =function(){
    return 'czm_material czm_getMaterial(czm_materialInput m){\n'+
        '   czm_material dm = czm_getDefaultMaterial(m);\n'+
        '   vec2 st = m.st;\n'+
        '   vec4 color = odColor;\n' +
        '   float f = fract(czm_frameNumber / t_rate);\n' +
        '   color.a = (0.5 - abs(0.5 - st.t)) / 0.5;\n' +
        '   if(glint){\n' +
        '     color.rgb += color.rgb * sin( f * 3.1415926 * 2.) * rate;\n' +
        '   }\n' +
        '   dm.diffuse = color.rgb;\n'+
        '   dm.alpha = color.a ;\n'+
        '   return dm;\n'+
        "}";
};

LineShader.RunLineShader = function(){
    return  'czm_material czm_getMaterial(czm_materialInput m){\n'+
        '   float length = v_czm_batchTable_length;\n'+
        '   czm_material dm = czm_getDefaultMaterial(m);\n'+
        '   vec2 repeat= vec2(length * 0.001, 1.0);\n'+
        '   vec2 st = repeat* m.st;\n'+
        '   vec4 color = vec4(odColor.rgb,0.);\n' +
        '   float time = fract(czm_frameNumber / t_rate) ;\n' +
        '   vec4 tColor = texture2D(glowImage, vec2(fract(st.s -time),st.t));\n'+
        '   dm.diffuse = tColor.a == 0.0 ?color.rgb : tColor.rgb * color.rgb;\n'+
        '   dm.alpha = tColor.a == 0.0 ? odColor.a : tColor.a;\n'+
        '   return dm;\n'+
        "}";
};

LineShader.RunLineShader2 = function(){
    return  'czm_material czm_getMaterial(czm_materialInput m){\n'+
        '   float length = v_czm_batchTable_length;\n'+
        '   czm_material dm = czm_getDefaultMaterial(m);\n'+
        '   vec2 repeat= vec2(1.0, 1.0);\n'+
        '   vec2 st = repeat* m.st;\n'+
        '   vec4 color = vec4(odColor.rgb,0.);\n' +
        '   float time = fract(czm_frameNumber / t_rate) ;\n' +
        '   vec4 tColor = texture2D(glowImage, vec2(fract(st.s -time),st.t));\n'+
        '   dm.diffuse = tColor.a == 0.0 ?color.rgb : tColor.rgb * color.rgb;\n'+
        '   dm.alpha = tColor.a == 0.0 ? odColor.a : tColor.a;\n'+
        '   return dm;\n'+
        "}";
};

LineShader.RunLineShader1 =function(){
    return 'czm_material czm_getMaterial(czm_materialInput m){\n'+
        '   czm_material dm = czm_getDefaultMaterial(m);\n'+
        '   vec2 st = m.st;\n'+
        '   vec4 color = vec4(odColor.rgb,0.);\n' +
        '   float time = fract(czm_frameNumber / t_rate) + rate;\n'+
        '   float time1 = time + rate;\n'+
        '   if(st.s > time && st.s < time1){\n'+
        '     float ff = st.s - time;'+
        '     color.a =  ff / rate ;\n'+
        '     color.a *= ( .5 - abs(0.5 - st.t))/0.5;\n'+
        '   }\n'+
        '   if(time1 > 1.&& st.s < (time1 - 1.)){\n' +
        '     color.a =  (st.s + 1. - time) / rate ;\n'+
        '     color.a *= ( .5 - abs(0.5 - st.t))/0.5;\n'+
        '   }\n'+
        '   dm.diffuse = color.rgb;\n'+
        '   dm.alpha = color.a ;\n'+
        '   return dm;\n'+
        "}";
};
export default LineGlow;










