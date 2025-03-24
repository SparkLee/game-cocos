import { _decorator, Component, Sprite, Color, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('VehicleComponent')
export class VehicleComponent extends Component {
    @property({ type: String })
    public vehicleType = '';

    @property({ type: Number })
    public width = 1;

    @property({ type: Number })
    public height = 1;

    @property({ type: Color })
    public color = new Color(255, 255, 255, 255);

    @property({ type: [SpriteFrame] })
    private vehicleSprites: SpriteFrame[] = [];

    private _x = 0;
    private _y = 0;

    public get x() { return this._x; }
    public get y() { return this._y; }

    public init(type: string, width: number, height: number, color: Color) {
        this.vehicleType = type;
        this.width = width;
        this.height = height;
        this.color = color;
        this.updateAppearance();
    }

    updateAppearance() {
        const sprite = this.getComponent(Sprite);
        if (sprite) {
            const index = Math.min(this.width - 1, this.vehicleSprites.length - 1);
            sprite.spriteFrame = this.vehicleSprites[index];
            sprite.color = this.color;
        }
    }

    public setPosition(gridX: number, gridY: number, gridSize: number) {
        this._x = gridX;
        this._y = gridY;
        this.node.setPosition(
            gridX * gridSize + gridSize * 0.5,
            gridY * gridSize + gridSize * 0.5
        );
    }
}