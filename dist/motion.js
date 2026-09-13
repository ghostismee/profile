// Progressive enhancement: content and native scrolling work without this layer.
(() => {
  if (!('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const revealItems = [];

  const prepare = (selector, kind = 'rise', stagger = 0, baseDelay = 0) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.dataset.reveal = kind;
      element.style.setProperty('--reveal-delay', `${baseDelay + Math.min(index, 4) * stagger}ms`);
      revealItems.push(element);
    });
  };

  prepare('.hero-copy > *', 'from-left', 85, 70);
  prepare('.hero-visual', 'visual', 0, 110);
  prepare('.section-kicker', 'rule');
  prepare('.section h2', 'title');
  prepare('.section-title-row > p, .ai-heading > p', 'rise', 0, 100);
  prepare('.curiosity-scene', 'visual');
  prepare('.about-copy > p', 'rise', 65, 80);
  prepare('.interest-tags > span', 'tag', 45);
  prepare('.education > .eyebrow', 'rise');
  prepare('.education > div', 'side', 90);
  prepare('.experience-card', 'card', 65);
  prepare('.work-stats > div', 'rise', 75);
  prepare('.creator-showcase .phone-shell', 'phone', 110);
  document.querySelectorAll('.creator-showcase').forEach((card, index) => {
    card.querySelector('.phone-shell').style.setProperty('--entry-angle', index ? '2deg' : '-2deg');
    card.querySelectorAll('.creator-index, h3, .account-metrics > div, .account-actions, .profile-link').forEach((element, order) => {
      element.classList.add('scroll-reveal');
      element.dataset.reveal = 'rise';
      element.style.setProperty('--reveal-delay', `${Math.min(order, 4) * 45 + 65}ms`);
      revealItems.push(element);
    });
  });
  prepare('.rednote-logo', 'rise', 0, 150);
  prepare('.toolkit', 'rise');
  prepare('.ai-card', 'card', 100);
  prepare('.ai-footnote, .data-note', 'rise');
  prepare('.contact-main > div > p', 'rise', 0, 90);
  prepare('.contact-cta', 'rise', 85);

  // Clipped headings use an unclipped parent as their visibility trigger.
  const triggerFor = element => element.dataset.reveal === 'title' ? element.parentElement : element;
  const targetsByTrigger = new Map();
  revealItems.forEach(element => {
    const trigger = triggerFor(element);
    if (!targetsByTrigger.has(trigger)) targetsByTrigger.set(trigger, []);
    targetsByTrigger.get(trigger).push(element);
  });
  // Each block enters once, so reading back up the page never hides it again.
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      targetsByTrigger.get(entry.target).forEach(element => element.classList.add('is-revealed'));
      revealObserver.unobserve(entry.target);
    });
  }, {threshold: .035, rootMargin: '0px 0px -5% 0px'});

  const floats = [
    {element: document.querySelector('.hero-visual'), anchor: document.querySelector('.hero-content'), depth: 22, kind: 'scene'},
    {element: document.querySelector('.curiosity-scene'), anchor: document.querySelector('.about-layout'), depth: 15, kind: 'scene'},
    ...[...document.querySelectorAll('.creator-showcase')].map((anchor, index) => ({element: anchor.querySelector('.phone-shell'), anchor, depth: index ? 21 : 15, kind: 'phone'}))
  ];
  floats.forEach(item => { item.element.dataset.scrollFloat = item.kind; });
  let frame = 0;
  const updateFloats = () => {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const viewportHeight = window.innerHeight;
    // Read geometry before applying changes; anchors themselves never move.
    const positions = floats.map(item => {
      const rect = item.anchor.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > viewportHeight + 80) return null;
      const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
      return {element: item.element, offset: ((.5 - progress) * item.depth * 2).toFixed(2)};
    });
    positions.forEach(item => {
      if (item) item.element.style.setProperty('--scene-y', `${item.offset}px`);
    });
  };
  const requestFloatUpdate = () => {
    if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(updateFloats);
  };

  const applyPreference = () => {
    revealObserver.disconnect();
    if (reduced.matches) {
      root.classList.remove('motion-ready');
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      floats.forEach(item => item.element.style.removeProperty('--scene-y'));
      return;
    }
    revealItems.forEach(element => {
      // A deep link or restored scroll position must not leave earlier content hidden.
      if (element.getBoundingClientRect().bottom <= 0) element.classList.add('is-revealed');
      if (!element.classList.contains('is-revealed')) revealObserver.observe(triggerFor(element));
    });
    root.classList.add('motion-ready');
    requestFloatUpdate();
  };

  document.addEventListener('focusin', event => {
    let element = event.target.closest('.scroll-reveal');
    while (element) {
      element.classList.add('is-revealed');
      revealObserver.unobserve(triggerFor(element));
      element = element.parentElement?.closest('.scroll-reveal');
    }
  });
  window.addEventListener('scroll', requestFloatUpdate, {passive:true});
  window.addEventListener('resize', requestFloatUpdate, {passive:true});
  window.addEventListener('load', requestFloatUpdate, {once:true});
  document.addEventListener('visibilitychange', requestFloatUpdate);
  reduced.addEventListener('change', applyPreference);
  applyPreference();
})();
