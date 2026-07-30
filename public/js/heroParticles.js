// Анимация падающих смайликов в hero-секции (только главная страница)
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const heroSection = canvas.closest('.hero');
  if (!heroSection) return;

  const ctx = canvas.getContext('2d');

  // Смайлики по теме сайта (торты, сладости, выпечка)
  const EMOJIS = ['🍰', '🎂', '🧁', '🍪', '🍬', '🍭', '🍫', '🍩', '🥐', '🍒', '🍓', '🍮', '🍯', '🥧'];

  const isMobile = window.matchMedia('(max-width: 640px)').matches || ('ontouchstart' in window && window.innerWidth <= 900);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COUNT = isMobile ? 14 : 26;
  const REPEL_RADIUS = isMobile ? 70 : 95; // радиус отталкивания вокруг курсора/пальца
  const REPEL_STRENGTH = 2.6;              // сила отталкивания
  const DAMPING = 0.9;                     // затухание — плавный возврат к траектории

  let width = 0;
  let height = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let particles = [];
  const pointer = { x: -9999, y: -9999, active: false };
  let rafId = null;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    const rect = heroSection.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // initial = true -> частицы разбросаны по всей высоте (чтобы сразу выглядело как "снегопад")
  // initial = false -> respawn сверху, за верхней границей
  function createParticle(initial) {
    return {
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: rand(0, width),
      y: initial ? rand(-height * 0.5, height) : rand(-height * 0.3, -20),
      size: rand(16, 34),
      opacity: rand(0.35, 0.9),
      vy: rand(0.35, 1.1),
      swaySpeed: rand(0.006, 0.02),
      swayAmount: rand(10, 34),
      phase: rand(0, Math.PI * 2),
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.01, 0.01),
      pushX: 0,
      pushY: 0,
    };
  }

  function initParticles() {
    particles = Array.from({ length: COUNT }, () => createParticle(true));
  }

  function getRelativePos(clientX, clientY) {
    const rect = heroSection.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onMouseMove(e) {
    const p = getRelativePos(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
  }
  function onMouseLeave() {
    pointer.active = false;
  }
  function onTouchMove(e) {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    const p = getRelativePos(t.clientX, t.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
  }
  function onTouchEnd() {
    pointer.active = false;
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.phase += p.swaySpeed;
      const sway = Math.sin(p.phase) * p.swayAmount * 0.02;

      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < REPEL_RADIUS) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          p.pushX += (dx / dist) * force;
          p.pushY += (dy / dist) * force;
        }
      }

      // затухание "отталкивания" -> плавный возврат к обычному падению
      p.pushX *= DAMPING;
      p.pushY *= DAMPING;

      p.x += sway + p.pushX;
      p.y += p.vy + p.pushY;
      p.rotation += p.rotSpeed;

      // мягкий wrap по горизонтали, если оттолкнуло за край
      if (p.x < -40) p.x = width + 40;
      if (p.x > width + 40) p.x = -40;

      // пересекла нижнюю границу -> исчезает, создаём новую сверху
      if (p.y > height + 40) {
        Object.assign(p, createParticle(false));
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });

    rafId = requestAnimationFrame(step);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });
  }

  function start() {
    resize();
    initParticles();

    if (reducedMotion) {
      // Пользователь включил "уменьшить анимацию" в системе — рисуем статично, без движения
      drawStatic();
      return;
    }

    if (rafId) cancelAnimationFrame(rafId);
    step();
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      if (reducedMotion) drawStatic();
    }, 150);
  });

  heroSection.addEventListener('mousemove', onMouseMove);
  heroSection.addEventListener('mouseleave', onMouseLeave);
  heroSection.addEventListener('touchmove', onTouchMove, { passive: true });
  heroSection.addEventListener('touchstart', onTouchMove, { passive: true });
  heroSection.addEventListener('touchend', onTouchEnd);

  start();
})();
