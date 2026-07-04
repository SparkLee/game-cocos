import {
    _decorator,
    Color,
    Component,
    Graphics,
    Node,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { BezierHandle, BezierHandleRole } from './BezierHandle';
import { BezierSpline } from './BezierSpline';

const { ccclass, executeInEditMode, menu, property, requireComponent } = _decorator;

const TMP_A = new Vec3();
const TMP_B = new Vec3();
const TMP_C = new Vec3();
const TMP_D = new Vec3();

@ccclass('PathPreview')
@executeInEditMode(true)
@requireComponent(BezierSpline)
@menu('Curve/Path Preview')
export class PathPreview extends Component {
    @property({ tooltip: '预览时沿曲线移动的小圆点半径。' })
    markerRadius = 14;

    @property({ tooltip: '沿曲线移动一圈所需秒数。' })
    loopDuration = 8;

    @property({ type: Color })
    markerColor = new Color(255, 90, 90, 255);

    @property({ type: Color })
    markerStrokeColor = new Color(120, 20, 20, 255);

    @property({ tooltip: '仅在编辑器预览 / 运行时才显示移动标记。' })
    previewInEditor = true;

    private _elapsed = 0;
    private _marker: Node | null = null;

    onEnable () {
        this.ensureMarker();
    }

    onDisable () {
        this._marker?.destroy();
        this._marker = null;
    }

    update (dt: number) {
        if (!this.previewInEditor) {
            return;
        }

        const spline = this.getComponent(BezierSpline);
        if (!spline) {
            return;
        }

        this.ensureMarker();
        this._elapsed += dt;
        const progress = (this._elapsed % Math.max(this.loopDuration, 0.1)) / Math.max(this.loopDuration, 0.1);
        const point = this.sampleSplineAt(spline, progress);
        this._marker?.setPosition(point.x, point.y, 0);
    }

    private ensureMarker () {
        if (this._marker?.isValid) {
            return;
        }

        this._marker = new Node('PreviewMarker');
        this._marker.setParent(this.node);
        const transform = this._marker.addComponent(UITransform);
        const size = this.markerRadius * 2 + 8;
        transform.setContentSize(size, size);

        const graphics = this._marker.addComponent(Graphics);
        graphics.lineWidth = 2;
        graphics.fillColor = this.markerColor;
        graphics.strokeColor = this.markerStrokeColor;
        graphics.circle(0, 0, this.markerRadius);
        graphics.fill();
        graphics.stroke();
    }

    private sampleSplineAt (spline: BezierSpline, normalizedT: number) {
        const anchors = this.node.children
            .filter((child) => child.getComponent(BezierHandle)?.role === BezierHandleRole.Anchor)
            .sort((a, b) => a.getSiblingIndex() - b.getSiblingIndex());

        if (anchors.length < 2) {
            return new Vec2();
        }

        const segmentCount = spline.closed ? anchors.length : anchors.length - 1;
        const targetLength = normalizedT * segmentCount;
        const segmentIndex = Math.min(Math.floor(targetLength), segmentCount - 1);
        const localT = targetLength - segmentIndex;

        const current = anchors[segmentIndex];
        const next = anchors[(segmentIndex + 1) % anchors.length];
        const p0 = TMP_A.set(current.position);
        const c0 = this.getOutgoingControl(current, TMP_B);
        const c1 = this.getIncomingControl(next, TMP_C);
        const p1 = TMP_D.set(next.position);

        const u = 1 - localT;
        const tt = localT * localT;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * localT;

        return new Vec2(
            uuu * p0.x + 3 * uu * localT * c0.x + 3 * u * tt * c1.x + ttt * p1.x,
            uuu * p0.y + 3 * uu * localT * c0.y + 3 * u * tt * c1.y + ttt * p1.y,
        );
    }

    private getOutgoingControl (anchor: Node, out: Vec3) {
        const tangent = anchor.children.find((child) => child.getComponent(BezierHandle)?.role === BezierHandleRole.Out);
        if (!tangent) {
            return out.set(anchor.position);
        }

        return out.set(anchor.position).add(tangent.position);
    }

    private getIncomingControl (anchor: Node, out: Vec3) {
        const tangent = anchor.children.find((child) => child.getComponent(BezierHandle)?.role === BezierHandleRole.In);
        if (!tangent) {
            return out.set(anchor.position);
        }

        return out.set(anchor.position).add(tangent.position);
    }
}
