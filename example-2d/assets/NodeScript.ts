import { _decorator, Component, log, math, Sprite, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

// 节点方向枚举
export enum NodeDirection {
    Up,    // 上
    Down,  // 下
    Left,  // 左
    Right, // 右
}

// 节点方向符号
enum NodeDirectionSign {
    Up = "↑",    // 上
    Down = "↓",  // 下
    Left = "←",  // 左
    Right = "→", // 右
}

// 节点方向颜色
enum NodeDirectionColor {
    Up = '#FF0000',    // 红色
    Down = '#00FF00',  // 绿色
    Left = '#0000FF',  // 蓝色
    Right = '#FFFF00', // 黄色
}

// 节点方向向量
const NodeDirectionVector = new Map<NodeDirection, Vec3>([
    [NodeDirection.Up, new Vec3(0, 1, 0)],
    [NodeDirection.Down, new Vec3(0, -1, 0)],
    [NodeDirection.Left, new Vec3(-1, 0, 0)],
    [NodeDirection.Right, new Vec3(1, 0, 0)],
]);

// 节点方向与反方向的映射表
const OppositeMap = new Map<NodeDirection, NodeDirection>([
    [NodeDirection.Up, NodeDirection.Down],
    [NodeDirection.Down, NodeDirection.Up],
    [NodeDirection.Left, NodeDirection.Right],
    [NodeDirection.Right, NodeDirection.Left],
]);

@ccclass('NodeScript')
export class NodeScript extends Component {
    direction: NodeDirection = NodeDirection.Up;

    // 逆时针旋转角度
    private _counterClockwiseRotationDegree: number = 0;
    get counterClockwiseRotationDegree(): number { return this._counterClockwiseRotationDegree; }
    set counterClockwiseRotationDegree(value: number) {
        this._counterClockwiseRotationDegree = value;                              // 更新角度
        this.node.setRotationFromEuler(0, 0, this.counterClockwiseRotationDegree); // 旋转归属节点角度
    }

    static get randomDirection(): number { // 获取随机方向
        return math.randomRangeInt(NodeDirection.Up, NodeDirection.Right + 1);
    }
    static get randomDirectionUpDown(): number { // 获取上下两个方向中的一个随机方向
        return math.randomRangeInt(NodeDirection.Up, NodeDirection.Down + 1);
    }
    static get randomDirectionLeftRight(): number { // 获取左右两个方向中的一个随机方向
        return math.randomRangeInt(NodeDirection.Left, NodeDirection.Right + 1);
    }
    get directionColor(): string { // 获取节点方向颜色
        return NodeDirectionColor[NodeDirection[this.direction]];
    }
    get directionSign(): number { // 获取节点方向符号
        return NodeDirectionSign[NodeDirection[this.direction]];
    }
    get directionVector(): Vec3 { // 获取节点方向向量
        return this.directionVectorWithRotation(NodeDirectionVector.get(this.direction));
    }
    get oppositeDirection(): NodeDirection { // 获取节点方向的相反方向（上的反方向是下，东北的反方向是西南，依此类推）
        return OppositeMap.get(this.direction);
    }
    get oppositeDirectionColor(): string { // 获取节点反方向颜色
        return NodeDirectionColor[NodeDirection[this.oppositeDirection]];
    }
    get oppositeDirectionSign(): string { // 获取节点反方向符号
        return NodeDirectionSign[NodeDirection[this.oppositeDirection]];
    }
    get oppositeDirectionVector(): Vec3 { // 获取节点反方向向量
        return this.directionVectorWithRotation(NodeDirectionVector.get(this.oppositeDirection));
    }

    start() {
        // this.logNodeInfo();
    }

    update(deltaTime: number) {

    }

    private directionVectorWithRotation(directionVector: Vec3) {
        const radian = math.toRadian(this.counterClockwiseRotationDegree);
        const cos = Math.cos(radian);
        const sin = Math.sin(radian);
        const rotatedX = directionVector.x * cos - directionVector.y * sin;
        const rotatedY = directionVector.x * sin + directionVector.y * cos;
        return new Vec3(rotatedX, rotatedY, directionVector.z);
    }

    /**
     * 反转节点方向
     */
    reverseDirection() {
        // this.logNodeInfo();

        // 反转方向
        this.direction = this.oppositeDirection;

        // 同时更新归属节点的方向颜色
        math.Color.fromHEX(this.node.getComponent(Sprite).color, this.directionColor);

        // this.logNodeInfo();
    }

    logNodeInfo() {
        // this.direction = this.randomDirection;
        log(
            `节点方向: ${this.direction} | ${NodeDirection[this.direction]} | ${this.directionSign} | ${this.directionColor}，`,
            `节点反方向: ${this.oppositeDirection} | ${NodeDirection[this.oppositeDirection]} | ${this.oppositeDirectionSign} | ${this.oppositeDirectionColor}，`,
        );
    }
}


