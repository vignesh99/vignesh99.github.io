/* Site-wide cursor water: a continuous moving pressure trace on an advected,
   damped height field. All imagery is generated locally; no video assets. */
(() => {
  'use strict';
  const surfaces = [...document.querySelectorAll('.screen, .post-shell')];
  if (!surfaces.length) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'wake-canvas';canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'4'});
  document.body.append(canvas);
  let gl = canvas.getContext('webgl2', {alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});
  let render;
  if (gl) {
    try {
      const shader = (type, source) => {const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram();
      gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
        in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
        precision highp float;uniform sampler2D field;uniform vec2 grid;uniform float fade;
        in vec2 uv;out vec4 color;
        vec2 slope(vec2 p){ivec2 i=ivec2(floor(p));vec2 f=fract(p);
          return mix(mix(texelFetch(field,i,0).rg,texelFetch(field,i+ivec2(1,0),0).rg,f.x),
          mix(texelFetch(field,i+ivec2(0,1),0).rg,texelFetch(field,i+ivec2(1,1),0).rg,f.x),f.y);}
        float environment(vec3 ray){
          // A fixed, finite moonlit patch reflected by the simulated surface.
          // Fine highlights come from surface orientation, not animated noise.
          vec2 sky=ray.xy/max(.25,ray.z);
          vec2 band=(sky-vec2(.10,.19))/vec2(.34,.055);
          vec2 moon=(sky-vec2(-.17,.26))/vec2(.048,.038);
          return .62*exp(-.5*dot(band,band))+.95*exp(-.5*dot(moon,moon));
        }
        void main(){vec2 p=clamp(vec2(uv.x,1.-uv.y)*(grid-1.),vec2(1.),grid-3.);vec2 d=slope(p);
          float activity=length(d);if(activity<.00008){color=vec4(0.);return;}
          vec3 normal=normalize(vec3(-d*4.2,1.));
          vec3 view=normalize(vec3((uv.x-.5)*.12,(uv.y-.5)*.10,1.));
          vec3 reflected=reflect(-view,normal);
          float light=environment(reflected)-environment(reflect(-view,vec3(0.,0.,1.)));
          float fresnel=.025+.975*pow(1.-max(0.,dot(normal,view)),5.);
          float gleam=1.-exp(-max(0.,light)*3.4);
          float alpha=min(.78,gleam*(.80+fresnel));
          if(light>0.)color=vec4(mix(vec3(.65,.83,.96),vec3(.94,.98,1.),gleam),alpha*fade);
          else color=vec4(.008,.035,.075,min(.16,-light*.3)*fade);
        }`));
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
      for(const axis of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,axis,gl.NEAREST);
      const grid=gl.getUniformLocation(program,'grid'),fade=gl.getUniformLocation(program,'fade');let allocatedWidth=0,allocatedHeight=0;
      render=(slopes,w,h,opacity)=>{gl.viewport(0,0,canvas.width,canvas.height);
        if(allocatedWidth!==w||allocatedHeight!==h){gl.texImage2D(gl.TEXTURE_2D,0,gl.RG32F,w,h,0,gl.RG,gl.FLOAT,slopes);allocatedWidth=w;allocatedHeight=h;}
        else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RG,gl.FLOAT,slopes);
        gl.uniform2f(grid,w,h);gl.uniform1f(fade,opacity);gl.drawArrays(gl.TRIANGLES,0,3);
      };
    } catch(error) {console.warn('Wake renderer unavailable:',error);canvas.remove();return;}
  } else {
    // Canvas fallback preserves the same simulation and motion, at grid resolution.
    const ink=canvas.getContext('2d'),surface=document.createElement('canvas'),ctx=surface.getContext('2d');let pixels;
    render=(slopes,w,h,opacity)=>{
      if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;pixels=ctx.createImageData(w,h);}
      for(let i=0;i<w*h;i++){const dx=slopes[i*2],dy=slopes[i*2+1],light=-dx*.7-dy*1.1,a=1-Math.exp(-Math.abs(light)*8),j=i*4;
        pixels.data[j]=light>0?209:2;pixels.data[j+1]=light>0?234:9;pixels.data[j+2]=light>0?255:20;pixels.data[j+3]=a*(light>0?175:95)*opacity;}
      ctx.putImageData(pixels,0,0);ink.clearRect(0,0,canvas.width,canvas.height);ink.drawImage(surface,0,0,canvas.width,canvas.height);
    };
  }
  surfaces.forEach(surface=>surface.dataset.cursorWater='wake');
  const foamCanvas=document.createElement('canvas');foamCanvas.id='wake-foam';foamCanvas.setAttribute('aria-hidden','true');foamCanvas.style.cssText=canvas.style.cssText;document.body.append(foamCanvas);
  const reading={left:0,top:0,right:0,bottom:0};
  const currentPane=()=>document.querySelector('.screen:not([hidden]) .section-scroll, .post-content');
  let starNodes=[];
  function readingBounds(){const r=currentPane().getBoundingClientRect();Object.assign(reading,{left:r.left-10,top:r.top-10,right:r.right+10,bottom:r.bottom+10});}
  function refreshStars(){starNodes=Array.from(document.querySelectorAll('.side-star')).map(node=>({node,x:parseFloat(node.style.left),y:parseFloat(node.style.top),light:node.querySelector('.star-light'),reflection:node.querySelector('.star-reflection')}));}
  function clearStars(){for(const star of starNodes)for(const part of [star.light,star.reflection]){part.style.removeProperty('translate');part.style.removeProperty('scale');}}
  const foamInk=foamCanvas.getContext('2d');const foam=[];let foamScale=1;
  let cell,w,h,height,velocity,nextHeight,nextVelocity,slopes,absorb,laplacian,currentX,currentY;
  let frame=0,lastTime=0,accumulator=0,lastInput=0,lastPoint=null,strokeLength=0,totalSamples=0,lastCost=0;
  const STEP=1/120,C=52,CAPILLARY=14000,VISCOSITY=12,FLOW=12,LIFETIME=4.2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const enabled=()=>!document.hidden&&!reduced.matches&&!document.body.classList.contains('still');
  function reset(){clearStars();foam.length=0;foamInk.clearRect(0,0,innerWidth,innerHeight);if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;accumulator=0;lastPoint=null;strokeLength=0;lastInput=0;
    if(height){height.fill(0);velocity.fill(0);nextHeight.fill(0);nextVelocity.fill(0);currentX.fill(0);currentY.fill(0);slopes.fill(0);render(slopes,w,h,0);}}
  function resize(){reset();readingBounds();refreshStars();cell=Math.max(2,innerWidth/600);w=Math.ceil(innerWidth/cell)+2;h=Math.ceil(innerHeight/cell)+2;
    const n=w*h;height=new Float32Array(n);velocity=new Float32Array(n);nextHeight=new Float32Array(n);nextVelocity=new Float32Array(n);slopes=new Float32Array(n*2);absorb=new Float32Array(n);laplacian=new Float32Array(n);currentX=new Float32Array(n);currentY=new Float32Array(n);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const edge=Math.min(x,y,w-1-x,h-1-y);absorb[y*w+x]=Math.exp(-(1.05+Math.max(0,12-edge)*.65)*STEP);}
    const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
    foamScale=Math.min(devicePixelRatio||1,2);foamCanvas.width=Math.round(innerWidth*foamScale);foamCanvas.height=Math.round(innerHeight*foamScale);foamInk.setTransform(foamScale,0,0,foamScale,0,0);render(slopes,w,h,0);}
  function disturb(x,y,dx,dy,speed,distance){
    const radius=7+Math.min(speed,650)*.0025,gx=x/cell,gy=y/cell,extent=Math.ceil(radius*2.7/cell),magnitude=.64*distance/2.5;
    const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
    for(let py=Math.max(2,Math.floor(gy)-extent);py<Math.min(h-2,gy+extent);py++)for(let px=Math.max(2,Math.floor(gx)-extent);px<Math.min(w-2,gx+extent);px++){
      const rx=(px-gx)*cell,ry=(py-gy)*cell,along=(rx*ux+ry*uy)/(radius*.8),across=(-rx*uy+ry*ux)/radius,q=along*along+across*across;
      if(q>7)continue;
      // A smooth depression and compensating shoulder displace the surface.
      // Samples overlap along the complete path rather than spawning ring sprites.
      const forward=rx*ux+ry*uy,side=-rx*uy+ry*ux;
      const fineRadius=3.2+Math.min(speed,650)*.0007;
      const fineQ=((forward-radius*.42)/fineRadius)**2+(side/(fineRadius*.88))**2;
      // Broad displaced water plus finer ripples at the leading contact region.
      // Both feed the same propagating field; no independently animated rings.
      height[py*w+px]+=magnitude*(.78*(q-1)*Math.exp(-q)+.60*(fineQ-1)*Math.exp(-fineQ));
      // Horizontal current from the moving contact, shared by foam and amber.
      // A bounded momentum impulse accumulates along the sampled stroke.
      const push=distance*Math.min(speed,700)*.12*Math.exp(-q*.55),index=py*w+px;
      currentX[index]=Math.max(-280,Math.min(280,currentX[index]+ux*push));
      currentY[index]=Math.max(-280,Math.min(280,currentY[index]+uy*push));
    }
    // Sparse surface froth travels with the wake, without flying particles.
    const aeration=Math.max(0,Math.min(1,(speed-40)/340));
    if(foam.length<240&&Math.random()<aeration*distance*.16){
      const side=Math.random()<.5?-1:1,offset=(.65+Math.random()*.45)*radius*side;
      foam.push({x:x-ux*(3+Math.random()*7)-uy*offset,y:y-uy*(3+Math.random()*7)+ux*offset,
        vx:ux*Math.min(24,speed*.035),vy:uy*Math.min(24,speed*.035)+FLOW,
        age:0,life:.6+Math.random()*.8,radius:.45+Math.random()*.9,bubble:Math.random()<.3,opacity:.5+Math.random()*.35});
    }
    totalSamples++;
  }
  function step(){
    const inverseCell2=1/(cell*cell),transport=FLOW*STEP/cell,currentDecay=Math.exp(-2.4*STEP);
    // Linear gravity-capillary surface model: h_tt = c² ∇²h − k ∇⁴h.
    // Surface tension gives small wavelets a different speed from the broad wake.
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x;
      laplacian[i]=((height[i-1]+height[i+1]+height[i-w]+height[i+w])*(2/3)
        +(height[i-w-1]+height[i-w+1]+height[i+w-1]+height[i+w+1])/6-height[i]*(10/3))*inverseCell2;
    }
    for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
      const i=y*w+x,a=height[i];
      // Approximate surface current: pressure response plus contact momentum.
      // The established height-wave solver below is unchanged.
      currentX[i]=(currentX[i]-((height[i+1]-height[i-1])/(2*cell))*150*STEP)*currentDecay;
      currentY[i]=(currentY[i]-((height[i+w]-height[i-w])/(2*cell))*150*STEP)*currentDecay;
      const bending=((laplacian[i-1]+laplacian[i+1]+laplacian[i-w]+laplacian[i+w])*(2/3)
        +(laplacian[i-w-1]+laplacian[i-w+1]+laplacian[i+w-1]+laplacian[i+w+1])/6-laplacian[i]*(10/3))*inverseCell2;
      // Laplacian viscosity damps short wavelengths faster than broad waves.
      const lapVelocity=(velocity[i-1]+velocity[i+1]+velocity[i-w]+velocity[i+w]-4*velocity[i])*inverseCell2;
      const v=(velocity[i]+STEP*(C*C*laplacian[i]-CAPILLARY*bending+VISCOSITY*lapVelocity))*absorb[i];
      nextVelocity[i]=v-transport*(velocity[i]-velocity[i-w]);
      nextHeight[i]=(a+v*STEP-transport*(a-height[i-w]))*Math.exp(-.10*STEP);
    }
    [height,nextHeight]=[nextHeight,height];[velocity,nextVelocity]=[nextVelocity,velocity];
  }
  function drawFoam(dt,fade){
    foamInk.clearRect(0,0,innerWidth,innerHeight);
    for(let i=foam.length-1;i>=0;i--){const p=foam[i];p.age+=dt;if(p.age>p.life){foam.splice(i,1);continue;}
      const gx=Math.max(1,Math.min(w-2,Math.round(p.x/cell))),gy=Math.max(1,Math.min(h-2,Math.round(p.y/cell))),index=gy*w+gx;
      const ax=-(height[index+1]-height[index-1])*9,ay=-(height[index+w]-height[index-w])*9;
      p.vx+=(ax+(currentX[index]-p.vx)*5)*dt;p.vy+=(ay+(FLOW+currentY[index]-p.vy)*5)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const life=Math.min(1,p.age/.06)*Math.pow(1-p.age/p.life,1.2),alpha=p.opacity*life*fade;
      foamInk.globalAlpha=alpha;foamInk.lineWidth=.55;foamInk.fillStyle='#eef8ff';foamInk.strokeStyle='#e5f5ff';
      foamInk.beginPath();foamInk.ellipse(p.x,p.y,p.radius*1.12,p.radius*.82,0,0,Math.PI*2);
      if(p.bubble){foamInk.stroke();foamInk.beginPath();foamInk.arc(p.x-p.radius*.15,p.y-p.radius*.15,p.radius*.66,Math.PI,Math.PI*1.75);foamInk.stroke();}
      else foamInk.fill();
    }
    foamInk.globalAlpha=1;
  }
  function warpStars(fade){
    for(const star of starNodes)for(const [part,offset] of [[star.light,0],[star.reflection,12]]){
      const gx=Math.max(1,Math.min(w-2,Math.round(star.x/cell))),gy=Math.max(1,Math.min(h-2,Math.round((star.y+offset)/cell))),i=gy*w+gx;
      const dx=slopes[i*2],dy=slopes[i*2+1];
      const x=Math.max(-6,Math.min(6,dx*85))*fade,y=Math.max(-5,Math.min(5,dy*75))*fade;
      part.style.translate=`${x.toFixed(3)}px ${y.toFixed(3)}px`;
      part.style.scale=`${(1+Math.max(-.35,Math.min(.55,dx*7))*fade).toFixed(3)} ${(1+Math.max(-.25,Math.min(.35,dy*5))*fade).toFixed(3)}`;
    }
  }
  function tick(now){frame=0;if(!enabled()){reset();return;}readingBounds();const start=performance.now(),age=(now-lastInput)/1000;
    if(age>LIFETIME){reset();return;}
    const elapsed=lastTime?Math.min((now-lastTime)/1000,.07):STEP;accumulator+=elapsed;lastTime=now;
    while(accumulator>=STEP){step();accumulator-=STEP;}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;slopes[i*2]=(height[i+1]-height[i-1])/(2*cell);slopes[i*2+1]=(height[i+w]-height[i-w])/(2*cell);}
    const t=Math.max(0,Math.min(1,(LIFETIME-age)/.65));render(slopes,w,h,t*t*(3-2*t));drawFoam(elapsed,t);warpStars(t);lastCost=performance.now()-start;
    frame=requestAnimationFrame(tick);
  }
  // Read the same continuous surface used for lighting and star distortion.
  // These slopes drive the amber grains; they are not a separate noise field.
  function sampleSurface(x,y){
    if(!enabled()||!frame)return {height:0,dx:0,dy:0,flowX:0,flowY:FLOW};
    const gx=Math.max(1,Math.min(w-3,x/cell)),gy=Math.max(1,Math.min(h-3,y/cell));
    const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
    const sample=(array,stride,component)=>{const i=(iy*w+ix)*stride+component;
      return (array[i]*(1-fx)+array[i+stride]*fx)*(1-fy)+(array[i+w*stride]*(1-fx)+array[i+(w+1)*stride]*fx)*fy;};
    return {height:sample(height,1,0),dx:sample(slopes,2,0),dy:sample(slopes,2,1),flowX:sample(currentX,1,0),flowY:FLOW+sample(currentY,1,0)};
  }
  function impulse(x,y,strength=.8){
    if(!enabled())return;
    const gx=x/cell,gy=y/cell,radius=12,extent=Math.ceil(radius*2.7/cell);
    for(let py=Math.max(2,Math.floor(gy)-extent);py<Math.min(h-2,gy+extent);py++)for(let px=Math.max(2,Math.floor(gx)-extent);px<Math.min(w-2,gx+extent);px++){
      const q=(((px-gx)*cell)**2+((py-gy)*cell)**2)/(radius*radius);
      if(q<7)height[py*w+px]+=strength*(q-1)*Math.exp(-q);
    }
    lastInput=performance.now();if(!frame)frame=requestAnimationFrame(tick);
  }
  function move(event){
    if(!enabled()||event.pointerType==='touch'||event.buttons||!(event.target instanceof Element)||!event.target.closest('[data-cursor-water="wake"]')||event.target.closest('.section-scroll,.post-content,a,button,summary,input,textarea,select')){lastPoint=null;return;}
    const points=event.getCoalescedEvents?.();
    for(const point of points?.length?points:[event]){
      const now=performance.now(),x=point.clientX,y=point.clientY;
      if(!lastPoint||now-lastPoint.time>220){lastPoint={x,y,time:now};strokeLength=0;continue;}
      const dx=x-lastPoint.x,dy=y-lastPoint.y,length=Math.hypot(dx,dy);
      if(length<.5)continue;
      if(length>260){lastPoint={x,y,time:now};continue;}
      const speed=length/Math.max(.008,(now-lastPoint.time)/1000),samples=Math.ceil(length/2.5);
      for(let i=1;i<=samples;i++)disturb(lastPoint.x+dx*i/samples,lastPoint.y+dy*i/samples,dx,dy,speed,length/samples);
      strokeLength+=length;lastPoint={x,y,time:now};lastInput=now;if(!frame)frame=requestAnimationFrame(tick);
    }
  }
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerleave',()=>{lastPoint=null;});
  addEventListener('sectionchange',()=>{reset();refreshStars();});addEventListener('sectionlayout',()=>{readingBounds();clearStars();refreshStars();});document.addEventListener('scroll',reset,{capture:true,passive:true});document.addEventListener('wheel',reset,{passive:true});addEventListener('resize',resize);
  document.addEventListener('visibilitychange',reset);reduced.addEventListener('change',reset);
  new MutationObserver(()=>{if(!enabled())reset();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  resize();
  window.waterWake={sample:sampleSurface,impulse,state:()=>({active:Boolean(frame),section:document.body.dataset.section||'article',strokeLength,totalSamples,foamCount:foam.length,frameCostMs:lastCost,reading:{...reading},grid:[w,h],renderer:gl?'webgl2':'canvas2d',maxHeight:height.reduce((a,v)=>Math.max(a,Math.abs(v)),0)})};
  window.introWake=window.waterWake; // Preserve the local inspection hook.
})();
