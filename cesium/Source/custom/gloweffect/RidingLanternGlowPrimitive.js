/**
 * Created by user on 2020/3/16.
 * 走马灯效果
 */

class RidingLanternGlowPrimitive {
    static createRidingLantern(options) {
        return new RidingLanternGlowPrimitive(options).polyline;
    }

    constructor(options) {
        this.viewer = options.viewer || window.viewer;
        this.positions = null;
        this.normals = null;
        this.sts = null;
        this.indices = null;
        this.geometrys = options.positions;
        this.color = options.color;
        this.u_tcolor = options.u_tcolor || Cesium.Color.YELLOW;//设置不透明的时候，alpha小于的颜色值

        this.speed = options.speed || 600;
        this.direction = options.direction || -1;
        this.translucent = options.translucent || false;//添加透明参数,true为透明

        //该高度单位为米
        this.height = options.height || 50.;
        //像素高度，表示多少个像素，当此值大于0时，height属性会失效
        this.piexlHeight = Cesium.defaultValue(options.piexlHeight,0);
        this.scale = Cesium.defaultValue(options.scale,1);

        this.type = options.type || 1;
        this.createPrimitive();
    }

    createPrimitive() {
        this.polyline = new Cesium.Primitive({
            geometryInstances: this.createGeometryInstances(),
            appearance: new Cesium.MaterialAppearance({
                material: new Cesium.Material({
                    translucent: this.translucent,
                    fabric: {
                        uniforms: {
                            u_color: this.color,
                            speed: this.speed,
                            direction: this.direction,
                            u_tcolor: this.u_tcolor,
                        },
                        source: this.createFS(this.translucent)
                    }
                }),
                vertexShaderSource: this.getVertexShaderSource1(),
                fragmentShaderSource: this.getFragmentShaderSource1(),
            }),
            asynchronous: false,
        });

        if(this.piexlHeight > 0){
            this.polyline.updateCallback = this.updateCallback.bind(this);
        }
    }


    updateCallback(){
        const boundingSphere = this.polyline._boundingSpheres[0];
        if(!boundingSphere){
            this.polyline.modelMatrix = Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY);
            return;
        }


        let scale = this.getScale();

        let scaleHeight = this.piexlHeight * scale / this.height;

        let m = Cesium.Transforms.eastNorthUpToFixedFrame(boundingSphere.center);
        let inverse = Cesium.Matrix4.inverse(m,new Cesium.Matrix4());

        let mScale = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1.0, 1.0, scaleHeight));

        let translationHeight = scaleHeight > 1 ? this.height * (scaleHeight -1) * 0.5 :this.height * (scaleHeight -1) * 0.5;

        let translationM = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(1.0, 1.0, translationHeight));

        let mm = Cesium.Matrix4.multiply(translationM,mScale,new Cesium.Matrix4());

        let tt = Cesium.Matrix4.multiply(mm,inverse,new Cesium.Matrix4());

        this.polyline.modelMatrix = Cesium.Matrix4.multiply(m,tt,new Cesium.Matrix4());
    }

    //获取当前比例尺,结果为一个像素多少米
    getScale(){
        let scene = this.viewer.scene;
        let width = scene.canvas.clientWidth;
        let height = scene.canvas.clientHeight;

        let left = scene.camera.getPickRay(
            new Cesium.Cartesian2((width / 2) | 0, height - 1)
        );
        let right = scene.camera.getPickRay(
            new Cesium.Cartesian2((1 + width / 2) | 0, height - 1)
        );

        let globe = scene.globe;
        let leftPosition = globe.pick(left, scene);
        let rightPosition = globe.pick(right, scene);

        if(leftPosition && rightPosition){
            let geodesic = new Cesium.EllipsoidGeodesic();
            let leftCartographic = globe.ellipsoid.cartesianToCartographic(
                leftPosition
            );
            let rightCartographic = globe.ellipsoid.cartesianToCartographic(
                rightPosition
            );

            geodesic.setEndPoints(leftCartographic, rightCartographic);

            return geodesic.surfaceDistance > 10 ? 0.001:geodesic.surfaceDistance;
        }

        return 0.001;
    }



    createGeometryInstances() {
        let geometryInstances = [];
        for (let i = 0; i < this.geometrys.length; i++) {
            let item = this.geometrys[i];
            let op = this.computePositions_dws(item, this.height);
            //console.log(op);
            this.positions = op.pos;
            this.normals = op.normals;
            this.sts = op.sts;
            this.indices = op.indices;

            let geometry = this.createGeometry(this.positions, this.normals, this.sts, this.indices);
            let gi = new Cesium.GeometryInstance({
                geometry: geometry,
            });
            geometryInstances.push(gi);
        }
        return geometryInstances;
    }

    createGeometry(pos, n, st, indice) {
        let positions = new Float64Array(pos);
        let normals = new Float32Array(n);
        let sts = new Float32Array(st);
        let indices = new Uint16Array(indice);

        return new Cesium.Geometry({
            attributes: {
                position: new Cesium.GeometryAttribute({
                    // 使用double类型的position进行计算
                    componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                    //componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: positions
                }),
                normal: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: normals
                }),
                st: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: sts
                })
            },
            indices: indices,
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
        });
    }
    computePositions_dws(cps, height) {
        let count = cps.length;
        let up = [];
        for (let i in cps) {
            up.push(this.addHeight(cps[i], height));
        }
        //计算位置
        let pos = [];//坐标
        let sts = [];//纹理
        let indices = [];//索引
        let normal = [];//法向量
        for (let i = 0; i < count - 1; i++) {
            // let ni = (i+1)%count;
            let ni = i + 1;
            pos.push(...[cps[i].x, cps[i].y, cps[i].z]);
            pos.push(...[cps[ni].x, cps[ni].y, cps[ni].z]);
            pos.push(...[up[ni].x, up[ni].y, up[ni].z]);
            pos.push(...[up[i].x, up[i].y, up[i].z]);

            normal.push(...[0, 0, 1]);
            normal.push(...[0, 0, 1]);
            normal.push(...[0, 0, 1]);
            normal.push(...[0, 0, 1]);

            sts.push(...[0, 0, 1, 0, 1, 1, 0, 1,]);//四个点的纹理一次存入

            let ii = i * 4;
            let i1 = ii + 1;
            let i2 = ii + 2;
            let i3 = ii + 3;
            indices.push(...[ii, i1, i2, i2, i3, ii]);
        }
        return {
            pos: pos,
            normals: normal,
            sts: sts,
            indices: indices,
        };
    }

    addHeight(point, height) {
        let tHeight = height || 0.0;
        if (!point.hasOwnProperty('height')) {
            let cartographic = Cesium.Cartographic.fromCartesian(point);
            cartographic.height += tHeight;
            return Cesium.Cartographic.toCartesian(cartographic);
        } else {
            point.height += tHeight;
            return point;
        }
    }

    createFS(t) {//修改了shader
        let fs = '';
        if (this.type === 1) {
            fs +=
                'czm_material czm_getMaterial( czm_materialInput cmi )\n' +
                '{\n' +
                '   czm_material material = czm_getDefaultMaterial(cmi);\n' +
                '   vec2 st = cmi.st;' +
                '    float t = fract(czm_frameNumber/speed) * direction;\n' +
                //'    vec2 st1 = vec2(fract(st.s - t),st.t);\n' +
                '    vec2 st1 = vec2(st.s,fract(st.t - t));\n' +
                '    vec4 color = vec4(0.,0.,0.,0.);\n' +
                '    float tt = 0.5 - abs(0.5 - st1.t);\n' +
                '    float ss = st1.s ;\n';
            if (t) {
                fs +=
                    '    float alpha = tt * 2.;\n' +
                    '    color = vec4(u_color.rgb * u_color.a, alpha * 1.2);\n' +
                    '   material.diffuse = color.rgb;\n' +
                    '   material.alpha = color.a;\n' +
                    '    return material;\n' +
                    '}\n'
            } else {
                fs +=
                    //'    color = mix(u_color,u_tcolor,tt);' +
                    '    color = vec4(u_color.rgb * u_color.a * pow(tt,0.25),1.);' +
                    '   material.diffuse = color.rgb;\n' +
                    '   material.alpha = color.a;\n' +
                    '    return material;\n' +
                    '}\n';
            }
        } else {
            fs +=
                'czm_material czm_getMaterial( czm_materialInput cmi )\n' +
                '{\n' +
                '   czm_material material = czm_getDefaultMaterial(cmi);\n' +
                '   vec2 st = cmi.st;\n' +
                '    float t = fract(czm_frameNumber/speed) * direction;\n' +
                '    vec2 st1 = vec2(fract(st.s - t),st.t);\n' +
                '    vec4 color = vec4(0.,0.,0.,0.);\n' +
                '    float alpha = 1.-st.t;\n' +
                '    float value = fract(st1.s/0.25);\n' +
                '    alpha *= sin(value * 3.1415926);\n';
            if (t) {
                fs += '    color = vec4(u_color.rgb * u_color.a, alpha * 1.2);' +
                    '   material.diffuse = color.rgb;\n' +
                    '   material.alpha = color.a;\n' +
                    '    return material;\n' +
                    '}\n';
            } else {
                fs += '    color = vec4(u_color.rgb * u_color.a,alpha);\n' +
                    '   material.diffuse = color.rgb;\n' +
                    '   material.alpha = color.a;\n' +
                    '    return material;\n' +
                    '}\n';
            }
        }
        return fs;
    }

    getVertexShaderSource1() {
        return "attribute vec3 position3DHigh;\
          attribute vec3 position3DLow;\
          attribute vec3 normal;\
          attribute vec2 st;\
          attribute float batchId;\
          varying vec2 v_st;\
          varying vec3 v_normalEC;\
          varying vec3 v_positionEC;\
          // uniform mat4 u_matrix;\
          void main()\
          {\
              vec4 p = czm_translateRelativeToEye(position3DHigh,position3DLow);\
              v_positionEC = (czm_modelViewRelativeToEye * p).xyz;\
              v_normalEC = czm_normal * normal;\
              v_st=st;\
              gl_Position = czm_modelViewProjectionRelativeToEye * p;\
          }\
          ";
    }

    getFragmentShaderSource1() {
        return 'varying vec3 v_positionEC;\n' +
            '    varying vec3 v_normalEC;\n' +
            '    varying vec2 v_st;\n' +
            '    void main()\n' +
            '    {\n' +
            '        vec3 positionToEyeEC = -v_positionEC;\n' +
            '        vec3 normalEC = normalize(v_normalEC);\n' +
            '    #ifdef FACE_FORWARD\n' +
            '        normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);\n' +
            '    #endif\n' +
            '        czm_materialInput materialInput;\n' +
            '        materialInput.normalEC = normalEC;\n' +
            '        materialInput.positionToEyeEC = positionToEyeEC;\n' +
            '        materialInput.st = v_st;\n' +
            '        czm_material material = czm_getMaterial(materialInput);\n' +
            '        gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n' +
            '    }';
    }
}

export default RidingLanternGlowPrimitive;
