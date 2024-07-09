//This file is automatically rebuilt by the Cesium build process.
export default "uniform int u_dataTexture_width;\n\
uniform int u_dataTexture_height;\n\
\n\
vec4 getClippingPlane(\n\
    highp sampler2D packedClippingPlanes,\n\
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
    // transform to  modelCoordinate\n\
    return czm_transformPlane(plane, transform);\n\
}\n\
\n\
\n\
float clip(vec3 positionMC,inout float deltaY,vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix, sampler2D multiClippingPlanesLength,inout bool UNION_State)\n\
    {\n\
\n\
    vec4 position = czm_windowToEyeCoordinates(fragCoord);\n\
    // vec4 MCPosition=czm_inverseModelView*position;\n\
    vec3 clipNormal = vec3(0.0);\n\
    vec3 clipPosition = vec3(0.0);\n\
    float clipAmount = 0.0;\n\
    float pixelWidth = czm_metersPerPixel(position);\n\
    int count = 0;\n\
    for (int i = 0; i < u_collectionLength; ++i)\n\
    {\n\
        float PlaneMinY=0.0;\n\
        bool thisOneClipped = true;\n\
        float thisCollectionClipAmount = 0.;\n\
        vec2 _ST= vec2((float(i) + 0.5)/float(u_collectionLength), 0.5);\n\
        vec4 _collectionTEXT=texture2D(multiClippingPlanesLength,_ST);\n\
        int thisCollectionLength = int(_collectionTEXT.w);\n\
        for (int j = 0; j < u_maxLength; ++j)\n\
        {\n\
            thisCollectionLength--;\n\
            vec4 clippingPlane = getClippingPlane(clippingPlanes, count, clippingPlanesMatrix);\n\
            // deltaY=(-unifromZ+positionMC.y)-clippingPlane.y;\n\
            deltaY=positionMC.y-clippingPlane.y;\n\
            clipNormal = clippingPlane.xyz;\n\
            clipPosition = -clippingPlane.w  * clipNormal;\n\
            // deltaY=positionMC.y-clipPosition.y;\n\
\n\
            // vec4 modelClippingPosition=czm_inverseModelViewProjection*vec4(-clipPosition,1.0);\n\
            // deltaY=positionMC.y-modelClippingPosition.y;\n\
            float amount = dot(clipNormal, (position.xyz - clipPosition))/ pixelWidth;\n\
            thisCollectionClipAmount = max(amount, thisCollectionClipAmount);\n\
            thisOneClipped = thisOneClipped && (amount <= 0.0);\n\
            PlaneMinY=min(positionMC.y,PlaneMinY);\n\
            // thisOneClipped = thisOneClipped && (amount <=0.);\n\
            count++;\n\
            if (thisCollectionLength == 0) break;\n\
        }\n\
        #ifdef HAS_UNION_MULTI_CLIPPING_REGIONS\n\
        if (thisOneClipped)\n\
        {\n\
            if (clipAmount == 0.0)\n\
             {clipAmount = thisCollectionClipAmount; }\n\
            else if (thisCollectionClipAmount != 0.0)\n\
            { clipAmount = min(clipAmount, thisCollectionClipAmount); }\n\
\n\
            UNION_State=true;\n\
\n\
        }\n\
        #endif\n\
        #ifndef HAS_UNION_MULTI_CLIPPING_REGIONS\n\
        if (thisOneClipped)\n\
        {\n\
            // float DELTA_Y=(-unifromZ+positionMC.y)-PlaneMinY;\n\
            // float DELTA_Y=positionMC.y-PlaneMinY;\n\
            // clipAmount=DELTA_Y*0.5;\n\
            // if(clipAmount>0.1)\n\
              discard;\n\
        }\n\
        if (clipAmount == 0.0)\n\
        {\n\
            clipAmount = thisCollectionClipAmount;\n\
        }\n\
        else if (thisCollectionClipAmount != 0.0)\n\
        {\n\
            clipAmount = min(clipAmount, thisCollectionClipAmount);\n\
        }\n\
        #endif\n\
    }\n\
    return clipAmount;\n\
\n\
\n\
\n\
    }\n\
void modelMultiClippingPlanesStage(vec3 positionMC,inout vec4 color,inout bool UNION_State)\n\
{\n\
    float deltaY;\n\
    float clipDistance = clip(positionMC,deltaY,gl_FragCoord, u_model_clippingPlanes, u_model_clippingPlanesMatrix,u_multiClippingPlanesLength,UNION_State);\n\
   \n\
    vec4 clippingPlanesEdgeColor = vec4(0.5922, 0.902, 0.5647, 1.0);\n\
    clippingPlanesEdgeColor.rgb = clippingPlanesEdgeColor.xyz;\n\
    float clippingPlanesEdgeWidth = u_clippingPlanesEdgeStyle.a;\n\
\n\
    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) {\n\
        color = clippingPlanesEdgeColor;\n\
    }\n\
//    color=vec4(clipDistance);\n\
\n\
\n\
    // if(clipDistance>-5.&&clipDistance<0.)\n\
    // {\n\
    //     if(deltaY>-5.5)\n\
    //        discard;\n\
    // }\n\
}\n\
";
