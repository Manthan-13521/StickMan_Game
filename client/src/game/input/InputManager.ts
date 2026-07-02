export interface GameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private cachedInput: GameInput = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false };

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  getInput(): GameInput {
    const c = this.cachedInput;
    c.left = this.keys.has('ArrowLeft');
    c.right = this.keys.has('ArrowRight');
    c.up = this.keys.has('ArrowUp');
    c.down = this.keys.has('ArrowDown');
    c.punch = this.keys.has('KeyJ') || this.keys.has('Space');
    c.kick = this.keys.has('KeyK');
    c.block = this.keys.has('KeyL') || this.keys.has('ShiftLeft');
    return c;
  }

  getP2Input(): GameInput {
    return {
      left: this.keys.has('KeyA'),
      right: this.keys.has('KeyD'),
      up: this.keys.has('KeyW'),
      down: this.keys.has('KeyS'),
      punch: this.keys.has('KeyF'),
      kick: this.keys.has('KeyG'),
      block: this.keys.has('KeyH'),
    };
  }

  destroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
