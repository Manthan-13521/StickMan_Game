'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MobileInput } from './input/MobileInput';

interface PhaserGameProps {
  onReady?: (game: Phaser.Game) => void;
}

export default function PhaserGame({ onReady }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initializedRef = useRef(false);

  const configRef = useRef<Phaser.Types.Core.GameConfig>({
    type: Phaser.AUTO,
    width: 1200,
    height: 600,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  });
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    const game = new Phaser.Game({ ...configRef.current, parent: containerRef.current });
    gameRef.current = game;
    onReadyRef.current?.(game);
    return () => {
      game.destroy(true);
      gameRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
      <MobileInput />
    </div>
  );
}
