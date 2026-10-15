(() => {
  'use strict';
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu-toggle');
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
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
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
  const motion = document.querySelector('.motion-toggle');
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    paused = !paused; applyMotion();
    try { localStorage.setItem('akitech-motion', paused ? 'paused' : 'playing'); } catch (_) {}
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.07 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    root.classList.add('js-reveal');
  }
})();
