import { useEffect } from 'react';
import { UIOverlay } from '../ui/UIOverlay.jsx';

export function AppShell({ children, isStarted, onStart, onClose }) {
  useEffect(() => {
    document.body.classList.toggle('ui-awake', isStarted);
    document.body.classList.toggle('drive-open', true);
    return () => {
      document.body.classList.remove('ui-awake');
      document.body.classList.remove('drive-open');
    };
  }, [isStarted]);

  return (
    <div className="drive-overlay" role="dialog" aria-modal="true" aria-label="Italy Drive explorer">
      <div className="app-shell">
        <button className="drive-overlay__close" type="button" onClick={onClose}>
          Back to Travel Guide
        </button>
        <div className="app-shell__glow app-shell__glow--left" aria-hidden="true" />
        <div className="app-shell__glow app-shell__glow--right" aria-hidden="true" />
        <div className="intro-grain" aria-hidden="true" />
        <div className="app-shell__scene">{children}</div>
        <UIOverlay isStarted={isStarted} />
        {!isStarted && <IntroOverlay onStart={onStart} />}
      </div>
    </div>
  );
}

function IntroOverlay({ onStart }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div className="intro-screen" role="dialog" aria-modal="true" aria-label="Italy Drive opening screen">
      <div className="intro-road">
        <div className="intro-road__line intro-road__line--1" />
        <div className="intro-road__line intro-road__line--2" />
        <div className="intro-road__line intro-road__line--3" />
      </div>

      <div className="intro-car" aria-hidden="true">
        <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="90" cy="85" rx="68" ry="5" fill="rgba(0,0,0,0.32)" />
          <rect x="12" y="44" width="156" height="34" rx="8" fill="#c7784a" />
          <path d="M52 44 L68 18 H118 L136 44 Z" fill="#a85f38" />
          <path d="M118 44 L108 24 H90 L76 44 Z" fill="#d4e8f0" opacity="0.7" />
          <path d="M68 18 L78 44 H62 Z" fill="#d4e8f0" opacity="0.6" />
          <rect x="145" y="60" width="18" height="10" rx="4" fill="#f0b86f" />
          <rect x="17" y="60" width="18" height="10" rx="4" fill="#f0b86f" />
          <rect x="153" y="51" width="10" height="6" rx="2" fill="#fff9e8" />
          <rect x="17" y="51" width="10" height="6" rx="2" fill="#d26b64" opacity="0.9" />
          <circle cx="48" cy="78" r="14" fill="#1c2233" />
          <circle cx="48" cy="78" r="7" fill="#e8e0d0" />
          <circle cx="48" cy="78" r="3" fill="#1c2233" />
          <circle cx="132" cy="78" r="14" fill="#1c2233" />
          <circle cx="132" cy="78" r="7" fill="#e8e0d0" />
          <circle cx="132" cy="78" r="3" fill="#1c2233" />
          <line x1="90" y1="44" x2="90" y2="74" stroke="#a05030" strokeWidth="2" opacity="0.45" />
        </svg>
      </div>

      <div className="intro-card">
        <p className="intro-eyebrow">Italy · Interactive 3D</p>
        <h1 className="intro-title">Italy<br /><span>Drive</span></h1>
        <p className="intro-subtitle">
          Step into the immersive route explorer and drive between the Colosseum and Pisa.
        </p>

        <div className="intro-progress-wrap">
          <div className="intro-progress-track">
            <div className="intro-progress-bar" style={{ width: '100%' }} />
          </div>
          <span className="intro-progress-label">Ready to explore</span>
        </div>

        <button className="intro-start-btn" type="button" onClick={onStart}>
          <span className="intro-start-btn__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="4,2 16,9 4,16" fill="currentColor" /></svg>
          </span>
          Start Driving
        </button>

        <p className="intro-hint">Press <kbd>Enter</kbd> or click to begin</p>
      </div>

      <div className="intro-grain" aria-hidden="true" />
    </div>
  );
}
