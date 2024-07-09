//This file is automatically rebuilt by the Cesium build process.
export default "\n\
uniform int u_dataTexture_width;\n\
uniform int u_dataTexture_height;\n\
varying float v_isFlatState;\n\
\n\
struct MultiDrawHeight {\n\
  float veterxTag;\n\
  float drawHeight;\n\
};\n\
\n\
float getHeight(int planIndex)\n\
{\n\
\n\
   return 0.;\n\
}\n\
float getVertexTag(int planIndex)\n\
{\n\
     float VertexTag=float(planIndex);\n\
     return VertexTag;\n\
\n\
}\n\
float get_Y_Value(float VertexTag)\n\
{\n\
   int columnIndex=int(VertexTag);\n\
   float Y_value=u_multiYaping[columnIndex].y;\n\
\n\
   return Y_value;\n\
\n\
}\n\
\n\
vec4 getClippingPlane(\n\
    sampler2D packedClippingPlanes,\n\
    int clippingPlaneNumber,\n\
    mat4 transform\n\
) {\n\
    int pixY = clippingPlaneNumber / u_dataTexture_width;\n\
    int pixX = clippingPlaneNumber - (pixY * u_dataTexture_width);\n\
    float pixelWidth = 1.0 / float(u_dataTexture_width);\n\
    float pixelHeight = 1.0 / float(u_dataTexture_height);\n\
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel\n\
    float v = (float(pixY) + 0.5) * pixelHeight;\n\
    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));\n\
    return czm_transformPlane(plane, transform);\n\
}\n\
float YapingMultiVS(sampler2D clippingPlanes, mat4 clippingPlanesMatrix,sampler2D multiClippingPlanesLength, vec3 McPos,inout float YapingState,inout MultiDrawHeight MultiHeight) \n\
    { \n\
    vec4 position = czm_modelView * vec4(McPos,1.0);\n\
    vec3 clipNormal = vec3(0.0); \n\
    vec3 clipPosition = vec3(0.0); \n\
    float clipAmount = 0.0; \n\
    float pixelWidth = czm_metersPerPixel(position); \n\
    int count = 0; \n\
    v_isFlatState=0.5;\n\
    for (int i = 0; i < u_collectionLength; ++i) \n\
    { \n\
        bool thisOneClipped = true; \n\
        float thisCollectionClipAmount = 0.;\n\
        vec2 _ST= vec2((float(i) + 0.5)/float(u_collectionLength), 0.5);\n\
        vec4 _collectionTEXT=texture2D(multiClippingPlanesLength,_ST);\n\
        int thisCollectionLength = int(_collectionTEXT.w); \n\
        for (int j = 0; j < u_maxLength; ++j) \n\
        { \n\
            thisCollectionLength--; \n\
            vec4 clippingPlane = getClippingPlane(clippingPlanes, count, clippingPlanesMatrix); \n\
            clipNormal = clippingPlane.xyz;  \n\
            clipPosition = -clippingPlane.w * clipNormal; \n\
            float amount= dot(clipNormal, (position.xyz - clipPosition));\n\
            //float amount= dot(clipNormal, (position.xyz - clipPosition))/pixelWidth;\n\
            thisCollectionClipAmount = max(amount, thisCollectionClipAmount-0.5); \n\
            thisOneClipped = thisOneClipped && (amount <= 2.5); \n\
\n\
\n\
            count++; \n\
            \n\
            if (thisCollectionLength == 0) break; \n\
        } \n\
        if (thisOneClipped)\n\
        {   \n\
            // float tempI=i;\n\
            // v_isFlatState=float(i);\n\
            MultiHeight.veterxTag=getVertexTag(i);\n\
        }\n\
        if (clipAmount == 0.0)\n\
          clipAmount = thisCollectionClipAmount; \n\
        else if (thisCollectionClipAmount != 0.0)\n\
          clipAmount = min(clipAmount, thisCollectionClipAmount); \n\
  \n\
    }\n\
     \n\
    return clipAmount; \n\
    }\n\
\n\
\n\
vec4 ModeClippingPlanesYaPingVSStage(in ProcessedAttributes attributes,inout float YapingState)\n\
{\n\
    vec3 McPos=attributes.positionMC;\n\
    vec4 targetPos=vec4(1.0);\n\
    MultiDrawHeight  DrawHeight;\n\
    float clipAmount= YapingMultiVS(u_model_clippingPlanes, u_model_clippingPlanesMatrix,u_multiClippingPlanesLength,McPos,YapingState,DrawHeight);\n\
    \n\
    // v_isFlatState=u_multiYaping[1].y;\n\
    \n\
    //  vec2 positionAarry[2];  \n\
    //  positionAarry[0]=vec2(0.,0.5);\n\
    //  positionAarry[1]=vec2(1.,1.0);\n\
    //  v_isFlatState=positionAarry[1].y;\n\
\n\
\n\
   \n\
\n\
\n\
    if(clipAmount<1.0)\n\
    {\n\
        float y_height=get_Y_Value(DrawHeight.veterxTag);\n\
\n\
        float y_V=-unifromZ+y_height;\n\
        float rd=(mod(McPos.y,100.)/100.)*0.01;\n\
        vec3 tempPos=vec3(McPos.x,rd+y_V,McPos.z);\n\
        targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);\n\
       \n\
    }\n\
    else\n\
    {\n\
       \n\
        vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);\n\
        targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);\n\
     \n\
     }\n\
\n\
//    if(clipAmount<1.0)\n\
//     {\n\
//          vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);\n\
//          targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);\n\
//     }\n\
//     else\n\
//     {\n\
\n\
\n\
\n\
//         float y_V=-unifromZ+12.;\n\
//         float rd=(mod(McPos.y,100.)/100.)*0.01;\n\
//         vec3 tempPos=vec3(McPos.x,rd+y_V,McPos.z);\n\
//         targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);\n\
       \n\
//      }\n\
\n\
\n\
\n\
    // vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);\n\
    // targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);\n\
\n\
\n\
    \n\
    return targetPos;\n\
}\n\
\n\
";
