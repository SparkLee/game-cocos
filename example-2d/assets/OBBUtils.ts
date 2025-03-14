import { Node, UITransform, Vec3, Size, Vec2 } from 'cc';

interface NodeOBB {
    center: Vec3;
    angle: number;
    width: number;
    height: number;
}

interface Projection {
    min: number;
    max: number;
}

export class OBBUtils {
    // 获取OBB的函数
    static getOBBFromNode(node: Node): NodeOBB {
        return {
            center: node.position,
            angle: node.angle,
            width: node.getComponent(UITransform).width,
            height: node.getComponent(UITransform).height
        };
    }

    // 计算OBB顶点
    static getOBBPoints(obb: NodeOBB) {
        let center = obb.center;
        let angle = obb.angle * Math.PI / 180; // 将角度转换为弧度
        let hw = obb.width / 2;
        let hh = obb.height / 2;

        let offset1 = new Vec2(-hw, -hh).rotate(angle);
        let offset2 = new Vec2(hw, -hh).rotate(angle);
        let offset3 = new Vec2(hw, hh).rotate(angle);
        let offset4 = new Vec2(-hw, hh).rotate(angle);

        return [
            center.clone().add(new Vec3(offset1.x, offset1.y, 0)),
            center.clone().add(new Vec3(offset2.x, offset2.y, 0)),
            center.clone().add(new Vec3(offset3.x, offset3.y, 0)),
            center.clone().add(new Vec3(offset4.x, offset4.y, 0))
        ];
    }

    // 获取OBB的分离轴
    static getOBBAxes(obb: NodeOBB): Vec2[] {
        let angle = obb.angle * Math.PI / 180; // 将角度转换为弧度
        let axisX = new Vec2(1, 0).rotate(angle).normalize();
        let axisY = new Vec2(0, 1).rotate(angle).normalize();
        return [axisX, axisY];
    }

    // 计算投影区间
    static getProjection(points: Vec3[], axis: Vec2): Projection {
        const axis3 = new Vec3(axis.x, axis.y, 0);
        let min = points[0].dot(axis3);
        let max = min;
        for (let i = 1; i < points.length; i++) {
            let proj = points[i].dot(axis3);
            if (proj < min) min = proj;
            if (proj > max) max = proj;
        }
        return { min: min, max: max };
    }

    // 判断投影重叠
    static isOverlapping(proj1: Projection, proj2: Projection): boolean {
        return proj1.max > proj2.min && proj2.max > proj1.min;
    }

    // 判断两个OBB是否相交
    static isOBBIntersecting(obb1: NodeOBB, obb2: NodeOBB): boolean {
        let points1 = this.getOBBPoints(obb1);
        let points2 = this.getOBBPoints(obb2);
        console.log('OBB1 Points:', points1);
        console.log('OBB2 Points:', points2);

        let axes1 = this.getOBBAxes(obb1);
        let axes2 = this.getOBBAxes(obb2);
        console.log('OBB1 Axes:', axes1);
        console.log('OBB2 Axes:', axes2);

        let axes = axes1.concat(axes2);

        for (let axis of axes) {
            let proj1 = this.getProjection(points1, axis);
            let proj2 = this.getProjection(points2, axis);

            console.log('Axis:', axis);
            console.log('Projection1:', proj1);
            console.log('Projection2:', proj2);

            if (!this.isOverlapping(proj1, proj2)) {
                return false;
            }
        }
        return true;
    }

    static areNodesIntersecting(node1: Node, node2: Node): boolean {
        let obb1 = this.getOBBFromNode(node1);
        let obb2 = this.getOBBFromNode(node2);
        return this.isOBBIntersecting(obb1, obb2);
    }
}
