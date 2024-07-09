/**
 * Created by user on 2020/3/16.
 * 走马灯效果geomerty
 */
import Color from '../Core/Color.js';
import GeometryInstance from '../Core/GeometryInstance.js';
import Geometry from '../Core/Geometry.js';
import GeometryAttribute from '../Core/GeometryAttribute.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
import Cartographic from '../Core/Cartographic.js';
import PrimitiveType from '../Core/PrimitiveType.js';
import BoundingSphere from '../Core/BoundingSphere.js';


class GetRidingLanternGeometry{
    constructor(options){
        this.positions  = null;
        this.normals  =null;
        this.sts  =null;
        this.indices  =null;
        this.geometrys = options.positions;
        this.color = options.color;
        this.u_tcolor = options.u_tcolor||Color.YELLOW;//设置不透明的时候，alpha小于的颜色值
        this.height = options.height||500.;
        this.speed = options.speed||600;
        this.direction = options.direction||-1;
        this.translucent = options.translucent||false;//添加透明参数,true为透明

        this.type = options.type||1;
    }

    createGeometryInstances(){
        let geometryInstances = [];
        for(let i = 0;i<this.geometrys.length;i++){
            let item = this.geometrys[i];
            let op = this.computePositions_dws(item,this.height);
            this.positions  = op.pos;
            this.normals  =op.normals;
            this.sts  =op.sts;
            this.indices  =op.indices;

            let geometry  = this.createGeometry(this.positions,this.normals,this.sts,this.indices);
            let gi = new GeometryInstance({
                id:Math.random(),
                geometry : geometry
            });
            geometryInstances.push(gi);
        }
        return geometryInstances;
    }

    createGeometry(pos,n,st,indice){
        let positions = new Float64Array(pos);
        let normals = new Float32Array(n);
        let sts = new Float32Array(st);
        let indices = new Uint16Array(indice);

        return new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    // 使用double类型的position进行计算
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute: 3,
                    values: positions
                }),
                normal: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: normals
                }),
                st: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: sts
                })
            },
            indices: indices,
            primitiveType: PrimitiveType.TRIANGLES,
            boundingSphere: BoundingSphere.fromVertices(positions)
        });
    }
    computePositions_dws(cps,height){
        let count = cps.length;
        let up = [];
        for(let i in cps){
            up.push(this.addHeight(cps[i],height));
        }
        //计算位置
        let pos = [];//坐标
        let sts = [];//纹理
        let indices = [];//索引
        let normal = [];//法向量
        for(let i =0;i<count-1;i++){
            // let ni = (i+1)%count;
            let ni = i+1;
            pos.push(...[ cps[i].x,cps[i].y,cps[i].z ]);
            pos.push(...[ cps[ni].x,cps[ni].y,cps[ni].z ]);
            pos.push(...[ up[ni].x,up[ni].y,up[ni].z ]);
            pos.push(...[ up[i].x,up[i].y,up[i].z ]);

            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);

            sts.push(...[0,0,1,0,1,1,0,1,]);//四个点的纹理一次存入

            let ii = i*4;
            let i1 = ii+1;
            let i2 = ii+2;
            let i3 = ii+3;
            indices.push(...[ ii,i1,i2 ,i2,i3,ii]);
        }
        return {
            pos:pos,
            normals:normal,
            sts:sts,
            indices:indices,
        };
    }

    addHeight(point,height){
        let tHeight = height||0.0;
        if(!point.hasOwnProperty('height')){
            let cartographic = Cartographic.fromCartesian(point);
            cartographic.height += tHeight;
            return Cartographic.toCartesian(cartographic);
        }else{
            point.height += tHeight;
            return point;
        }
    }
}

export default GetRidingLanternGeometry;
