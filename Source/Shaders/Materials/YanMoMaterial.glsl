uniform vec4 floodVar;//（基础淹没高度，当前淹没高度，最大淹没高度,默认高度差(最大淹没高度 - 基础淹没高度)）
czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.alpha = (materialInput.height < floodVar.y) ? 0.3 : 0.0;
    float rr = (materialInput.height < floodVar.y)?(materialInput.height-floodVar.x)/floodVar.w/2.0:0.0;
    material.diffuse = vec3(1.0-rr,rr,0.0);
    return material;
}