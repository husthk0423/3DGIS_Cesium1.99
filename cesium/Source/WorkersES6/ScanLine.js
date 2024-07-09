'use strict';

let lines=new Array();//把所有的边打个标号放入
let lines_count=0;

let next=new Array();//Lines[next[i]]:即为下一条边
let head=-1;//活动边表的头

//定义一个新边表（NET）
let slNet=[];

let ymax = 0;
let ymin = 0;
let tileSize = 256;
let sData;


function scanLine(bitmapData,feature,size,maxY,minY)
{
    sData = bitmapData;
    ymax = maxY;
    ymin = minY;
    tileSize = size;

    lines=new Array();//把所有的边打个标号放入
    lines_count=0;

    next=new Array();//Lines[next[i]]:即为下一条边
    head=-1;//活动边表的头

    //定义一个新边表（NET）
    slNet=new Array(ymax-ymin+1);
    for(let i=0;i<slNet.length;i++){
        slNet[i]=[];//生成二维数组
    }

    //初始化新边表
   initNET(feature);
    //进行扫描线填充
    return ProcessScanLineFill();
}

function initNET(feature)
{
    for(let j = 0;j<feature.geometrys.length;j++) {
        let geometry = feature.geometrys[j];
        let points_count = geometry.length*0.5;
        for(let k = 0;k<points_count;k++) {
            let m = 2*k;
            let L_start={x:Math.round(geometry[m]),y:Math.round(geometry[m+1])};//边的第一个顶点
            let index1 = 2*((k+1) % points_count);
            let L_end={x:Math.round(geometry[index1]),y:Math.round(geometry[index1+1])};//边的第二个顶点
            let index2 = 2*((k - 1 + points_count) % points_count);
            let L_start_pre={x:Math.round(geometry[index2]),y:Math.round(geometry[index2+1])};//第一个顶点前面的点
            let index3 = 2*((k +2 ) % points_count);
            let L_end_next={x:Math.round(geometry[index3]),y:Math.round(geometry[index3+1])};//第二个顶点后面的点
            if(L_end.y!=L_start.y){//跳过水平线
                let e=new tagEdge();
                e.totalHeight = feature.totalHeight;
                e.id=lines_count++;
                e.isIn=false;
                e.dx=(L_end.x-L_start.x)/(L_end.y-L_start.y);//1/k
                if(L_end.y>L_start.y){
                    e.xi=L_start.x;
                    if(L_end_next.y>=L_end.y){
                        e.ymax=L_end.y-1;
                    }else e.ymax=L_end.y;

                    slNet[L_start.y-ymin].push(e);
                }else{
                    e.xi=L_end.x;
                    if(L_start_pre.y>=L_start.y){
                        e.ymax=L_start.y-1;
                    }else e.ymax=L_start.y;

                    slNet[L_end.y-ymin].push(e);
                }
                lines.push(e);
            }
        }
    }
    return lines;
}

function ProcessScanLineFill(){
    //初始化活动边表的信息
    head=-1;
    for(let i=0;i<lines.length;i++){
        next[i]=-1;
    }

    for(let y=ymin;y<=ymax;y++){
        insert(y-ymin);//插入新边
        for(let j=head;j!=-1;j=next[next[j]]){//绘制该扫描线
            if(typeof j == "undefined"){
                break;
            }
            if(next[j]!=-1){
                for(let x = lines[j].xi;x <= lines[next[j]].xi;x++){
                    if(x <0 || x > tileSize -1 || y<0 || y>tileSize -1){
                        continue;
                    }

                    x = x==tileSize?tileSize-1:x;
                    y = y==tileSize?tileSize-1:y;
                    let index = y  * tileSize + x ;
                    sData[index] = lines[j].totalHeight;
                }
            }
        }
        remove(y);//删除非活动边
        update_AET();//更新活动边表中每项的xi值，并根据xi重新排序
    }

    return sData;
}

//删除非活动边
function remove(y){
    var pre=head;
    while(head!=-1&&lines[head].ymax==y){
        lines[head].isIn=false;
        head=next[head];
        next[pre]=-1;
        pre=head;
    }
    if(head==-1) return;
    var nxt=next[head];
    for(var i=nxt;i!=-1;i=nxt){
        nxt=next[i];
        if(lines[i].ymax==y){
            next[pre]=next[i];
            lines[i].isIn=false;
            next[i]=-1;
        }else pre=i;
    }
}

//更新活动边表中每项的xi值，并根据xi重新排序
function update_AET(){
    for(var i=head;i!=-1;i=next[i]){
        lines[i].xi+=Math.round(lines[i].dx);
    }
    //按照冒泡排序的思想O(n)重新排序
    if(head==-1) return;
    if(next[head]==-1) return;
    var pre=head;
    if(lines[head].xi>lines[next[head]].xi){
        head=next[head];
        next[pre]=next[head];
        next[head]=pre;
        pre=head;
    }
    var j=next[head];
    for(var i=j;i!=-1;i=j){
        j=next[i];
        if(j==-1) break;
        if(lines[i].xi>lines[next[i]].xi){
            next[pre]=next[i];
            next[i]=next[next[i]];
            next[j]=i;
        }else pre=i;
    }
}

//将扫描线对应的所有新边插入到AET中
function insert(y){
    for(var i=0;i<slNet[y].length;i++){
        var temp=slNet[y][i];

        if(temp.ymax==0&&temp.dx==0) break;

        if(head==-1){
            head=temp.id;
        }else{
            if(temp.xi<lines[head].xi){
                next[temp.id]=head;
                head=temp.id;
            }else{
                var pre=head;
                for(var j=next[head];;j=next[j]){
                    if(j==-1||temp.xi<lines[j].xi){
                        next[pre]=temp.id;
                        next[temp.id]=j;
                        break;
                    }
                    pre=j;
                }
            }
        }
        temp.isIn=true;
    }
}


function tagEdge(){
    this.xi=0;
    this.dx=0;//  1/k
    this.ymax=0;
    this.id=0;
    this.isIn=false;
}


export default scanLine;