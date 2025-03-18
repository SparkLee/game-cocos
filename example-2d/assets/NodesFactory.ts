import { Size } from "cc";
import { NodesManager } from "./NodesManager";

/**
 * 生成节点集合的工厂类
 */
class NodesFactory {
    /**
     * 生成节点集合
     */
    static generate(): NodesManager {
        return new NodesManager([], new Size(0, 0));
    }
}