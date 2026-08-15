import { _decorator, Component, sp, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpineAttach')
export class SpineAttach extends Component {

    @property({ type: sp.Skeleton })
    skeleton: sp.Skeleton = null!;

    @property({ type: Node })
    attachNode: Node = null!;

    start () {
        var socket = new sp.SpineSocket("root/hip/tail1/tail2/tail3/tail4/tail5/tail6/tail7", this.attachNode); // 第一个参数传入的是挂点的目标骨骼。第二个参数传入的是挂点的节点
        this.skeleton!.sockets.push(socket);
        this.skeleton!.sockets = this.skeleton!.sockets;
    }

}