import { EventKeyboard, EventMouse, Input, KeyCode, input } from 'cc';
import { System, World } from '../../ecs/World';
import { Player, Velocity } from '../Components';
import { ENEMY_CAP_PRESETS, GameContext } from '../GameConfig';

/**
 * 把键盘/鼠标写成 InputState，并直接改主角 Velocity。
 * 一次性按键用 latch：本帧读走后清掉，避免按住空格连触发。
 */
export class InputSystem implements System {
    name = 'Input';

    private readonly keys = new Set<KeyCode>();
    private pointerDown = false;
    private pointerX = 0;
    private pointerY = 0;
    private restartLatch = false;
    private pauseLatch = false;
    private hashLatch = false;
    private muteLatch = false;
    private hudLatch = false;
    private capLatch = -1;

    constructor(private readonly ctx: GameContext) {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    }

    dispose(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    }

    update(_world: World, _dt: number): void {
        const state = this.ctx.input;
        let x = 0;
        let y = 0;
        if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) x -= 1;
        if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) x += 1;
        if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) y -= 1;
        if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) y += 1;

        if (this.pointerDown) { // 按住左键：朝指针方向走，覆盖 WASD
            const dx = this.pointerX - this.ctx.viewW * 0.5;
            const dy = this.pointerY - this.ctx.viewH * 0.5;
            const len = Math.hypot(dx, dy);
            if (len > 8) { // 死区：点太靠近屏幕中心（主角）时不转向，避免抖动
                x = dx / len;
                y = dy / len;
            }
        }

        const len = Math.hypot(x, y);
        state.x = len > 0 ? x / len : 0; // WASD 斜走时 x=y=1，不归一化会快 √2 倍
        state.y = len > 0 ? y / len : 0;
        state.restart = this.restartLatch;
        state.togglePause = this.pauseLatch;
        state.toggleHash = this.hashLatch;
        state.toggleMute = this.muteLatch;
        state.toggleHud = this.hudLatch;
        state.capPreset = this.capLatch;
        this.restartLatch = false;
        this.pauseLatch = false;
        this.hashLatch = false;
        this.muteLatch = false;
        this.hudLatch = false;
        this.capLatch = -1; // 一次性标志本帧消费完就清

        const player = _world.get(this.ctx.player, Player);
        const velocity = _world.get(this.ctx.player, Velocity);
        if (player && velocity && !this.ctx.paused && !this.ctx.dead) {
            velocity.x = state.x * player.moveSpeed;
            velocity.y = state.y * player.moveSpeed;
        } else if (velocity) {
            velocity.x = 0;
            velocity.y = 0;
        }
    }

    private onKeyDown(event: EventKeyboard): void {
        this.ctx.sfx.unlock();
        this.keys.add(event.keyCode);
        if (event.keyCode === KeyCode.KEY_R) this.restartLatch = true;
        if (event.keyCode === KeyCode.SPACE) this.pauseLatch = true;
        if (event.keyCode === KeyCode.KEY_C) this.hashLatch = true;
        if (event.keyCode === KeyCode.KEY_M) this.muteLatch = true;
        if (event.keyCode === KeyCode.KEY_H) this.hudLatch = true;
        const preset = event.keyCode - KeyCode.DIGIT_1; // Digit1..4 是连续枚举，减 Digit1 得到 0..3
        if (preset >= 0 && preset < ENEMY_CAP_PRESETS.length) {
            this.capLatch = preset;
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        this.keys.delete(event.keyCode);
    }

    private onMouseDown(event: EventMouse): void {
        this.ctx.sfx.unlock();
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this.pointerDown = true;
            this.readPointer(event);
        }
    }

    private onMouseUp(event: EventMouse): void {
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this.pointerDown = false;
        }
    }

    private onMouseMove(event: EventMouse): void {
        this.readPointer(event);
    }

    private readPointer(event: EventMouse): void {
        this.pointerX = event.getUILocation().x;
        this.pointerY = event.getUILocation().y;
    }
}
