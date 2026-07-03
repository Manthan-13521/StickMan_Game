'use client';

import { useCallback, useEffect, useRef } from 'react';

const KEY_MAP: Record<string, string> = {
  'btn-left': 'ArrowLeft',
  'btn-right': 'ArrowRight',
  'btn-up': 'ArrowUp',
  'btn-down': 'ArrowDown',
  'btn-punch': 'KeyJ',
  'btn-kick': 'KeyK',
  'btn-block': 'KeyL',
  'btn-rematch': 'Enter',
  'btn-ultimate': 'KeyJ',
};

function dispatchKey(code: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

export function MobileInput() {
  const pressedRef = useRef<Set<string>>(new Set());

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent, key: string) => {
    e.preventDefault();
    const code = KEY_MAP[key];
    if (!code || pressedRef.current.has(key)) return;

    pressedRef.current.add(key);
    const codeToPress = key === 'btn-ultimate' && code === 'KeyJ' ? 'KeyK' : code;
    dispatchKey(code, 'keydown');
    if (key === 'btn-ultimate') {
      dispatchKey('KeyK', 'keydown');
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent, key: string) => {
    e.preventDefault();
    const code = KEY_MAP[key];
    if (!code || !pressedRef.current.has(key)) return;

    pressedRef.current.delete(key);
    dispatchKey(code, 'keyup');
    if (key === 'btn-ultimate') {
      dispatchKey('KeyK', 'keyup');
    }
  }, []);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, []);

  const btn = (id: string, label: string, className = '') => (
    <button
      id={id}
      onTouchStart={(e) => handleTouchStart(e, id)}
      onTouchEnd={(e) => handleTouchEnd(e, id)}
      onTouchCancel={(e) => handleTouchEnd(e, id)}
      onMouseDown={(e) => handleTouchStart(e, id)}
      onMouseUp={(e) => handleTouchEnd(e, id)}
      onMouseLeave={(e) => handleTouchEnd(e, id)}
      className={`touch-button ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mobile-controls">
      <div className="mobile-dpad">
        {btn('btn-up', '▲')}
        <div className="mobile-dpad-row">
          {btn('btn-left', '◀')}
          {btn('btn-down', '▼')}
          {btn('btn-right', '▶')}
        </div>
      </div>
      <div className="mobile-actions">
        {btn('btn-punch', 'JAB', 'btn-punch-action')}
        {btn('btn-kick', 'KICK', 'btn-kick-action')}
        {btn('btn-block', 'BLOCK', 'btn-block-action')}
        {btn('btn-ultimate', 'ULT', 'btn-ult-action')}
      </div>
    </div>
  );
}
