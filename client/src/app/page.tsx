'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { networkClient } from '@/game/networking/NetworkClient';

type View = 'menu' | 'join' | 'create' | 'game';

const PhaserGame = dynamic(() => import('@/game/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

function GameView() {
  return (
    <div className="relative min-h-screen bg-[#0f0d2e] flex flex-col">
      <div className="flex-1 relative p-4">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading game...</p>
              </div>
            </div>
          }
        >
          <PhaserGame />
        </Suspense>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>('menu');
  const [roomCode, setRoomCode] = useState('');
  const { setRoomCode: setStoreRoomCode, setPlayerIndex, setGameState, setConnected, setError, reset: resetStore } =
    useGameStore();

  useEffect(() => {
    const socket = networkClient.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    networkClient.onRoomCreated((data) => {
      setStoreRoomCode(data.code);
      setPlayerIndex(data.playerIndex);
      setView('game');
    });

    networkClient.onPlayerJoined((data) => {
      setStoreRoomCode(data.code);
      setPlayerIndex(data.playerIndex);
      setView('game');
    });

    networkClient.onGameState((data) => {
      setGameState(data);
    });

    networkClient.onError((data) => {
      setError(data.message);
    });

    return () => {
      networkClient.disconnect();
      resetStore();
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    networkClient.createRoom();
    setView('create');
  }, []);

  const handleJoinRoom = useCallback(() => {
    if (roomCode.length === 6) {
      networkClient.joinRoom(roomCode);
    }
  }, [roomCode]);

  if (view === 'game') {
    return <GameView />;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0f0d2e]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/20 blur-[120px]" />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center gap-12 px-6"
          >
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-display text-7xl md:text-8xl font-black tracking-tight"
              >
                <span className="text-gradient">StickMan</span>
                <br />
                <span className="text-gradient-accent">Arena</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-4 text-lg md:text-xl text-slate-400 font-light tracking-wide"
              >
                Real-time multiplayer combat
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-col gap-4 w-full max-w-sm"
            >
              <button onClick={handleCreateRoom} className="btn-primary w-full">
                Create Room
              </button>
              <button onClick={() => setView('join')} className="btn-secondary w-full">
                Join Room
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="absolute bottom-8 text-xs text-slate-600 font-mono"
            >
              v1.0.0
            </motion.p>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center gap-8 px-6"
          >
            <h2 className="font-display text-4xl font-bold text-gradient">Join Room</h2>
            <div className="glass rounded-2xl p-8 w-full max-w-sm">
              <input
                type="text"
                maxLength={6}
                placeholder="ENTER CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center font-display text-2xl tracking-[0.5em] text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-colors uppercase"
              />
              <div className="flex gap-3 mt-6">
                <button onClick={() => setView('menu')} className="btn-secondary flex-1 text-sm py-3">
                  Back
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6}
                  className="btn-primary flex-1 text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Creating room...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
