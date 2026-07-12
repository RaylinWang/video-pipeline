# video-pipeline

真人口播视频动效流水线：剪映粗剪 → Remotion 渲染成片。

## 当 Claude Code skill 用（推荐）

本仓库自带 `/口播剪辑` skill（[skills/koubo-pipeline/SKILL.md](skills/koubo-pipeline/SKILL.md)）：
你提供母版、分镜表和按时间段归档的素材，AI 完成转码、转录校对、写分镜、
静帧审批、渲染归档全流程。安装：

```bash
mkdir -p ~/.claude/skills && cp -r skills/koubo-pipeline ~/.claude/skills/
```

装完对 Claude Code 说"新一期，母版在XX"即启动。首次使用 skill 会引导装齐
下面的依赖，手动用本仓库则继续往下读。

## 一次性安装

```bash
npm install
```

## 素材与工作副本

母版、截图、录屏这些**源素材**不存在这个仓库里（媒体文件不进 git），建议
每期在你自己的项目文件夹里归档：母版视频、纠错后的转录 json、各场景素材、
最终成片。

`public/` 里放的是**从素材文件夹 cp 过来的工作副本**，不是真源——丢了随
时能重新 cp 一份。（试过用软链接省一份拷贝，但 Remotion 的本地静态服务器
不跟随符号链接，会 404，所以老实 cp 一份。）

## 每期流程

1. **母版入库**：剪映等工具导出的干净母版（无字幕/无音乐/无转场）放到
   `public/master.mp4`（源文件留在你自己的素材文件夹）
2. **转录**：
   ```bash
   bash scripts/transcribe.sh public/master.mp4
   # 产出 public/master.json（词级时间戳），校对错字后备份一份（别用新转录覆盖纠错稿）
   ```
3. **素材入库**：截图/录屏 cp 一份到 `public/`
   （storyboard 里用 public/ 下的文件名引用）
4. **写分镜**：编辑 `storyboard.json`
   - `durationSec` 改成母版实际时长（可用 `ffprobe` 查）
   - `width`/`height` 按母版实际分辨率填（4K 就是 3840×2160）——不用担心
     动效组件的字号跑偏，见下面「分辨率架构」
   - `scenes` 按时间轴排镜头；`talk` 段可省略不写，只写有动效的段落也行
5. **预览**（可拖时间轴实时看效果）：
   ```bash
   npm run studio
   ```
6. **渲染成片**：
   ```bash
   npm run render
   # 产出 out/final.mp4，确认没问题后归档到你自己的项目文件夹
   ```

## 镜头语言共创（新工作流）

新视频不再直接从零手写效果组件。先让 AI 按口播拆分镜，输出“建议镜头＋素材清单”，
你用保留／修改／删除的方式审一轮，再进入实现。

- [镜头语言使用手册](docs/镜头语言使用手册.md)：`L01–L12` 布局目录、精准表述模板和修改语法。
- [母版分镜共创模板](docs/母版分镜共创模板.md)：AI 拿到母版后必须先交付的表格格式。
- `ShotLanguageCatalog`：在 Remotion Studio 里可视化查看 12 种布局。
- `examples/shot-cards.example.json`：`type: "shot"` 的完整示例。

确认后的镜头卡可以直接写进 `storyboard.json`，并运行：

```bash
npm run validate:shots
```

校验器会检查时间、素材、布局依赖、人物窗／圆头像冲突和流程节点时刻。

## 分辨率架构（真 4K 原生画质）

母版是什么分辨率，`storyboard.json` 的 `width`/`height` 就填什么——母版视频
本身按真实分辨率原生显示（`Composition.tsx` 里没有把它塞进缩放容器，直接
显示才能吃满源片画质，压成 1920 宽再放大等于白转了高分辨率源）。

所有动效组件的字号/间距/圆角这些 px 值，都是按 1920×1080 这个「逻辑画布」
写死的，不会因为母版是 4K 就自动变大。`Composition.tsx` 用一个 CSS
`transform: scale()` 把整个动效层（不含母版视频）整体铺满实际画布——文字/
SVG 这类矢量内容缩放不会糊，只有本身就是位图的素材（截图、`text_behind`
用的人物抠像序列）分辨率不够撑起放大倍数时才会显得欠清晰。真要保画质到
底，`text_behind` 用的抠像序列得按当前母版分辨率重新跑（见下面「人物抠像」），
截图类素材本身分辨率有限就没办法了，除非换更高清的原图。

主题色（强调色）默认红 `#FF2442`，8 个组件（`zoom_highlight`/`highlight_shot`/`number_cards`/
`text_fx`/`split_board`/`slide`/`person_slide`）共用同一套默认值，改的话
全局搜 `#FF2442` 批量换，或者每个 scene 自己带 `color`/`dotColor` 覆盖。

## 当前组件

| type | 效果 | 参数 |
|---|---|---|
| `shot` | 语义镜头卡：从 L01–L13 选择布局，再组合人物、素材、焦点与 beats | id/intent/primary/layout/focus/presenter/media/copy/diagram/beats |
| `tree_toc` | 常驻树状目录：左上角小树，讲到新章节时长出一个节点（中英双语），出现后不退场；放 scenes 数组末尾可叠在全屏镜头之上 | root/nodes（每条 zh/en/atSec）/color/leftPx/topPx/widthPx/panelOpacity |
| `talk` | 纯口播（占位，无浮层） | start/end |
| `float_shot` | 压暗+截图弹入+贴纸标签 | src/label/dim/position/widthPct |
| `zoom_highlight` | 截图铺屏+关键区域放大成白底卡片+强调色标注点 | src/rect/zoom/dim/shotDim/widthPct/dotColor |
| `dim` | 纯压暗（口播强调段用） | dim |
| `highlight_shot` | 截图铺屏+原位强调色框划重点+引线标签+聚光 | src/rect/label/labelPos/dim/spotDim/widthPct/color |
| `hand_arrow` | 手绘箭头指向画面某处+尾部手写标签 | x/y/angle/length/label/color |
| `person_slide` | 人物让位一侧+对侧文字面板逐条弹出 | side/shiftPct/scale/title/items/itemTimes |
| `number_cards` | 压暗+01/02编号卡逐条弹出 | items/itemTimes/position/dim/color |
| `text_fx` | 通用文字特效：按时刻弹入，「」内自动标强调色，可选贴纸/白底卡/大字压轴 | items/layout/punch/tag/card/anchor/size/dim |
| `text_behind` | 文字层叠母版上、人物抠像序列叠文字上（人在字前面） | lines/align/maxWidthPct/cutoutPrefix/cutoutFrom/cutoutCount/fontSize/topPct |
| `float_clip` | FloatShot 的视频版（静音），圆角浮窗 | src/position/widthPct/dim/label/radius |
| `split_board` | 左右两栏标题+逐条列点对比 | left/right（各含 title/items/itemTimes）/dim |
| `slide` | 全屏 PPT 页，整页盖住母版（声音继续） | title/items/itemTimes/dim |
| `photo_scatter` | 人物两侧散落真实截图证据卡，错峰弹入带轻微旋转 | items（每条 src/xPct/yPct/widthPct/rotateDeg/at）/dim |

`zoom_highlight` / `highlight_shot` 的 `rect` 是高亮区域在截图上的百分比坐标
（0-100，原点左上角，x/y 是区域左上角，w/h 是区域宽高）。不用量得很准：
studio 里拖到该镜头，目测偏差改两轮就对齐了。
`hand_arrow` 的 x/y 是箭头尖端在整个画面上的百分比坐标（不是截图坐标）。
`person_slide` / `number_cards` / `slide` 的 `itemTimes` 用来把每条列点的
弹出时刻对齐口播（相对本镜头起点的秒数），不填就按默认间隔逐条出。
`text_behind` 的人物抠像序列（`public/cutout/`）是 rembg 预处理产物，本仓库
不存源图，丢了要重新跑 rembg 抠一遍（见下方「人物抠像」）。

## 安全区自动测量（text_behind / photo_scatter 摆位前先跑这个）

以前给这两种镜头摆位置全靠「渲一帧、目测、改数字、再渲」试错。现在有
`scripts/measure_safezone.py`：给定母版和时间段，抽样跑 rembg 测人像轮廓
左右边界，直接吐出安全百分比，摆位一次就准，不用来回试。

```bash
python3 scripts/measure_safezone.py public/master.mp4 51.0 57.05
# {"safe_left_pct": 22.2, "safe_right_pct": 77.3, ...}
# 意思：左侧 0-22.2% 随便放，右侧 77.3-100% 随便放，中间是人像范围
```

`--samples` 控制抽几帧（默认 5，人物动作幅度大就加密）；`--y-bands` 控制
测哪些高度（默认覆盖头到腰 10-80%）；`--margin` 是额外缓冲（默认 2%）。
每次跑都会真的调用 rembg，几秒到十几秒一次，不用担心测试成本。

## 人物抠像（text_behind 用）

```bash
uv tool install "rembg[cli]"
# 从 public/master.mp4 按时间段抽帧，逐帧抠人，输出到 public/cutout/c_NNN.png
```
抠像质量以头部边缘为准，效果不行就换 birefnet 模型重跑。这是本地专属的
派生产物，不进 git 也不进素材归档——丢了随时能从 master.mp4 重新抠。

## 手写强调字体

`public/fonts/` 打包了 4 款免费商用字体（简体覆盖完整，圆润可爱系+一个硬朗
海报体），`src/Fonts.tsx`
用 `@font-face` 全局注册，`text_fx` 的 `punch` 和 `text_behind` 都能用
`font` 字段指定：

| key | 字体 | 感觉 |
|---|---|---|
| `smiley` | 得意黑（斜体） | 硬朗海报感，冲击力标题 |
| `xiaolai` | 小赖字体 | 软手写，偏瘦 |
| `chillround` | 寒蝉圆黑 | 圆黑体，规整 |
| `yozai` | 悠哉 | 手账感手写，最明显的手写不规则感 |

这几款字体只用在「偶尔出现的主旨/关键句」这种强调场景（`punch`/`text_behind`
的大字），**不要**用来做正文字幕——正文走 `Subtitle.tsx` 自己的字体逻辑，别混。
不填 `font` 就走默认黑体，不强制每条都用手写体。

## 字幕字体

默认尝试手写风字体，本机没装会回退到苹方。想要手写感字幕，
安装「沐瑶软笔手写体」(Muyao-Softbrush，免费商用)，
然后在 storyboard.json 的 `subtitle.fontFamily` 指定。

## 排错

- 预览黑屏 → 检查 `public/master.mp4` 是否存在、storyboard 的 master 字段是否对
- 字幕不出现 → 检查 `public/master.json` 是否生成、transcript 字段文件名是否一致
- 渲染慢 → remotion.config.ts 里调高 setConcurrency
