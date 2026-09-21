/* Calm water and interactive ripples. Stream flow is disabled for this iteration.
 * Side ripples work on every section and article; waves can pass through reading areas.
 */
(() => {
  'use strict';
  const FLOW_SECONDS = 7;
  const RIPPLE_SECONDS = 1.8;
  const FILL_SECONDS = .55;
  // Local, finite-difference height fields. The fixed step stays well below the
  // wave equation's stability limit; a nine-point stencil reduces grid bias.
  const WATER_CELL = 3, WAVE_STEP = 1 / 90, WAVE_SPEED = 135;
  const FIELD_SIZE = 193, FIELD_CENTER = (FIELD_SIZE - 1) / 2;
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform vec2 viewport;
    uniform float scroll, now, morph, activity, hazeVisible;
    uniform vec4 geometry; // bio top, fork center, end of split, end of publications
    uniform vec4 channel;  // text left, text right, side channel half-width, bio water half-width
    uniform vec2 weight, travel, released;
    uniform vec4 reservoir; // haze left, start of lower curve, haze right, curve depth
    uniform vec4 basins[6];
    uniform float opened[6];
    float hash(vec3 p) { p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z); }
    float noise(vec3 p) {
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
    float fbm(vec3 p) { return noise(p)*.57+noise(p*2.03+17.)*.28+noise(p*4.13+43.)*.15; }
    float edge(float d,float radius,float feather) {return 1.-smoothstep(radius-feather,radius+feather,d);}
    float roundedBox(vec2 p,vec2 halfSize,float radius) {
      vec2 q=abs(p)-halfSize+radius;return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
    }
    void main() {
      vec2 p=vec2(uv.x*viewport.x,(1.-uv.y)*viewport.y+scroll);
      float center=viewport.x*.5;
      float split=smoothstep(geometry.y,geometry.z,p.y);
      float left=mix(reservoir.x+16.,channel.x-channel.z-12.,split);
      float right=mix(reservoir.z-16.,channel.y+channel.z+12.,split);
      float width=mix(5.,channel.z,split);
      float bank=(noise(vec3(p.y*.012,13.,0.))-.5)*min(18.,channel.z*.3)*split;
      float end=1.-smoothstep(geometry.w-35.,geometry.w+140.,p.y);
      float branchStart=smoothstep(geometry.y-15.,geometry.y-2.,p.y);
      float ml=edge(abs(p.x-left),width+bank,3.+split*4.)*branchStart*end*clamp(weight.x,0.,1.);
      float vr=edge(abs(p.x-right),width-bank,3.+split*4.)*branchStart*end*clamp(weight.y,0.,1.);
      // A wetting front travels from the intro's lower curved boundary.
      ml*=1.-smoothstep(released.x*1.8+12.,released.x*1.8+80.,p.y-geometry.y);
      vr*=1.-smoothstep(released.y*1.8+12.,released.y*1.8+80.,p.y-geometry.y);
      float speedSide=ml+vr>.01?(ml*travel.x+vr*travel.y)/max(ml+vr,.001):0.;
      float cross=ml+vr>.01?(ml*(p.x-left)+vr*(p.x-right))/max(ml+vr,.001):p.x-center;
      vec2 flowPoint=vec2(cross*.029,(p.y-speedSide)*.017);
      float localMorph=morph*max(ml,vr);
      float n=fbm(vec3(flowPoint.x,flowPoint.y*.43,localMorph*.08));
      vec2 warp=vec2(n,fbm(vec3(flowPoint*.6+17.,localMorph*.06)))*1.7;
      float texture=fbm(vec3(flowPoint+warp,localMorph*.1));
      float light=pow(1.-abs(texture*2.-1.),18.);
      float motionTexture=max(ml,vr);
      float quiet=fbm(vec3(p*.008,0.));
      float basinMask=0.;
      for(int i=0;i<6;i++) {
        if(basins[i].z>0.) {
          vec4 r=basins[i];
          float box=1.-smoothstep(-1.,2.,roundedBox(p-(r.xy+r.zw*.5),r.zw*.5,6.));
          float fill=smoothstep(0.,.55,now-opened[i]);
          float waterline=r.y+fill*(r.w+18.)-9.+(noise(vec3(p.x*.06,now*.2,0.))-.5)*6.*(1.-fill);
          box*=1.-smoothstep(waterline-4.,waterline+4.,p.y);
          basinMask=max(basinMask,box*(1.-smoothstep(.25,.55,now-opened[i])));
        }
      }
      vec3 paper=vec3(9.,34.,63.)/255.; // Cobalt #09223f
      vec3 shallow=vec3(16.,52.,92.)/255.;
      vec3 running=vec3(24.,82.,142.)/255.;
      vec3 water=mix(shallow,running,motionTexture*.60);
      water+=(quiet-.5)*.035;
      water+=motionTexture*((texture-.5)*.13+light*.075);
      // Restore the original calm-water palette and 33% reading-area blend,
      // uniformly across the active reading pane, ending in a soft curve.
      float bowlX=(p.x-(reservoir.x+reservoir.z)*.5)/((reservoir.z-reservoir.x)*.5);
      float bed=reservoir.y+reservoir.w*sqrt(max(0.,1.-bowlX*bowlX));
      float radius=(reservoir.z-reservoir.x)*.5;
      float held=edge(abs(p.x-center),radius,12.)
        *smoothstep(geometry.x-24.,geometry.x+4.,p.y)
        *(1.-smoothstep(bed-12.,bed+12.,p.y));
      vec3 color=mix(paper,shallow+(quiet-.5)*.035,held*.33*hazeVisible);
      color=mix(color,water,motionTexture*.9*activity);
      vec3 basinWater=mix(shallow,paper,.26);
      color=mix(color,basinWater,basinMask*.83);
      // Surface-normal moonlight and amber particles are composited above text.
      gl_FragColor=vec4(color,1.);
    }
  `;

  // Reconstruct surface slopes first, then light each display pixel. Enlarging
  // already-lit low-resolution pixels blurs the nonlinear specular highlights.
  function createMoonRenderer(canvas) {
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});
    if(!gl)return null;
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    try {
      const program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,`#version 300 es
        in vec2 position;
        void main(){gl_Position=vec4(position,0.,1.);}`));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`#version 300 es
        precision highp float;
        uniform sampler2D slopes;
        uniform vec2 origin, size;
        uniform float pixelsPerCell;
        out vec4 color;
        void main(){
          vec2 p=origin+vec2(gl_FragCoord.x,size.y-gl_FragCoord.y)/pixelsPerCell-.5;
          ivec2 cell=ivec2(floor(p));vec2 f=fract(p);
          vec2 a=mix(texelFetch(slopes,cell,0).rg,texelFetch(slopes,cell+ivec2(1,0),0).rg,f.x);
          vec2 b=mix(texelFetch(slopes,cell+ivec2(0,1),0).rg,texelFetch(slopes,cell+ivec2(1,1),0).rg,f.x);
          vec2 d=mix(a,b,f.y);
          if(abs(d.x)+abs(d.y)<.0004){color=vec4(0.);return;}
          vec3 normal=normalize(vec3(-d*2.1,1.));
          float reflection=pow(max(0.,dot(normal,vec3(-.24,-.31,.92))),36.);
          float light=dot(-d,vec2(.54,.84))*1.5+(reflection-pow(.92,36.))*.82;
          if(light>0.){
            float gleam=1.-exp(-light*10.);
            color=vec4(vec3(210.+32.*gleam,232.+17.*gleam,255.)/255.,.92*gleam);
          }else color=vec4(vec3(0.,8.,24.)/255.,min(.62,-light*1.6));
        }`));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const uniforms=Object.fromEntries(['origin','size','pixelsPerCell'].map(k=>[k,gl.getUniformLocation(program,k)]));
      let textureWidth=0,textureHeight=0;
      return (data,width,height,left,top,columns,rows,scale)=>{
        const cw=Math.ceil(columns*WATER_CELL*scale),ch=Math.ceil(rows*WATER_CELL*scale);
        if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
        gl.viewport(0,0,cw,ch);
        if(width!==textureWidth||height!==textureHeight){
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RG32F,width,height,0,gl.RG,gl.FLOAT,data);
          textureWidth=width;textureHeight=height;
        }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RG,gl.FLOAT,data);
        gl.uniform2f(uniforms.origin,left,top);gl.uniform2f(uniforms.size,cw,ch);
        gl.uniform1f(uniforms.pixelsPerCell,scale*WATER_CELL);
        gl.drawArrays(gl.TRIANGLES,0,3);
      };
    }catch(error){console.warn('Using CPU moonlight renderer:',error);return null;}
  }

  window.createStream = function (canvas, overlay, initial = {}) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    const ink = overlay.getContext('2d');
    const fallback = gl ? null : canvas.getContext('2d');
    if (!gl) document.body.classList.add('stream-fallback');
    let program, uniform;
    if (gl) {
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniform = Object.fromEntries(['viewport','scroll','now','morph','activity','hazeVisible','geometry','channel','reservoir','weight','travel','released','basins[0]','opened[0]'].map(k => [k, gl.getUniformLocation(program, k)]));
    }
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const clock = () => performance.now() / 1000;
    const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
    const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
    const geometry = new Float32Array(4), channel = new Float32Array(4), reservoir = new Float32Array(4);
    const basinRects = new Float32Array(24), opened = new Float32Array(6);
    const rippleBursts = Array(12).fill(null);
    const basins = new Map();
    let paused = Boolean(initial.paused), selected = 'all';
    let weight = [3,3], fromWeight = [3,3], targetWeight = [3,3], travel = [0,0], released = [0,0];
    let transitionStart = -100, flowStart = -100, morph = 0, nextDrop = 0;
    let frame = 0, lastFrame = 0, needsMeasure = true, pulseUntil = -100, fillUntil = -100;
    let particles = [], width = innerWidth, height = innerHeight, overlayScale = 1, hazeVisible = 1;
    let surfaceCanvas = document.createElement('canvas');
    const renderMoon = createMoonRenderer(surfaceCanvas);
    if(!renderMoon)surfaceCanvas=document.createElement('canvas');
    const surfaceInk = renderMoon ? null : surfaceCanvas.getContext('2d');
    let clickSurfaceActive=false;
    let surfaceHeights, surfaceSlopes, surfaceImage, surfaceWidth = 0, surfaceHeight = 0;

    // Cached sprites for the occasional double-click amber particle effect.
    const emberSprites = ['#ff8b16', '#ffaf20', '#ffcb46', '#ffe19a'].map(color => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 48;
      const ctx = sprite.getContext('2d');
      ctx.scale(3, 3);
      const halo = ctx.createRadialGradient(8, 8, .8, 8, 8, 7);
      halo.addColorStop(0, '#ffad2480');
      halo.addColorStop(.3, '#ff850035');
      halo.addColorStop(1, '#ff650000');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(8, 8, 1.15, .85, -.4, 0, Math.PI * 2); ctx.fill();
      return sprite;
    });

    function measureNow() {
      width = innerWidth; height = innerHeight;
      const readingPane = document.querySelector('.screen:not([hidden]) .section-scroll, .post-content');
      const bio = readingPane.getBoundingClientRect();
      hazeVisible=bio.width>0&&!document.body.classList.contains('lighthouse-lighting')?1:0;
      const text = (document.querySelector('#research-content') || readingPane).getBoundingClientRect();
      const research = (document.querySelector('#research') || document.querySelector('.post-shell')).getBoundingClientRect();
      const mobile=width<=600,padding=mobile?12:16;
      reservoir.set([bio.left-padding,bio.bottom+scrollY+(mobile?8:10),bio.right+padding,mobile?48:66]);
      geometry.set([bio.top+scrollY, reservoir[1]+5, text.top+scrollY+30, research.bottom+scrollY]);
      const halfWidth = clamp((width-text.width)/4-15, 14, 70);
      channel.set([text.left, text.right, halfWidth, Math.min(width*.47, 550)]);
      basinRects.fill(0); opened.fill(-100);
      let i=0;
      for (const [element, start] of basins) {
        const r=element.getBoundingClientRect();
        if (r.width && r.height && i<6) {
          basinRects.set([r.left,r.top+scrollY,r.width,r.height], i*4);
          opened[i]=start; i++;
        }
      }
      const scale=Math.min(devicePixelRatio||1, 1.3, 1500/width);
      const cw=Math.round(width*scale),ch=Math.round(height*scale);
      if(canvas.width!==cw||canvas.height!==ch) {canvas.width=cw;canvas.height=ch;}
      overlayScale=Math.min(devicePixelRatio||1,2);
      const ow=Math.round(width*overlayScale),oh=Math.round(height*overlayScale);
      if(overlay.width!==ow||overlay.height!==oh) {overlay.width=ow;overlay.height=oh;}
      ink.setTransform(overlayScale,0,0,overlayScale,0,0);
      needsMeasure=false;
    }
    function centerAt(y, side) {
      const split=smooth((y-geometry[1])/(geometry[2]-geometry[1]));
      const start=side===0?reservoir[0]+16:reservoir[2]-16;
      const end=side===0?channel[0]-channel[2]-12:channel[1]+channel[2]+12;
      return start+(end-start)*split;
    }
    function randomField(x) {
      const hash = n => {const r=Math.sin(n*127.1)*43758.5453;return r-Math.floor(r);};
      const a=Math.floor(x),f=smooth(x-a);return hash(a)*(1-f)+hash(a+1)*f;
    }
    function seedParticles() {
      particles=[];
      for(let side=0;side<2;side++) for(let i=0;i<48;i++) {
        particles.push({ side, y: geometry[1]-Math.random()*420, offset:(Math.random()+Math.random()-1)*.78, speed:.88+Math.random()*.24, seed:Math.random()*1000, length:6+Math.random()*13 });
      }
    }
    function createWaveField(x, y, strength, seed) {
      const current = new Float32Array(FIELD_SIZE * FIELD_SIZE);
      const previous = new Float32Array(current.length);
      const originX = Math.floor(x / WATER_CELL) - FIELD_CENTER;
      const originY = Math.floor(y / WATER_CELL) - FIELD_CENTER;
      const cx = x / WATER_CELL - originX, cy = y / WATER_CELL - originY;
      const contact = (9.5 + Math.random() * 2) / WATER_CELL;
      const aspect = .88 + Math.random() * .2;
      const cos = Math.cos(seed), sin = Math.sin(seed);
      for (let py = FIELD_CENTER - 13; py <= FIELD_CENTER + 13; py++) {
        for (let px = FIELD_CENTER - 13; px <= FIELD_CENTER + 13; px++) {
          const dx = px - cx, dy = py - cy;
          const u = (dx * cos - dy * sin) / contact;
          const v = (dx * sin + dy * cos) / (contact * aspect);
          const r2 = u * u + v * v;
          // A small depression displaces water into its surrounding shoulder.
          // Randomness belongs to the contact shape, never to frame-by-frame
          // ring positions. Propagation then follows the wave equation alone.
          current[py * FIELD_SIZE + px] = -7.5 * strength * (1 - r2) * Math.exp(-r2)
            * (1 + .09 * u + .06 * v);
        }
      }
      previous.set(current);
      return { current, previous, next: new Float32Array(current.length), originX, originY, time: 0 };
    }
    function advanceWaveField(field, age) {
      const q = (WAVE_SPEED * WAVE_STEP / WATER_CELL) ** 2;
      const damping = Math.exp(-2.6 * WAVE_STEP);
      while (field.time + WAVE_STEP <= age) {
        const { current, previous, next } = field;
        const radius = Math.min(FIELD_CENTER - 1, Math.ceil((field.time * WAVE_SPEED + 42) / WATER_CELL));
        const lo = FIELD_CENTER - radius, hi = FIELD_CENTER + radius;
        for (let y = lo; y <= hi; y++) for (let x = lo; x <= hi; x++) {
          const i = y * FIELD_SIZE + x, h = current[i];
          const cardinal = current[i - 1] + current[i + 1] + current[i - FIELD_SIZE] + current[i + FIELD_SIZE];
          const diagonal = current[i - FIELD_SIZE - 1] + current[i - FIELD_SIZE + 1]
            + current[i + FIELD_SIZE - 1] + current[i + FIELD_SIZE + 1];
          const laplacian = cardinal * (2 / 3) + diagonal / 6 - h * (10 / 3);
          next[i] = h + damping * (h - previous[i]) + q * laplacian;
        }
        field.previous = current; field.current = next; field.next = previous;
        field.time += WAVE_STEP;
      }
    }
    function drawMoonSurface(t) {
      const moons = rippleBursts.filter(b => b?.kind === 'moon' && t - b.start < RIPPLE_SECONDS);
      clickSurfaceActive=moons.length>0;
      if (!clickSurfaceActive) return;
      const sw = Math.ceil(width / WATER_CELL) + 2, sh = Math.ceil(height / WATER_CELL) + 3;
      if (sw !== surfaceWidth || sh !== surfaceHeight) {
        surfaceWidth = sw; surfaceHeight = sh;
        surfaceHeights = new Float32Array(sw * sh);
        surfaceSlopes = new Float32Array(sw * sh * 2);
      }
      surfaceHeights.fill(0); surfaceSlopes.fill(0);
      const originY = Math.floor(scrollY / WATER_CELL) - 1;
      let minX = sw, minY = sh, maxX = 0, maxY = 0;
      for (const burst of moons) {
        const age = t - burst.start, field = burst.field;
        advanceWaveField(field, age);
        const extent = Math.min(FIELD_CENTER - 1, Math.ceil((age * WAVE_SPEED + 42) / WATER_CELL));
        const ox = field.originX + 1, oy = field.originY - originY;
        const x0 = Math.max(0, ox + FIELD_CENTER - extent), x1 = Math.min(sw - 1, ox + FIELD_CENTER + extent);
        const y0 = Math.max(0, oy + FIELD_CENTER - extent), y1 = Math.min(sh - 1, oy + FIELD_CENTER + extent);
        const settle = smooth((RIPPLE_SECONDS - age) / .35);
        minX = Math.min(minX, Math.max(1, x0)); minY = Math.min(minY, Math.max(1, y0));
        maxX = Math.max(maxX, Math.min(sw - 2, x1)); maxY = Math.max(maxY, Math.min(sh - 2, y1));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          // Sum displacement before lighting, so wave intersections reinforce
          // or cancel one another rather than stacking decorative rings.
          surfaceHeights[y * sw + x] += field.current[(y - oy) * FIELD_SIZE + x - ox] * settle;
        }
      }
      if(maxX<minX||maxY<minY)return;
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const i = y * sw + x;
        surfaceSlopes[i*2]=(surfaceHeights[i+1]-surfaceHeights[i-1])/(2*WATER_CELL);
        surfaceSlopes[i*2+1]=(surfaceHeights[i+sw]-surfaceHeights[i-sw])/(2*WATER_CELL);
      }
      const columns=maxX-minX+1,rows=maxY-minY+1;
      if(renderMoon){
        renderMoon(surfaceSlopes,sw,sh,minX,minY,columns,rows,overlayScale);
      }else{
        // Canvas-only fallback shades at one CSS pixel, never enlarging a shaded grid.
        const rw=columns*WATER_CELL,rh=rows*WATER_CELL;
        if(surfaceCanvas.width!==rw||surfaceCanvas.height!==rh){
          surfaceCanvas.width=rw;surfaceCanvas.height=rh;
          surfaceImage=surfaceInk.createImageData(rw,rh);
        }
        surfaceImage.data.fill(0);
        const pixels=surfaceImage.data,baseReflection=.92**36;
        for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
          const gx=minX+(x+.5)/WATER_CELL-.5,gy=minY+(y+.5)/WATER_CELL-.5;
          const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
          const i=(iy*sw+ix)*2;
          const dx=(surfaceSlopes[i]*(1-fx)+surfaceSlopes[i+2]*fx)*(1-fy)
            +(surfaceSlopes[i+sw*2]*(1-fx)+surfaceSlopes[i+sw*2+2]*fx)*fy;
          const dy=(surfaceSlopes[i+1]*(1-fx)+surfaceSlopes[i+3]*fx)*(1-fy)
            +(surfaceSlopes[i+sw*2+1]*(1-fx)+surfaceSlopes[i+sw*2+3]*fx)*fy;
          if (Math.abs(dx) + Math.abs(dy) < .0004) continue;
          const nx = -dx * 2.1, ny = -dy * 2.1, inverseLength = 1 / Math.sqrt(1 + nx * nx + ny * ny);
          const reflection = Math.max(0, (nx * -.24 + ny * -.31 + .92) * inverseLength) ** 36;
          const slopeLight = (-dx * .54 - dy * .84) * 1.5;
          const light = slopeLight + (reflection - baseReflection) * .82;
          const pixel = (y*rw+x)*4;
          if (light > 0) {
            // Expose the moon's reflection without altering the wave simulation.
            // Smooth compression lifts small crests while retaining highlight detail.
            const gleam = 1 - Math.exp(-light * 10);
            pixels[pixel] = 210 + 32 * gleam;
            pixels[pixel + 1] = 232 + 17 * gleam;
            pixels[pixel + 2] = 255;
            pixels[pixel + 3] = .92 * gleam * 255;
          } else {
            pixels[pixel] = 0; pixels[pixel + 1] = 8; pixels[pixel + 2] = 24;
            pixels[pixel + 3] = Math.min(.62, -light * 1.6) * 255;
          }
        }
        surfaceInk.putImageData(surfaceImage,0,0);
      }
      // Align to the overlay's pixel grid; do not blur a shaded image a second time.
      ink.imageSmoothingEnabled=false;
      ink.drawImage(surfaceCanvas,(minX-1)*WATER_CELL,
        Math.round(((originY+minY)*WATER_CELL-scrollY)*overlayScale)/overlayScale,
        columns*WATER_CELL,rows*WATER_CELL);
      ink.imageSmoothingEnabled=true;
    }
    function sampleWaterSurface(x,y){
      const surface=window.waterWake?.sample(x,y)||{height:0,dx:0,dy:0,flowY:0};
      if(!clickSurfaceActive)return surface;
      const gx=clamp(x/WATER_CELL+1,1,surfaceWidth-3);
      const gy=clamp((y+scrollY)/WATER_CELL-(Math.floor(scrollY/WATER_CELL)-1),1,surfaceHeight-3);
      const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
      const sample=(array,stride,component)=>{const i=(iy*surfaceWidth+ix)*stride+component;
        return (array[i]*(1-fx)+array[i+stride]*fx)*(1-fy)+(array[i+surfaceWidth*stride]*(1-fx)+array[i+(surfaceWidth+1)*stride]*fx)*fy;};
      surface.height+=sample(surfaceHeights,1,0);
      const clickX=sample(surfaceSlopes,2,0),clickY=sample(surfaceSlopes,2,1);
      surface.clickSlope=Math.hypot(clickX,clickY);surface.dx+=clickX;surface.dy+=clickY;
      return surface;
    }
    function createRipple(x, y, start, strength, kind) {
      const seed=Math.random()*Math.PI*2, grains=[];
      if(kind==='moon')return {x,y,start,seed,grains,strength:clamp(strength,.2,1),kind,
        field:createWaveField(x,y,clamp(strength,.2,1),seed)};
      for(let ring=0;ring<3;ring++) {
        const count=Math.round([190,140,95][ring]*clamp(strength,.2,1));
        const rotation=Math.random()*Math.PI*2;
        for(let i=0;i<count;i++) {
          const angle=rotation+Math.random()*Math.PI*2;
          const stray=Math.random()<.14;
          grains.push({
            angle, ring, stray,
            x:null,y:null,flowX:0,flowY:0,vx:0,vy:0,coupling:0,clickCoupling:0,

            // Randomness is sampled once. Each grain then moves continuously.
            offset:(Math.random()-.5)*(stray?14:4),
            drift:(Math.random()-.5)*.025,
            wobble:Math.random()*Math.PI*2,
            size:.7+Math.random()*.7,
            birth:ring*.115+Math.random()*.045,
            death:Math.min(RIPPLE_SECONDS,.8+Math.random()*.98+ring*.03),
            heat:Math.random()<.12?3:Math.floor(Math.random()*3),
            glint:Math.random()<.22
          });
        }
      }
      return {x,y,start,seed,grains,strength:clamp(strength,.2,1),kind,lastTransport:start};
    }
    function drawRipples(t) {
      if(paused)return;
      ink.lineCap='round';
      drawMoonSurface(t);
      for(let i=0;i<rippleBursts.length;i++) {
        const burst=rippleBursts[i];if(!burst)continue;
        const age=t-burst.start;
        if(age>=RIPPLE_SECONDS) {rippleBursts[i]=null;continue;}
        const reach=age*145+42,cy=burst.y-scrollY;
        if(burst.x+reach<0||burst.x-reach>width||cy+reach<0||cy-reach>height)continue;
        if(burst.kind==='moon')continue;
        const elapsed=Math.min(.08,Math.max(0,t-burst.lastTransport));burst.lastTransport=t;
        for(const grain of burst.grains) {
          if(age<grain.birth||age>=grain.death)continue;
          const angle=grain.angle;
          if(grain.x===null){
            const radius=7+grain.offset*.4;
            grain.x=burst.x+Math.cos(angle)*radius;grain.y=burst.y+Math.sin(angle)*radius;
            // Initial expansion only. No circular position is imposed afterward.
            const speed=145+(grain.stray?-9:0);
            grain.vx=Math.cos(angle)*speed;grain.vy=Math.sin(angle)*speed;
          }
          let surface={height:0,dx:0,dy:0,flowX:0,flowY:0};
          const sample=(window.waterWake||clickSurfaceActive)?sampleWaterSurface:null;
          let remaining=Math.min(elapsed,Math.max(0,age-grain.birth));
          while(remaining>0){const dt=Math.min(remaining,1/120);remaining-=dt;
            if(sample)surface=sample(grain.x,grain.y-scrollY);
            const currentX=surface.flowX||0,currentY=surface.flowY||0;
            // Current is added to transport; slopes deflect particle momentum.
            // Position persists, so a passing wake can tear and carry a segment.
            grain.vx+=(-surface.dx*850-grain.vx*.38)*dt;
            grain.vy+=(-surface.dy*850-grain.vy*.38)*dt;
            grain.vx=clamp(grain.vx,-220,220);grain.vy=clamp(grain.vy,-220,220);
            grain.x+=(grain.vx+currentX)*dt;grain.y+=(grain.vy+currentY)*dt;
            grain.flowX+=currentX*dt;grain.flowY+=currentY*dt;
            grain.coupling=Math.max(grain.coupling,Math.hypot(surface.dx,surface.dy));
            grain.clickCoupling=Math.max(grain.clickCoupling,surface.clickSlope||0);
          }
          const x=grain.x,y=grain.y-scrollY-surface.height*1.5;
          if(x < -12||x>width+12||y < -12||y>height+12)continue;
          // The original amber effect keeps its irregular grains and small trails.
          const life=smooth((age-grain.birth)/.05)*smooth((grain.death-age)/.16);
          const size=grain.size*life*(.94+.06*Math.sin(grain.wobble+age*9));
          if(size<.08)continue;
          if(grain.glint) {
            const length=(1.5+grain.size)*life;
            const tx=-Math.sin(Math.atan2(grain.vy,grain.vx))*length,ty=Math.cos(Math.atan2(grain.vy,grain.vx))*length;
            ink.strokeStyle=grain.heat===0?'#ff8b16':'#ffb52a';
            ink.lineWidth=.7*size;
            ink.beginPath();ink.moveTo(x-tx,y-ty);ink.lineTo(x+tx,y+ty);ink.stroke();
          }
          ink.drawImage(emberSprites[grain.heat],x-8*size,y-8*size,16*size,16*size);
        }
      }
    }
    function drawOverlay(t, dt, envelope) {
      ink.clearRect(0,0,width,height);
      if (!paused && envelope>0) {
        particles.forEach(p => {
          p.y += weight[p.side]*24*dt*envelope*p.speed;
          if(p.y<geometry[1]||p.y>geometry[3]+50)return;
          const y=p.y-scrollY;
          if(y < -30 || y > height+30 || weight[p.side]<.02)return;
          const split=smooth((p.y-geometry[1])/(geometry[2]-geometry[1]));
          const localWidth=5+(channel[2]-5)*split;
          const shift=(randomField(p.seed+morph*.12+p.y*.002)-.5)*localWidth*.3;
          const x=centerAt(p.y,p.side)+p.offset*localWidth+shift;
          const tail=p.length*clamp(weight[p.side]/3,.3,1.4);
          const previousX=centerAt(p.y-tail,p.side)+p.offset*localWidth+shift;
          ink.beginPath();ink.moveTo(previousX,y-tail);ink.quadraticCurveTo(x+1,y-tail*.4,x,y);
          ink.strokeStyle=`rgba(178,214,255,${.36*envelope*clamp(weight[p.side])})`;
          ink.lineWidth=.8;ink.stroke();
        });
      }
      drawRipples(t);
    }
    function drawFallback(t, envelope) {
      const scale=canvas.width/width;fallback.setTransform(scale,0,0,scale,0,0);fallback.clearRect(0,0,width,height);
      fallback.fillStyle='#09223f';fallback.fillRect(0,0,width,height);
      if(hazeVisible){
      const center=(reservoir[0]+reservoir[2])*.5, radius=(reservoir[2]-reservoir[0])*.5;
      const top=geometry[0]-12-scrollY;
      fallback.save();fallback.globalAlpha=.33;fallback.filter='blur(10px)';
      fallback.beginPath();fallback.moveTo(reservoir[0],top);fallback.lineTo(reservoir[2],top);
      fallback.lineTo(reservoir[2],reservoir[1]-scrollY);
      fallback.ellipse(center,reservoir[1]-scrollY,radius,reservoir[3],0,0,Math.PI);
      fallback.closePath();
      fallback.fillStyle='#10345c';fallback.fill();fallback.restore();
      }
      if(envelope<=0)return;
      for(let side=0;side<2;side++) {
        if(weight[side]<.02)continue;
        fallback.beginPath();
        for(let y=geometry[1];y<Math.min(geometry[3]+80,geometry[1]+released[side]*1.8+40);y+=8) { const x=centerAt(y,side);if(y===geometry[1])fallback.moveTo(x,y-scrollY);else fallback.lineTo(x,y-scrollY); }
        fallback.lineWidth=channel[2]*1.8;fallback.lineCap='round';fallback.strokeStyle=`rgba(35,95,162,${.44*envelope})`;fallback.stroke();
      }
    }
    function draw(t,dt,envelope) {
      if(gl) {
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.uniform2f(uniform.viewport,width,height);gl.uniform1f(uniform.scroll,scrollY);
        gl.uniform1f(uniform.now,t);gl.uniform1f(uniform.morph,morph);
        gl.uniform1f(uniform.activity,envelope);
        gl.uniform1f(uniform.hazeVisible,hazeVisible);
        gl.uniform4fv(uniform.geometry,geometry);gl.uniform4fv(uniform.channel,channel);
        gl.uniform4fv(uniform.reservoir,reservoir);gl.uniform2fv(uniform.released,released);
        gl.uniform2fv(uniform.weight,weight);gl.uniform2fv(uniform.travel,travel);
        gl.uniform4fv(uniform['basins[0]'],basinRects);gl.uniform1fv(uniform['opened[0]'],opened);
        gl.drawArrays(gl.TRIANGLES,0,6);
      } else drawFallback(t,envelope);
      drawOverlay(t,dt,envelope);
    }
    function tick(timestamp) {
      frame=0;
      if(document.hidden) {lastFrame=0;return;}
      const t=timestamp/1000,dt=lastFrame?Math.min(t-lastFrame,.07):0;
      lastFrame=t;
      if(needsMeasure)measureNow();
      const mix=paused?1:smooth((t-transitionStart)/.95);
      weight=fromWeight.map((v,i)=>v+(targetWeight[i]-v)*mix);
      const age=t-flowStart;
      const envelope=paused||age<0||age>=FLOW_SECONDS?0:smooth(age/.45)*(1-smooth((age-5.1)/1.9));
      if(envelope>0) {
        travel=travel.map((v,i)=>v+weight[i]*24*dt*envelope);
        released=released.map((v,i)=>v+weight[i]*24*dt*envelope);
        morph+=dt*envelope;
      }
      draw(t,dt,envelope);
      const active=!paused&&(envelope>0||(age>=0&&age<.45)||mix<1||t<pulseUntil||t<fillUntil);
      if(active)frame=requestAnimationFrame(tick);else lastFrame=0;
    }
    function request() {if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
    function measure() {needsMeasure=true;request();}
    function ripple(clientX,clientY,strength=1,kind='moon') {
      if(paused||reducedMotion.matches)return;
      const t=clock();rippleBursts[nextDrop]=createRipple(clientX,clientY+scrollY,t,strength,kind);
      nextDrop=(nextDrop+1)%rippleBursts.length;
      pulseUntil=t+RIPPLE_SECONDS;request();
    }
    function route(filter,count) {
      // Publication filters only change content while the stream is disabled.
      selected=filter;fromWeight=weight.slice();
      targetWeight=filter==='ml'?[count,0]:filter==='vlsi'?[0,count]:[count/2,count/2];
      transitionStart=-100;
      flowStart=-100;
      released=[0,0];
      needsMeasure=true;measureNow();
      request();
    }
    let lastPointer=0;
    function isWaterTarget(target) {
      if(reducedMotion.matches)return false;
      if (!(target instanceof Element) || target.closest('a,button,summary,input,textarea,select')) return false;
      if (target.closest('.section-scroll, .post-content')) return false;
      return Boolean(target.closest('.screen:not([hidden]), .post-shell'));
    }
    document.addEventListener('pointerdown',event=>{
      if(event.button!==0||!isWaterTarget(event.target))return;
      // Empty water margins should not select the nearest heading on double-click.
      if(event.pointerType==='mouse')event.preventDefault();
      ripple(event.clientX,event.clientY);
    });
    document.addEventListener('dblclick',event=>{
      if(event.button!==0||!isWaterTarget(event.target)||paused)return;
      // Single clicks respond immediately; a double click replaces their nearby
      // moonlit waves with one amber burst, without delaying ordinary feedback.
      const t=clock(),y=event.clientY+scrollY;
      for(let i=0;i<rippleBursts.length;i++) {
        const burst=rippleBursts[i];
        if(burst?.kind==='moon'&&t-burst.start<.8&&Math.hypot(burst.x-event.clientX,burst.y-y)<32)rippleBursts[i]=null;
      }
      window.waterWake?.impulse(event.clientX,event.clientY,.85);
      ripple(event.clientX,event.clientY,1,'amber');
    });
    document.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||event.buttons||!isWaterTarget(event.target)||event.target.closest('[data-cursor-water="wake"]')||performance.now()-lastPointer<180)return;
      lastPointer=performance.now();ripple(event.clientX,event.clientY,.45);
    },{passive:true});
    addEventListener('scroll',request,{passive:true});addEventListener('resize',measure);
    document.addEventListener('scroll',measure,{capture:true,passive:true});
    addEventListener('sectionchange',()=>{rippleBursts.fill(null);pulseUntil=-100;measure();});
    addEventListener('sectionlayout',measure);
    document.addEventListener('visibilitychange',()=>{lastFrame=0;request();});
    const readingObserver = new ResizeObserver(measure);
    readingObserver.observe(document.querySelector('main'));
    document.querySelectorAll('.section-scroll, .post-content, .post-shell').forEach(pane => readingObserver.observe(pane));
    document.fonts.ready.then(measure);
    measureNow();request();
    return {
      route, measure, ripple,
      amberParticles(){return rippleBursts.filter(b=>b?.kind==='amber'&&clock()-b.start<RIPPLE_SECONDS).flatMap(b=>b.grains.map((g,id)=>({id,x:g.x,y:g.y,alive:clock()-b.start>=g.birth&&clock()-b.start<g.death,flowX:g.flowX,flowY:g.flowY})));},
      basin(element,open) {
        if(open) {basins.set(element,clock()-1);fillUntil=-100;}
        else basins.delete(element);
        measure();
      },
      setPaused(value) {
        const wasPaused=paused;paused=Boolean(value);
        if(paused) {
          flowStart=-100;transitionStart=-100;pulseUntil=-100;fillUntil=-100;
          rippleBursts.fill(null);
          for(const element of basins.keys())basins.set(element,clock()-1);
          needsMeasure=true;
        }
        if(wasPaused!==paused)lastFrame=0;
        request();
      },
      state() {return {amberCoupling:rippleBursts.filter(b=>b?.kind==='amber'&&clock()-b.start<RIPPLE_SECONDS).map(b=>({maxSlope:Math.max(0,...b.grains.map(g=>g.coupling)),maxClickSlope:Math.max(0,...b.grains.map(g=>g.clickCoupling)),maxDrift:Math.max(0,...b.grains.map(g=>Math.hypot(g.flowX,g.flowY)))})),activeRipples:rippleBursts.filter(b=>b&&clock()-b.start<RIPPLE_SECONDS).map(b=>({kind:b.kind,x:b.x,y:b.y})),selected,weights:weight.slice(),targetWeights:targetWeight.slice(),speed:targetWeight.map(v=>v*24),flowing:!paused&&clock()-flowStart<FLOW_SECONDS,flowAge:clock()-flowStart,paused,travel:travel.slice(),openBasins:basins.size,rippleLifetime:RIPPLE_SECONDS,renderer:gl?'webgl':'canvas2d'};}
    };
  };
})();
