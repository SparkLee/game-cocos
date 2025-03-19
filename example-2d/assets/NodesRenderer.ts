import { Label, Node, Sprite, math } from "cc";
import { NodesManager } from "./NodesManager";
import { NodeScript } from "./NodeScript";

/**
 * 节点集合渲染器（将生成的节点集合渲染到屏幕上）
 */
export class NodesRenderer {
    targetNode: Node; // 渲染节点的父节点
    nodesManager: NodesManager

    constructor(targetNode: Node, nodesManager: NodesManager) {
        this.targetNode = targetNode;
        this.nodesManager = nodesManager;
    }

    render() {
        let index = 0;
        this.nodesManager.unObstructedNodes.forEach(node => {
            index++;
            const nodeScript = node.getComponent(NodeScript)!;

            // 设置节点展示颜色
            const sprite = node.getComponent(Sprite)!;
            math.Color.fromHEX(sprite.color, nodeScript.directionColor)

            // 设置节点展示文本
            const labelNode = node.children[0];
            const label = labelNode.getComponent(Label)!;
            // index = Number(node.name.replace('Rectangle', ''));
            label.string = `${index} ${nodeScript.directionSign}`;

            this.targetNode.addChild(node);
        });


    }
}