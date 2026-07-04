# 贝塞尔曲线编辑工具

这个工具的目标是让你在 Cocos Creator 3.8.8 编辑器里，直接像钢笔工具一样可视化编辑曲线。

## 已实现的编辑方式

- 给任意 `Node` 挂上 `BezierSpline` 组件。
- 组件会自动生成两个锚点 `Point_0 / Point_1`。
- 每个锚点下面会自动生成两个切线手柄 `In / Out`。
- 直接在场景编辑器里拖动：
  - `Point_x`：移动锚点本身。
  - `In / Out`：调整该点的贝塞尔控制手柄。
- 曲线、控制线、控制点都会实时重绘。
- 点击锚点或手柄会高亮当前选中项。

## Inspector 里可直接用的功能

- `clickToAdd`：暂时保留，当前稳定工作流不依赖它。
- `closed`：切换为闭合曲线。
- `stepsPerSegment`：曲线采样精度。
- `curveColor / guideColor`：曲线和辅助线颜色。

## 手柄联动

- 每个 `Point_x` 锚点上现在都会带一个 `BezierPoint` 组件。
- 你可以在这个组件里切换 `tangentMode`：
- `Free`：两边手柄互不影响。
- `Aligned`：方向保持反向联动，但长度各自保留。
- `Mirrored`：方向和长度都镜像联动，最接近钢笔工具里的平滑点。



## 新增编辑能力

- 插点时使用贝塞尔分割，原曲线形状会尽量保持不变。
- 可以删除当前选中的中间点。
- 当前选中的点、手柄和相邻曲线段会高亮显示。
- 可以通过 Inspector 稳定地执行：
- `当前段插点`：对当前选中点后的曲线段在中点处插入锚点。
- `中心插点`：以当前曲线节点中心为参考，插入到最近曲线段。



## 自定义 Inspector

当前版本为了稳定性，默认使用标准 Inspector 里的工具项，而不是依赖自定义 Inspector。

你会在 `BezierSpline` 组件里看到这些一次性工具开关：

- `[Tool] Append Anchor`
- `[Tool] Insert On Selected Segment`
- `[Tool] Insert Nearest From Center`
- `[Tool] Rebuild Evenly Spaced Points`
- `[Tool] Export Points JSON`
- `[Tool] Import Points JSON`
- `[Tool] Delete Selected Point`
- `[Tool] Select Previous Point`
- `[Tool] Select Next Point`
- `[Tool] Reset Curve`

这些开关勾一下就会执行动作，然后自动复位。

其中：

- `evenlySpacedStep`：控制均匀重建点位时的目标像素间距，默认 `20`
- `[Tool] Rebuild Evenly Spaced Points`：会沿整条曲线按弧长近似均匀重建锚点
- `[Tool] Export`Canvas `Points JSON`：会把当前曲线导出成 `.json` 文件，同时结果也写到 `Exported Points JSON` 字段里
- `[Tool] Import Points JSON`：会按当前节点名，从默认导出目录读取同名 `.json`，并重建当前曲线

导出规则：

- 导出目录：项目资源目录下的 `assets/PathRes/`
- 文件名：当前挂载该脚本的节点名 + `.json`
- 导出后的完整路径会显示在 `Exported File Path`
- 导入导出结果会显示在 `Import / Export Status`

导入规则：

- 导入目录同样是项目资源目录下的 `assets/PathRes/`
- 默认读取文件名也是当前挂载脚本的节点名 + `.json`
- 导入后会恢复：
- `closed`
- `evenlySpacedStep`
- `selectedPointIndex`
- 每个点的 `position / inTangent / outTangent / tangentMode`



## 推荐挂载方式

1. 在 `Canvas` 下新建一个空节点，比如 `CurveEditor`。
2. 给它挂 `BezierSpline`。
3. 直接拖动自动生成出来的点和手柄。



## 当前版本定位

这是一个先把“编辑体验”落地的版本，重点是：

- 编辑器内可见
- 节点可直接拖拽
- 支持稳定的 Inspector 插点工作流
- 支持手柄联动模式
- 曲线实时反馈

如果你下一步想继续往 `PS 钢笔工具` 的手感靠近，建议继续补这几项：

- 手柄联动模式：自由 / 对称 / 打断
- 删除中间点、插入点
- 悬停高亮、选中态
- 自定义 Inspector 按钮
- 更深入的 Scene 工具扩展

