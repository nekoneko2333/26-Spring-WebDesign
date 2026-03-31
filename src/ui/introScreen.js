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
  const tl = gsap.timeline({ delay: 0.1 });

  tl.fromTo(introRoad, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 1.2, ease: 'power3.inOut' })
    .fromTo(introCar,  { x: -120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.4)' }, '-=0.3')
    .fromTo(introTitle,    { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.4')
    .fromTo(introSubtitle, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.4')
    .fromTo(startBtn,      { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.2');

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

  tl.to(introCar,  { x: 300, opacity: 0, duration: 0.6, ease: 'power3.in' })
    .to(introCard,  { y: -30, opacity: 0, duration: 0.45, ease: 'power2.in' }, '-=0.3')
    .to(introEl,    { opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.15');
}

export function showLoadingProgress(value) {
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.round(value))}%`;
  }
}
