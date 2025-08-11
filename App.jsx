import React, { useEffect, useRef, useState } from "react";

/**
 * Internship Boredom — Mini Game Hub
 * Games: Flappy, Runner, 2048, Snake, Breakout
 * Chat: Supabase Realtime only (ephemeral global chat)
 *
 * This build removes Firebase and uses Supabase Realtime broadcast/presence only.
 * Messages are NOT persisted.
 */

/******************************
 * Supabase Realtime loader (broadcast presence, no DB required)
 ******************************/
let __sb = null;
async function loadSupabase(){
  if (__sb) return __sb;
  const mod = await import('@supabase/supabase-js');
  __sb = { createClient: mod.createClient };
  return __sb;
}

/******************************
 * Root App
 ******************************/
export default function InternshipBoredomHub() {
  const [tab, setTab] = useState("home");
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-slate-100 text-slate-800">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid md:grid-cols-[220px_1fr] gap-4">
          <nav className="sticky top-2 self-start bg-white/80 backdrop-blur rounded-2xl shadow border p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2 pb-2">Games</div>
            <MenuButton onClick={() => setTab("flappy")}   active={tab === "flappy"}   icon="🐤" label="Flappy" />
            <MenuButton onClick={() => setTab("runner")}   active={tab === "runner"}   icon="🏃" label="Runner" />
            <MenuButton onClick={() => setTab("2048")}     active={tab === "2048"}     icon="🔢" label="2048" />
            <MenuButton onClick={() => setTab("snake")}    active={tab === "snake"}    icon="🐍" label="Snake" />
            <MenuButton onClick={() => setTab("breakout")} active={tab === "breakout"} icon="🧱" label="Breakout" />
            <div className="h-px bg-slate-200 my-2" />
            <MenuButton onClick={() => setTab("chat")}     active={tab === "chat"}     icon="💬" label="Global Chat" />
            <MenuButton onClick={() => setTab("credits")}  active={tab === "credits"}  icon="👤" label="Credits" />
            <div className="h-px bg-slate-200 my-2" />
            <MenuButton onClick={() => setTab("home")}     active={tab === "home"}     icon="🏠" label="Home" />
          </nav>
          <main className="min-h-[70vh]">
            {tab === "home"     && <HomePanel onStart={() => setTab("flappy")} />}
            {tab === "flappy"   && <FlappyGame />}
            {tab === "runner"   && <RunnerGame />}
            {tab === "2048"     && <Game2048 />}
            {tab === "snake"    && <SnakeGame />}
            {tab === "breakout" && <BreakoutGame />}
            {tab === "chat"     && <ChatPanel />}
            {tab === "credits"  && <Credits />}
          </main>
        </div>
      </div>
      <Footer />
      <DevTests />
    </div>
  );
}

/******************************
 * Layout bits
 ******************************/
function Header() {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🧑‍💼😵‍💫</div>
          <div>
            <div className="text-xl font-extrabold">Internship Boredom</div>
            <div className="text-xs text-slate-500">Micro‑games • Supabase Realtime Chat</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          <span>React + Canvas • Realtime over WebSockets</span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t py-6 text-center text-xs text-slate-500">
      Pro tip: Flappy with <kbd className="px-1 rounded bg-slate-200">Space</kbd>; Runner jump with Space; 2048 with arrows; Snake with arrows; Breakout with arrows or mouse.
    </footer>
  );
}

function MenuButton({ onClick, active, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition shadow-sm border ${
        active ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function HomePanel({ onStart }) {
  return (
    <div className="rounded-2xl bg-white shadow border p-6">
      <h2 className="text-2xl font-bold mb-2">Welcome 👋</h2>
      <p className="text-slate-600 mb-4">
        A tiny arcade for bored interns and focus‑challenged adults. Jump into a game or open the global chat to
        commiserate with the rest of the world.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={onStart} className="px-4 py-2 rounded-xl bg-slate-900 text-white shadow">Play Flappy</button>
        <a href="#chat" onClick={(e)=>{e.preventDefault(); const el=document.querySelector('[data-tab-chat]'); el?.scrollIntoView({behavior:'smooth'});}}
           className="px-4 py-2 rounded-xl bg-white border shadow text-slate-700">Open Chat</a>
      </div>
    </div>
  );
}

/******************************
 * Game 1: Flappy (compact)
 ******************************/
function FlappyGame() {
  const W = 360, H = 560, GROUND = 70, BIRD_X = Math.round(W*0.25), BIRD_R = 14;
  const GRAVITY = 1500, FLAP_V = -420, PIPE_W = 66, GAP_MIN = 135, GAP_MAX = 180, SPAWN = 1.35, SPEED = 170, TOP = 40;
  const canvasRef = useRef(null); const rafRef = useRef(0);
  const [phase, setPhase] = useState("ready"); const [score, setScore] = useState(0); const [best, setBest] = useState(()=>parseInt(localStorage.getItem("ib-flappy-best")||"0"));
  const state = useRef({ y:H/2, v:0, pipes:[], t:0, last:0 });

  useEffect(()=>{ const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d');
    const scale=()=>{ const dpr=Math.min(devicePixelRatio||1,2); c.width=W*dpr; c.height=H*dpr; c.style.width=W+"px"; c.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); }; scale();
    const draw=()=>{ const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#87CEEB"); g.addColorStop(1,"#cfefff"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#2ecc71"; ctx.strokeStyle="#27ae60"; ctx.lineWidth=4;
      for(const p of state.current.pipes){ const topH=Math.max(TOP,p.gapY-p.gapH/2); const botY=p.gapY+p.gapH/2; const botH=Math.max(10,H-GROUND-botY);
        ctx.beginPath(); ctx.rect(p.x,0,PIPE_W,topH); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.rect(p.x,botY,PIPE_W,botH); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle="#d9a760"; ctx.fillRect(0,H-GROUND,W,GROUND); ctx.fillStyle="#9ccc65"; ctx.fillRect(0,H-GROUND,W,8);
      const y=state.current.y, vy=state.current.v, tilt=Math.max(-0.6, Math.min(0.9, vy/600));
      ctx.save(); ctx.translate(BIRD_X,y); ctx.rotate(tilt); ctx.fillStyle="#f1c40f"; ctx.beginPath(); ctx.arc(0,0,BIRD_R,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(6,-4,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(7,-4,2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#e67e22"; ctx.beginPath(); ctx.moveTo(BIRD_R-2,0); ctx.lineTo(BIRD_R+10,-4); ctx.lineTo(BIRD_R+10,4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle="#000"; ctx.globalAlpha=.15; ctx.fillRect(10,10,96,40); ctx.globalAlpha=1; ctx.fillStyle="#fff"; ctx.font="bold 24px ui-sans-serif"; ctx.fillText(`Score: ${score}`,18,38);
      ctx.textAlign='center'; ctx.fillStyle="#fff";
      if(phase==='ready'){ banner(ctx,W,H,"Flappy — Click/Space to start"); }
      if(phase==='paused'){ banner(ctx,W,H,"Paused — P to resume"); }
      if(phase==='gameover'){ banner(ctx,W,H,`Game Over — Score ${score} • Best ${best}`); }
    };
    const update=(dt)=>{ if(phase!=="playing") return; const s=state.current; s.v+=GRAVITY*dt; s.y+=s.v*dt; s.t+=dt;
      if(s.t>SPAWN){ s.t=0; const gapH=rand(GAP_MIN,GAP_MAX); const minY=TOP+gapH/2+10, maxY=H-GROUND-gapH/2-10; const gapY=rand(minY,maxY); s.pipes.push({x:W+10,gapY,gapH,passed:false}); }
      for(const p of s.pipes){ p.x-=SPEED*dt; if(!p.passed && p.x+PIPE_W < BIRD_X-BIRD_R){ p.passed=true; const n=score+1; setScore(n); if(n>best){ setBest(n); localStorage.setItem("ib-flappy-best", String(n)); } } }
      if(s.pipes.length && s.pipes[0].x+PIPE_W<-40) s.pipes.shift();
      if(s.y+BIRD_R>=H-GROUND || s.y-BIRD_R<=0) return setPhase("gameover");
      for(const p of s.pipes){ const inX= BIRD_X+BIRD_R>p.x && BIRD_X-BIRD_R<p.x+PIPE_W; if(inX){ const topH=Math.max(TOP,p.gapY-p.gapH/2); const botY=p.gapY+p.gapH/2; if(s.y-BIRD_R<topH || s.y+BIRD_R>botY) return setPhase("gameover"); } }
    };
    const loop=(t)=>{ const s=state.current; if(!s.last) s.last=t; let dt=(t-s.last)/1000; s.last=t; dt=Math.min(dt,1/30); update(dt); draw(); rafRef.current=requestAnimationFrame(loop); };
    const onKey=(e)=>{ if(e.repeat) return; if(e.code==='Space'){ e.preventDefault(); flap(); } else if(e.key.toLowerCase()==='p'){ setPhase(p=>p==='playing'?'paused':'playing'); } else if(e.key.toLowerCase()==='r'){ restart(); } };
    window.addEventListener('keydown', onKey); rafRef.current=requestAnimationFrame(loop); return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); };
  }, [phase, score, best]);
  const flap=()=>{ if(phase==='ready') start(); else if(phase==='playing') state.current.v=FLAP_V; else if(phase==='gameover') restart(); };
  const start=()=>{ setScore(0); state.current={ y:H/2, v:0, pipes:[], t:0, last:0 }; setPhase('playing'); };
  const restart=()=>{ setScore(0); state.current={ y:H/2, v:0, pipes:[], t:0, last:0 }; setPhase('ready'); };
  const rand=(a,b)=> a+Math.random()*(b-a);
  const banner=(ctx,W,H,text)=>{ ctx.fillStyle="#000"; ctx.globalAlpha=.35; ctx.fillRect(20,H/2-60,W-40,120); ctx.globalAlpha=1; ctx.fillStyle="#fff"; ctx.font="bold 18px ui-sans-serif"; ctx.fillText(text, W/2, H/2+6); };
  return (
    <section className="rounded-2xl bg-white shadow border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🐤 Flappy</h2>
        <div className="text-xs text-slate-500">Click/Tap/Space to flap • P pause • R restart</div>
      </div>
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} width={W} height={H} onPointerDown={flap} className="rounded-xl border shadow touch-none select-none" />
      </div>
    </section>
  );
}

/******************************
 * Game 2: Runner (Dino‑style)
 ******************************/
function RunnerGame(){
  const W=600, H=220, G=180; // ground y
  const canvasRef=useRef(null); const rafRef=useRef(0);
  const [phase,setPhase]=useState('ready'); const [score,setScore]=useState(0); const [best,setBest]=useState(()=>parseInt(localStorage.getItem('ib-runner-best')||'0'));
  const s=useRef({x:50,y:G-32,v:0,obs:[],t:0,last:0,speed:280});
  useEffect(()=>{ const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d');
    const scale=()=>{ const dpr=Math.min(devicePixelRatio||1,2); c.width=W*dpr; c.height=H*dpr; c.style.width=W+"px"; c.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);}; scale();
    const draw=()=>{ ctx.fillStyle='#f8fafc'; ctx.fillRect(0,0,W,H); ctx.strokeStyle='#94a3b8'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,G); ctx.lineTo(W,G); ctx.stroke();
      ctx.fillStyle="#0f172a"; ctx.fillRect(s.current.x, s.current.y, 28, 28);
      ctx.fillStyle="#22c55e"; for(const o of s.current.obs){ ctx.fillRect(o.x, G-20-o.h, 12, 20+o.h); }
      ctx.fillStyle="#64748b"; ctx.font='bold 16px ui-sans-serif'; ctx.fillText(`Score: ${score}`, 12, 20);
      if(phase==='ready') centerText(ctx,W,H,'Runner — Space/Click to start');
      if(phase==='gameover') centerText(ctx,W,H,`Game Over — Score ${score} • Best ${best}`);
    };
    const update=(dt)=>{ if(phase!=='playing') return; const st=s.current; st.v+=1500*dt; st.y+=st.v*dt; if(st.y>G-32){ st.y=G-32; st.v=0; }
      st.t+=dt; if(st.t>rand(0.9,1.4)){ st.t=0; st.obs.push({x:W+20,h:Math.floor(rand(10,50)),passed:false}); }
      for(const o of st.obs){ o.x-=st.speed*dt; if(!o.passed && o.x+12<st.x){ o.passed=true; const n=score+1; setScore(n); if(n>best){ setBest(n); localStorage.setItem('ib-runner-best',String(n)); } st.speed=Math.min(520, st.speed+6); } }
      if(st.obs.length && st.obs[0].x<-30) st.obs.shift();
      for(const o of st.obs){ const hitX= st.x+28>o.x && st.x<o.x+12; const hitY= st.y+28 > G-20-o.h; if(hitX && hitY){ setPhase('gameover'); return; } }
    };
    const loop=(t)=>{ const st=s.current; if(!st.last) st.last=t; let dt=(t-st.last)/1000; st.last=t; dt=Math.min(dt,1/30); update(dt); draw(); rafRef.current=requestAnimationFrame(loop); };
    const onKey=(e)=>{ if(e.repeat) return; if(e.code==='Space'){ e.preventDefault(); jump(); } if(e.key.toLowerCase()==='r'){ restart(); } };
    window.addEventListener('keydown', onKey); rafRef.current=requestAnimationFrame(loop); return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); };
  }, [phase, score, best]);
  const centerText=(ctx,W,H,txt)=>{ ctx.fillStyle='#000'; ctx.globalAlpha=.1; ctx.fillRect(20,H/2-50,W-40,100); ctx.globalAlpha=1; ctx.fillStyle='#0f172a'; ctx.font='bold 18px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(txt, W/2, H/2+6); };
  const rand=(a,b)=> a+Math.random()*(b-a);
  const start=()=>{ setScore(0); s.current={x:50,y:G-32,v:0,obs:[],t:0,last:0,speed:280}; setPhase('playing'); };
  const restart=()=>{ setScore(0); s.current={x:50,y:G-32,v:0,obs:[],t:0,last:0,speed:280}; setPhase('ready'); };
  const jump=()=>{ if(phase==='ready') start(); else if(phase==='playing' && s.current.y>=G-32-1){ s.current.v=-520; } else if(phase==='gameover'){ restart(); }};
  return (
    <section className="rounded-2xl bg-white shadow border p-4 mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🏃 Runner</h2>
        <div className="text-xs text-slate-500">Space/Click to jump • R restart</div>
      </div>
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={220} onPointerDown={jump} className="rounded-xl border shadow touch-none select-none" />
      </div>
    </section>
  );
}

/******************************
 * Game 3: 2048 (keyboard arrows / swipe)
 ******************************/
function Game2048(){
  const [grid, setGrid] = useState(()=> spawn(spawn(empty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(()=>parseInt(localStorage.getItem('ib-2048-best')||'0'));
  const [status, setStatus] = useState('playing');
  useEffect(()=>{ const onKey=(e)=>{ const map={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}; if(map[e.key]){ e.preventDefault(); move(map[e.key]); } };
    window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey);
  });
  useEffect(()=>{ let sx=0, sy=0; const onStart=(e)=>{ const t=e.touches?.[0]; sx=t.clientX; sy=t.clientY; };
    const onEnd=(e)=>{ const t=e.changedTouches?.[0]; if(!t) return; const dx=t.clientX-sx, dy=t.clientY-sy; const ax=Math.abs(dx), ay=Math.abs(dy); if(Math.max(ax,ay)<24) return; if(ax>ay) move(dx>0?'R':'L'); else move(dy>0?'D':'U'); sx=0; sy=0; };
    const el=document.getElementById('g2048'); el?.addEventListener('touchstart',onStart,{passive:true}); el?.addEventListener('touchend',onEnd); return ()=>{ el?.removeEventListener('touchstart',onStart); el?.removeEventListener('touchend',onEnd); };
  }, [grid]);
  function move(dir){ if(status!=="playing") return; const { next, gained, changed } = slide(grid, dir); if(!changed) return; let g = spawn(next); setGrid(g); const ns = score + gained; setScore(ns); if(ns>best){ setBest(ns); localStorage.setItem('ib-2048-best', String(ns)); } if(!movesAvailable(g)) setStatus('over'); }
  return (
    <section className="rounded-2xl bg-white shadow border p-4 mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🔢 2048</h2>
        <div className="text-xs text-slate-500">Arrow keys or swipe • Best {best}</div>
      </div>
      <div id="g2048" className="flex flex-col md:flex-row gap-4 md:items-start items-center">
        <Board2048 grid={grid} />
        <div className="text-sm text-slate-600 max-w-sm">
          <div className="mb-2">Score: <span className="font-bold">{score}</span></div>
          {status==='over' ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 mb-2">Game over! No more moves.</div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 mb-2">Keep merging tiles to reach 2048.</div>
          )}
          <button onClick={()=>{ setGrid(spawn(spawn(empty()))); setScore(0); setStatus('playing'); }} className="px-3 py-2 rounded-xl bg-slate-900 text-white shadow">Restart</button>
        </div>
      </div>
    </section>
  );
}

function Board2048({ grid }){
  return (
    <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-100 border shadow" style={{width: 312}}>
      {grid.flat().map((v, i)=> (
        <div key={i} className={`h-16 rounded-xl flex items-center justify-center text-lg font-bold ${tileClass(v)}`}>{v||''}</div>
      ))}
    </div>
  );
}

function tileClass(v){
  const map={0:'bg-white text-slate-300 border',2:'bg-amber-50 text-amber-700',4:'bg-amber-100 text-amber-800',8:'bg-orange-200 text-orange-900',16:'bg-orange-300',32:'bg-orange-400',64:'bg-orange-500 text-white',128:'bg-emerald-300',256:'bg-emerald-400',512:'bg-emerald-500 text-white',1024:'bg-sky-500 text-white',2048:'bg-indigo-600 text-white'}; return map[v]||'bg-slate-700 text-white';
}

// 2048 helpers
function empty(){ return Array.from({length:4},()=>Array(4).fill(0)); }
function spawn(g){ const e=[]; for(let r=0;r<4;r++) for(let c=0;c<4;c++) if(!g[r][c]) e.push([r,c]); if(!e.length) return g; const [r,c]=e[Math.floor(Math.random()*e.length)]; const v=Math.random()<0.9?2:4; const ng=g.map(row=>row.slice()); ng[r][c]=v; return ng; }
function slide(grid, dir){
  const L = (row)=>{ const a=row.filter(Boolean); for(let i=0;i<a.length-1;i++){ if(a[i]===a[i+1]){ a[i]*=2; a[i+1]=0; } } const b=a.filter(Boolean); while(b.length<4) b.push(0); return b; };
  const rot = (g)=> g[0].map((_,c)=> g.map(r=> r[c])); // transpose
  let g = grid.map(r=>r.slice()); let gained=0; let changed=false;
  const apply=(rows)=>{ const out=[]; for(const row of rows){ const before=row.slice(); const slid=L(row); for(let i=0;i<4;i++){ if(slid[i]!==before[i]) changed=true; }
      const gain = row.reduce((acc,cur,i)=> acc + (slid[i]>0 && slid[i]!==row[i] && slid[i]===row[i]*2 ? slid[i] : 0), 0); gained+=gain; out.push(slid); }
    return out; };
  if(dir==='L') g = apply(g);
  if(dir==='R') g = apply(g.map(r=> r.slice().reverse())).map(r=> r.reverse());
  if(dir==='U') { g = rot(g); g = apply(g); g = rot(g); }
  if(dir==='D') { g = rot(g); g = apply(g.map(r=> r.slice().reverse())).map(r=> r.reverse()); g = rot(g); }
  return { next:g, gained, changed };
}
function movesAvailable(g){ for(let r=0;r<4;r++) for(let c=0;c<4;c++) if(!g[r][c]) return true; for(let r=0;r<4;r++) for(let c=0;c<4;c++){ const v=g[r][c]; if((g[r+1]?.[c]===v) || (g[r]?.[c+1]===v)) return true; } return false; }

/******************************
 * Game 4: Snake (grid)
 ******************************/
function SnakeGame(){
  const SIZE=18, COLS=22, ROWS=22, W=COLS*SIZE, H=ROWS*SIZE; // grid canvas
  const canvasRef=useRef(null); const rafRef=useRef(0);
  const [phase,setPhase]=useState('ready'); const [score,setScore]=useState(0); const [best,setBest]=useState(()=>parseInt(localStorage.getItem('ib-snake-best')||'0'));
  const s=useRef({ dir:'R', nextDir:'R', snake:[[8,11],[7,11],[6,11]], food:[14,11], last:0, acc:0, speed:8 }); // cells/sec

  useEffect(()=>{ const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d');
    const scale=()=>{ const dpr=Math.min(devicePixelRatio||1,2); c.width=W*dpr; c.height=H*dpr; c.style.width=W+"px"; c.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);}; scale();
    const draw=()=>{ ctx.fillStyle='#0b1220'; ctx.fillRect(0,0,W,H); // grid subtle
      ctx.strokeStyle='#0f1b33'; for(let x=SIZE;x<W;x+=SIZE){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); } for(let y=SIZE;y<H;y+=SIZE){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      // food
      ctx.fillStyle='#ef4444'; ctx.fillRect(s.current.food[0]*SIZE, s.current.food[1]*SIZE, SIZE, SIZE);
      // snake
      ctx.fillStyle='#22c55e'; s.current.snake.forEach(([x,y],i)=>{ ctx.fillRect(x*SIZE+1, y*SIZE+1, SIZE-2, SIZE-2); });
      // score
      ctx.fillStyle='#94a3b8'; ctx.font='bold 14px ui-sans-serif'; ctx.fillText(`Score: ${score}`, 8, 16);
      if(phase==='ready') overlay(ctx,W,H,'Snake — arrows to start');
      if(phase==='gameover') overlay(ctx,W,H,`Game Over — Score ${score} • Best ${best}`);
    };
    const update=(dt)=>{ if(phase!=='playing') return; const st=s.current; st.acc+=dt*st.speed; if(st.acc<1) return; st.acc-=1; st.dir=st.nextDir; const head=st.snake[0].slice();
      if(st.dir==='R') head[0]++; if(st.dir==='L') head[0]--; if(st.dir==='U') head[1]--; if(st.dir==='D') head[1]++;
      if(head[0]<0||head[0]>=COLS||head[1]<0||head[1]>=ROWS) { setPhase('gameover'); return; }
      if(st.snake.some(([x,y])=> x===head[0] && y===head[1])){ setPhase('gameover'); return; }
      st.snake.unshift(head);
      if(head[0]===st.food[0] && head[1]===st.food[1]){ const n=score+1; setScore(n); if(n>best){ setBest(n); localStorage.setItem('ib-snake-best',String(n)); } st.food = randFood(st.snake); }
      else st.snake.pop();
    };
    const loop=(t)=>{ if(!s.current.last) s.current.last=t; const dt=Math.min((t-s.current.last)/1000, 1/15); s.current.last=t; update(dt); draw(); rafRef.current=requestAnimationFrame(loop); };
    const onKey=(e)=>{ const k=e.key; const map={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}; if(map[k]){ const nd=map[k]; const {dir}=s.current; if((dir==='L'&&nd!=='R')||(dir==='R'&&nd!=='L')||(dir==='U'&&nd!=='D')||(dir==='D'&&nd!=='U')) s.current.nextDir=nd; if(phase==='ready') setPhase('playing'); if(phase==='gameover') restart(); }};
    window.addEventListener('keydown', onKey); rafRef.current=requestAnimationFrame(loop); return ()=> { cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); };
  }, [phase, score, best]);
  const randFood=(snake)=>{ let x,y; do{ x=Math.floor(Math.random()*COLS); y=Math.floor(Math.random()*ROWS); } while(snake.some(([sx,sy])=> sx===x && sy===y)); return [x,y]; };
  const restart=()=>{ setScore(0); s.current={ dir:'R', nextDir:'R', snake:[[8,11],[7,11],[6,11]], food:[14,11], last:0, acc:0, speed:8 }; setPhase('ready'); };
  const overlay=(ctx,W,H,txt)=>{ ctx.fillStyle='#000'; ctx.globalAlpha=.35; ctx.fillRect(20,H/2-50,W-40,100); ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.font='bold 18px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(txt, W/2, H/2+6); };
  return (
    <section className="rounded-2xl bg-white shadow border p-4 mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🐍 Snake</h2>
        <div className="text-xs text-slate-500">Arrows to move • eat red squares</div>
      </div>
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} width={COLS*SIZE} height={ROWS*SIZE} className="rounded-xl border shadow touch-none select-none" />
      </div>
    </section>
  );
}

/******************************
 * Game 5: Breakout (paddle + bricks)
 ******************************/
function BreakoutGame(){
  const W=500, H=320; const canvasRef=useRef(null); const rafRef=useRef(0);
  const [phase,setPhase]=useState('ready'); const [score,setScore]=useState(0); const [best,setBest]=useState(()=>parseInt(localStorage.getItem('ib-breakout-best')||'0'));
  const s=useRef({x:W/2, y:H-32, vx:180, vy:-180, r:6, paddleX: W/2-45, bricks:[], cols:8, rows:4, padW:90});
  useEffect(()=>{ const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d');
    const scale=()=>{ const dpr=Math.min(devicePixelRatio||1,2); c.width=W*dpr; c.height=H*dpr; c.style.width=W+"px"; c.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);}; scale();
    if(!s.current.bricks.length){ const b=[]; for(let r=0;r<s.current.rows;r++){ for(let col=0; col<s.current.cols; col++){ b.push({x: 20+col*((W-40)/s.current.cols), y: 30+r*20, w: (W-40)/s.current.cols-4, h: 12, hit:false}); } } s.current.bricks=b; }
    const draw=()=>{ ctx.fillStyle='#f8fafc'; ctx.fillRect(0,0,W,H); 
      ctx.fillStyle='#0f172a'; ctx.fillRect(s.current.paddleX, H-20, s.current.padW, 8);
      ctx.beginPath(); ctx.arc(s.current.x, s.current.y, s.current.r, 0, Math.PI*2); ctx.fillStyle='#2563eb'; ctx.fill();
      ctx.fillStyle='#22c55e'; s.current.bricks.forEach(b=>{ if(!b.hit) ctx.fillRect(b.x, b.y, b.w, b.h); });
      ctx.fillStyle='#64748b'; ctx.font='bold 14px ui-sans-serif'; ctx.fillText(`Score: ${score}`, 8, 16);
      if(phase==='ready') overlay(ctx,W,H,'Breakout — move with arrows or mouse');
      if(phase==='gameover') overlay(ctx,W,H,`Game Over — Score ${score} • Best ${best}`);
      if(phase==='win') overlay(ctx,W,H,`You win! Score ${score} • Best ${best}`);
    };
    const update=(dt)=>{ if(phase!=='playing') return; const st=s.current; st.x+=st.vx*dt; st.y+=st.vy*dt;
      if(st.x<st.r){ st.x=st.r; st.vx*=-1; } if(st.x>W-st.r){ st.x=W-st.r; st.vx*=-1; } if(st.y<st.r){ st.y=st.r; st.vy*=-1; }
      if(st.y+st.r>=H-20 && st.x>=st.paddleX && st.x<=st.paddleX+st.padW && st.vy>0){ st.y=H-20-st.r; const rel=(st.x-(st.paddleX+st.padW/2))/(st.padW/2); st.vx = 240*rel; st.vy = -Math.max(150, Math.abs(st.vy)); }
      if(st.y>H+30){ setPhase('gameover'); return; }
      for(const b of st.bricks){ if(b.hit) continue; if(st.x> b.x && st.x < b.x+b.w && st.y-st.r < b.y+b.h && st.y+st.r > b.y){ b.hit=true; st.vy*=-1; const n=score+10; setScore(n); if(n>best){ setBest(n); localStorage.setItem('ib-breakout-best', String(n)); } }
      }
      if(st.bricks.every(b=> b.hit)) { setPhase('win'); }
    };
    const loop=(t)=>{ if(!s.current.last) s.current.last=t; const dt=Math.min((t-s.current.last)/1000, 1/30); s.current.last=t; update(dt); draw(); rafRef.current=requestAnimationFrame(loop); };
    const onKey=(e)=>{ if(e.key==='ArrowLeft'){ s.current.paddleX-=18; } if(e.key==='ArrowRight'){ s.current.paddleX+=18; } if(e.key.toLowerCase()==='r'){ restart(); } if(phase==='ready' && (e.key.startsWith('Arrow')||e.code==='Space')) setPhase('playing'); if(phase==='gameover'||phase==='win'){ if(e.key.toLowerCase()==='r') restart(); } };
    const onMouse=(e)=>{ const rect=c.getBoundingClientRect(); const x=e.clientX-rect.left; s.current.paddleX=x - s.current.padW/2; if(phase==='ready') setPhase('playing'); };
    window.addEventListener('keydown', onKey); c.addEventListener('mousemove', onMouse); rafRef.current=requestAnimationFrame(loop); return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); c.removeEventListener('mousemove', onMouse); };
  }, [phase, score, best]);
  const overlay=(ctx,W,H,txt)=>{ ctx.fillStyle='#000'; ctx.globalAlpha=.15; ctx.fillRect(20,H/2-50,W-40,100); ctx.globalAlpha=1; ctx.fillStyle='#0f172a'; ctx.font='bold 18px ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(txt, W/2, H/2+6); };
  const restart=()=>{ setScore(0); s.current={x:W/2, y:H-32, vx:180, vy:-180, r:6, paddleX: W/2-45, bricks:[], cols:8, rows:4, padW:90}; setPhase('ready'); };
  return (
    <section className="rounded-2xl bg-white shadow border p-4 mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🧱 Breakout</h2>
        <div className="text-xs text-slate-500">Arrows or mouse to move • R to restart</div>
      </div>
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border shadow touch-none select-none" />
      </div>
    </section>
  );
}

/******************************
 * Chat — Supabase Realtime only (ephemeral)
 ******************************/
function ChatPanel(){
  const [name, setName] = useState(()=> localStorage.getItem('ib-name') || randomName());
  const [text, setText] = useState('');
  const [status, setStatus] = useState('offline'); // 'offline' | 'online'
  const [messages, setMessages] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [diag, setDiag] = useState(null);
  const sb = useRef({ client: null, channel: null, room: 'ib-global' });
  const addMsg = (msg) => setMessages(m => pushUniqueById(m, msg));

  // Auto-connect from (priority): URL query > localStorage > Vite env / window globals
  useEffect(()=>{
    (async ()=>{
      const cfg = resolveSupabaseConfig();
      if(cfg.url && cfg.key){ await connectSupabase(cfg.url, cfg.key, cfg.room); }
    })();
  }, []);

  async function connectSupabase(url, key, room){
    try {
      setConnecting(true);
      // cleanup any prior connection to avoid duplicate handlers
      try { await sb.current.channel?.unsubscribe(); } catch {}
      try { await sb.current.client?.removeAllChannels?.(); } catch {}
      const sbLib = await loadSupabase();
      const u = (url||'').trim(); const k = (key||'').trim(); const rm = (room||'ib-global').trim() || 'ib-global';
      if(!u || !k) throw new Error('Missing URL or anon key');
      const client = sbLib.createClient(u, k, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 8 } } });
      const channel = client.channel(rm, { config: { broadcast: { self: true }, presence: { key: name } } });
      channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        addMsg(payload);
      });
      channel.on('presence', { event: 'sync' }, () => {
        // presence available via channel.presenceState()
      });
      await channel.subscribe((state)=>{ if(state==='SUBSCRIBED'){ setStatus('online'); } });
      try { await channel.track({ name, at: new Date().toISOString() }); } catch (_) {}
      sb.current = { client, channel, room: rm };
      localStorage.setItem('ib-supabase-url', u);
      localStorage.setItem('ib-supabase-key', k);
      localStorage.setItem('ib-supabase-room', rm);
      setErrorMsg('');
    } catch (e) {
      setStatus('offline');
      setErrorMsg('Supabase connect failed: '+ String(e?.message||e));
    } finally {
      setConnecting(false);
    }
  }

  function disconnectSupabase(){
    try { sb.current.channel?.unsubscribe(); } catch {}
    try { sb.current.client?.removeAllChannels?.(); } catch {}
    sb.current = { client: null, channel: null, room: 'ib-global' };
    localStorage.removeItem('ib-supabase-url');
    localStorage.removeItem('ib-supabase-key');
    localStorage.removeItem('ib-supabase-room');
    setStatus('offline');
  }

  async function send(){
    const msg = { id: crypto.randomUUID(), name, text: text.trim(), ts: Date.now() };
    if(!msg.text) return; setText('');
    if(sb.current.channel){
      try {
        addMsg(msg); // optimistic, echo is deduped
        await sb.current.channel.send({ type: 'broadcast', event: 'message', payload: msg });
      } catch(e){ setErrorMsg('Send failed: '+ String(e?.message||e)); }
    } else {
      setErrorMsg('Not connected. Click Connect Supabase first.');
    }
  }

  async function runDiagnostics(){
    const res = [];
    try {
      const url = localStorage.getItem('ib-supabase-url');
      const key = localStorage.getItem('ib-supabase-key');
      const room = localStorage.getItem('ib-supabase-room');
      res.push({ name:'URL set', ok: !!url });
      res.push({ name:'Anon key set', ok: !!key });
      res.push({ name:'Room', ok: !!room, msg: room||'' });
      try { const lib = await loadSupabase(); res.push({ name:'@supabase/supabase-js loaded', ok: !!lib?.createClient }); } catch(e) { res.push({ name:'supabase-js load', ok:false, msg:String(e?.message||e) }); }
      res.push({ name:'Channel active', ok: !!sb.current.channel });
    } catch (e) {
      res.push({ name:'Diagnostics error', ok: false, msg: String(e?.message||e) });
    }
    setDiag(res);
  }

  return (
    <section data-tab-chat className="rounded-2xl bg-white shadow border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">💬 Global Chat {status==='online' ? <span className="text-emerald-600">(online)</span> : <span className="text-slate-400">(offline)</span>}</h2>
        <div className="flex items-center gap-2 relative">
          <ConnectSupabaseButton connected={status==='online'} connecting={connecting} onConnect={(u,k,r)=>connectSupabase(u,k,r)} onDisconnect={disconnectSupabase} />
        </div>
      </div>
      {errorMsg && (
        <div className="p-3 mb-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}
      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500">Nickname</label>
          <input value={name} onChange={e=>{setName(e.target.value); localStorage.setItem('ib-name', e.target.value);}} className="w-full px-3 py-2 rounded-xl border bg-slate-50" />
          <div className="text-xs text-slate-500">Supabase Realtime is live but not stored. Everyone connected to the same room sees messages.</div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={runDiagnostics} className="text-xs px-2 py-1 rounded-lg border bg-white">Run Chat Self‑Test</button>
            <span className="text-xs text-slate-400">Room: {sb.current.room}</span>
          </div>
          {diag && (
            <ul className="mt-2 text-xs space-y-1">
              {diag.map((d,i)=> (
                <li key={i} className={d.ok? 'text-emerald-700' : 'text-rose-700'}>
                  {d.ok ? '✅' : '❌'} {d.name}{d.msg? ` — ${d.msg}`:''}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col h-[420px]">
          <div className="flex-1 overflow-auto rounded-xl border p-3 bg-slate-50 space-y-2" id="chatlog">
            {messages.map(m=> (
              <div key={m.id || m.ts} className="text-sm">
                <span className="font-semibold">{m.name}</span>
                <span className="mx-1 text-slate-400">·</span>
                <span className="text-slate-400">{formatTime(m.ts)}</span>
                <div className="leading-snug whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
            {messages.length===0 && <div className="text-slate-400 text-sm">No messages yet. Say hi! 👋</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }} className="flex-1 px-3 py-2 rounded-xl border bg-white" placeholder="Type a message…" />
            <button onClick={send} className="px-4 py-2 rounded-xl bg-slate-900 text-white">Send</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectSupabaseButton({ connected, connecting, onConnect, onDisconnect }){
  const [open, setOpen] = useState(false);
  const initial = resolveSupabaseConfig();
  const [url, setUrl] = useState(()=> localStorage.getItem('ib-supabase-url') || initial.url || '');
  const [key, setKey] = useState(()=> localStorage.getItem('ib-supabase-key') || initial.key || '');
  const [room, setRoom] = useState(()=> localStorage.getItem('ib-supabase-room') || initial.room || 'ib-global');
  async function save(){ await onConnect?.(url.trim(), key.trim(), (room||'ib-global').trim() || 'ib-global'); if(!connecting) setOpen(false); }
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} disabled={connecting} className="text-xs px-2 py-1 rounded-lg border bg-white">
        {connecting ? 'Connecting…' : (connected ? 'Reconnect' : 'Connect Supabase')}
      </button>
      {open && (
        <div className="absolute z-20 max-w-md right-0 mt-2 bg-white border shadow-xl rounded-2xl p-3 text-sm">
          <div className="font-semibold mb-1">Enter your Supabase Realtime settings</div>
          <ol className="list-decimal ml-5 text-slate-600 mb-2">
            <li>In Supabase → Settings → Project URL & anon key.</li>
            <li>No database needed. We use Realtime broadcast for ephemeral chat.</li>
          </ol>
          <div className="grid gap-2">
            <input placeholder="Supabase URL (https://xxxx.supabase.co)" value={url} onChange={e=>setUrl(e.target.value)} className="px-2 py-1 rounded-lg border" />
            <input placeholder="Anon public key" value={key} onChange={e=>setKey(e.target.value)} className="px-2 py-1 rounded-lg border" />
            <input placeholder="Room name (optional)" value={room} onChange={e=>setRoom(e.target.value)} className="px-2 py-1 rounded-lg border" />
          </div>
          <div className="mt-2 flex gap-2 justify-end">
            <button onClick={()=>{ onDisconnect?.(); setOpen(false); }} className="px-2 py-1 rounded-lg border">Disconnect</button>
            <button onClick={save} className="px-3 py-1 rounded-lg bg-slate-900 text-white">Save & Connect</button>
          </div>
        </div>
      )}
    </div>
  );
}

/******************************
 * Credits
 ******************************/
function Credits(){
  return (
    <section className="rounded-2xl bg-white shadow border p-6">
      <h2 className="text-2xl font-bold mb-2">Credits</h2>
      <p className="text-slate-600 mb-4">Made by <span className="font-semibold">Santiago Toledo</span>.</p>
      <div className="text-slate-700">Email: <a className="underline" href="mailto:shaquyx@gmail.com">shaquyx@gmail.com</a></div>
    </section>
  );
}

/******************************
 * Utilities & Self-tests
 ******************************/
function randomName(){ const a=['Sleepy','Caffeinated','Heroic','Lost','Sneaky','Curious','Pixel','Quiet','Noisy','Witty']; const b=['Intern','Badger','Koala','Lobster','Mantis','Pigeon','Otter','Panda','Fox','Sloth']; return a[Math.floor(Math.random()*a.length)] + ' ' + b[Math.floor(Math.random()*b.length)]; }
function formatTime(ts){ const d=new Date(ts||Date.now()); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function pushUniqueById(list, item){ return list.some(m => (m.id ?? m.ts) === (item.id ?? item.ts)) ? list : [...list, item]; }

// Read Vite env if available (safe if not using Vite)
function readEnv(key){ try { return import.meta?.env?.[key]; } catch { return undefined; } }

// Resolve Supabase config from URL query, localStorage, or env/window globals
function resolveSupabaseConfig(){
  let params; try { params = new URLSearchParams(window.location.search); } catch { params = new URLSearchParams(''); }
  const qUrl  = params.get('sbUrl') || params.get('supabaseUrl');
  const qKey  = params.get('sbKey') || params.get('supabaseKey');
  const qRoom = params.get('room')  || params.get('sbRoom');

  const stUrl  = localStorage.getItem('ib-supabase-url');
  const stKey  = localStorage.getItem('ib-supabase-key');
  const stRoom = localStorage.getItem('ib-supabase-room');

  const envUrl  = readEnv('VITE_SUPABASE_URL')      || window.__SUPABASE_URL__;
  const envKey  = readEnv('VITE_SUPABASE_ANON_KEY') || window.__SUPABASE_ANON_KEY__;
  const envRoom = readEnv('VITE_SUPABASE_ROOM')     || window.__SUPABASE_ROOM__;

  const url  = (qUrl  || stUrl  || envUrl  || '').trim();
  const key  = (qKey  || stKey  || envKey  || '').trim();
  const room = ((qRoom || stRoom || envRoom || 'ib-global') || 'ib-global').trim() || 'ib-global';

  try {
    if(url && !stUrl)  localStorage.setItem('ib-supabase-url', url);
    if(key && !stKey)  localStorage.setItem('ib-supabase-key', key);
    if(room && !stRoom) localStorage.setItem('ib-supabase-room', room);
  } catch {}