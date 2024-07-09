
uniform int u_dataTexture_width;
uniform int u_dataTexture_height;
varying float v_isFlatState;

struct MultiDrawHeight {
  float veterxTag;
  float drawHeight;
};

vec4 getClippingPlane(
    sampler2D packedClippingPlanes,
    int clippingPlaneNumber,
    mat4 transform
) {
    int pixY = clippingPlaneNumber / u_dataTexture_width;
    int pixX = clippingPlaneNumber - (pixY * u_dataTexture_width);
    float pixelWidth = 1.0 / float(u_dataTexture_width);
    float pixelHeight = 1.0 / float(u_dataTexture_height);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));
    return czm_transformPlane(plane, transform);
}
float YapingMultiVS(sampler2D clippingPlanes, mat4 clippingPlanesMatrix,sampler2D multiClippingPlanesLength, vec3 McPos,inout float YapingState) 
    { 
    vec4 position = czm_modelView * vec4(McPos,1.0);
    vec3 clipNormal = vec3(0.0); 
    vec3 clipPosition = vec3(0.0); 
    float clipAmount = 0.0; 
    float pixelWidth = czm_metersPerPixel(position); 
    int count = 0; 
    MultiDrawHeight g_DrawHeight[u_collectionLength];
    for (int i = 0; i < u_collectionLength; ++i) 
    { 
        bool thisOneClipped = true; 
        float thisCollectionClipAmount = 0.;
        vec2 _ST= vec2((float(i) + 0.5)/float(u_collectionLength), 0.5);
        vec4 _collectionTEXT=texture2D(multiClippingPlanesLength,_ST);
        int thisCollectionLength = int(_collectionTEXT.w); 
        g_DrawHeight[i].drawHeight=(i+1.)*10.;
        for (int j = 0; j < u_maxLength; ++j) 
        { 
            thisCollectionLength--; 
            vec4 clippingPlane = getClippingPlane(clippingPlanes, count, clippingPlanesMatrix); 
            clipNormal = clippingPlane.xyz;  
            clipPosition = -clippingPlane.w * clipNormal; 
            float amount= dot(clipNormal, (position.xyz - clipPosition));
            //float amount= dot(clipNormal, (position.xyz - clipPosition))/pixelWidth;
            thisCollectionClipAmount = max(amount, thisCollectionClipAmount-0.5); 
            thisOneClipped = thisOneClipped && (amount <= 0.); 
            g_DrawHeight[i].veterxTag=1.0;
            count++; 
            
            if (thisCollectionLength == 0) break; 
        } 
        if (thisOneClipped)
        {   

            v_isFlatState=1.0;
        }
        if (clipAmount == 0.0)
          clipAmount = thisCollectionClipAmount; 
        else if (thisCollectionClipAmount != 0.0)
          clipAmount = min(clipAmount, thisCollectionClipAmount); 
  
    }
     
    return clipAmount; 
    }


vec4 ModeClippingPlanesYaPingVSStage(in ProcessedAttributes attributes,inout float YapingState)
{
    vec3 McPos=attributes.positionMC;
    vec4 targetPos=vec4(1.0);
    float clipAmount= YapingMultiVS(u_model_clippingPlanes, u_model_clippingPlanesMatrix,u_multiClippingPlanesLength,McPos,YapingState);


    // v_isFlatState=clipAmount;

    if(clipAmount<1.0)
    {
   
        float y_V=-unifromZ+80.;
        float rd=(mod(McPos.y,100.)/100.)*0.01;
        vec3 tempPos=vec3(McPos.x,rd+y_V,McPos.z);
        targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);
       
    }
    else
    {
      
       
            vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);
            targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);
     
     }

//    if(clipAmount<1.0)
//     {
//          vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);
//          targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);
//     }
//     else
//     {



//         float y_V=-unifromZ+12.;
//         float rd=(mod(McPos.y,100.)/100.)*0.01;
//         vec3 tempPos=vec3(McPos.x,rd+y_V,McPos.z);
//         targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);
       
//      }



    // vec3 tempPos=vec3(McPos.x,McPos.y,McPos.z);
    // targetPos=czm_projection * czm_modelView *vec4(tempPos,1.0);


    
    return targetPos;
}

