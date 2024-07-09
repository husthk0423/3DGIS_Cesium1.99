import ImprovedNoise from './ImprovedNoise.js';

 class VolumeCloud {

    /**
     * 体积云
     * @param {Object} [options]
     * @param {Cartesian3} [options.position] 体积云的位置
     * @param {number} [options.zoomFactor] 体积云的放大倍数
     */
    constructor(options) {
      this.drawCommand = undefined;
      const perlin = new ImprovedNoise();
      this.threshold = 0.25;
      this.opacity = 0.25;
      this.range = 0.1;
      this.steps = 100;
      this.frame = 4;
      this.geometry_lxs = Cesium.BoxGeometry.fromDimensions({
        vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
        dimensions: new Cesium.Cartesian3(1, 1, 1),
      });
  
      const size = 128;
      const data = new Uint8Array(size * size * size);
      let i = 0;
      const scale = 0.05;
      for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const vector = new Cesium.Cartesian3(
              (x - size / 2) / size,
              (y - size / 2) / size,
              (z - size / 2) / size
            );
            const d = 1.0 - Cesium.Cartesian3.magnitude(vector);
            data[i] =
              (128 +
                128 * perlin.noise((x * scale) / 1.5, y * scale, (z * scale) / 1.5)) *
              d *
              d;
            i++;
          }
        }
      }
  
      this.texture3D = new Cesium.Texture3({
        context: viewer.scene.context,
        source: {
          width: size,
          height: size,
          depth: size,
          arrayBufferView: data,
        },
        pixelFormat: Cesium.PixelFormat.ALPHA,
        pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
      });
  
      const zoomFactor = options.zoomFactor;
      const scaleMatrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(zoomFactor, zoomFactor, zoomFactor));
      const position = options.position;
      const primitive_modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame( position );
      this.modelMatrix = Cesium.Matrix4.multiply(primitive_modelMatrix, scaleMatrix, primitive_modelMatrix);
    }
    createCommand(context) {
      if (!Cesium.defined(this.geometry_lxs)) return;
      const geometry = Cesium.BoxGeometry.createGeometry(this.geometry_lxs);
      const attributelocations =
        Cesium.GeometryPipeline.createAttributeLocations(geometry);
      this.vertexarray = Cesium.VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributes: attributelocations,
      });
      const renderstate = Cesium.RenderState.fromCache({
        depthTest: {
          enabled: false,
        },
        cull: {
          enabled: true,
        },
      });
      const shaderProgram = Cesium.ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: `
          attribute vec3 position;
          attribute vec2 st;
      
          varying vec3 vOrigin;
          varying vec3 vDirection;
      
          void main() {    
            vOrigin=czm_encodedCameraPositionMCHigh+czm_encodedCameraPositionMCLow;
            vDirection=position - vOrigin;
            gl_Position = czm_modelViewProjection * vec4(position,1.0);
          }
        `,
        fragmentShaderSource: `
        precision highp float;
        precision highp sampler3D;
     
        varying vec3 vOrigin;
        varying vec3 vDirection;
     
        uniform vec3 base;
        uniform sampler3D map;
     
        uniform float threshold;
        uniform float range;
        uniform float opacity;
        uniform float steps;
        uniform float frame;
     
        uint wang_hash(uint seed)
        {
            seed = (seed ^ 61u) ^ (seed >> 16u);
            seed *= 9u;
            seed = seed ^ (seed >> 4u);
            seed *= 0x27d4eb2du;
            seed = seed ^ (seed >> 15u);
            return seed;
        }
     
        float randomFloat(inout uint seed)
        {
            return float(wang_hash(seed)) / 4294967296.;
        }
     
        vec2 hitBox( vec3 orig, vec3 dir ) {
          const vec3 box_min = vec3( - 0.5 );
          const vec3 box_max = vec3( 0.5 );
          vec3 inv_dir = 1.0 / dir;
          vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
          vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
          vec3 tmin = min( tmin_tmp, tmax_tmp );
          vec3 tmax = max( tmin_tmp, tmax_tmp );
          float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
          float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
          return vec2( t0, t1 );
        }
     
        float sample1( vec3 p ) {
          return texture( map, p ).a;
        }
     
        float shading( vec3 coord ) {
          float step = 0.01;
          return sample1( coord + vec3( - step ) ) - sample1( coord + vec3( step ) );
        }
     
        void main(){
          vec3 rayDir = normalize( vDirection );
          vec2 bounds = hitBox( vOrigin, rayDir );
          if ( bounds.x > bounds.y ) discard;
          bounds.x = max( bounds.x, 0.0 );
          vec3 p = vOrigin + bounds.x * rayDir;
          vec3 inc = 1.0 / abs( rayDir );
          float delta = min( inc.x, min( inc.y, inc.z ) );
          delta /= steps;
          // Jitter
     
          // Nice little seed from
          // https://blog.demofox.org/2020/05/25/casual-shadertoy-path-tracing-1-basic-camera-diffuse-emissive/
          uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
          vec3 size = vec3( textureSize( map, 0 ) );
          float randNum = randomFloat( seed ) * 2.0 - 1.0;
          p += rayDir * randNum * ( 1.0 / size );
     
          vec4 ac = vec4( base, 0.0 );
          for ( float t = bounds.x; t < bounds.y; t += delta ) {
            float d = sample1( p + 0.5 );
            d = smoothstep( threshold - range, threshold + range, d ) * opacity;
            float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;
            ac.rgb += ( 1.0 - ac.a ) * d * col;
            ac.a += ( 1.0 - ac.a ) * d;
            if ( ac.a >= 0.95 ) break;
            p += rayDir * delta;
          }
          if ( ac.a == 0.0 ) discard;
          gl_FragColor=ac;
        }
      `,
        attributeLocations: attributelocations,
      });
      const that = this;
      const uniformmap = {
        map() {
          return that.texture3D;
        },
        base() {
          return new Cesium.Cartesian3(0.4745098, 0.541176, 0.62745);
        },
        threshold() {
          return that.threshold;
        },
        opacity() {
          return that.opacity;
        },
        range() {
          return that.range;
        },
        steps() {
          return that.steps;
        },
        frame() {
          return that.frame;
        },
      };
  
      this.drawCommand = new Cesium.DrawCommand({
        boundingVolume: this.geometry_lxs.boundingSphere,
        modelMatrix: this.modelMatrix,
        pass: Cesium.Pass.TRANSLUCENT,
        shaderProgram: shaderProgram,
        renderState: renderstate,
        vertexArray: this.vertexarray,
        uniformMap: uniformmap,
      });
    }
    update(frameState) {
      if (!this.drawCommand) {
        this.createCommand(frameState.context);
      }
      frameState.commandList.push(this.drawCommand);
    }
  }

export default VolumeCloud;