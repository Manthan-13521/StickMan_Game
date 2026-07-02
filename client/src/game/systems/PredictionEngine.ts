import { PLAYER_CONFIG, INPUT_BUFFER_SIZE } from '@/shared';
import type { PlayerInput, PlayerSnapshot } from '@/shared';
import { createPhysicsState, updatePhysics, type PhysicalState } from './LocalPhysics';

interface InputFrame {
  input: PlayerInput;
  state: PhysicalState;
}

export class PredictionEngine {
  private inputHistory: InputFrame[] = [];
  private predictedState: PhysicalState;

  constructor(x: number, y: number, facingRight: boolean) {
    this.predictedState = createPhysicsState(x, y, facingRight);
  }

  predict(input: PlayerInput, dt: number): PhysicalState {
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    updatePhysics(this.predictedState, dt, moveX, input.up);

    this.inputHistory.push({
      input: JSON.parse(JSON.stringify(input)),
      state: { ...this.predictedState },
    });
    if (this.inputHistory.length > INPUT_BUFFER_SIZE) {
      this.inputHistory.shift();
    }

    return this.predictedState;
  }

  reconcile(serverState: PlayerSnapshot): void {
    if (this.inputHistory.length === 0) {
      this.predictedState.x = serverState.x;
      this.predictedState.y = serverState.y;
      this.predictedState.vx = serverState.velocityX;
      this.predictedState.vy = serverState.velocityY;
      this.predictedState.facingRight = serverState.facingRight;
      return;
    }

    this.predictedState.x = serverState.x;
    this.predictedState.y = serverState.y;
    this.predictedState.vx = serverState.velocityX;
    this.predictedState.vy = serverState.velocityY;
    this.predictedState.facingRight = serverState.facingRight;

    const lastServerSeq = serverState.lastProcessedInput ?? 0;

    const unprocessedInputs = this.inputHistory.filter(
      (f) => f.input.sequence > lastServerSeq
    );

    for (const frame of unprocessedInputs) {
      const moveX = (frame.input.right ? 1 : 0) - (frame.input.left ? 1 : 0);
      updatePhysics(this.predictedState, 1 / 50, moveX, frame.input.up);
    }

    const keepCount = Math.min(unprocessedInputs.length + 10, this.inputHistory.length);
    this.inputHistory = this.inputHistory.slice(-keepCount);
  }

  reset(x: number, y: number, facingRight: boolean): void {
    this.predictedState = createPhysicsState(x, y, facingRight);
    this.inputHistory = [];
  }

  get state(): PhysicalState {
    return this.predictedState;
  }
}
