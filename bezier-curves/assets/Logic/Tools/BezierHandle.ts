import { _decorator, Color, Component, Enum, Graphics, UITransform } from 'cc';

const { ccclass, executeInEditMode, menu, property } = _decorator;

export enum BezierHandleRole {
    Anchor = 0,
    In = 1,
    Out = 2,
}

@ccclass('BezierHandle')
@executeInEditMode
@menu('Curve/Bezier Handle')
export class BezierHandle extends Component {
    @property({ type: Enum(BezierHandleRole) })
    role = BezierHandleRole.Anchor;

    @property
    pointIndex = 0;

    @property
    radius = 9;

    @property({ type: Color })
    fillColor = new Color(255, 255, 255, 255);

    @property({ type: Color })
    strokeColor = new Color(45, 45, 45, 255);

    onEnable () {
        this.refreshVisual();
    }

    onValidate () {
        this.refreshVisual();
    }

    public applyStyle (radius: number, fillColor: Readonly<Color>, strokeColor: Readonly<Color>) {
        this.radius = radius;
        this.fillColor.set(fillColor);
        this.strokeColor.set(strokeColor);
        this.refreshVisual();
    }

    public refreshVisual () {
        const transform = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        const graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        const size = this.radius * 2 + 12;

        transform.setContentSize(size, size);

        graphics.clear();
        graphics.lineWidth = 2;
        graphics.strokeColor = this.strokeColor;
        graphics.fillColor = this.fillColor;

        switch (this.role) {
        case BezierHandleRole.Anchor:
            graphics.circle(0, 0, this.radius);
            break;
        case BezierHandleRole.In:
        case BezierHandleRole.Out:
            graphics.moveTo(0, this.radius);
            graphics.lineTo(this.radius, 0);
            graphics.lineTo(0, -this.radius);
            graphics.lineTo(-this.radius, 0);
            graphics.close();
            break;
        }

        graphics.fill();
        graphics.stroke();
    }
}
