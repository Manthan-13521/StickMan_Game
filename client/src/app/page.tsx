'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerEvent } from '@/shared';
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
  const { connected, error, navigateToMenu, setRoomCode: setStoreRoomCode, setPlayerIndex, setGameState, setConnected, setError, reset: resetStore } =
    useGameStore();

  useEffect(() => {
    if (navigateToMenu) {
      resetStore();
      setView('menu');
      return;
    }
  }, [navigateToMenu, resetStore]);

  useEffect(() => {
    networkClient.connect();

    const onConnect = () => { setConnected(true); setError(null); };
    const onDisconnect = () => setConnected(false);
    const onRoomCreated = (data: { code: string; playerIndex: number }) => {
      setStoreRoomCode(data.code);
      setPlayerIndex(data.playerIndex);
      setView('game');
    };
    const onPlayerJoined = (data: { code: string; playerIndex: number }) => {
      setStoreRoomCode(data.code);
      setPlayerIndex(data.playerIndex);
      setView('game');
    };
    const onGameStart = () => setView('game');
    const onGameState = (data: any) => setGameState(data);
    const onError = (data: { message: string }) => setError(data.message);

    networkClient.on('_connected', onConnect);
    networkClient.on('_disconnected', onDisconnect);
    networkClient.on(ServerEvent.ROOM_CREATED, onRoomCreated);
    networkClient.on(ServerEvent.PLAYER_JOINED, onPlayerJoined);
    networkClient.on(ServerEvent.GAME_START, onGameStart);
    networkClient.on(ServerEvent.GAME_STATE, onGameState);
    networkClient.on(ServerEvent.ERROR, onError);

    return () => {
      networkClient.off('_connected', onConnect);
      networkClient.off('_disconnected', onDisconnect);
      networkClient.off(ServerEvent.ROOM_CREATED, onRoomCreated);
      networkClient.off(ServerEvent.PLAYER_JOINED, onPlayerJoined);
      networkClient.off(ServerEvent.GAME_START, onGameStart);
      networkClient.off(ServerEvent.GAME_STATE, onGameState);
      networkClient.off(ServerEvent.ERROR, onError);
      networkClient.disconnect();
      resetStore();
    };
  }, [setConnected, setError, setStoreRoomCode, setPlayerIndex, setGameState, resetStore]);

  const handleCreateRoom = useCallback(() => {
    setError(null);
    networkClient.createRoom();
    setView('create');
  }, [setError]);

  const handleJoinRoom = useCallback(() => {
    if (roomCode.length === 6) {
      setError(null);
      networkClient.joinRoom(roomCode);
    }
  }, [roomCode, setError]);

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

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-col gap-4 w-full max-w-sm"
            >
              <button
                onClick={() => setView('game')}
                className="btn-primary w-full"
              >
                Local Play
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!connected}
                className="btn-secondary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {connected ? 'Create Room' : 'Connecting...'}
              </button>
              <button
                onClick={() => setView('join')}
                disabled={!connected}
                className="btn-tertiary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
            {error && (
              <div className="w-full max-w-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
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
            {error && (
              <button onClick={() => setView('menu')} className="btn-secondary mt-4 text-sm py-3">
                Back
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
