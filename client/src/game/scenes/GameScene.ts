import * as Phaser from 'phaser';
import {
  PLAYER_CONFIG, COMBAT_CONFIG, ATTACK_CONFIG, GAME_CONFIG,
  PlayerStance, GamePhase, getAttackConfig as sharedGetAttackConfig,
} from '@/shared';
import type { GameStateSnapshot, PlayerSnapshot } from '@/shared';
import { Stickman } from '../entities/Stickman';
import { InputManager, type GameInput } from '../input/InputManager';
import { createPhysicsState, updatePhysics, pushApart, type PhysicalState } from '../systems/LocalPhysics';
import { CombatHUD } from '../ui/CombatHUD';
import { CountdownOverlay } from '../ui/CountdownOverlay';
import { WinScreen, type RoundStats } from '../ui/WinScreen';
import { PauseOverlay } from '../ui/PauseOverlay';
import { ParticleEffects } from '../effects/ParticleEffects';
import { SoundManager, soundManager } from '../effects/SoundManager';
import { DamageNumbers } from '../effects/DamageNumber';
import { networkClient } from '../networking/NetworkClient';
import { PredictionEngine } from '../systems/PredictionEngine';
import { InterpolationEngine } from '../systems/InterpolationEngine';
import { useGameStore } from '@/stores/gameStore';

interface CombatState {
  health: number;
  maxHealth: number;
  combo: number;
  longestCombo: number;
  ultimate: number;
  ultimateReady: boolean;
  wins: number;
  hitstopTimer: number;
  attackTimer: number;
  attackType: 'punch' | 'kick' | 'heavy' | 'ultimate' | null;
  isBlocking: boolean;
  inHitstun: boolean;
  invincibilityTimer: number;
  knockbackTimer: number;
  knockdownTimer: number;
  recoveryTimer: number;
  comboResetTimer: number;
  alive: boolean;
  damageDealt: number;
  hitsLanded: number;
}

const P2_INPUT: GameInput = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false };

function createCombatState(wins = 0): CombatState {
  return {
    health: PLAYER_CONFIG.MAX_HEALTH,
    maxHealth: PLAYER_CONFIG.MAX_HEALTH,
    combo: 0,
    longestCombo: 0,
    ultimate: 0,
    ultimateReady: false,
    wins,
    hitstopTimer: 0,
    attackTimer: 0,
    attackType: null,
    isBlocking: false,
    inHitstun: false,
    invincibilityTimer: 0,
    knockbackTimer: 0,
    knockdownTimer: 0,
    recoveryTimer: 0,
    comboResetTimer: 0,
    alive: true,
    damageDealt: 0,
    hitsLanded: 0,
  };
}

function snapshotToCombatState(snap: PlayerSnapshot): CombatState {
  return {
    health: snap.health,
    maxHealth: snap.maxHealth,
    combo: snap.combo ?? 0,
    longestCombo: Math.max(snap.combo ?? 0, 0),
    ultimate: snap.ultimate ?? 0,
    ultimateReady: snap.ultimateReady ?? false,
    wins: snap.wins ?? 0,
    hitstopTimer: 0,
    attackTimer: 0,
    attackType: null,
    isBlocking: false,
    inHitstun: false,
    invincibilityTimer: 0,
    knockbackTimer: 0,
    knockdownTimer: 0,
    recoveryTimer: 0,
    comboResetTimer: 0,
    alive: snap.health > 0,
    damageDealt: 0,
    hitsLanded: 0,
  };
}

export class GameScene extends Phaser.Scene {
  private stickmen: Stickman[] = [];
  private physStates: PhysicalState[] = [];
  private combatStates: CombatState[] = [createCombatState(), createCombatState()];
  private inputManager: InputManager | null = null;
  private networkState: GameStateSnapshot | null = null;
  private localMode = true;
  private walkPhase = 0;

  private hud: CombatHUD | null = null;
  private countdown: CountdownOverlay | null = null;
  private winScreen: WinScreen | null = null;
  private pauseOverlay: PauseOverlay | null = null;
  private particles: ParticleEffects | null = null;
  private soundManager: SoundManager | null = null;
  private damageNumbers: DamageNumbers | null = null;
  private _paused = false;
  private hitstopFlash: Phaser.GameObjects.Rectangle | null = null;

  private predictionEngine: PredictionEngine | null = null;
  private interpEngine: InterpolationEngine | null = null;
  private playerIndex: number = 0;
  private lastServerTick: number = -1;
  private inputSeq: number = 0;
  private localAttackOverride: { timer: number; type: string } | null = null;
  private localBlockOverride = false;
  private networkStances: (PlayerStance | null)[] = [null, null];

  private round = 1;
  private roundTimer: number = GAME_CONFIG.ROUND_DURATION;
  private fighting = false;
  private roundOver = false;
  private koElapsed = 0;
  private koActive = false;
  private koTextObj: Phaser.GameObjects.Text | null = null;
  private koTextShown = false;
  private koWinScreenShown = false;
  private koFreezeDuration = 120;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const store = useGameStore.getState();
    if (store.playerIndex !== null) {
      this.localMode = false;
      this.playerIndex = store.playerIndex;
    } else {
      this.localMode = true;
    }

    this.drawArena();
    this.cameras.main.setBackgroundColor('#0f0d2e');

    this.stickmen = [new Stickman(this), new Stickman(this)];
    this.resetPositions();

    this.inputManager = new InputManager();
    this.hud = new CombatHUD(this);
    this.countdown = new CountdownOverlay(this);
    this.winScreen = new WinScreen(this);
    this.pauseOverlay = new PauseOverlay(this);
    this.particles = new ParticleEffects(this);
    this.soundManager = soundManager;
    this.damageNumbers = new DamageNumbers(this);

    this.hitstopFlash = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0xffffff, 0,
    ).setDepth(350).setVisible(false);

    this.input.keyboard?.once('keydown', () => {
      this.soundManager?.init();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.roundOver || !this.fighting) {
        useGameStore.getState().exitToMenu();
        return;
      }
      if (this.pauseOverlay?.active) {
        this._paused = false;
        this.pauseOverlay.hide();
      } else {
        this._paused = true;
        this.pauseOverlay?.show(() => {
          this._paused = false;
        });
      }
    });

    if (!this.localMode) {
      const startX = this.playerIndex === 0
        ? PLAYER_CONFIG.STAGE_LEFT + 200
        : PLAYER_CONFIG.STAGE_RIGHT - 200;
      const startY = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
      const facingRight = this.playerIndex === 0;

      this.predictionEngine = new PredictionEngine(startX, startY, facingRight);
      this.interpEngine = new InterpolationEngine();
      this.networkState = null;
      this.lastServerTick = -1;

      this.applyServerSnapshot(store.gameState);
    }

    this.round = 1;
    this.roundTimer = GAME_CONFIG.ROUND_DURATION;
    this.fighting = false;
    this.roundOver = false;
    this.koActive = false;
    this.koElapsed = 0;
    this.koTextShown = false;
    this.koWinScreenShown = false;

    if (this.localMode) {
      this.countdown.start(() => {
        this.fighting = true;
      });
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (dt > 0.05) return;
    if (this.stickmen.length < 2 || this.combatStates.length < 2) return;

    this.countdown?.update(dt);
    this.damageNumbers?.update(dt);

    if (this._paused) {
      this.renderIdle(dt);
      return;
    }

    if (this.koActive) {
      this.updateKOSequence(dt);
      return;
    }

    if (!this.fighting) {
      this.renderIdle(dt);
      return;
    }

    this.walkPhase += dt * 8;

    this.stateTimerTick();

    const hitstopActive = this.combatStates[0].hitstopTimer > 0 || this.combatStates[1].hitstopTimer > 0;

    if (!hitstopActive) {
      if (this.localMode && this.inputManager) {
        const input = this.inputManager.getInput();
        this.handleLocalInput(input, dt);
      } else if (!this.localMode) {
        this.handleNetworkUpdate(dt);
      }
    }

    this.renderFighters(dt);

    this.resolveRound();

    if (this.roundOver) {
      this.hud?.update(
        this.combatStates[0],
        this.combatStates[1],
        this.round,
        this.roundTimer,
      );
      return;
    }

    this.roundTimer -= dt;
    if (this.roundTimer <= 0) {
      this.roundTimer = 0;
      this.triggerKO(null);
    }

    this.hud?.update(
      this.combatStates[0],
      this.combatStates[1],
      this.round,
      this.roundTimer,
    );
  }

  private updateKOSequence(dt: number): void {
    this.koElapsed += dt * 1000;

    const loserIdx = this.combatStates[0].health <= 0 ? 0
      : this.combatStates[1].health <= 0 ? 1 : -1;
    const winnerIdx = loserIdx === 0 ? 1 : loserIdx === 1 ? 0 : -1;

    for (let i = 0; i < 2; i++) {
      const cs = this.combatStates[i];
      if (cs.health <= 0 && !cs.alive) {
        cs.invincibilityTimer = 9999;
        this.stickmen[i].setStance(PlayerStance.DEAD, true);
      }
    }

    if (this.koElapsed < this.koFreezeDuration) {
      this.renderFighters(dt);
      return;
    }

    if (winnerIdx >= 0 && this.koElapsed > this.koFreezeDuration + 200) {
      this.stickmen[winnerIdx].setStance(PlayerStance.VICTORY, true);
      if (this.physStates[winnerIdx] && this.physStates[loserIdx]) {
        this.physStates[winnerIdx].facingRight =
          this.physStates[winnerIdx].x < this.physStates[loserIdx].x;
      }
    }

    for (let i = 0; i < 2; i++) {
      const cs = this.combatStates[i];
      if (cs.health <= 0) {
        const phys = this.physStates[i];
        updatePhysics(phys, dt, 0, false, false, true);
      }
    }

    if (!this.koTextShown && this.koElapsed > this.koFreezeDuration + 400) {
      this.koTextShown = true;
      this.showKOText();
    }

    if (!this.koWinScreenShown && this.koElapsed > this.koFreezeDuration + 1200) {
      this.koWinScreenShown = true;
      this.showWinScreenAfterKO();
    }

    this.renderFighters(dt);
  }

  private showKOText(): void {
    if (this.koTextObj) return;
    this.koTextObj = this.add.text(
      this.scale.width / 2, this.scale.height * 0.35,
      'K.O.!',
      {
        fontFamily: 'monospace',
        fontSize: '80px',
        color: '#ff2222',
        stroke: '#000000',
        strokeThickness: 8,
      },
    ).setOrigin(0.5).setDepth(400).setScale(3).setAlpha(0);

    this.cameras.main.shake(300, 0.01);

    this.tweens.add({
      targets: this.koTextObj,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.koTextObj,
          alpha: 0.8,
          duration: 200,
          yoyo: true,
          repeat: 1,
        });
      },
    });
  }

  private showWinScreenAfterKO(): void {
    const winnerIndex = this.combatStates[0].wins > this.combatStates[1].wins ? 0
      : this.combatStates[1].wins > this.combatStates[0].wins ? 1 : null;
    const winnerName = winnerIndex === 0 ? 'P1' : winnerIndex === 1 ? 'P2' : '';
    const totalWinsNeeded = Math.ceil(GAME_CONFIG.ROUNDS_TO_WIN);
    const isMatchOver = winnerIndex !== null && this.combatStates[winnerIndex].wins >= totalWinsNeeded;

    const stats: [RoundStats, RoundStats] = [
      {
        damageDealt: this.combatStates[0].damageDealt,
        hitsLanded: this.combatStates[0].hitsLanded,
        longestCombo: this.combatStates[0].longestCombo,
      },
      {
        damageDealt: this.combatStates[1].damageDealt,
        hitsLanded: this.combatStates[1].hitsLanded,
        longestCombo: this.combatStates[1].longestCombo,
      },
    ];

    if (isMatchOver) {
      if (winnerIndex === 0) this.soundManager?.playVictory();
      else if (winnerIndex === 1) this.soundManager?.playDefeat();
      if (this.localMode) {
        this.winScreen?.showMatchOver(winnerIndex, winnerName, undefined, stats);
      } else {
        this.winScreen?.showMatchOver(winnerIndex, winnerName, () => {
          networkClient.requestRematch();
        }, stats);
      }
    } else {
      if (this.localMode) {
        this.winScreen?.showKO(winnerIndex, winnerName, () => {
          this.nextRound();
        }, stats);
      } else {
        this.winScreen?.showKO(winnerIndex, winnerName, () => {
          networkClient.requestRematch();
        }, stats);
      }
    }
  }

  private nextRound(): void {
    this.round++;
    this.roundTimer = GAME_CONFIG.ROUND_DURATION;
    this.resetPositions();
    this.combatStates = [
      createCombatState(this.combatStates[0].wins),
      createCombatState(this.combatStates[1].wins),
    ];
    this.koActive = false;
    this.koElapsed = 0;
    this.koTextShown = false;
    this.koWinScreenShown = false;
    this.koTextObj?.destroy();
    this.koTextObj = null;
    this.roundOver = false;
    this.countdown?.start(() => {
      this.soundManager?.playFight();
      this.fighting = true;
    });
  }

  private stateTimerTick(): void {
    for (let i = 0; i < 2; i++) {
      const cs = this.combatStates[i];
      if (cs.hitstopTimer > 0) cs.hitstopTimer--;
      if (cs.invincibilityTimer > 0) cs.invincibilityTimer--;
      if (cs.attackTimer > 0) cs.attackTimer--;
      if (cs.knockbackTimer > 0) cs.knockbackTimer--;
      if (cs.knockdownTimer > 0) cs.knockdownTimer--;
      if (cs.recoveryTimer > 0) cs.recoveryTimer--;
      if (cs.comboResetTimer > 0) {
        cs.comboResetTimer--;
        if (cs.comboResetTimer <= 0) {
          cs.combo = 0;
        }
      }
    }

    if (this.localAttackOverride) {
      this.localAttackOverride.timer--;
      if (this.localAttackOverride.timer <= 0) {
        this.localAttackOverride = null;
      }
    }
  }

  private handleNetworkUpdate(dt: number): void {
    const store = useGameStore.getState();
    const serverState = store.gameState;

    if (serverState && serverState.tick !== this.lastServerTick) {
      this.lastServerTick = serverState.tick;
      this.applyServerSnapshot(serverState);
    }

    if (this.inputManager) {
      const rawInput = this.playerIndex === 0
        ? this.inputManager.getInput()
        : this.inputManager.getP2Input();

      const hasInput = rawInput.punch || rawInput.kick || rawInput.block ||
                       rawInput.up || rawInput.down || rawInput.left || rawInput.right;

      this.inputSeq++;
      const seq = this.inputSeq;

      if (hasInput) {
        networkClient.sendInput(rawInput, seq);
      }

      const predState = this.predictionEngine?.predict(
        { ...rawInput, sequence: seq, timestamp: Date.now() },
        dt,
      );
      if (predState) {
        this.physStates[this.playerIndex] = predState;
      }

      const cs = this.combatStates[this.playerIndex];
      cs.isBlocking = rawInput.block && (this.physStates[this.playerIndex]?.grounded ?? true);
      this.localBlockOverride = cs.isBlocking;

      if (!cs.inHitstun && cs.hitstopTimer <= 0) {
        const both = rawInput.punch && rawInput.kick;
        if (both && cs.ultimate >= COMBAT_CONFIG.ULTIMATE_COST && cs.attackTimer <= 0) {
          cs.attackType = 'ultimate';
          cs.ultimate = 0;
          cs.ultimateReady = false;
          const f = this.getAttackFramesSafe('ultimate');
          cs.attackTimer = f.total;
          this.localAttackOverride = { timer: f.total, type: 'ultimate' };
          const p = this.physStates[this.playerIndex];
          if (p) {
            this.cameras.main.shake(200, 0.01);
            this.particles?.ultimateBurst(p.x + PLAYER_CONFIG.WIDTH / 2, p.y + PLAYER_CONFIG.HEIGHT / 2);
          }
        } else if (both && cs.attackTimer <= 0) {
          cs.attackType = 'heavy';
          const f = this.getAttackFramesSafe('heavy');
          cs.attackTimer = f.total;
          this.localAttackOverride = { timer: f.total, type: 'heavy' };
        } else if (rawInput.punch && cs.attackTimer <= 0) {
          cs.attackType = 'punch';
          const f = this.getAttackFramesSafe('punch');
          cs.attackTimer = f.total;
          this.localAttackOverride = { timer: f.total, type: 'punch' };
        } else if (rawInput.kick && cs.attackTimer <= 0) {
          cs.attackType = 'kick';
          const f = this.getAttackFramesSafe('kick');
          cs.attackTimer = f.total;
          this.localAttackOverride = { timer: f.total, type: 'kick' };
        }
      }
    }
  }

  private getAttackFramesSafe(type: string): { startup: number; active: number; recovery: number; total: number } {
    const cfg = this.getAttackConfig(type);
    if (!cfg) return { startup: 3, active: 3, recovery: 6, total: 12 };
    const startup = Math.round(cfg.startup / 16) || 1;
    const active = Math.round(cfg.active / 16) || 1;
    const recovery = Math.round(cfg.recovery / 16) || 1;
    return { startup, active, recovery, total: startup + active + recovery };
  }

  private applyServerSnapshot(snapshot: GameStateSnapshot | null): void {
    if (!snapshot || !snapshot.players) return;
    this.networkState = snapshot;

    if (!this.predictionEngine || !this.interpEngine) return;

    const localSnap = snapshot.players[this.playerIndex];
    const remoteSnap = snapshot.players[1 - this.playerIndex];

    if (snapshot.roundTimer !== undefined) {
      this.roundTimer = snapshot.roundTimer;
    }

    if (snapshot.phase === GamePhase.KO && !this.roundOver) {
      for (let i = 0; i < snapshot.players.length && i < this.combatStates.length; i++) {
        this.combatStates[i].health = snapshot.players[i].health;
      }
      const loserIdx = snapshot.winner ? (snapshot.players.findIndex(p => p.id !== snapshot.winner)) : null;
      this.triggerKO(loserIdx);
      return;
    }

    if (snapshot.phase === GamePhase.COUNTDOWN) {
      this.winScreen?.hide();
      this.roundOver = false;
      this.round = snapshot.round ?? this.round;
      this.roundTimer = GAME_CONFIG.ROUND_DURATION;
      this.countdown?.startServer(snapshot.countdown);
      return;
    }

    if (snapshot.phase === GamePhase.FIGHTING && localSnap.health === localSnap.maxHealth && remoteSnap.health === remoteSnap.maxHealth) {
      if (this.roundOver || !this.fighting) {
        this.roundOver = false;
        this.koActive = false;
        this.koElapsed = 0;
        this.koTextShown = false;
        this.koWinScreenShown = false;
        this.koTextObj?.destroy();
        this.koTextObj = null;
        this.fighting = true;
        this.localAttackOverride = null;
        this.round = snapshot.round ?? this.round;
      }
    }

    const remoteCS = snapshotToCombatState(remoteSnap);
    this.combatStates[1 - this.playerIndex] = remoteCS;

    this.networkStances[this.playerIndex] = localSnap.stance;
    this.networkStances[1 - this.playerIndex] = remoteSnap.stance;

    const localCS = snapshotToCombatState(localSnap);
    if (this.localAttackOverride) {
      localCS.attackType = this.localAttackOverride.type as any;
      localCS.attackTimer = this.localAttackOverride.timer;
    }
    localCS.isBlocking = this.localBlockOverride;
    this.combatStates[this.playerIndex] = localCS;

    this.predictionEngine.reconcile(localSnap);
    this.physStates[this.playerIndex] = this.predictionEngine.state;

    this.interpEngine.pushState(remoteSnap);
  }

  private resetPositions(): void {
    if (this.localMode) {
      this.physStates = [
        createPhysicsState(PLAYER_CONFIG.STAGE_LEFT + 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, true),
        createPhysicsState(PLAYER_CONFIG.STAGE_RIGHT - 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, false),
      ];
    }
  }

  private renderIdle(dt: number = GAME_CONFIG.TICK_DURATION / 1000): void {
    for (let i = 0; i < 2; i++) {
      const phys = this.physStates[i] ?? this.fallbackPhysics(i);
      const cs = this.combatStates[i];
      const stickman = this.stickmen[i];

      stickman.setStance(this.getVisualStance(i, phys, cs));
      stickman.update(dt);

      const color = i === 0 ? 0x6366f1 : 0xec4899;
      stickman.render(
        phys.x + PLAYER_CONFIG.WIDTH / 2,
        phys.y + PLAYER_CONFIG.HEIGHT,
        phys.facingRight,
        color,
      );
    }

    this.hud?.update(
      this.combatStates[0],
      this.combatStates[1],
      this.round,
      this.roundTimer,
    );
  }

  private renderFighters(dt: number): void {
    const remoteIndex = this.localMode ? -1 : (1 - this.playerIndex);
    const localIndex = this.localMode ? -1 : this.playerIndex;

    for (let i = 0; i < 2; i++) {
      let phys: PhysicalState;
      if (!this.localMode && i === localIndex && this.predictionEngine) {
        phys = this.predictionEngine.state;
        this.physStates[i] = phys;
      } else if (!this.localMode && i === remoteIndex && this.interpEngine) {
        const interp = this.interpEngine.interpolate(Date.now(), 80);
        if (interp) {
          phys = createPhysicsState(interp.x, interp.y, interp.facingRight);
          phys.vx = interp.velocityX;
          phys.vy = interp.velocityY;
          phys.grounded = interp.y >= PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
        } else {
          phys = this.physStates[i] ?? this.fallbackPhysics(i);
        }
        this.physStates[i] = phys;
      } else {
        phys = this.physStates[i] ?? this.fallbackPhysics(i);
      }

      const cs = this.combatStates[i];
      const stickman = this.stickmen[i];

      const stance = this.getVisualStance(i, phys, cs);
      stickman.setStance(stance);
      stickman.setWalkPhase(this.walkPhase + i * Math.PI);

      if (cs.hitstopTimer > 0 && cs.hitstopTimer % 4 < 2) {
        stickman.flash(0xff4444);
      }

      stickman.update(dt);

      const color = i === 0 ? 0x6366f1 : 0xec4899;
      stickman.render(
        phys.x + PLAYER_CONFIG.WIDTH / 2,
        phys.y + PLAYER_CONFIG.HEIGHT,
        phys.facingRight,
        color,
      );
    }
  }

  private updateHitstun(index: number, phys: PhysicalState, cs: CombatState, dt: number): void {
    if (cs.hitstopTimer <= 0 && !cs.inHitstun) return;
    if (cs.health <= 0) return;

    updatePhysics(phys, dt, 0, false, false, true);

    if (cs.knockbackTimer > 0) return;

    if (cs.knockdownTimer > 0) {
      if (phys.grounded) {
        cs.knockdownTimer--;
        phys.vx *= 0.85;
        if (cs.knockdownTimer <= 0) {
          cs.recoveryTimer = Math.round(300 / 16);
        }
      }
      return;
    }

    if (cs.recoveryTimer > 0) {
      cs.recoveryTimer--;
      if (cs.recoveryTimer <= 0) {
        cs.inHitstun = false;
        cs.knockbackTimer = 0;
        cs.invincibilityTimer = 0;
        phys.vx = 0;
      }
      return;
    }

    if (phys.grounded && cs.invincibilityTimer <= 0) {
      if (cs.knockbackTimer <= 0 && cs.knockdownTimer <= 0 && cs.recoveryTimer <= 0) {
        cs.inHitstun = false;
        phys.vx = 0;
      }
    }
  }

  private fallbackPhysics(index: number): PhysicalState {
    return createPhysicsState(
      index === 0 ? PLAYER_CONFIG.STAGE_LEFT + 200 : PLAYER_CONFIG.STAGE_RIGHT - 200,
      PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT,
      index === 0,
    );
  }

  private handleLocalInput(input: GameInput, dt: number): void {
    const p0 = this.physStates[0];
    const p1 = this.physStates[1];
    const c0 = this.combatStates[0];
    const c1 = this.combatStates[1];
    const p2Input = this.inputManager?.getP2Input() ?? P2_INPUT;

    this.updateHitstun(0, p0, c0, dt);
    if (c0.health > 0 && !(c0.hitstopTimer > 0 || c0.inHitstun)) {
      let moveX1 = 0;
      if (input.left) moveX1 -= 1;
      if (input.right) moveX1 += 1;
      c0.isBlocking = input.block && p0.grounded;
      this.handleLocalAttack(0, input);
      updatePhysics(p0, dt, moveX1, input.up, input.down, false);
    }

    this.updateHitstun(1, p1, c1, dt);
    if (c1.health > 0 && !(c1.hitstopTimer > 0 || c1.inHitstun)) {
      let moveX2 = 0;
      if (p2Input.left) moveX2 -= 1;
      if (p2Input.right) moveX2 += 1;
      c1.isBlocking = p2Input.block && p1.grounded;
      this.handleLocalAttack(1, p2Input);
      updatePhysics(p1, dt, moveX2, p2Input.up, p2Input.down, false);
    }

    pushApart(p0, p1);
    this.checkLocalCollisions();
  }

  private getAttackFrames(type: string | null): { startup: number; active: number; recovery: number; total: number } | null {
    const cfg = this.getAttackConfig(type);
    if (!cfg) return null;
    const startup = Math.round(cfg.startup / 16);
    const active = Math.round(cfg.active / 16);
    const recovery = Math.round(cfg.recovery / 16);
    return { startup, active, recovery, total: startup + active + recovery };
  }

  private isAttackInActiveWindow(cs: CombatState): boolean {
    const frames = this.getAttackFrames(cs.attackType);
    if (!frames) return false;
    const elapsed = frames.total - cs.attackTimer;
    return elapsed >= frames.startup && elapsed < frames.startup + frames.active;
  }

  private handleLocalAttack(index: number, input: GameInput): void {
    const cs = this.combatStates[index];
    if (cs.attackTimer > 0) return;
    if (cs.health <= 0) return;

    const both = input.punch && input.kick;

    if (both && cs.ultimate >= COMBAT_CONFIG.ULTIMATE_COST) {
      cs.attackType = 'ultimate';
      cs.ultimate = 0;
      cs.ultimateReady = false;
      const f = this.getAttackFrames('ultimate')!;
      cs.attackTimer = f.total;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      this.cameras.main.shake(200, 0.01);
      const p = this.physStates[index];
      this.particles?.ultimateBurst(p.x + PLAYER_CONFIG.WIDTH / 2, p.y + PLAYER_CONFIG.HEIGHT / 2);
      return;
    }

    if (both) {
      cs.attackType = 'heavy';
      const f = this.getAttackFrames('heavy')!;
      cs.attackTimer = f.total;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      return;
    }

    if (input.punch) {
      cs.attackType = 'punch';
      const f = this.getAttackFrames('punch')!;
      cs.attackTimer = f.total;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      return;
    }

    if (input.kick) {
      cs.attackType = 'kick';
      const f = this.getAttackFrames('kick')!;
      cs.attackTimer = f.total;
      this.stickmen[index].setStance(PlayerStance.KICKING, true);
      return;
    }
  }

  private checkLocalCollisions(): void {
    for (let i = 0; i < 2; i++) {
      const atk = this.physStates[i];
      const def = this.physStates[1 - i];
      const atkC = this.combatStates[i];
      const defC = this.combatStates[1 - i];

      if (!atkC.attackType || atkC.attackTimer <= 0) continue;
      if (defC.health <= 0) continue;
      if (!this.isAttackInActiveWindow(atkC)) continue;
      if (defC.invincibilityTimer > 0) continue;

      this.triggerHitstopFlash();

      const config = this.getAttackConfig(atkC.attackType);
      if (!config) continue;

      const atkX = atk.facingRight ? atk.x + PLAYER_CONFIG.WIDTH : atk.x;
      const defX = def.x;
      const dist = Math.abs(atkX - defX);

      if (dist >= config.range) continue;
      if (Math.abs(atk.y - def.y) > PLAYER_CONFIG.HEIGHT * 1.5) continue;

      const hitAttackType = atkC.attackType || 'punch';
      const knockDir = atk.facingRight ? 1 : -1;
      let damage: number = config.damage;

      if (atkC.combo > 0) {
        damage = Math.max(1, Math.floor(damage * Math.pow(COMBAT_CONFIG.COMBO_SCALING, atkC.combo)));
      }

      const wasBlocking = defC.isBlocking;
      if (wasBlocking) {
        damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
      }

      const actualDamage = Math.min(defC.health, damage);
      defC.health = Math.max(0, defC.health - damage);
      def.vy = config.knockbackY;
      def.vx = knockDir * config.knockback;
      defC.hitstopTimer = Math.round((config.hitstop as number) / 16) + 1;
      defC.inHitstun = true;
      if (defC.invincibilityTimer <= 0) {
        defC.invincibilityTimer = Math.round(PLAYER_CONFIG.INVINCIBILITY_DURATION / 16);
      }
      defC.knockbackTimer = Math.round(PLAYER_CONFIG.KNOCKBACK_DURATION / 16);

      if (hitAttackType === 'kick') {
        defC.knockdownTimer = Math.round(400 / 16);
      } else if (hitAttackType === 'heavy') {
        defC.knockdownTimer = Math.round(600 / 16);
      } else if (hitAttackType === 'ultimate') {
        defC.knockdownTimer = Math.round(800 / 16);
      } else {
        defC.knockdownTimer = 0;
      }
      defC.recoveryTimer = 0;

      atkC.hitstopTimer = Math.round((config.hitstop as number) / 16) + 1;
      atkC.combo++;
      atkC.longestCombo = Math.max(atkC.longestCombo, atkC.combo);
      atkC.comboResetTimer = Math.round(COMBAT_CONFIG.COMBO_TIMER_MS / 16);
      atkC.damageDealt += actualDamage;
      atkC.hitsLanded++;

      const frames = this.getAttackFrames(atkC.attackType);
      atkC.attackTimer = frames ? frames.recovery : Math.round(config.recovery / 16);
      atkC.attackType = null;

      atkC.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, atkC.ultimate + PLAYER_CONFIG.ULTIMATE_PER_HIT);
      defC.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, defC.ultimate + PLAYER_CONFIG.ULTIMATE_PER_TAKE_HIT);
      atkC.ultimateReady = atkC.ultimate >= COMBAT_CONFIG.ULTIMATE_COST;
      defC.ultimateReady = defC.ultimate >= COMBAT_CONFIG.ULTIMATE_COST;

      this.stickmen[i].setStance(PlayerStance.PUNCHING, true);
      this.stickmen[1 - i].flash(wasBlocking ? 0x4444ff : 0xff4444);
      this.cameras.main.shake(config.hitstop > 100 ? 150 : 80, 0.005);

      const hitX = def.x + PLAYER_CONFIG.WIDTH / 2;
      const hitY = def.y + PLAYER_CONFIG.HEIGHT / 2;

      this.soundManager?.playHit(hitAttackType as 'punch' | 'kick' | 'heavy' | 'ultimate', wasBlocking);

      if (wasBlocking) {
        this.particles?.blockSpark(hitX, hitY);
        this.damageNumbers?.show(hitX, hitY - 20, actualDamage, true);
      } else {
        this.particles?.hitSpark(hitX, hitY);
        this.damageNumbers?.show(hitX, hitY - 20, actualDamage, false, config.damage >= 200);
        this.damageNumbers?.showCombo(hitX, hitY, atkC.combo);
      }

      if (defC.health <= 0) {
        this.cameras.main.shake(400, 0.015);
        for (let j = 0; j < 3; j++) {
          this.particles?.hitSpark(
            hitX + (Math.random() - 0.5) * 40,
            hitY + (Math.random() - 0.5) * 40,
          );
        }
      }
    }
  }

  private resolveRound(): void {
    if (this.roundOver) return;
    for (let i = 0; i < 2; i++) {
      if (this.combatStates[i].health <= 0 && this.combatStates[i].alive) {
        this.combatStates[i].alive = false;
        this.triggerKO(i);
        break;
      }
    }
  }

  private triggerHitstopFlash(): void {
    if (!this.hitstopFlash) return;
    this.hitstopFlash.setVisible(true).setAlpha(0.25);
    this.tweens.add({
      targets: this.hitstopFlash,
      alpha: 0,
      duration: 80,
      onComplete: () => this.hitstopFlash?.setVisible(false),
    });
  }

  private triggerKO(loserIndex: number | null): void {
    if (this.roundOver) return;
    this.roundOver = true;
    this.fighting = false;
    this.koActive = true;
    this.koElapsed = 0;
    this.koTextShown = false;
    this.koWinScreenShown = false;

    let winnerIndex: number | null;

    if (loserIndex !== null) {
      winnerIndex = loserIndex === 0 ? 1 : 0;
    } else {
      const h0 = this.combatStates[0].health;
      const h1 = this.combatStates[1].health;
      if (h0 > h1) winnerIndex = 0;
      else if (h1 > h0) winnerIndex = 1;
      else winnerIndex = null;
    }

    if (winnerIndex !== null) {
      this.combatStates[winnerIndex].wins++;
    }

    for (let i = 0; i < 2; i++) {
      const cs = this.combatStates[i];
      if (cs.health <= 0 && cs.alive) {
        cs.alive = false;
      }
    }

    this.soundManager?.playKO();
    this.cameras.main.shake(200, 0.008);

    if (this.particles) {
      const loserIdx = loserIndex ?? -1;
      if (loserIdx >= 0) {
        const p = this.physStates[loserIdx];
        this.particles.hitSpark(
          p.x + PLAYER_CONFIG.WIDTH / 2,
          p.y + PLAYER_CONFIG.HEIGHT / 2,
        );
      }
    }
  }

  private getAttackConfig(type: string | null) {
    return sharedGetAttackConfig(type);
  }

  private getVisualStance(index: number, phys: PhysicalState, cs: CombatState): PlayerStance {
    if (!this.localMode && this.networkStances[index] !== null) {
      return this.networkStances[index]!;
    }
    if (this.koActive && cs.health > 0) return PlayerStance.VICTORY;
    if (cs.health <= 0) return PlayerStance.DEAD;
    if (cs.recoveryTimer > 0) return PlayerStance.GETTING_UP;
    if (cs.knockdownTimer > 0 && phys.grounded && cs.knockbackTimer <= 0) return PlayerStance.KNOCKED_DOWN;
    if (cs.inHitstun) {
      if (cs.knockbackTimer > 0 && !phys.grounded) return PlayerStance.FALLING;
      return PlayerStance.HIT;
    }
    if (cs.attackTimer > 0 && cs.attackType) {
      return cs.attackType === 'kick' ? PlayerStance.KICKING : PlayerStance.PUNCHING;
    }
    if (cs.isBlocking) return PlayerStance.BLOCKING;
    if (!phys.grounded) {
      return phys.vy < 0 ? PlayerStance.JUMPING : PlayerStance.FALLING;
    }
    if (Math.abs(phys.vx) > 50) {
      return PlayerStance.WALKING;
    }
    return PlayerStance.IDLE;
  }

  private drawArena(): void {
    const g = this.add.graphics();

    const stageW = PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.STAGE_LEFT;
    const stageH = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.STAGE_CEILING;
    const floorY = PLAYER_CONFIG.STAGE_GROUND;

    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_CEILING, stageW, stageH);

    g.lineStyle(1, 0x6366f1, 0.15);
    const gridSize = 40;
    for (let x = PLAYER_CONFIG.STAGE_LEFT; x <= PLAYER_CONFIG.STAGE_RIGHT; x += gridSize) {
      g.beginPath();
      g.moveTo(x, PLAYER_CONFIG.STAGE_CEILING);
      g.lineTo(x, floorY);
      g.stroke();
    }
    for (let y = PLAYER_CONFIG.STAGE_CEILING; y <= floorY; y += gridSize) {
      g.beginPath();
      g.moveTo(PLAYER_CONFIG.STAGE_LEFT, y);
      g.lineTo(PLAYER_CONFIG.STAGE_RIGHT, y);
      g.stroke();
    }

    g.fillStyle(0x6366f1, 0.08);
    g.fillRect(PLAYER_CONFIG.STAGE_LEFT, floorY - 60, stageW, 4);

    const gradient = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const alpha = 0.06 * (1 - i / 60);
      gradient.fillStyle(0x818cf8, alpha);
      gradient.fillRect(PLAYER_CONFIG.STAGE_LEFT, floorY - 4 + i, stageW, 1);
    }

    g.lineStyle(2, 0x818cf8, 0.3);
    g.strokeRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_CEILING, stageW, floorY);
  }

  destroy(): void {
    for (const s of this.stickmen) s.destroy();
    this.inputManager?.destroy();
    this.hud?.destroy();
    this.countdown?.destroy();
    this.winScreen?.destroy();
    this.pauseOverlay?.destroy();
    this.particles?.destroy();
    this.damageNumbers?.destroy();
    this.hitstopFlash?.destroy();
    this.predictionEngine = null;
    this.interpEngine = null;
  }
}
