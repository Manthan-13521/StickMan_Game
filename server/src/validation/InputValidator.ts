import { PLAYER_CONFIG, validatePlayerInput, validateInputRate } from 'shared';
import type { PlayerInput } from 'shared';

export class InputValidator {
  private playerInputs = new Map<string, PlayerInput | null>();

  validate(socketId: string, input: unknown): input is PlayerInput {
    if (!validatePlayerInput(input)) return false;

    const lastInput = this.playerInputs.get(socketId) || null;
    if (!validateInputRate(lastInput, input)) return false;

    this.playerInputs.set(socketId, input);
    return true;
  }

  validatePosition(x: number, y: number): boolean {
    return (
      x >= PLAYER_CONFIG.STAGE_LEFT - 100 &&
      x <= PLAYER_CONFIG.STAGE_RIGHT + 100 &&
      y >= PLAYER_CONFIG.STAGE_CEILING - 100 &&
      y <= PLAYER_CONFIG.STAGE_GROUND + 100
    );
  }

  validateHealth(health: number): boolean {
    return health >= 0 && health <= PLAYER_CONFIG.MAX_HEALTH;
  }

  clear(socketId: string): void {
    this.playerInputs.delete(socketId);
  }
}
