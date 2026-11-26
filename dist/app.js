(() => {
  'use strict';
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu-toggle');
  const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMotionOff = () => root.classList.contains('motion-off') || mediaReduce.matches;

  const closeMenu = () => {
    header.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', '展开导航');
  };
  menu.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  });
  document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (header.classList.contains('menu-open') && !header.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  /* Sliding indicator helper for segmented controls & tabs. */
  function mountIndicator(group, attr) {
    if (!group) return;
    const buttons = [...group.querySelectorAll('button')];
    function place(instant) {
      const active = buttons.find(b => b.getAttribute(attr) === 'true');
      if (!active || !active.offsetWidth) return;
      if (instant) group.classList.add('pill-instant');
      group.style.setProperty('--pill-x', active.offsetLeft + 'px');
      group.style.setProperty('--pill-w', active.offsetWidth + 'px');
      if (instant) requestAnimationFrame(() => requestAnimationFrame(() => group.classList.remove('pill-instant')));
    }
    group.classList.add('has-pill');
    place(true);
    new MutationObserver(() => place(false)).observe(group, { attributes: true, subtree: true, attributeFilter: [attr] });
    if ('ResizeObserver' in window) new ResizeObserver(() => place(true)).observe(group);
    if (document.fonts) document.fonts.ready.then(() => place(true));
  }
  mountIndicator(document.querySelector('.stage-controls'), 'aria-pressed');
  mountIndicator(document.querySelector('.tabs'), 'aria-selected');

  /* Scenario tabs. */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
    });
  });

  /* Cross-browser smooth accordion for services & legal disclosures. */
  document.querySelectorAll('.service-list details, .legal').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary) return;
    const body = document.createElement('div');
    body.className = 'details-body';
    while (summary.nextSibling) body.append(summary.nextSibling);
    details.append(body);
    let anim = null;

    summary.addEventListener('click', event => {
      if (isMotionOff() || !body.animate) return;
      event.preventDefault();
      if (anim) anim.cancel();
      if (details.open) {
        const start = body.offsetHeight;
        anim = body.animate(
          [{ height: start + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 340, easing: 'cubic-bezier(.32, .72, 0, 1)' }
        );
        anim.onfinish = () => { details.open = false; anim = null; };
        anim.oncancel = () => { anim = null; };
      } else {
        details.open = true;
        const end = body.scrollHeight;
        anim = body.animate(
          [{ height: '0px', opacity: 0 }, { height: end + 'px', opacity: 1 }],
          { duration: 420, easing: 'cubic-bezier(.16, 1, .3, 1)' }
        );
        anim.onfinish = () => { anim = null; };
        anim.oncancel = () => { anim = null; };
      }
    });
  });

  /* Motion preference toggle. */
  const motion = document.querySelector('.motion-toggle');
  let paused = mediaReduce.matches;
  try { const saved = localStorage.getItem('akitech-motion'); if (saved !== null) paused = saved === 'paused'; } catch (_) {}
  function applyMotion() {
    root.classList.toggle('motion-off', paused);
    motion.setAttribute('aria-pressed', String(paused));
    const label = paused ? '恢复装饰动效' : '暂停装饰动效';
    motion.setAttribute('aria-label', label);
    motion.title = label;
    motion.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
  }
  applyMotion();
  motion.addEventListener('click', () => {
    paused = !paused;
    applyMotion();
    try { localStorage.setItem('akitech-motion', paused ? 'paused' : 'playing'); } catch (_) {}
  });

  /* Header scroll progress & active nav section highlight. */
  const navLinks = [...document.querySelectorAll('#navigation a[href^="#"]')];
  const sections = navLinks.map(a => ({ link: a, el: document.querySelector(a.getAttribute('href')) })).filter(s => s.el);
  let scrollQueued = false;
  function updateHeader() {
    scrollQueued = false;
    const h = document.documentElement.clientHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - h);
    const p = Math.max(0, Math.min(1, window.scrollY / max));
    header.style.setProperty('--scroll-progress', p.toFixed(4));
    header.style.setProperty('--progress-vis', window.scrollY > 40 ? '1' : '0');

    let current = null;
    for (const s of sections) {
      if (s.el.getBoundingClientRect().top <= h * 0.42) current = s.link;
    }
    navLinks.forEach(a => a.classList.toggle('is-active', a === current));
  }
  function queueHeader() {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateHeader); }
  }
  window.addEventListener('scroll', queueHeader, { passive: true });
  window.addEventListener('resize', queueHeader, { passive: true });
  updateHeader();

  document.getElementById('year').textContent = new Date().getFullYear();

  /* Staggered scroll reveal. */
  if ('IntersectionObserver' in window) {
    document.querySelectorAll('.steps li').forEach((li, i) => li.style.setProperty('--reveal-delay', (i * 0.09) + 's'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.07 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    root.classList.add('js-reveal');
  }
})();
