/* File: js/scripts.js
   Central JS for site behavior (now includes the typewriter module)
   - Theme toggle & persistence
   - Smooth scrolling for anchor links
   - Modal open/close and form handling (WhatsApp/mailto)
   - Album intersection observers (row highlighting + expander)
   - Typewriter effect (runs only if #typed exists)
   - Accessibility niceties
*/

/* Helper utilities */
function $ (sel) { return document.querySelector(sel); }
function $$ (sel) { return document.querySelectorAll(sel); }
function onAll(selector, event, handler){ Array.prototype.forEach.call(document.querySelectorAll(selector), el => el.addEventListener(event, handler)); }
function openNew(url){ window.open(url, '_blank'); }

/* Theme toggle (light/dark) — persists to localStorage */
(function themeToggleModule(){
  const toggle = $('#theme-toggle');
  if(!toggle) return;
  const root = document.documentElement;
  const key = 'kashi-theme';
  function applyTheme(theme){
    if(theme === 'dark'){
      root.setAttribute('data-theme','dark');
      toggle.textContent = '☀️';
      toggle.setAttribute('aria-pressed','true');
    } else {
      root.removeAttribute('data-theme');
      toggle.textContent = '🌙';
      toggle.setAttribute('aria-pressed','false');
    }
  }
  try{
    const saved = localStorage.getItem(key);
    if(saved){ applyTheme(saved); }
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){ applyTheme('dark'); }
    else { applyTheme('light'); }
  }catch(e){}
  toggle.addEventListener('click', () => {
    const now = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(now);
    try{ localStorage.setItem(key, now); }catch(e){}
  });
})();

/* Smooth scroll for internal anchors */
(function smoothScrollModule(){
  onAll('a[href^="#"]', 'click', function(e){
    const href = this.getAttribute('href');
    const target = document.querySelector(href);
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
})();

/* Modal behavior (contact modal) */
(function modalModule(){
  const modal = $('#contact-modal');
  if(!modal) return;
  const openBtns = [$('#open-contact'), $('#open-contact-2')].filter(Boolean);
  const closeBtn = $('#close-modal');
  function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  openBtns.forEach(b => b.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); }));
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });
})();

/* Contact form handling */
(function contactFormModule(){
  const form = $('#contact-form') || $('#contactForm');
  if(!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const data = new FormData(this);
    const name = (data.get('name') || '').trim() || 'Friend';
    const email = (data.get('email') || '').trim();
    const message = (data.get('message') || data.get('msg') || '').trim() || '';
    let text = `Hi KashiFrame, I am ${name}. `;
    if(email) text += `Email: ${email}. `;
    text += `Message: ${message}`;
    const link = 'https://wa.me/918299887999?text=' + encodeURIComponent(text);
    openNew(link);
    const modal = $('#contact-modal'); if(modal) modal.classList.remove('open');
  });
  const sendMailBtn = $('#sendMail');
  if(sendMailBtn){
    sendMailBtn.addEventListener('click', function(){
      const name = ($('#name') && $('#name').value) || '';
      const email = ($('#email') && $('#email').value) || '';
      const message = ($('#message') && $('#message').value) || '';
      const subject = encodeURIComponent('Inquiry from ' + (name || 'website'));
      const body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
      window.location.href = 'mailto:info@kashiframe.studio?subject=' + subject + '&body=' + body;
    });
  }
})();

/* Album / Gallery interaction */
(function albumModule(){
  const gallery = $('#gallery');
  if(!gallery) return;
  const sections = Array.from(document.querySelectorAll('.gallery-section'));
  const rows = Array.from(document.querySelectorAll('.row'));
  const tiles = Array.from(document.querySelectorAll('.tile'));
  const expanderRoot = document.getElementById('expander-root') || document.createElement('div');
  const rowCaption = document.getElementById('row-caption') || document.createElement('div');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!document.getElementById('expander-root')){
    expanderRoot.id = 'expander-root';
    expanderRoot.setAttribute('aria-hidden','true');
    document.body.appendChild(expanderRoot);
  }
  if(!document.getElementById('row-caption')){
    rowCaption.id = 'row-caption'; rowCaption.className = 'row-caption'; document.body.appendChild(rowCaption);
  }
  function randomEffect(){ const arr = ['effect-slide','effect-rotate','effect-fade']; return arr[Math.floor(Math.random()*arr.length)]; }
  function captionForSection(sec){ return sec.getAttribute('data-caption') || (sec.querySelector('.meta') ? sec.querySelector('.meta').textContent.trim() : 'Gallery'); }
  function createExpanderForImage(src){
    expanderRoot.innerHTML = '';
    const exp = document.createElement('div'); exp.className = 'expander';
    const base = document.createElement('div'); base.className = 'layer base'; base.style.backgroundImage = `url("${src}")`;
    const blur = document.createElement('div'); blur.className = 'layer blur'; blur.style.backgroundImage = `url("${src}")`;
    const glaze = document.createElement('div'); glaze.className = 'layer glaze'; glaze.style.backgroundImage = `url("${src}")`;
    exp.append(base, blur, glaze);
    expanderRoot.appendChild(exp);
    requestAnimationFrame(()=> exp.classList.add('show'));
  }
  function removeExpander(){
    const exp = expanderRoot.querySelector('.expander');
    if(!exp) return;
    exp.classList.remove('show');
    setTimeout(()=>{ expanderRoot.innerHTML = ''; }, 1200);
  }
  const tileObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const img = entry.target.querySelector('img');
      if(!img) return;
      if(entry.isIntersecting && entry.intersectionRatio > 0.5){
        const src = img.src;
        const existing = expanderRoot.querySelector('.expander .layer.base');
        if(!existing || existing.style.backgroundImage.indexOf(src) === -1){
          createExpanderForImage(src);
        }
      } else {
        const still = tiles.some(t => {
          const r = t.getBoundingClientRect();
          return r.top < (window.innerHeight * 0.8) && r.bottom > (window.innerHeight * 0.2);
        });
        if(!still) removeExpander();
      }
    });
  }, { threshold: [0.35, 0.5, 0.75] });
  tiles.forEach(t => tileObserver.observe(t));
  const rowObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
    rows.forEach(r => r.classList.remove('active','effect-slide','effect-rotate','effect-fade'));
    if(visible.length > 0){
      const bestSection = visible[0].target;
      const row = bestSection.querySelector('.row');
      if(row){
        row.classList.add('active');
        if(!prefersReduced){ row.classList.add(randomEffect()); }
        const text = captionForSection(bestSection);
        const count = bestSection.querySelectorAll('.tile').length;
        rowCaption.innerHTML = '';
        rowCaption.appendChild(document.createTextNode(text));
        const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = `${count} photos`;
        rowCaption.appendChild(sub);
        rowCaption.classList.add('show');
      }
    } else {
      rowCaption.classList.remove('show');
    }
  }, { root: null, rootMargin: '0px', threshold: [0.4, 0.6, 0.82] });
  sections.forEach(s => rowObserver.observe(s));
  rows.forEach(r => { r.addEventListener('animationend', () => { r.classList.remove('effect-slide','effect-rotate','effect-fade'); }); });
  const mm = window.matchMedia('(prefers-reduced-motion: reduce)');
  mm.addEventListener('change', () => { if(mm.matches){ rows.forEach(r => r.classList.remove('effect-slide','effect-rotate','effect-fade')); } });
})();

/* Typewriter effect (moved from inline in index.html)
   Runs only if #typed exists on the page */
(function typewriterModule(){
  const el = document.getElementById('typed');
  if(!el) return;
  const phrases = ['Crafting Stories in the Heart of Varanasi','Cinematic films with local soul','Weddings • Travel • Documentaries'];
  let p = 0, i = 0, rev = false;
  function step(){
    const str = phrases[p];
    if(!rev){
      i++;
      el.textContent = str.slice(0,i);
      if(i === str.length){ rev = true; setTimeout(step, 1200); return; }
    } else {
      i--;
      el.textContent = str.slice(0,i);
      if(i === 0){ rev=false; p=(p+1)%phrases.length; }
    }
    setTimeout(step, rev ? 40 : 60);
  }
  step();
})();

/* Accessibility niceties */
(function a11yAnnouncer(){
  const rowCaption = document.getElementById('row-caption');
  if(rowCaption) rowCaption.setAttribute('aria-live','polite');
})();
