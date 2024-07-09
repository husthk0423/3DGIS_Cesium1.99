uniform sampler2D colorTexture; //输入的场景渲染照片
varying vec2 v_textureCoordinates;

float snow(vec2 uv,float scale)
{
    float time = czm_frameNumber / 60.0;
    float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;
    uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;
    uv*=scale;vec2 s=floor(uv),f=fract(uv),p;float k=3.,d;
    p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p);k=min(d,k);
    k=smoothstep(0.,k,sin(f.x+f.y)*0.01);
    return k*w;
}

void main(void){
    vec2 resolution = czm_viewport.zw;
    vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
    vec3 finalColor=vec3(0);
    //float c=smoothstep(1.,0.3,clamp(uv.y*.3+.8,0.,.75));
    float c = 0.0;
    c+=snow(uv,30.)*.0;
    c+=snow(uv,20.)*.0;
    c+=snow(uv,15.)*.0;
    c+=snow(uv,10.);
    c+=snow(uv,8.);
    c+=snow(uv,6.);
    c+=snow(uv,5.);
    finalColor=(vec3(c)); //屏幕上雪的颜色
    gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.5);  //将雪和三维场景融合
}



float x = 0.0;
float y = 0.0;
bool inRect(float x1,float x2, float y1, float y2){
    if(x>x1 && x<x2 && y>y1 && y<y2) { return true; } else { return false; }
}

void ledRectChar(int n, float xa,float xb, float ya, float yb){
    float x1 = xa;
    float x2 = xa+xb;
    float y1 = ya;
    float y2 = ya+yb;
    float ox = (x2+x1)/2.0;
    float oy = (y2+y1)/2.0;
    float dx = (x2-x1)/10.0;
    float dy = (y2-y1)/10.0;
    float b = (x2-x1)/20.0;
    int num = n;

    // 设定调试区显示范围
    if(x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        // 设置调试区背景色
        gl_FragColor = vec4(0.2,1.0,0.2,1.0);
        // 分别绘制出 LED 形式的数字 1~0 , 用黑色绘制1个或2个矩形,由矩形以外的绿色区域组成字型
        if((num==1 && (inRect(x1,ox-dx,y1,y2) || inRect(ox+dx,x2,y1,y2))) ||
        (num==2 && (inRect(x1,x2-dx,oy+dy/2.0,y2-dy) || inRect(x1+dx,x2,y1+dy,oy-dy/2.0))) ||
        (num==3 && (inRect(x1,x2-dx,oy+dy/2.0,y2-dy) || inRect(x1,x2-dx,y1+dy,oy-dy/2.0))) ||
        (num==4 && (inRect(x1+dx,x2-dx,oy+dy/2.0,y2) || inRect(x1,x2-dx,y1,oy-dy/2.0))) ||
        (num==5 && (inRect(x1+dx,x2,oy+dy/2.0,y2-dy) || inRect(x1,x2-dx,y1+dy,oy-dy/2.0))) ||
        (num==6 && (inRect(x1+dx,x2,oy+dy/2.0,y2-dy) || inRect(x1+dx,x2-dx,y1+dy,oy-dy))) ||
        (num==7 && inRect(x1,x2-dx,y1,y2-dy)) ||
        (num==8 && (inRect(x1+dx,x2-dx,oy+dy/2.0,y2-dy) || inRect(x1+dx,x2-dx,y1+dy,oy-dy/2.0))) ||
        (num==9 && (inRect(x1+dx,x2-dx,oy+dy/2.0,y2-dy) || inRect(x1,x2-dx,y1+dy,oy-dy/2.0))) ||
        (num==0 && inRect(x1+dx,x2-dx,y1+dy,y2-dy)) ||
        // 传入10则绘制小数点, 传入11则绘制负号, 传入12则清空
        (num==10 && (inRect(x1,x2,oy-dy,y2) || inRect(x1,ox-dx*2.0,y1,oy-dy) || inRect(ox+dx*2.0,x2,y1,oy-dy) )) ||
        (num==11 && (inRect(x1,x2,oy+dy,y2) || inRect(x1,x2,y1,oy-dy))) ||
        (num==12)
        )
        {
            gl_FragColor = vec4(0,0,0,.5);
        }
    }
}

void showFloat(float f){
    int myNum[20];
    int k = 0;
    int iPart = int(floor(abs(f)));
    int fPart = int(fract(abs(f))*100000.0);
    float m=0.86;

    // 初始化数组,全部置为代表黑色的12
    for(int i=0; i<20; i++){
        myNum[i] = 12;
    }

    // 插入小数部分
    while (fPart>0)
    {
        // 从个位开始, 依次取出个位,十位,百位,千位...的数字值
        myNum[k++]=fPart-((fPart/10)*10);
        fPart=fPart/10;
    }

    // 如果是0
    if(f==0.0){myNum[k++] = 0;}

    // 插入小数点
    myNum[k++] = 10;

    // 插入整数部分
    while (iPart>0)
    {
        myNum[k++]=iPart-((iPart/10)*10);
        iPart=iPart/10;
    }

    // 如果是负数,则插入代表负号的11
    if(f<0.0) { myNum[k++]=11;}

    // 循环输出数字数组
    for(int i=0; i<20; i++)
    {
        m = m-0.03;
        ledRectChar(myNum[i], m, 0.02, 0.6, 0.15);
    }
}

