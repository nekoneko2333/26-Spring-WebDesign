// ==================== Intro / Opening Screen ====================
import { gsap } from 'gsap';

const introEl = document.getElementById('intro-screen');
const startBtn = document.getElementById('intro-start-btn');
const introTitle = document.getElementById('intro-title');
const introSubtitle = document.getElementById('intro-subtitle');
const introCard = document.getElementById('intro-card');
const introRoad = document.getElementById('intro-road');
const introCar = document.getElementById('intro-car-svg');
const progressBar = document.getElementById('intro-progress');

let _onStart = null;

/**
 * @param {{ onStart: Function }} callbacks
 */
export function initIntroScreen({ onStart }) {
  _onStart = onStart;

  if (!introEl) return;

  // Animate intro elements in on load
  const tl = gsap.timeline({ delay: 0.25 });

  tl.fromTo(introRoad, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 1.8, ease: 'power2.inOut' })
    .fromTo(introCar,  { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.65')
    .fromTo(introTitle,    { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.05, ease: 'power2.out' }, '-=0.85')
    .fromTo(introSubtitle, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: 'power2.out' }, '-=0.82')
    .fromTo(startBtn,      { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' }, '-=0.62');

  if (startBtn) {
    startBtn.addEventListener('click', () => dismissIntro());
  }

  // Allow pressing Enter / Space to start
  window.addEventListener('keydown', (e) => {
    if (introEl && !introEl.classList.contains('is-gone') && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      dismissIntro();
    }
  }, { once: false });
}

function dismissIntro() {
  if (!introEl || introEl.classList.contains('is-dismissing')) return;
  introEl.classList.add('is-dismissing');

  // Car drives off screen
  const tl = gsap.timeline({
    onComplete: () => {
      introEl.classList.add('is-gone');
      introEl.setAttribute('aria-hidden', 'true');
      if (_onStart) _onStart();
    }
  });

  tl.to(introCar,  { x: 280, opacity: 0, duration: 0.9, ease: 'power2.inOut' })
    .to(introCard,  { y: -24, opacity: 0, duration: 0.72, ease: 'power2.inOut' }, '-=0.62')
    .to(introEl,    { opacity: 0, duration: 0.62, ease: 'power2.inOut' }, '-=0.38');
}

export function showLoadingProgress(value) {
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.round(value))}%`;
  }
}
