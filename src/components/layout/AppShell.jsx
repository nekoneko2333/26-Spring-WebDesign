import { useEffect, useState } from 'react';
import { UIOverlay } from '../ui/UIOverlay.jsx';
import { useAppStore } from '../../state/useAppStore.js';

const shellCopy = {
  en: {
    close: 'Back to Travel Guide',
    introEyebrow: 'Hand-drawn route / 3D atlas',
    introTitleTop: 'Italy',
    introTitleBottom: 'Drive',
    introSubtitle: 'Open a parchment route atlas, then follow the landmarks through a hand-drawn 3D travel map.',
    ready: 'Route inked',
    start: 'Start Driving',
    hintPrefix: 'Press',
    hintSuffix: 'or click to begin',
  },
  zh: {
    close: '返回旅行首页',
    introEyebrow: '手绘路线 / 3D 地图册',
    introTitleTop: '意大利',
    introTitleBottom: '行车导览',
    introSubtitle: '展开一张牛皮纸路线图，在手绘质感的 3D 旅行地图中穿行于各个地标。',
    ready: '路线已描好',
    start: '开始驾驶',
    hintPrefix: '按下',
    hintSuffix: '或点击开始',
  },
};

export function AppShell({ children, isStarted, onStart, onClose }) {
  const language = useAppStore((state) => state.language);
  const copy = shellCopy[language] ?? shellCopy.en;
  const [introVisible, setIntroVisible] = useState(!isStarted);
  const [introExiting, setIntroExiting] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('ui-awake', isStarted);
    document.body.classList.toggle('drive-open', true);
    return () => {
      document.body.classList.remove('ui-awake');
      document.body.classList.remove('drive-open');
    };
  }, [isStarted]);

  useEffect(() => {
    if (!isStarted) {
      setIntroVisible(true);
      setIntroExiting(false);
      return undefined;
    }

    setIntroExiting(true);
    const timer = window.setTimeout(() => {
      setIntroVisible(false);
      setIntroExiting(false);
    }, 820);
    return () => window.clearTimeout(timer);
  }, [isStarted]);

  return (
    <div className="drive-overlay" role="dialog" aria-modal="true" aria-label="Italy Drive explorer">
      <div className={`app-shell ${language === 'zh' ? 'is-zh' : 'is-en'}`}>
        <button className="drive-overlay__close" type="button" onClick={onClose}>
          {copy.close}
        </button>
        <div className="app-shell__paper" aria-hidden="true" />
        <div className="app-shell__glow app-shell__glow--left" aria-hidden="true" />
        <div className="app-shell__glow app-shell__glow--right" aria-hidden="true" />
        <div className="intro-grain" aria-hidden="true" />
        <div className="app-shell__scene">{children}</div>
        <UIOverlay isStarted={isStarted} />
        {introVisible && <IntroOverlay onStart={onStart} copy={copy} isExiting={introExiting} />}
      </div>
    </div>
  );
}

function IntroOverlay({ onStart, copy, isExiting }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div className={`intro-screen ${isExiting ? 'is-exiting' : ''}`} role="dialog" aria-modal="true" aria-label="Italy Drive opening screen">
      <div className="intro-map-sheet" aria-hidden="true">
        <span className="intro-map-sheet__route" />
        <span className="intro-map-sheet__pin intro-map-sheet__pin--1" />
        <span className="intro-map-sheet__pin intro-map-sheet__pin--2" />
        <span className="intro-map-sheet__pin intro-map-sheet__pin--3" />
        <span className="intro-map-sheet__pin intro-map-sheet__pin--4" />
      </div>

      <div className="intro-card">
        <p className="intro-eyebrow">{copy.introEyebrow}</p>
        <h1 className="intro-title">{copy.introTitleTop}<br /><span>{copy.introTitleBottom}</span></h1>
        <p className="intro-subtitle">{copy.introSubtitle}</p>

        <div className="intro-progress-wrap">
          <div className="intro-progress-track">
            <div className="intro-progress-bar" style={{ width: '100%' }} />
          </div>
          <span className="intro-progress-label">{copy.ready}</span>
        </div>

        <button className="intro-start-btn" type="button" onClick={onStart}>
          <span className="intro-start-btn__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="4,2 16,9 4,16" fill="currentColor" /></svg>
          </span>
          {copy.start}
        </button>

        <p className="intro-hint">{copy.hintPrefix} <kbd>Enter</kbd> {copy.hintSuffix}</p>
      </div>

      <div className="intro-grain" aria-hidden="true" />
    </div>
  );
}
