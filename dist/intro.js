(() => {
  'use strict';
  const hero = document.querySelector('.ring-intro');
  const sticky = hero.querySelector('.ring-sticky');
  const opening = hero.querySelector('.brand-opening');
  const logo = hero.querySelector('h1');
  const map = hero.querySelector('.business-map');
  const rings = hero.querySelector('.brand-rings');
  const scrollLabel = document.getElementById('ring-scroll-label');
  const nodes = [...hero.querySelectorAll('.business-node')];
  const lines = [...hero.querySelectorAll('.business-line')];
  const joints = [...hero.querySelectorAll('.business-joint')];
  const root = document.documentElement;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.min(1, Math.max(0, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  let enabled = false, visible = true, frame = 0, current = 0, target = 0, lastTime = 0;
  let panX = 0, panY = 0, maxZoom = 2.6, ringStartScale = 1.65;
  let unfoldedHint = false;

  function geometry() {
    const mobile = innerWidth <= 700;
    const cx = map.clientWidth * 0.5;
    const cy = map.clientHeight * (mobile ? 0.21 : 0.5);
    const radius = rings.offsetWidth * 240 / 560;

    nodes.forEach((node, i) => {
      const left = node.offsetLeft;
      const right = left + node.offsetWidth;
      const centerY = node.offsetTop;
      let sx, sy, tx, ty, d;

      if (mobile) {
        const isLeft = i < 3;
        const row = i % 3;
        const spreadAngle = (isLeft ? [104, 98, 93] : [76, 82, 87])[row] * Math.PI / 180;
        sx = cx + Math.cos(spreadAngle) * radius;
        sy = cy + Math.sin(spreadAngle) * radius;
        tx = isLeft ? right + 3 : left - 3;
        ty = centerY;
        const spineX = cx + (isLeft ? -1 : 1) * (2.5 + (2 - row) * 2.4);
        const bendY = sy + (ty - sy) * 0.42;
        d = `M${sx.toFixed(1)},${sy.toFixed(1)} C${spineX.toFixed(1)},${bendY.toFixed(1)} ${spineX.toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
      } else {
        tx = i < 3 ? right + 12 : left - 12;
        ty = centerY;
        const angle = Math.atan2(ty - cy, tx - cx);
        sx = cx + Math.cos(angle) * radius;
        sy = cy + Math.sin(angle) * radius;
        const mx = (sx + tx) / 2;
        d = `M${sx.toFixed(1)},${sy.toFixed(1)} C${mx.toFixed(1)},${sy.toFixed(1)} ${mx.toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
      }
      lines[i].setAttribute('d', d);
      joints[i].setAttribute('cx', tx.toFixed(1));
      joints[i].setAttribute('cy', ty.toFixed(1));
    });

    if (!enabled) return;
    // The center of the original SVG's gold mark is 14.92%, 52.36%.
    const image = logo.querySelector('img');
    if (!image.offsetWidth) return;
    const originalCenterX = opening.offsetLeft - opening.offsetWidth / 2 + image.offsetWidth * 0.1492;
    const originalCenterY = opening.offsetTop - opening.offsetHeight / 2 + image.offsetHeight * 0.5236;
    panX = (map.offsetLeft + cx) - originalCenterX;
    panY = (map.offsetTop + cy) - originalCenterY;
    const originalDiameter = image.offsetWidth * (57.5 / 206.26949);
    const ringDiameter = rings.offsetWidth * 520 / 560;
    ringStartScale = mobile ? 1.42 : 1.56;
    maxZoom = ringDiameter * ringStartScale / originalDiameter;
  }

  function measure() {
    if (!enabled) return;
    const top = innerWidth <= 700 ? 60 : 68;
    const distance = hero.offsetHeight - sticky.offsetHeight;
    target = distance > 0 ? clamp((top - hero.getBoundingClientRect().top) / distance) : 0;
    request();
  }

  function paint(time) {
    frame = 0;
    if (!enabled || !visible || document.hidden) return;
    const delta = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;
    current += (target - current) * (1 - Math.exp(-delta / 60));

    const zoom = smooth(current / 0.36);
    const handoff = smooth((current - 0.25) / 0.12);
    const settle = smooth((current - 0.36) / 0.18);
    const set = (k, v) => hero.style.setProperty(k, String(v));

    set('--ring-progress', current.toFixed(4));
    set('--logo-pan-x', (panX * zoom).toFixed(2) + 'px');
    set('--logo-pan-y', (panY * zoom).toFixed(2) + 'px');
    set('--logo-zoom', (1 + (maxZoom - 1) * zoom).toFixed(4));
    set('--logo-opacity', (1 - handoff).toFixed(4));
    set('--logo-caption-opacity', (1 - smooth(current / 0.14)).toFixed(4));
    set('--ring-heading-opacity', (1 - smooth(current / 0.16) * 0.55).toFixed(4));
    set('--double-ring-opacity', handoff.toFixed(4));
    set('--double-ring-scale', (ringStartScale - (ringStartScale - 1) * settle).toFixed(4));
    set('--ring-center-opacity', smooth((current - 0.40) / 0.14).toFixed(4));
    set('--business-caption-opacity', smooth((current - 0.72) / 0.16).toFixed(4));
    set('--ring-aura', (1 + handoff * 0.55).toFixed(4));

    const nowUnfolded = current > 0.72;
    if (scrollLabel && nowUnfolded !== unfoldedHint) {
      unfoldedHint = nowUnfolded;
      scrollLabel.innerHTML = nowUnfolded
        ? '选一项看详情'
        : '下滑看服务 <i aria-hidden="true">↓</i>';
    }

    nodes.forEach((node, i) => {
      const order = [0, 2, 4, 1, 3, 5][i];
      const progress = smooth((current - (0.44 + order * 0.055)) / 0.15);
      node.style.setProperty('--node-opacity', progress.toFixed(4));
      node.style.setProperty('--node-shift', ((1 - progress) * (i < 3 ? 14 : -14)).toFixed(2) + 'px');
      node.style.setProperty('--node-visibility', progress > 0.01 ? 'visible' : 'hidden');
      node.tabIndex = progress > 0.7 ? 0 : -1;
      node.setAttribute('aria-hidden', String(progress <= 0.01));
      lines[i].style.setProperty('--line-offset', (1 - progress).toFixed(4));
      lines[i].style.setProperty('--line-opacity', (progress * 0.62).toFixed(4));
      joints[i].style.setProperty('--joint-opacity', progress.toFixed(4));
    });

    if (Math.abs(target - current) > 0.00015) request();
  }

  function request() {
    if (!frame && enabled && visible && !document.hidden) frame = requestAnimationFrame(paint);
  }

  function configure() {
    const next = !media.matches && !root.classList.contains('motion-off') && innerHeight >= 600;
    if (next !== enabled) {
      enabled = next;
      hero.classList.toggle('ring-ready', enabled);
      lastTime = 0;
      if (!enabled) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        hero.removeAttribute('style');
        nodes.forEach(n => { n.removeAttribute('style'); n.tabIndex = 0; n.removeAttribute('aria-hidden'); });
        lines.forEach(n => n.removeAttribute('style'));
        joints.forEach(n => n.removeAttribute('style'));
      }
    }
    geometry();
    if (enabled) measure();
  }

  nodes.forEach((node, i) => {
    const highlight = on => {
      lines[i].classList.toggle('is-lit', on);
      joints[i].classList.toggle('is-lit', on);
    };
    node.addEventListener('pointerenter', () => highlight(true));
    node.addEventListener('pointerleave', () => highlight(false));
    node.addEventListener('focus', () => highlight(true));
    node.addEventListener('blur', () => highlight(false));
    node.addEventListener('click', () => {
      const detail = document.querySelector(node.getAttribute('href'));
      if (detail?.tagName === 'DETAILS') detail.open = true;
    });
  });

  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', configure, { passive: true });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    lastTime = 0;
    if (visible) measure();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }).observe(hero);
  new MutationObserver(configure).observe(root, { attributes: true, attributeFilter: ['class'] });
  media.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (!document.hidden) measure();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  logo.querySelector('img').addEventListener('load', configure);
  configure();
})();
