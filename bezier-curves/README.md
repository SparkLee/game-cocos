# 贝塞尔曲线路径编辑演示

基于 QfGame `levelTool` 的贝塞尔曲线工具，在示例科幻实验室地图上编辑小兵/怪物的移动路线。

> 参考：E:\qifeng\code2\QfGame\小兵打龙项目\程序\client\cocos\assets\Logic\Tools

## 快速开始

1. 用 **Cocos Creator 3.8.6+** 打开本项目。
2. 打开场景 `assets/levelTool.scene`。
3. 场景会自动创建：
   - `bg`：示例地图背景（你提供的实验室走廊图）
   - `paths/path_left`、`paths/path_right`：左右两条演示路径
4. 在场景编辑器中直接拖动锚点 `Point_x` 和切线手柄 `In/Out` 调整曲线。
5. 点击 **预览** 可看到红色圆点沿路径移动（`PathPreview` 组件）。

## 目录结构

```
assets/
├── levelTool.scene          # 演示场景
├── textures/demo_map.jpg    # 示例地图
├── Logic/Tools/             # 曲线编辑核心脚本
│   ├── BezierSpline.ts      # 主编辑器组件
│   ├── BezierHandle.ts      # 锚点/手柄可视化
│   ├── BezierPoint.ts       # 切线联动模式
│   ├── LevelToolDemo.ts     # 场景自动初始化
│   └── PathPreview.ts       # 路径预览动画
└── PathRes/                 # 路径 JSON 导出目录
    ├── path_left.json
    └── path_right.json
```

## 编辑操作

| 操作 | 方式 |
|------|------|
| 移动锚点 | 拖动 `Point_x` |
| 调整曲线形状 | 拖动 `In/Out` 手柄 |
| 切换切线模式 | 选中锚点 → `BezierPoint.tangentMode`（Free/Aligned/Mirrored） |
| 追加路径点 | Inspector 勾选 `[工具] 追加尾点` |
| 段中插点 | 勾选 `[工具] 当前段插点` |
| 均匀重建点位 | 勾选 `[工具] 按固定间距重建点位` |
| 导出 JSON | 勾选 `[工具] 导出点位 JSON` → 保存到 `assets/PathRes/{节点名}.json` |
| 导入 JSON | 勾选 `[工具] 导入点位 JSON` |

## 新增路径

1. 在 `paths` 节点下新建空节点，命名如 `path_center`。
2. 添加组件 `Curve/Bezier Spline`。
3. 可选添加 `Curve/Path Preview` 做移动预览。
4. 编辑完成后导出 JSON，运行时由游戏逻辑读取。

更详细的组件说明见 `assets/Logic/Tools/README_曲线工具.md`。
