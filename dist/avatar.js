// The supplied greeting is composited as video + alpha, with independently tracked eyes.
// This is a 3D-style animated portrait, not a rigged 3D model.
(() => {
  const image = document.getElementById('avatar-fallback');
  const canvas = document.getElementById('avatar-canvas');
  const wrap = document.querySelector('.avatar-wrap');
  const stage = document.querySelector('.avatar-stage');
  const toggle = document.getElementById('avatar-motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const HOLD_MS = 5000;
  const staticLandmarks = {eyes:[[431/1024,373/1536],[576/1024,358/1536]],open:[1,1],bird:[[675/1024,499/1536,16/1024,18/1536],[630/1024,497/1536,8/1024,13/1536]]};
  let inView = false, userPaused = false, frame = 0, mode = 'static';
  let video, data, gl, program, texture, previousTexture, uniforms;
  let loaded = false, failed = false, packed = false, sourceDirty = false;
  let presentedTime = 0, hasFrameCallback = false, returning = false;
  let holdTimer = 0, holdStarted = 0, holdRemaining = HOLD_MS;
  let pointer = null, gaze = [0,0], birdGaze = [0,0];
  let playPending = false, videoFrameCallback = 0;
  const active = () => inView && !document.hidden && !reduced.matches && !userPaused;
  const clamp = v => Math.max(-1,Math.min(1,v));
  const setMode = value => {mode=value;wrap.dataset.animation=value;};
  const schedule = () => {if(!frame && inView && !document.hidden && gl)frame=requestAnimationFrame(draw);};
  const eyeUniform = (name, point, rx, ry) => gl.uniform4f(uniforms[name],point?.[0]||0,1-(point?.[1]||0),rx,ry);
  function landmarks() {
    if(!packed || !data)return staticLandmarks;
    return data.frames[Math.min(data.frames.length-1,Math.max(0,Math.round(presentedTime*data.fps)))];
  }
  function draw() {
    frame=0;
    if(!gl || !inView || document.hidden)return;
    if(packed && video.readyState>=2 && !video.seeking) {
      if(!hasFrameCallback && !video.paused){presentedTime=video.currentTime;sourceDirty=true;}
      if(sourceDirty) {
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
        sourceDirty=false;
      }
    }
    const points=landmarks(), center=[(points.eyes[0][0]+points.eyes[1][0])/2,(points.eyes[0][1]+points.eyes[1][1])/2];
    const birdCenter=points.bird[0]||[.64,.325];
    let target=[0,0],birdTarget=[0,0];
    if(pointer && finePointer.matches && !reduced.matches) {
      const r=stage.getBoundingClientRect();
      target=[clamp((pointer[0]-(r.left+r.width*center[0]))/(r.width*.78)),clamp(((r.top+r.height*center[1])-pointer[1])/(r.height*.4))];
      birdTarget=[clamp((pointer[0]-(r.left+r.width*birdCenter[0]))/(r.width*.75)),clamp(((r.top+r.height*birdCenter[1])-pointer[1])/(r.height*.4))];
    }
    gaze=gaze.map((v,i)=>v+(target[i]-v)*.2);
    birdGaze=birdGaze.map((v,i)=>v+(birdTarget[i]-v)*.18);
    gl.uniform2fv(uniforms.gaze,gaze);gl.uniform2fv(uniforms.birdGaze,birdGaze);
    eyeUniform('leftEye',points.eyes[0],.044,Math.max(.001,.021*points.open[0]));
    eyeUniform('rightEye',points.eyes[1],.044,Math.max(.001,.021*points.open[1]));
    gl.uniform2f(uniforms.eyeOpen,points.open[0],points.open[1]);
    for(let i=0;i<2;i++) {
      const b=points.bird[i];eyeUniform(i?'birdEyeB':'birdEyeA',b,b?.[2]||.001,b?.[3]||.001);
    }
    gl.uniform2f(uniforms.birdOpen,points.bird[0]?1:0,points.bird[1]?1:0);
    gl.uniform1f(uniforms.isPacked,packed?1:0);
    wrap.classList.toggle('is-animated',packed);
    const blend=returning?Math.max(0,1-presentedTime/.32):0;
    gl.uniform1f(uniforms.returnBlend,blend*blend*(3-2*blend));
    if(returning && blend===0)returning=false;
    gl.drawArrays(gl.TRIANGLES,0,6);
    const unsettled=gaze.some((v,i)=>Math.abs(target[i]-v)>.002)||birdGaze.some((v,i)=>Math.abs(birdTarget[i]-v)>.002);
    if(unsettled || (active() && mode==='greeting'))schedule();
  }
  function pauseHold() {
    if(!holdTimer)return;
    clearTimeout(holdTimer);holdTimer=0;
    holdRemaining=Math.max(0,holdRemaining-(performance.now()-holdStarted));
  }
  function resumeHold() {
    if(holdTimer || !active() || mode!=='holding')return;
    holdStarted=performance.now();
    holdTimer=setTimeout(()=>{
      holdTimer=0;holdRemaining=0;
      if(!active())return;
      returning=true;setMode('restarting');
      video.currentTime=0;
      // Seeking retains the last rendered frame until a decoded first frame is available.
    },holdRemaining);
  }
  function play() {
    if(!loaded || !active() || playPending || !video.paused || mode==='holding' || mode==='restarting')return;
    playPending=true;
    video.play().then(()=>{
      playPending=false;
      if(!active()){video.pause();return;}
      setMode('greeting');schedule();
    }).catch(()=>{
      playPending=false;userPaused=true;updateToggle();
    });
  }
  function updateToggle() {
    toggle.hidden=!loaded || reduced.matches || failed;
    toggle.setAttribute('aria-pressed',String(userPaused));
    toggle.setAttribute('aria-label',userPaused?'Play greeting animation':'Pause greeting animation');
    toggle.dataset.paused=String(userPaused);
  }
  function sync() {
    if(reduced.matches) {
      video?.pause();pauseHold();returning=false;packed=false;pointer=null;gaze=[0,0];birdGaze=[0,0];
      if(gl) {gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
      setMode('static');schedule();
    } else if(active()) {
      if(!loaded && !failed)loadVideo();
      else if(loaded) {
        if(!packed){packed=true;sourceDirty=true;presentedTime=video.currentTime;setMode(video.ended?'holding':'greeting');holdRemaining=HOLD_MS;}
        if(mode==='holding')resumeHold();else play();
        schedule();
      }
    } else {
      video?.pause();pauseHold();
      if(frame){cancelAnimationFrame(frame);frame=0;}
    }
    updateToggle();
  }
  function fallback() {
    failed=true;loaded=false;packed=false;video?.pause();pauseHold();
    if(videoFrameCallback)video.cancelVideoFrameCallback?.(videoFrameCallback);
    setMode('static');toggle.hidden=true;
    if(gl){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);schedule();}
  }
  async function loadVideo() {
    if(video || !gl || reduced.matches)return;
    video=document.createElement('video');video.id='avatar-video';
    video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
    video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.className='avatar-video-source';stage.append(video);
    video.addEventListener('error',fallback);
    video.addEventListener('ended',()=>{
      presentedTime=(data.frames.length-1)/data.fps;sourceDirty=true;
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,previousTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      holdRemaining=HOLD_MS;setMode('holding');schedule();resumeHold();
    });
    video.addEventListener('seeked',()=>{
      sourceDirty=true;presentedTime=video.currentTime;
      if(mode==='restarting'){setMode('greeting');play();}
      schedule();
    });
    try {
      const response=await fetch('./assets/chloe-greeting-landmarks.json?v=aligned-seams-2');
      if(!response.ok)throw new Error('Missing greeting landmarks');
      data=await response.json();
      if(!data.frames?.length)throw new Error('Empty greeting landmarks');
      if('requestVideoFrameCallback' in video) {
        hasFrameCallback=true;
        const decoded=(_,info)=>{
          presentedTime=info.mediaTime;sourceDirty=true;schedule();
          if(!failed)videoFrameCallback=video.requestVideoFrameCallback(decoded);
        };
        videoFrameCallback=video.requestVideoFrameCallback(decoded);
      }
      video.addEventListener('loadeddata',()=>{
        if(failed)return;
        loaded=true;packed=!reduced.matches;sourceDirty=true;sync();
      },{once:true});
      video.src='./assets/chloe-greeting.mp4?v=aligned-seams-2';video.load();
    } catch {fallback();}
  }
  function initialize() {
    gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
    if(!gl)return;
    canvas.width=768;canvas.height=1152;
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Portrait shader failed');
      return shader;
    };
    try {
      const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}');
      const fragment=compile(gl.FRAGMENT_SHADER,`precision highp float;
        varying vec2 uv;
        uniform sampler2D portrait,previousPortrait;
        uniform vec2 gaze,birdGaze,eyeOpen,birdOpen;
        uniform vec4 leftEye,rightEye,birdEyeA,birdEyeB;
        uniform float isPacked,returnBlend;
        float eyeMask(vec2 p,vec4 eye){return 1.-smoothstep(.24,1.,length((p-eye.xy)/eye.zw));}
        vec4 unpackPortrait(sampler2D tex,vec2 p){
          vec2 colorUV=vec2(clamp(p.x*.5,.0004,.4996),p.y);
          float alpha=texture2D(tex,colorUV+vec2(.5,0.)).r;
          vec3 premult=texture2D(tex,colorUV).rgb;
          return vec4(premult/max(alpha,.008),smoothstep(.008,.995,alpha));
        }
        void main(){
          float face=max(eyeMask(uv,leftEye)*eyeOpen.x,eyeMask(uv,rightEye)*eyeOpen.y);
          vec2 shift=gaze*vec2(10./1024.,5.5/1536.)*face;
          shift+=birdGaze*vec2(3.2/1024.,2.6/1536.)*(eyeMask(uv,birdEyeA)*birdOpen.x+eyeMask(uv,birdEyeB)*birdOpen.y);
          vec2 p=clamp(uv-shift,vec2(0.),vec2(1.));
          if(isPacked<.5){gl_FragColor=texture2D(portrait,p);return;}
          vec4 current=unpackPortrait(portrait,p);
          if(returnBlend>.001){
            vec4 previous=unpackPortrait(previousPortrait,p);
            float a=mix(current.a,previous.a,returnBlend);
            vec3 rgb=mix(current.rgb*current.a,previous.rgb*previous.a,returnBlend);
            current=vec4(rgb/max(a,.008),a);
          }
          gl_FragColor=current;
        }`);
      program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Portrait program failed');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      const makeTexture=unit=>{
        gl.activeTexture(unit);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;
      };
      texture=makeTexture(gl.TEXTURE0);previousTexture=makeTexture(gl.TEXTURE1);
      uniforms=Object.fromEntries(['gaze','birdGaze','eyeOpen','birdOpen','leftEye','rightEye','birdEyeA','birdEyeB','isPacked','returnBlend'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gl.uniform1i(gl.getUniformLocation(program,'portrait'),0);gl.uniform1i(gl.getUniformLocation(program,'previousPortrait'),1);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.viewport(0,0,canvas.width,canvas.height);
      inView=wrap.getBoundingClientRect().bottom>0 && wrap.getBoundingClientRect().top<innerHeight;
      draw();wrap.classList.add('is-ready');sync();
    } catch(error) {console.warn('Greeting renderer: using static portrait.',error.message);gl=null;wrap.classList.remove('is-ready');}
  }
  toggle.addEventListener('click',()=>{userPaused=!userPaused;sync();});
  document.addEventListener('pointermove',event=>{
    if(reduced.matches || !finePointer.matches || event.pointerType!=='mouse' || !inView)return;
    pointer=[event.clientX,event.clientY];schedule();
  },{passive:true});
  const resetPointer=()=>{pointer=null;schedule();};
  document.documentElement.addEventListener('pointerleave',resetPointer);window.addEventListener('blur',resetPointer);
  reduced.addEventListener('change',sync);finePointer.addEventListener('change',resetPointer);
  document.addEventListener('visibilitychange',sync);
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;sync();},{threshold:0}).observe(wrap);
  canvas.addEventListener('webglcontextlost',()=>{
    video?.pause();pauseHold();if(frame)cancelAnimationFrame(frame);gl=null;failed=true;toggle.hidden=true;wrap.classList.remove('is-ready');
  });
  if(image.complete && image.naturalWidth)initialize();else image.addEventListener('load',initialize,{once:true});
})();
