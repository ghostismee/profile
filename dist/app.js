// Keep the desktop composition visible at any preview panel width.
(() => {
  const fitDesktop = () => {
    const width = document.documentElement.clientWidth;
    const layout = Math.max(1440, width);
    document.documentElement.style.setProperty("--layout-width", layout + "px");
    document.documentElement.style.setProperty("--desktop-scale", String(width / layout));
  };
  fitDesktop();
  window.addEventListener("resize", fitDesktop, {passive: true});
})();

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Two identical sets form a continuous belt; the visual copy stays out of the accessibility tree.
const toolItems = window.siteContent.tools.map(tool => `<li class="tool-card"><span class="tool-logo ${tool.wide?'tool-logo-wide':''}"><img src="./assets/${esc(tool.logo)}" alt="" width="48" height="48" decoding="async"></span><span>${esc(tool.name)}</span></li>`).join('');
document.getElementById('tool-track').innerHTML = `<ul class="tool-set">${toolItems}</ul><ul class="tool-set tool-set-copy" aria-hidden="true" inert>${toolItems}</ul>`;

// CSS transforms keep the loop smooth and resume from the same position after a pause.
(() => {
  const toolkit = document.querySelector('.toolkit');
  const rail = document.getElementById('tool-rail');
  const toggle = toolkit.querySelector('[data-tool-action="toggle"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, visible = false;
  const update = () => {
    toolkit.dataset.paused = String(paused || !visible || document.hidden || reduced.matches);
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(paused || reduced.matches));
    toggle.setAttribute('aria-label', reduced.matches ? 'Automatic scrolling disabled for reduced motion' : paused ? 'Play automatic scrolling' : 'Pause automatic scrolling');
    toggle.querySelector('span').textContent = paused || reduced.matches ? '▶' : 'Ⅱ';
  };
  toggle.addEventListener('click', () => { paused = !paused; update(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(rail);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  update();
})();

document.getElementById('experience-grid').innerHTML = window.siteContent.experience.map(item => `
  <article class="experience-card ${item.featured?'featured':''}">
    <div class="company-row"><div class="company-identity"><span class="company-logo"><img src="./assets/${esc(item.logo)}" alt="${esc(item.company)} logo" width="64" height="64" loading="lazy"></span><div><span class="company-name">${esc(item.company)}</span><p class="card-role">${esc(item.role)}</p></div></div><span class="card-number" aria-hidden="true">${item.number||'✳'}</span></div>
    <h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>
    ${item.capabilities?`<ul class="capability-list">${item.capabilities.map((cap,index)=>`<li><span class="capability-number" aria-hidden="true">0${index+1}</span><div><h4>${esc(cap.title)}</h4><p>${esc(cap.text)}${cap.highlight?` <span class="capability-highlight">${esc(cap.highlight)}</span> ${esc(cap.detail)}`:''}</p></div></li>`).join('')}</ul>`:''}
    ${item.tags?`<div class="work-tags">${item.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}
    ${item.stats?`<div class="work-stats">${item.stats.map(([n,label])=>`<div><strong>${esc(n)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`:''}
    ${item.note?`<p class="featured-note">${esc(item.note)}</p>`:''}${item.result?`<p class="result">${esc(item.result)}</p>`:''}
  </article>`).join('');
document.getElementById('creator-grid').innerHTML = window.siteContent.creators.map(item => `
  <article class="creator-showcase" aria-labelledby="creator-name-${esc(item.number)}">
    ${item.screenshot?`<a class="phone-shell" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${esc(item.name)} on RedNote (opens in a new tab)">
      <span class="phone-screen"><img src="./assets/${esc(item.screenshot)}" alt="${esc(item.name)}的小红书账号原始截图" lang="zh-CN" width="1206" height="2622" loading="lazy" decoding="async"><span class="phone-island" aria-hidden="true"></span></span>
    </a>`:`<div class="phone-shell phone-pending"><div class="phone-screen"><span class="phone-island" aria-hidden="true"></span><p lang="zh-CN">原始截图待补充<span>${esc(item.name)}</span></p></div></div>`}
    <div class="creator-details"><p class="creator-index">${esc(item.number)} / REDNOTE</p><h3 id="creator-name-${esc(item.number)}" lang="zh-CN">${esc(item.name)}</h3>
      <dl class="account-metrics"><div><dt>Followers</dt><dd>${esc(item.followers)}</dd></div><div><dt>Likes & saves</dt><dd>${esc(item.likes)}</dd></div></dl>
      <div class="account-actions"><span class="account-id">ID / ${esc(item.id)}</span><button class="copy-id" data-copy="${esc(item.id)}" aria-label="Copy ${esc(item.name)} account ID">Copy ID ↗</button></div>
      <a class="profile-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${esc(item.name)} profile (opens in a new tab)">Visit profile <span aria-hidden="true">↗</span></a>
    </div>
  </article>`).join('');
const icons = {
  play:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
  flow:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6M3 18h7m-3-3 3 3-3 3"/>'
};
document.getElementById('ai-grid').innerHTML = window.siteContent.ai.map(item=>`<article class="ai-card"><div class="ai-card-top"><span class="ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[item.symbol]}</svg></span><span class="card-number">${item.number}</span></div><p class="eyebrow">${esc(item.label)}</p><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="work-tags">${item.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></article>`).join('');
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  try {await navigator.clipboard.writeText(button.dataset.copy);button.textContent='Copied ✓';button.setAttribute('aria-label','Account ID copied');}
  catch {button.textContent=button.dataset.copy;button.setAttribute('aria-label','Account ID: '+button.dataset.copy);}
  setTimeout(()=>{button.textContent='Copy ID ↗';button.setAttribute('aria-label','Copy account ID '+button.dataset.copy)},2200);
}));

// Sparse gold meteors in every section; the home trails favor the central whitespace.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = {
    home: [[56,17],[59,40],[52,65],[63,25],[56,49],[61,72],[49,32]],
    about: [[47,18],[93,35],[12,66],[53,72],[87,88]],
    work: [[62,13],[97,31],[10,52],[55,73],[88,94]],
    creator: [[54,19],[91,28],[10,63],[53,72],[89,92]],
    ai: [[59,18],[96,33],[44,49],[12,73],[86,88]],
    contact: [[49,20],[94,31],[43,55],[13,76],[83,88]]
  };
  const scenes = new Map();
  Object.entries(positions).forEach(([id, points]) => {
    const section = document.getElementById(id);
    if (!section) return;
    const layer = document.createElement('div');
    layer.className = 'ambient-meteors';
    layer.setAttribute('aria-hidden', 'true');
    points.forEach(([x,y], index) => {
      const meteor = document.createElement('span');
      meteor.className = 'ambient-meteor';
      const delays = id === 'home' ? [0,1.3,7,8.8,15,18,23] : [0,1.6,8,14,20];
      const travel = 140 + index % 3 * 27;
      const properties = {
        x: `${x}%`, y: `${y}%`, length: `${150 + index % 3 * 30}px`,
        period: `${26 + index % 4 * 2.3}s`, delay: `${delays[index]}s`,
        dx: `${-travel}px`, dy: `${Math.round(travel * .625)}px`
      };
      Object.entries(properties).forEach(([key,value]) => meteor.style.setProperty(`--meteor-${key}`,value));
      layer.append(meteor);
    });
    section.append(layer);
    scenes.set(section, {layer, visible:false});
  });
  const update = () => scenes.forEach(scene => {
    scene.layer.classList.toggle('is-active', scene.visible && !document.hidden && !reduced.matches);
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {scenes.get(entry.target).visible = entry.isIntersecting;});
      update();
    }, {threshold:0});
    scenes.forEach((_,section) => observer.observe(section));
  } else {
    scenes.forEach(scene => {scene.visible = true;});
    update();
  }
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
})();

// A small, interactive map of the interests in the About section.
(() => {
  const scene = document.querySelector('.curiosity-scene');
  const title = document.getElementById('interest-caption-title');
  const caption = document.getElementById('interest-caption');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stories = {
    food: ['Foodie', 'Good food is always worth discovering.'],
    travel: ['Traveler', 'Taking the scenic route, one new place at a time.'],
    bird: ['Bird Lover', 'Life is sweeter with a little feathered company.'],
    tech: ['Tech Marketer', 'Connecting new technology with stories people care about.'],
    world: ['World Explorer', 'Always looking for a new perspective.']
  };
  const nodes = [...scene.querySelectorAll('[data-interest]')];
  const tags = [...document.querySelectorAll('[data-interest-tag]')];
  const show = key => {
    if(key)scene.dataset.active=key;else delete scene.dataset.active;
    title.textContent=key?stories[key][0]:'A few things that make me, me.';
    caption.textContent=key?stories[key][1]:'A good meal. A new place. An idea worth exploring.';
    nodes.forEach(node=>node.classList.toggle('is-active',node.dataset.interest===key));
    tags.forEach(tag=>tag.classList.toggle('is-highlighted',tag.dataset.interestTag===key));
  };
  nodes.forEach(node=>{
    const activate=()=>show(node.dataset.interest);
    node.addEventListener('pointerenter',activate);
    node.addEventListener('focus',activate);
    node.addEventListener('click',activate);
    node.addEventListener('pointerleave',()=>show(scene.contains(document.activeElement)?document.activeElement.dataset.interest:null));
    node.addEventListener('blur',()=>show(null));
  });
  const resetParallax=()=>{
    scene.style.setProperty('--pointer-x','0px');
    scene.style.setProperty('--pointer-y','0px');
  };
  scene.addEventListener('pointermove',event=>{
    if(reduced.matches)return;
    const r=scene.getBoundingClientRect();
    scene.style.setProperty('--pointer-x',((event.clientX-r.left)/r.width-.5)*9+'px');
    scene.style.setProperty('--pointer-y',((event.clientY-r.top)/r.height-.5)*9+'px');
  },{passive:true});
  scene.addEventListener('pointerleave',resetParallax);
  reduced.addEventListener('change',resetParallax);
})();
