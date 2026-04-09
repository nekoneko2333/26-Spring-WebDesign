import { useEffect, useRef } from 'react';

export function useKeyboardDrive() {
  const controls = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
  });

  useEffect(() => {
    const onKeyChange = (pressed) => (event) => {
      const { code } = event;
      if (code === 'KeyW' || code === 'ArrowUp') controls.current.forward = pressed;
      if (code === 'KeyS' || code === 'ArrowDown') controls.current.backward = pressed;
      if (code === 'KeyA' || code === 'ArrowLeft') controls.current.left = pressed;
      if (code === 'KeyD' || code === 'ArrowRight') controls.current.right = pressed;
      if (code === 'ShiftLeft' || code === 'ShiftRight') controls.current.boost = pressed;
      if ([
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(code)) {
        event.preventDefault();
      }
    };

    const down = onKeyChange(true);
    const up = onKeyChange(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return controls;
}
