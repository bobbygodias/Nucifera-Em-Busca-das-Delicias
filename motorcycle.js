/* Nucífera — corrida especial. Idealizado por Bobby Dias Developer.
 * Developer ID: 36e3b89c-2939-5565-a551-83d310ac8c6f
 */
(function (root) {
  'use strict';
  const DURATION = 60, VIEW = 105, CRUISE_SPEED = 21, BOOST_SPEED = CRUISE_SPEED * 1.8, BOOST_DURATION = 4.4;
  function create(saved) {
    const initial = { elapsed: 0, distance: 0, lane: 1, position: 1, lean: 0,
      boostUntil: 0, boostReady: 0, crashUntil: 0, immuneUntil: 2,
      nextRow: 75, serial: 0, seed: 821206, objects: [], sweets: 0, status: 'running' };
    return Object.assign(initial, saved || {}, { objects: (saved && saved.objects || []).map(o => Object.assign({}, o)) });
  }
  function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
  function move(s, direction) {
    if (s.status !== 'running' || s.elapsed < s.crashUntil) return;
    s.lane = Math.max(0, Math.min(2, s.lane + Math.sign(direction)));
  }
  function boost(s) {
    if (s.status !== 'running' || s.elapsed < s.crashUntil || s.elapsed < s.boostReady) return false;
    s.boostUntil = s.elapsed + BOOST_DURATION; s.boostReady = s.boostUntil + 3; return true;
  }
  function spawn(s) {
    const row = ++s.serial, z = s.nextRow;
    const safe = Math.floor(random(s) * 3);
    const blocked = [0, 1, 2].filter(l => l !== safe);
    const twoCars = s.elapsed > 12 && random(s) < .38;
    const count = twoCars ? 2 : 1;
    if (!twoCars && random(s) < .5) blocked.reverse();
    for (let i = 0; i < count; i++) s.objects.push({ id: 'car-' + row + '-' + i, kind: 'car', lane: blocked[i], z,
      style: Math.floor(random(s) * 4), done: false });
    // The sweets show the open lane; a visible gap separates each traffic row.
    for (let i = 0; i < 3; i++) s.objects.push({ id: 'sweet-' + row + '-' + i, kind: 'sweet', lane: safe,
      z: z - 13 + i * 9, style: Math.floor(random(s) * 8), done: false });
    s.nextRow += 43 + random(s) * 11;
  }
  function tick(s, seconds, callbacks) {
    if (s.status !== 'running') return;
    const dt = Math.max(0, Math.min(.1, seconds)), active = Math.min(dt, DURATION - s.elapsed);
    const oldDistance = s.distance;
    s.elapsed = Math.min(DURATION, s.elapsed + active);
    const speed = s.elapsed < s.crashUntil ? 12 : s.elapsed < s.boostUntil ? BOOST_SPEED : CRUISE_SPEED;
    s.distance += speed * active;
    // Remove a vehicle occupying the finish area, keeping the rest of the traffic.
    if (s.elapsed >= DURATION - 3) {
      const stripeZ = s.distance + (DURATION - s.elapsed) * CRUISE_SPEED;
      s.objects = s.objects.filter(o => o.kind !== 'car' || Math.abs(o.z - stripeZ) > 18);
    }
    const previousPosition = s.position;
    s.position += (s.lane - s.position) * (1 - Math.exp(-13 * active));
    s.lean += (((s.position - previousPosition) / Math.max(active, .001)) * .13 - s.lean) * (1 - Math.exp(-10 * active));
    if (s.elapsed < 56) while (s.nextRow <= s.distance + VIEW) spawn(s);
    for (const o of s.objects) {
      if (o.done || o.z > s.distance || o.z < oldDistance - 8) continue;
      o.done = true;
      if (Math.abs(s.position - o.lane) > (o.kind === 'car' ? .40 : .47)) continue;
      if (s.elapsed < s.crashUntil) continue;
      if (o.kind === 'sweet') {
        s.sweets++; if (callbacks && callbacks.collect) callbacks.collect(o.id);
      } else if (s.elapsed >= s.immuneUntil) {
        s.crashUntil = s.elapsed + 1; s.immuneUntil = s.elapsed + 2.5; s.boostUntil = 0;
        if (callbacks && callbacks.crash) callbacks.crash();
        if (s.status !== 'running') break;
      }
    }
    s.objects = s.objects.filter(o => o.z > s.distance - 10);
    if (s.elapsed >= DURATION && s.status === 'running') {
      s.elapsed = DURATION; s.status = 'finish';
      if (callbacks && callbacks.finish) callbacks.finish();
    }
  }
  function project(width, height, lane, z) {
    const p = Math.max(0, Math.min(1.12, 1 - z / VIEW)), depth = p * p;
    return { x: width / 2 + (lane - 1) * (9 + depth * width * .28), y: 122 + (height - 166) * depth,
      scale: .10 + .90 * depth };
  }
  function polygon(c, points, fill, stroke) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function oval(c, x, y, rx, ry, fill, stroke) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function drawCar(c, style, x, y, scale) {
    const colors = ['#c95747', '#42749a', '#cfab63', '#789487'];
    c.save(); c.translate(x, y); c.scale(scale, scale); c.lineWidth = 2;
    oval(c, 0, -1, 37, 8, 'rgba(24,29,38,.26)');
    c.fillStyle = '#252831'; c.fillRect(-31, -31, 10, 33); c.fillRect(21, -31, 10, 33);
    polygon(c, [[-35,-6],[-35,-40],[-26,-77],[22,-77],[35,-42],[35,-6]], colors[style], '#493d41');
    polygon(c, [[-24,-72],[20,-72],[27,-48],[-28,-48]], '#394553', '#a9bdc2');
    c.strokeStyle = '#718794'; c.beginPath(); c.moveTo(-19,-67); c.lineTo(13,-67); c.stroke();
    c.fillStyle = '#dfb787'; c.fillRect(-31,-28,12,12); c.fillRect(20,-28,12,12);
    c.fillStyle = '#bc3937'; c.fillRect(-31,-28,12,8); c.fillRect(20,-28,12,8);
    c.fillStyle = '#efe8d3'; c.fillRect(-12,-21,24,9); c.fillStyle = '#675b57'; c.fillRect(-32,-9,64,5);
    c.fillStyle = '#cfdfdf'; c.fillRect(-6,-39,12,3);
    if (style === 1) { oval(c, 0,-31,14,14,'#343844','#929397'); oval(c,0,-31,6,6,'#686975'); }
    if (style === 3) { c.fillStyle='#d6d6c1'; c.fillRect(-28,-42,56,3); }
    c.restore();
  }
  function drawRider(c, x, foot, lean, t, fast, image, wind) {
    c.save(); c.translate(x, foot); c.rotate(lean * .10); c.lineWidth = 1.6;
    oval(c,0,2,39,8,'rgba(29,29,39,.30)');
    if (image && image.complete && image.naturalWidth) {
      if (wind && wind.complete && wind.naturalWidth) {
        // Every frame contains the complete rider. The drawn hair stays connected to the neck.
        const frameWidth = wind.naturalWidth / 16, frame = Math.floor(t * (fast ? 19 : 12)) % 16;
        c.drawImage(wind,frame * frameWidth,0,frameWidth,wind.naturalHeight,-57,-146,114,150);
      } else { c.drawImage(image,-57,-146,114,150); }
      c.restore(); return;
    }
    // Rear view: broad Vmax tank, twin chrome shocks/exhausts and a thick rear tyre.
    oval(c,0,-19,15,28,'#25232d','#11131e');
    c.strokeStyle='#7b787c'; for (let i=0;i<5;i++) { c.beginPath(); c.moveTo(-9,-36+i*7); c.lineTo(8,-32+i*7); c.stroke(); }
    const chrome=c.createLinearGradient(-38,0,38,0); chrome.addColorStop(0,'#636878');chrome.addColorStop(.25,'#f1eee6');chrome.addColorStop(.52,'#9c9fad');chrome.addColorStop(.8,'#fbf4e9');chrome.addColorStop(1,'#727686');
    polygon(c,[[-33,-50],[-22,-51],[-15,-13],[-28,-11]],chrome,'#56515d');
    polygon(c,[[33,-50],[22,-51],[15,-13],[28,-11]],chrome,'#56515d');
    c.strokeStyle='#e6e4df'; c.lineWidth=3; for(let side of [-1,1]) { c.beginPath();c.moveTo(side*24,-62);c.lineTo(side*21,-29);c.stroke();
      c.lineWidth=1.3; for(let i=0;i<6;i++){c.beginPath();c.moveTo(side*18,-59+i*5);c.lineTo(side*28,-57+i*5);c.stroke();}c.lineWidth=3; }
    polygon(c,[[-23,-62],[-28,-95],[-13,-112],[13,-112],[28,-95],[23,-62]],'#7145a1','#3e2b56');
    polygon(c,[[-21,-62],[-17,-48],[17,-48],[21,-62]],'#342e40','#aaa2b2');
    c.fillStyle='#b084d7';c.fillRect(-21,-90,5,22); c.fillStyle='#e06558';c.fillRect(-12,-53,24,9);
    c.fillStyle='#f6e4c3';c.fillRect(-11,-40,22,13);c.fillStyle='#514152';c.font='bold 6px system-ui';c.textAlign='center';c.fillText('VMAX',0,-31);
    for(let side of [-1,1]) { c.fillStyle='#272734';c.fillRect(side*19-5,-74,10,22);oval(c,side*23,-48,9,5,'#77513c','#483027'); }
    polygon(c,[[-23,-67],[-23,-102],[0,-107],[23,-102],[23,-67],[0,-62]],'#a3653d','#694329');
    polygon(c,[[-19,-89],[-21,-112],[-9,-127],[9,-127],[21,-112],[19,-89]],'#f7efdc','#746657');
    c.strokeStyle='#935b3b';c.lineWidth=4;c.beginPath();c.moveTo(-10,-119);c.lineTo(-9,-87);c.moveTo(10,-119);c.lineTo(9,-87);c.stroke();
    for(let side of [-1,1]) { c.strokeStyle='#efc69b';c.lineWidth=7;c.beginPath();c.moveTo(side*18,-112);c.lineTo(side*29,-101);c.lineTo(side*37,-109);c.stroke();
      c.strokeStyle='#d9d8d7';c.lineWidth=3;c.beginPath();c.moveTo(side*37,-109);c.lineTo(side*47,-119);c.stroke();oval(c,side*48,-125,10,8,'#bfdfeb','#5e6070'); }
    oval(c,0,-132,18,19,'#794929','#473027');
    oval(c,0,-140,23,14,'#6d442a','#3b271f');
    c.strokeStyle='#a27349';c.lineWidth=1;c.beginPath();c.arc(0,-141,17,3.5,5.8);c.stroke();
    oval(c,14,-130,5,8,'#d9a879','#55402e'); c.strokeStyle='#352c29';c.beginPath();c.moveTo(14,-133);c.lineTo(21,-134);c.stroke();
    drawHair(c,-4,-121,t,fast,lean); c.restore();
  }
  function drawHair(c,x,y,t,fast,lean) {
    c.save();c.translate(x,y);c.rotate(Math.sin(t*(fast?19:13))*.18+lean*.25);c.lineWidth=1.2;
    const wave=Math.sin(t*16)*(fast?8:5);
    c.beginPath();c.moveTo(-7,0);c.bezierCurveTo(-22,10,-25,25,-12+wave,42);
    c.bezierCurveTo(-5+wave,35,11+wave,24,6,10);c.quadraticCurveTo(5,3,-7,0);
    c.fillStyle='#563624';c.fill();c.strokeStyle='#38281f';c.stroke();
    c.strokeStyle='#98673f';c.beginPath();c.moveTo(-5,8);c.bezierCurveTo(-14,18,-13,28,-8+wave,34);c.stroke();
    c.fillStyle='#b24c42';c.fillRect(-7,0,14,4);c.restore();
  }
  function drawFallenBike(c, x, foot, image) {
    c.save(); c.translate(x,foot); c.rotate(-.75);
    if (image && image.complete && image.naturalWidth) c.drawImage(image,-48,-126,96,126);
    else { oval(c,0,-20,14,26,'#28242e'); polygon(c,[[-26,-48],[-23,-85],[22,-85],[26,-48]],'#7145a1','#3e2b56'); }
    c.restore();
  }
  function render(c, s, width, height, art, finishTime) {
    const t = s.elapsed + (finishTime || 0), roadTop=122, center=width/2;
    const arrival = s.status === 'finish', remaining=Math.max(0,DURATION-s.elapsed);
    // Widen the view of the shoulder before the finish, then hold the camera still.
    const approach = Math.max(0, Math.min(1, (3 - remaining) / 1.6));
    const finishBlend = approach * approach * (3 - 2 * approach);
    const roadCenter = center - width * .10 * finishBlend, roadScale = 1 - .42 * finishBlend;
    const roadX = x => roadCenter + (x - center) * roadScale;
    const projectRoad = (lane, z) => { const p = project(width, height, lane, z); p.x = roadX(p.x); return p; };
    const sky=c.createLinearGradient(0,0,0,180);sky.addColorStop(0,'#6aabd6');sky.addColorStop(1,'#e4f0e5');c.fillStyle=sky;c.fillRect(0,0,width,height);
    // Coastal scenery has no traffic baked into the background; every car is playable.
    if (art && art.scenery && art.scenery.complete && art.scenery.naturalWidth) {
      const image = art.scenery, top = Math.floor(image.height * .37);
      c.drawImage(image,0,top,image.width,image.height-top,0,0,width,height);
    }
    else {
      polygon(c,[[0,85],[34,63],[62,92],[98,54],[154,94],[185,120],[0,180]],'#89a3a1');
      polygon(c,[[0,112],[50,86],[83,113],[131,81],[177,122],[0,183]],'#718b75');
      c.fillStyle='#70bbce';c.fillRect(0,144,width/2,height-144);
      for(let i=0;i<7;i++){c.fillStyle='#e8e4c8';c.fillRect(9+i*19,117-(i%3)*7,14,11);polygon(c,[[7+i*19,117-(i%3)*7],[16+i*19,110-(i%3)*7],[25+i*19,117-(i%3)*7]],'#c38164');}
      polygon(c,[[center+5,roadTop],[width,78],[width,height],[center+8,height]],'#caaa7a');
      for(let i=0;i<10;i++){const p=i/9;const xx=center+16+p*p*width*.6, yy=125+p*p*(height-125); oval(c,xx,yy,8+18*p,15+31*p,'#6f9563');oval(c,xx-5,yy-15*p,5+13*p,13+25*p,'#87a66a');}
    }
    if (finishBlend > 0) {
      c.save(); c.globalAlpha = finishBlend;
      const grass=c.createLinearGradient(0,roadTop,0,height);grass.addColorStop(0,'#a9b087');grass.addColorStop(1,'#7e9167');
      const shoulder=c.createLinearGradient(0,roadTop,0,height);shoulder.addColorStop(0,'#c3b184');shoulder.addColorStop(1,'#ad966c');
      polygon(c,[[roadX(center-7),roadTop],[roadX(-30),height],[0,height],[0,roadTop]],grass);
      polygon(c,[[roadX(center+7),roadTop],[roadX(width+30),height],[width,height],[width,roadTop]],shoulder);
      // Small ground details keep the widened shoulder in the coastal scenery's style.
      for(let i=0;i<36;i++) {
        const depth=(i+.5)/36, y=roadTop+depth*depth*(height-roadTop);
        const edge=roadX(center+7)+(roadX(width+30)-roadX(center+7))*depth*depth;
        const x=edge+8+(width-edge-15)*((i*17%37)/37), size=1+depth*2;
        oval(c,x,y,size*1.5,size*.45,i%3?'rgba(107,101,68,.22)':'rgba(232,214,173,.45)');
      }
      c.restore();
    }
    polygon(c,[[roadX(center-7),roadTop],[roadX(center+7),roadTop],[roadX(width+30),height],[roadX(-30),height]],'#807b78');
    const roadShade=c.createLinearGradient(0,roadTop,0,height);roadShade.addColorStop(0,'rgba(225,213,185,.5)');roadShade.addColorStop(1,'rgba(76,63,64,.16)');
    polygon(c,[[roadX(center-7),roadTop],[roadX(center+7),roadTop],[roadX(width+30),height],[roadX(-30),height]],roadShade);
    c.lineWidth=2;c.strokeStyle='#f9edcf';for(let side of [-1,1]){c.beginPath();c.moveTo(roadX(center+side*7),roadTop);c.lineTo(roadX(center+side*(width/2+25)),height);c.stroke();}
    // Markings approach the rider, in the same direction and at the same speed as traffic.
    const phase = (12 - s.distance % 12) % 12;
    for(let z=phase;z<VIEW;z+=12) for(let lane of [.5,1.5]) {
      const a=projectRoad(lane,z), b=projectRoad(lane,z+5);
      polygon(c,[[a.x-1.8*a.scale,a.y],[a.x+1.8*a.scale,a.y],[b.x+1.8*b.scale,b.y],[b.x-1.8*b.scale,b.y]],'#eee6cf');
    }
    for(let side of [-1,1]) {
      const guardTop=roadX(center+side*13), fullBottom=roadX(center+side*(width/2+39));
      const endY=height-30-finishBlend*115, guardBottom=guardTop+(fullBottom-guardTop)*(endY-roadTop)/(height-30-roadTop);
      c.strokeStyle='#dfdfd0';c.lineWidth=5;c.beginPath();c.moveTo(guardTop,roadTop);c.lineTo(guardBottom,endY);c.stroke();
      c.strokeStyle='#858a87';c.lineWidth=1.5;c.beginPath();c.moveTo(guardTop,roadTop+3);c.lineTo(guardBottom,endY+5);c.stroke();
      for(let z=(18-s.distance%18)%18;z<VIEW;z+=18){const p=projectRoad(side<0?-.65:2.65,z);if(p.y>endY)continue;c.fillStyle='#989a8d';c.fillRect(p.x,p.y-13*p.scale,3*p.scale,26*p.scale);}
    }
    if (remaining < 3 || arrival) {
      const z=arrival ? 0 : remaining*21, a=projectRoad(-.5,z), b=projectRoad(2.5,z), rowHeight=12*a.scale;
      for(let row=0;row<2;row++)for(let i=0;i<12;i++){c.fillStyle=(i+row)%2?'#f7eddb':'#403a43';c.fillRect(a.x+(b.x-a.x)*i/12,a.y+row*rowHeight,(b.x-a.x)/12+1,rowHeight);}
      // Sarinha belongs to the same world depth as the finish stripe, on its right shoulder.
      const sara = projectRoad(3.35,z);
      if (art && art.sara) art.sara(sara.x,sara.y,t,sara.scale);
    }
    s.objects.slice().sort((a,b)=>b.z-a.z).forEach(o=>{
      if(arrival || o.done || o.z<s.distance || o.z>s.distance+VIEW)return;
      const p=projectRoad(o.lane,o.z-s.distance);
      if(o.kind==='car')drawCar(c,o.style,p.x,p.y,p.scale*1.25);
      else { oval(c,p.x,p.y+1,12*p.scale,4*p.scale,'rgba(81,57,27,.18)');if(art&&art.sweet)art.sweet(o.style,p.x,p.y-8*p.scale,30*p.scale); }
    });
    const riderLane=arrival ? 1+(s.position-1)*Math.exp(-(finishTime||0)*5) : s.position;
    const p=projectRoad(riderLane,0), fast=!arrival&&s.elapsed<s.boostUntil;
    const crashing=!arrival&&s.elapsed<s.crashUntil;
    if(crashing){drawFallenBike(c,p.x,p.y,art&&art.bike);
      if(art&&art.fallen)art.fallen(p.x+60,p.y-8,1-(s.crashUntil-s.elapsed));}
    else if(s.elapsed<2 || s.elapsed>=s.immuneUntil || Math.floor(t*12)%2===0 || arrival) {
      const changingLane = s.lane - s.position;
      const direction = arrival ? 0 : Math.abs(changingLane) > .035 ? Math.sign(changingLane) : Math.abs(s.lean) > .08 ? Math.sign(s.lean) : 0;
      const name = direction > 0 ? 'right' : direction < 0 ? 'left' : 'straight';
      const pose = art && art.poses && art.poses[name];
      drawRider(c,p.x,p.y,arrival ? s.lean*Math.exp(-(finishTime||0)*5) : s.lean,t,fast,pose ? pose.image : art&&art.rider,pose && pose.wind);
    }
    if(fast&&!crashing){c.strokeStyle='rgba(255,241,205,.65)';c.lineWidth=2;for(let i=0;i<8;i++){const side=i%2?1:-1, y=170+(i*47+s.distance*5)%300, x=center+side*(width*.25+(y-170)*.18);c.beginPath();c.moveTo(x,y);c.lineTo(x+side*8,y+32);c.stroke();}}
    c.fillStyle='rgba(255,249,235,.94)';c.fillRect(9,10,width-18,52);c.fillStyle='#62442e';c.font='bold 13px system-ui';c.textAlign='left';c.fillText('FASE 6 · ROTA DAS DELÍCIAS',19,31);
    c.font='11px system-ui';c.fillText(arrival?'CHEGADA!':Math.ceil(remaining)+' s · '+(fast?'ACELERANDO':'VMAX 1200'),19,50);
    c.textAlign='right';c.fillText('TROPEÇOS '+(art&&art.losses||0)+'/10',width-19,50);c.textAlign='left';
    if(s.elapsed<4){c.fillStyle='rgba(255,249,235,.95)';c.fillRect(36,80,width-72,28);c.fillStyle='#67462d';c.font='11px system-ui';c.textAlign='center';c.fillText('◀ / ▶ muda de faixa · ACELERAR dá impulso',center,98);c.textAlign='left';}
    if(arrival){c.fillStyle='rgba(255,249,235,.96)';c.fillRect(45,80,width-90,60);c.fillStyle='#67462d';c.textAlign='center';c.font='bold 20px Georgia';c.fillText('Você chegou!',center,104);c.font='12px system-ui';c.fillText(s.sweets+' doces recuperados em 60 segundos',center,125);c.textAlign='left';}
  }
  const api = { create, move, boost, tick, project, render, DURATION, BOOST_DURATION };
  root.NuciferaRace = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
