uniform int u_dataTexture_width;
uniform int u_dataTexture_height;

vec4 getClippingPlane(
    highp sampler2D packedClippingPlanes,
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
    // transform to  modelCoordinate
    return czm_transformPlane(plane, transform);
}


float clip(vec3 positionMC,inout float deltaY,vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix, sampler2D multiClippingPlanesLength,inout bool UNION_State)
    {

    vec4 position = czm_windowToEyeCoordinates(fragCoord);
    // vec4 MCPosition=czm_inverseModelView*position;
    vec3 clipNormal = vec3(0.0);
    vec3 clipPosition = vec3(0.0);
    float clipAmount = 0.0;
    float pixelWidth = czm_metersPerPixel(position);
    int count = 0;
    for (int i = 0; i < u_collectionLength; ++i)
    {
        float PlaneMinY=0.0;
        bool thisOneClipped = true;
        float thisCollectionClipAmount = 0.;
        vec2 _ST= vec2((float(i) + 0.5)/float(u_collectionLength), 0.5);
        vec4 _collectionTEXT=texture2D(multiClippingPlanesLength,_ST);
        int thisCollectionLength = int(_collectionTEXT.w);
        for (int j = 0; j < u_maxLength; ++j)
        {
            thisCollectionLength--;
            vec4 clippingPlane = getClippingPlane(clippingPlanes, count, clippingPlanesMatrix);
            // deltaY=(-unifromZ+positionMC.y)-clippingPlane.y;
            deltaY=positionMC.y-clippingPlane.y;
            clipNormal = clippingPlane.xyz;
            clipPosition = -clippingPlane.w  * clipNormal;
            // deltaY=positionMC.y-clipPosition.y;

            // vec4 modelClippingPosition=czm_inverseModelViewProjection*vec4(-clipPosition,1.0);
            // deltaY=positionMC.y-modelClippingPosition.y;
            float amount = dot(clipNormal, (position.xyz - clipPosition))/ pixelWidth;
            thisCollectionClipAmount = max(amount, thisCollectionClipAmount);
            thisOneClipped = thisOneClipped && (amount <= 0.0);
            PlaneMinY=min(positionMC.y,PlaneMinY);
            // thisOneClipped = thisOneClipped && (amount <=0.);
            count++;
            if (thisCollectionLength == 0) break;
        }
        #ifdef HAS_UNION_MULTI_CLIPPING_REGIONS
        if (thisOneClipped)
        {
            if (clipAmount == 0.0)
             {clipAmount = thisCollectionClipAmount; }
            else if (thisCollectionClipAmount != 0.0)
            { clipAmount = min(clipAmount, thisCollectionClipAmount); }

            UNION_State=true;

        }
        #endif
        #ifndef HAS_UNION_MULTI_CLIPPING_REGIONS
        if (thisOneClipped)
        {
            // float DELTA_Y=(-unifromZ+positionMC.y)-PlaneMinY;
            // float DELTA_Y=positionMC.y-PlaneMinY;
            // clipAmount=DELTA_Y*0.5;
            // if(clipAmount>0.1)
              discard;
        }
        if (clipAmount == 0.0)
        {
            clipAmount = thisCollectionClipAmount;
        }
        else if (thisCollectionClipAmount != 0.0)
        {
            clipAmount = min(clipAmount, thisCollectionClipAmount);
        }
        #endif
    }
    return clipAmount;



    }
void modelMultiClippingPlanesStage(vec3 positionMC,inout vec4 color,inout bool UNION_State)
{
    float deltaY;
    float clipDistance = clip(positionMC,deltaY,gl_FragCoord, u_model_clippingPlanes, u_model_clippingPlanesMatrix,u_multiClippingPlanesLength,UNION_State);
   
    vec4 clippingPlanesEdgeColor = vec4(0.5922, 0.902, 0.5647, 1.0);
    clippingPlanesEdgeColor.rgb = clippingPlanesEdgeColor.xyz;
    float clippingPlanesEdgeWidth = u_clippingPlanesEdgeStyle.a;

    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) {
        color = clippingPlanesEdgeColor;
    }
//    color=vec4(clipDistance);


    // if(clipDistance>-5.&&clipDistance<0.)
    // {
    //     if(deltaY>-5.5)
    //        discard;
    // }
}
