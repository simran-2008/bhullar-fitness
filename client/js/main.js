/* =================================================================
   BHULLAR FITNESS — Landing Page JS
   Vanilla JS · no dependencies (except Lucide icons)
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* Render Lucide icons */
  if (window.lucide) lucide.createIcons();

  /* -------------------------------------------------
     1. NAVBAR — scroll state + mobile menu + active link
  ------------------------------------------------- */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  const links     = document.querySelectorAll('.nav-link');

  // Add shadow/background when scrolled
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  // Close mobile menu when a link is tapped
  links.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // Highlight nav link for the section currently in view
  const sections = document.querySelectorAll('section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* -------------------------------------------------
     2. SCROLL REVEAL — fade/slide elements into view
  ------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Slight stagger for grouped elements
        setTimeout(() => entry.target.classList.add('in'), (i % 4) * 80);
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealObs.observe(el));

  /* -------------------------------------------------
     3. HERO — subtle parallax on background
  ------------------------------------------------- */
  const heroBg = document.getElementById('heroBg');
  if (heroBg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroBg.style.transform = `scale(1.08) translateY(${y * 0.18}px)`;
      }
    }, { passive: true });
  }

  /* -------------------------------------------------
     4. STAT COUNTERS — count up when visible
  ------------------------------------------------- */
  const counters = document.querySelectorAll('.stat-num');
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = +el.dataset.target;
      const dur    = 1600;
      const start  = performance.now();

      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString();
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countObs.observe(c));

  /* -------------------------------------------------
     5. TESTIMONIAL SLIDER
  ------------------------------------------------- */
  const track = document.getElementById('sliderTrack');
  const dots  = document.querySelectorAll('#slDots .dot');
  const total = document.querySelectorAll('.slide').length;
  let current = 0;
  let autoTimer;

  const goTo = (i) => {
    current = (i + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
  };
  const startAuto = () => { autoTimer = setInterval(() => goTo(current + 1), 6000); };
  const stopAuto  = () => clearInterval(autoTimer);

  document.getElementById('slNext').addEventListener('click', () => { goTo(current + 1); stopAuto(); startAuto(); });
  document.getElementById('slPrev').addEventListener('click', () => { goTo(current - 1); stopAuto(); startAuto(); });
  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.slide); stopAuto(); startAuto(); }));
  startAuto();

  /* -------------------------------------------------
     6. GALLERY LIGHTBOX
  ------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lbImg');
  document.querySelectorAll('.gal-item').forEach(item => {
    item.addEventListener('click', () => {
      lbImg.src = item.dataset.src;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });
  const closeLb = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };
  document.getElementById('lbClose').addEventListener('click', closeLb);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

  /* -------------------------------------------------
     7. BMI CALCULATOR
  ------------------------------------------------- */
  document.getElementById('bmiCalcBtn').addEventListener('click', () => {
    const h = parseFloat(document.getElementById('bmiHeight').value);
    const w = parseFloat(document.getElementById('bmiWeight').value);
    const box = document.getElementById('bmiResult');

    if (!h || !w || h < 50 || w < 20) {
      box.innerHTML = `<span class="calc-placeholder">Please enter valid height &amp; weight.</span>`;
      return;
    }
    const m   = h / 100;
    const bmi = (w / (m * m)).toFixed(1);

    let label, tag;
    if (bmi < 18.5)      { label = 'Underweight'; tag = 'tag-low'; }
    else if (bmi < 25)   { label = 'Normal weight'; tag = 'tag-norm'; }
    else if (bmi < 30)   { label = 'Overweight'; tag = 'tag-high'; }
    else                 { label = 'Obese'; tag = 'tag-high'; }

    box.innerHTML = `
      <div>
        <div class="res-num">${bmi}</div>
        <div class="res-lbl">Your BMI</div>
        <span class="res-tag ${tag}">${label}</span>
      </div>`;
  });

  /* -------------------------------------------------
     8. CALORIE CALCULATOR (Mifflin-St Jeor)
  ------------------------------------------------- */
  document.getElementById('calCalcBtn').addEventListener('click', () => {
    const age      = parseFloat(document.getElementById('calAge').value);
    const gender   = document.getElementById('calGender').value;
    const h        = parseFloat(document.getElementById('calHeight').value);
    const w        = parseFloat(document.getElementById('calWeight').value);
    const activity = parseFloat(document.getElementById('calActivity').value);
    const box      = document.getElementById('calResult');

    if (!age || !h || !w || age < 10) {
      box.innerHTML = `<span class="calc-placeholder">Please fill in all fields correctly.</span>`;
      return;
    }
    // BMR
    let bmr = 10 * w + 6.25 * h - 5 * age;
    bmr += (gender === 'male') ? 5 : -161;

    const maintenance = Math.round(bmr * activity);
    const lose = maintenance - 500;   // ~0.5kg/week deficit
    const gain = maintenance + 500;   // ~0.5kg/week surplus

    box.innerHTML = `
      <div>
        <div class="res-num">${maintenance.toLocaleString()}</div>
        <div class="res-lbl">Maintenance calories / day</div>
        <span class="res-tag tag-norm">Lose: ${lose.toLocaleString()} · Gain: ${gain.toLocaleString()}</span>
      </div>`;
  });

  /* -------------------------------------------------
     9. CONTACT FORM — client-side validation
        (replace the simulated submit with a real
         fetch() to your backend /api/contact later)
  ------------------------------------------------- */
  const form = document.getElementById('contactForm');
  const ok   = document.getElementById('formOk');

  const setError = (id, msg) => {
    const input = document.getElementById(id);
    const group = input.closest('.fg');
    group.classList.toggle('err', !!msg);
    group.querySelector('.ferr').textContent = msg || '';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const name  = document.getElementById('cName').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const msg   = document.getElementById('cMsg').value.trim();

    if (name.length < 2)  { setError('cName', 'Please enter your name.'); valid = false; }
    else setError('cName', '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('cEmail', 'Enter a valid email.'); valid = false; }
    else setError('cEmail', '');

    if (msg.length < 5)   { setError('cMsg', 'Message is too short.'); valid = false; }
    else setError('cMsg', '');

    if (!valid) return;

    /* === Connect to backend here ===
       fetch(`${API_BASE}/contact`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ name, email, message: msg })
       });
    */
    ok.classList.add('show');
    form.reset();
    setTimeout(() => ok.classList.remove('show'), 5000);
  });

});
