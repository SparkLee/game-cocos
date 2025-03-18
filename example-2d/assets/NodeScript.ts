import { _decorator, Component, Enum, log, math, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

// 节点方向枚举
enum NodeDirection {
    Up,        // 上
    Down,      // 下
    Left,      // 左
    Right,     // 右
    NorthEast, // 东北
    NorthWest, // 西北
    SouthEast, // 东南
    SouthWest, // 西南
}

// 节点方向符号
enum NodeDirectionSign {
    Up = "↑",        // 上
    Down = "↓",      // 下
    Left = "←",      // 左
    Right = "→",     // 右
    NorthEast = "↗", // 东北
    NorthWest = "↖", // 西北
    SouthEast = "↘", // 东南
    SouthWest = "↙", // 西南
}

// 节点方向颜色
enum NodeDirectionColor {
    Up = '#FF0000',        // 红色
    Down = '#00FF00',      // 绿色
    Left = '#0000FF',      // 蓝色
    Right = '#FFFF00',     // 黄色
    NorthEast = '#FF00FF', // 品红色
    NorthWest = '#00FFFF', // 青色
    SouthEast = '#800080', // 紫色
    SouthWest = '#FFA500', // 橙色
}

// 节点方向向量
const NodeDirectionVector = new Map<NodeDirection, Vec3>([
    [NodeDirection.Up, new Vec3(0, 1, 0)],
    [NodeDirection.Down, new Vec3(0, -1, 0)],
    [NodeDirection.Left, new Vec3(-1, 0, 0)],
    [NodeDirection.Right, new Vec3(1, 0, 0)],
    [NodeDirection.NorthEast, new Vec3(1, 1, 0)],
    [NodeDirection.NorthWest, new Vec3(-1, 1, 0)],
    [NodeDirection.SouthEast, new Vec3(1, -1, 0)],
    [NodeDirection.SouthWest, new Vec3(-1, -1, 0)],
]);

// 节点方向与反方向的映射表
const OppositeMap = new Map<NodeDirection, NodeDirection>([
    [NodeDirection.Up, NodeDirection.Down],
    [NodeDirection.Down, NodeDirection.Up],
    [NodeDirection.Left, NodeDirection.Right],
    [NodeDirection.Right, NodeDirection.Left],
    [NodeDirection.NorthEast, NodeDirection.SouthWest],
    [NodeDirection.NorthWest, NodeDirection.SouthEast],
    [NodeDirection.SouthEast, NodeDirection.NorthWest],
    [NodeDirection.SouthWest, NodeDirection.NorthEast],
]);

@ccclass('NodeScript')
export class NodeScript extends Component {

    @property({ type: Enum(NodeDirection), tooltip: '节点方向' })
    direction: NodeDirection = NodeDirection.NorthEast;

    get randomDirection(): number { // 获取随机方向
        return math.randomRangeInt(NodeDirection.Up, NodeDirection.SouthWest + 1);
    }
    get randomPrimaryDirection(): number { // 获取随机主方向（上、下、左、右）
        return math.randomRangeInt(NodeDirection.Up, NodeDirection.Right + 1);
    }
    get randomIntercardinalDirection(): number { // 
        return math.randomRangeInt(NodeDirection.NorthEast, NodeDirection.SouthWest + 1);
    }
    get directionColor(): string { // 获取节点方向颜色
        return NodeDirectionColor[NodeDirection[this.direction]];
    }
    get directionSign(): number { // 获取节点方向符号
        return NodeDirectionSign[NodeDirection[this.direction]];
    }
    get directionVector(): Vec3 { // 获取节点方向向量
        return NodeDirectionVector.get(this.direction) ?? new Vec3(0, 0, 0); // Default case, should not happen
    }
    get oppositeDirection(): NodeDirection { // 获取节点方向的相反方向（上的反方向是下，东北的反方向是西南，依此类推）
        return OppositeMap.get(this.direction) ?? NodeDirection.Up; // Default case, should not happen
    }
    get oppositeDirectionColor(): string { // 获取节点反方向颜色
        return NodeDirectionColor[NodeDirection[this.oppositeDirection]];
    }
    get oppositeDirectionSign(): string { // 获取节点反方向符号
        return NodeDirectionSign[NodeDirection[this.oppositeDirection]];
    }
    get oppositeDirectionVector(): Vec3 { // 获取节点反方向向量
        return NodeDirectionVector.get(this.oppositeDirection) ?? new Vec3(0, 0, 0); // Default case, should not happen
    }

    start() {
        // this.logNodeInfo();
    }

    update(deltaTime: number) {

    }

    /**
     * 反转节点方向
     */
    reverseDirection() {
        // this.logNodeInfo();
        this.direction = this.oppositeDirection;
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


