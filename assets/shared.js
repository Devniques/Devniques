/* Shared shell and motion. Content stays in the HTML partials and pages. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const isAI = location.pathname.endsWith('ai-automation.html');
  const loader = document.getElementById('loader');
  let ready = false;

  function revealPage() {
    if (ready) return;
    ready = true;
    document.body.classList.add('loaded');
    if (loader) {
      loader.classList.add('done');
      loader.addEventListener('transitionend', () => { loader.hidden = true; }, {once: true});
      setTimeout(() => { loader.hidden = true; }, 320);
    }
  }
  // A slow font, video, or partial must never trap the visitor behind the loader.
  setTimeout(revealPage, 800);

  const hero = document.querySelector('.ln-hero-inner, .lx-hero-inner');
  if (hero) [...hero.children].filter(el => !el.matches('.ln-shot-glow')).forEach((el, i) => {
    el.classList.remove('rv');
    el.classList.add('hero-step');
    el.style.setProperty('--step', i);
  });
  const headline = hero && hero.querySelector('h1');
  if (headline) {
    headline.classList.add('word-reveal');
    const walker = document.createTreeWalker(headline, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let word = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(text => {
        if (!text.trim()) fragment.append(document.createTextNode(text));
        else {
          const span = document.createElement('span');
          span.className = 'dv-word';
          span.style.setProperty('--word', word++);
          span.textContent = text;
          fragment.append(span);
        }
      });
      node.replaceWith(fragment);
    });
  }

  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    reveal.unobserve(entry.target);
  }), {threshold: 0.08, rootMargin: '0px 0px -24px 0px'});
  function observe(root) {
    root.querySelectorAll('.rv').forEach(el => {
      const siblings = [...el.parentElement.children].filter(child => child.classList.contains('rv'));
      el.style.setProperty('--step', siblings.indexOf(el) % 4);
      if (motion.matches) el.classList.add('in');
      else { el.classList.add('reveal-ready'); reveal.observe(el); }
    });
  }
  observe(document);

  let nav, links, burger;
  function menu(open, restoreFocus = false) {
    if (!nav) return;
    nav.classList.toggle('open', open);
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (restoreFocus) burger.focus();
  }
  function setupNav() {
    nav = document.getElementById('nav');
    links = document.getElementById('navLinks');
    burger = document.getElementById('burger');
    if (!nav || !links || !burger) return;
    burger.setAttribute('aria-controls', 'navLinks');
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', () => menu(!links.classList.contains('open')));
    nav.addEventListener('keydown', event => {
      if (event.key === 'Escape') menu(false, true);
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target)) menu(false);
    });
    matchMedia('(max-width: 900px)').addEventListener('change', () => menu(false));
    const anchors = [...links.querySelectorAll('a')];
    function active(hash) {
      anchors.forEach(a => {
        const selected = a.getAttribute('href') === hash;
        a.classList.toggle('on', selected);
        if (selected) a.setAttribute('aria-current', isAI ? 'page' : 'location');
        else a.removeAttribute('aria-current');
      });
    }
    active(isAI ? '#ai-feature' : '#top');
    if (!isAI) {
      const spy = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) active('#' + entry.target.id);
      }), {rootMargin: '-15% 0px -60% 0px'});
      document.querySelectorAll('section[id], footer[id]').forEach(el => spy.observe(el));
    }
    updateScroll();
  }

  // Both pages fetch exactly the same partials; routing is handled without rewriting copy or links.
  async function loadPartial(id, file) {
    const target = document.getElementById(id);
    if (!target) return;
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Unable to load ${file}: ${response.status}`);
    target.innerHTML = await response.text();
    observe(target);
  }
  Promise.all([loadPartial('navbar', 'assets/Navbar.html'), loadPartial('footer', 'assets/Footer.html')])
    .then(() => {
      setupNav();
      requestAnimationFrame(() => requestAnimationFrame(revealPage));
      if (location.hash) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView({behavior: 'instant'});
      }
      const product = new URLSearchParams(location.search).get('product');
      if (product && typeof window.openProductModal === 'function') window.openProductModal(product);
    })
    .catch(error => { console.error(error); revealPage(); });

  document.addEventListener('click', event => {
    const a = event.target.closest('a');
    if (!a) return;
    // Footer product links use the homepage's existing product dialogs.
    if (isAI && a.closest('#footer') && a.hasAttribute('onclick')) {
      const product = a.getAttribute('onclick').match(/^openProductModal\('([^']+)'\)$/);
      if (product) {
        event.preventDefault();
        event.stopImmediatePropagation();
        location.href = 'index.html?product=' + encodeURIComponent(product[1]) + '#products';
        return;
      }
    }
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#') || href === '#') return;
    if (a.closest('#navbar')) menu(false);
    if (isAI && a.closest('#navbar, #footer') && href !== '#contact') {
      event.preventDefault();
      location.href = 'index.html' + href;
    }
  }, true);

  const progress = document.getElementById('sprog');
  const backdrop = document.querySelector('.lx-hero-bg');
  let pending = false;
  function updateScroll() {
    pending = false;
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    if (progress) {
      const height = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${height > 0 ? y / height : 0})`;
    }
    if (backdrop) backdrop.style.transform = motion.matches ? 'none' : `translateY(${Math.min(y * 0.06, 32)}px)`;
  }
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(updateScroll); }
  }, {passive: true});
  addEventListener('resize', updateScroll, {passive: true});
  updateScroll();

  function applyMotionPreference() {
    document.querySelectorAll('video').forEach(video => {
      if (motion.matches) video.pause();
      else if (video.autoplay) video.play().catch(() => {});
    });
    if (motion.matches) document.querySelectorAll('.reveal-ready').forEach(el => el.classList.add('in'));
    updateScroll();
  }
  applyMotionPreference();
  motion.addEventListener('change', applyMotionPreference);
})();
