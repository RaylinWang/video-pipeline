// ============================================================
// storyboard.json 的类型定义 —— 每期视频唯一需要手写的文件
// 所有时间单位均为「秒」，相对于母版视频的时间轴
// ============================================================

import type { FontKey } from "./Fonts";
import type { ShotScene } from "./shot-language/types";

export type WhisperWord = {
  word: string;
  start: number;
  end: number;
};

export type WhisperSegment = {
  text: string;
  start: number;
  end: number;
  words?: WhisperWord[];
};

export type WhisperResult = {
  segments: WhisperSegment[];
};

// ---------- 镜头类型 ----------

// 常态口播：只有人物画面+字幕
export type TalkScene = {
  type: "talk";
  start: number;
  end: number;
};

// 浮层截图：画面压暗，截图/贴纸浮在上层
export type FloatShotScene = {
  type: "float_shot";
  start: number;
  end: number;
  src: string;            // assets/ 下的图片文件名
  label?: string;         // 贴纸标签文字（如「经验」「标准」）
  dim?: number;           // 压暗程度 0-1，默认 0.65
  position?: "left" | "right" | "center"; // 截图位置，默认 center
  widthPct?: number;      // 截图宽度占画面百分比，默认 55
  breathe?: boolean;      // 弹入定住后加一层缓慢呼吸缩放循环，默认 false。
                          // 给插画/示意图这种要「看起来活着」但内部元素
                          // 不单独动的素材用（比 float_clip 简单，不用素材是视频）
};

// 放大高亮：截图铺满浮层，其中一块区域抠出来放大成白底卡片，
// 带橙色标注点（对标参考视频的「关键句放大」效果）
export type ZoomHighlightScene = {
  type: "zoom_highlight";
  start: number;
  end: number;
  src: string;            // public/ 下的截图文件名
  // 高亮区域在截图上的位置，全部是相对截图宽高的百分比 0-100，
  // 原点在左上角。先在 studio 里拖时间轴目测，改两轮就能对准。
  rect: { x: number; y: number; w: number; h: number };
  zoom?: number;          // 区域放大倍数，默认 1.6
  dim?: number;           // 母版压暗程度 0-1，默认 0.75
  shotDim?: number;       // 卡片出现后截图本身再压暗多少，默认 0.35
  widthPct?: number;      // 截图宽度占画面百分比，默认 85
  dotColor?: string;      // 标注点颜色，默认橙色 #FF2442
};

// 纯压暗：只把画面压暗，什么都不浮（配合口播强调"听我说"的段落）
export type DimScene = {
  type: "dim";
  start: number;
  end: number;
  dim?: number;           // 压暗程度 0-1，默认 0.5
};

// 截图划重点：截图铺屏，目标区域画橙色手绘框 + 引线 + 标签，
// 框外区域轻微压暗聚光（不放大，放大用 zoom_highlight）
export type HighlightShotScene = {
  type: "highlight_shot";
  start: number;
  end: number;
  src: string;            // public/ 下的截图文件名
  rect: { x: number; y: number; w: number; h: number }; // 同 zoom_highlight，截图百分比坐标
  label?: string;         // 引线末端的标签文字
  labelPos?: "top" | "bottom"; // 标签在框的上方还是下方，默认 bottom
  dim?: number;           // 母版压暗程度，默认 0.75
  spotDim?: number;       // 框外聚光压暗程度，默认 0.35
  widthPct?: number;      // 截图宽度占画面百分比，默认 85
  color?: string;         // 高亮框/引线颜色，默认 #FF2442
};

// 手写箭头：一支手绘感箭头指向画面某处 + 尾部标签
// 直接叠在母版上（指人、指画面里的东西），坐标是画面百分比
export type HandArrowScene = {
  type: "hand_arrow";
  start: number;
  end: number;
  x: number;              // 箭头「尖端」位置，画面百分比 0-100
  y: number;
  angle?: number;         // 箭头从哪个方向指过来（度，0=从右边水平指入，逆时针），默认 40
  length?: number;        // 箭杆长度 px，默认 200
  label?: string;         // 尾部标签文字
  color?: string;         // 默认 #fff
};

// 人物位移：母版视频缩小让到一侧，另一侧弹出文字面板逐条列点
// （母版的位移由 Composition 统一驱动，本 scene 只声明参数）
export type PersonSlideScene = {
  type: "person_slide";
  start: number;
  end: number;
  side?: "left" | "right"; // 人物让到哪一侧，默认 left（面板在右）
  shiftPct?: number;       // 位移幅度，画面宽度百分比，默认 22
  scale?: number;          // 位移时母版缩放，默认 0.9
  title?: string;          // 面板标题
  items: string[];         // 逐条弹出的列点
  itemTimes?: number[];    // 每条出现时刻（相对本镜头起点的秒），不填则 0.5s 起每 0.8s 一条
};

// 编号卡：01/02/03 编号卡片逐条弹出（画面压暗，卡片浮上层）
export type NumberCardsScene = {
  type: "number_cards";
  start: number;
  end: number;
  items: string[];
  itemTimes?: number[];    // 同 person_slide，默认 0.4s 起每 0.7s 一条
  position?: "left" | "right" | "center"; // 卡片列位置，默认 center
  dim?: number;            // 压暗程度，默认 0.65
  color?: string;          // 编号颜色，默认 #FF2442
};

// 通用文字特效：白字黑描边大字按时刻弹入，「」内自动橙色，
// 单字符 +/= 自动按橙色符号渲染；可选大字 punch 压轴、贴纸 tag、白底卡片
export type TextFxItem = {
  text: string;
  at?: number;            // 出现时刻（相对本镜头起点秒），默认按 0.25s 间隔
  newRow?: boolean;       // row 布局下另起一行
};
export type TextFxScene = {
  type: "text_fx";
  start: number;
  end: number;
  layout?: "row" | "stack"; // 默认 row
  items: TextFxItem[];
  punch?: { text: string; at: number; size?: number; font?: FontKey }; // 压轴大字+橙色底线；
                          // font 指定后走手写强调字体（见 src/Fonts.tsx），
                          // 只用于「主旨/关键句」这种偶尔出现的强调，别用在正文
  tag?: string;           // 贴纸标签（黑底白字，挂在内容块上方）
  card?: boolean;         // items 渲成白底黑字圆角卡（引述/提问用）
  size?: number;          // items 字号，默认 row 72 / stack 60
  dim?: number;           // 默认 0.55
  anchor?: "center" | "top-left" | "top-right"; // 内容块位置，默认 center；
                          // top-left/top-right 贴人像两侧中上方，避开人脸
};

// 人头后大字：文字层叠母版上，人物抠像 PNG 序列再叠文字上
export type TextBehindScene = {
  type: "text_behind";
  start: number;
  end: number;
  lines: string[];        // 逐行错峰弹入
  align?: "center" | "left"; // 默认 center；left 整块贴左侧安全区，不进人像范围
  maxWidthPct?: number;   // align=left 时的块宽上限（画面百分比），默认 30，超宽自动换行
  font?: FontKey;         // 手写强调字体（见 src/Fonts.tsx），不填走默认黑体
  cutoutPrefix: string;   // public/ 下序列前缀，如 "cutout/c_"（文件名 c_001.png 起）
  cutoutFrom: number;     // 序列第一帧对应的母版时刻（秒）
  cutoutCount: number;    // 序列帧数
  fontSize?: number;      // 默认 260（align=left 时默认 110）
  topPct?: number;        // 文字块垂直中心位置（画面百分比），默认 40
};

// 浮层视频：FloatShot 的视频版（静音），圆角手机浮窗感
export type FloatClipScene = {
  type: "float_clip";
  start: number;
  end: number;
  src: string;
  position?: "left" | "right" | "center";
  widthPct?: number;      // 默认 22
  dim?: number;           // 默认 0.5
  label?: string;
  radius?: number;        // 圆角 px，默认 28
};

// 人物周围散落截图：真实截图证据卡片贴在人像两侧安全区，
// 错峰弹出，像拍立得一样带轻微旋转，营造「随手一搜一堆」的感觉
export type PhotoScatterItem = {
  src: string;      // public/ 下的截图文件名
  xPct: number;     // 卡片左上角位置（画面百分比，0-100）
  yPct: number;
  widthPct?: number;  // 默认 15
  rotateDeg?: number; // 默认按索引交替 ±5
  at?: number;        // 弹入时刻（相对本镜头起点秒），默认按 0.7s 间隔错峰
};
export type PhotoScatterScene = {
  type: "photo_scatter";
  start: number;
  end: number;
  items: PhotoScatterItem[];
  dim?: number; // 背景压暗，默认 0.35（比 float_shot 浅，因为画面本身已经很满）
};

// 左右两栏对比板：两侧标题+逐条列点，中间分割线
export type SplitSide = {
  title: string;
  titleAt?: number;       // 标题出现时刻（相对秒），默认 0.3
  items: string[];
  itemTimes?: number[];   // 每条出现时刻（相对秒）
};
export type SplitBoardScene = {
  type: "split_board";
  start: number;
  end: number;
  left: SplitSide;
  right: SplitSide;
  dim?: number;           // 默认 0.8
};

// 全屏 PPT 页：整页盖住母版（声音继续），标题+编号条目逐条弹入
export type SlideScene = {
  type: "slide";
  start: number;
  end: number;
  title: string;
  items: string[];
  itemTimes?: number[];   // 每条出现时刻（相对秒），默认 0.5s 起每 0.8s 一条
  numbered?: boolean;     // 默认 true，01/02/03 橙色编号
};

// 横向步骤条：用于「三个结论词」「三个定位问题」等需要逐项点亮、
// 但绝不能自动换行的短句。
export type HorizontalStepsScene = {
  type: "horizontal_steps";
  start: number;
  end: number;
  title?: string;
  steps: Array<{ label: string; atSec?: number; marker?: string }>;
  highlightMode?: "cumulative" | "current";
  subtitleSafeBottomPx?: number;
  safeGapPx?: number;
  widthPct?: number;
  fontSize?: number;
  accentColor?: string;
  dim?: number;
};

// 左右流程对比：每侧内部用短句和箭头组成一条单行流程。
export type ProcessCompareScene = {
  type: "process_compare";
  start: number;
  end: number;
  title?: string;
  traditional: {
    title: string;
    steps: string[];
    atSec?: number;
    color?: string;
  };
  ai: {
    title: string;
    steps: string[];
    atSec?: number;
    color?: string;
  };
  traditionalAtSec?: number;
  aiAtSec?: number;
  stepIntervalSec?: number;
  subtitleSafeBottomPx?: number;
  safeGapPx?: number;
  widthPct?: number;
  stepFontSize?: number;
  traditionalColor?: string;
  aiColor?: string;
  dim?: number;
};

// 常驻树状目录：小树挂在画面左上角，讲到新章节时向下长出一个节点，
// 出现后不退场（章标角色）。一条 scene 覆盖整个持续区间，可横跨任意多个
// 其他镜头——放在 scenes 数组末尾就叠在全屏镜头（如 slide）之上
export type TreeTocNode = {
  zh: string;
  en?: string;
  atSec: number;          // 展开时刻（相对本镜头起点的秒）
};
export type TreeTocScene = {
  type: "tree_toc";
  start: number;
  end: number;
  root?: { zh: string; en?: string }; // 根标题，从镜头开始就显示
  nodes: TreeTocNode[];
  color?: string;         // 节点展开时的高亮色，默认 #FF2442
  leftPx?: number;        // 背板位置（1920×1080 逻辑画布 px），默认 32
  topPx?: number;         // 默认 40，避开 slide 左上角的橙色角标条
  widthPx?: number;       // 背板宽度，默认 330
  panelOpacity?: number;  // 背板不透明度，默认 0.45
};

export type Scene =
  | TalkScene
  | FloatShotScene
  | ZoomHighlightScene
  | DimScene
  | HighlightShotScene
  | HandArrowScene
  | PersonSlideScene
  | NumberCardsScene
  | TextFxScene
  | TextBehindScene
  | FloatClipScene
  | SplitBoardScene
  | SlideScene
  | PhotoScatterScene
  | HorizontalStepsScene
  | ProcessCompareScene
  | TreeTocScene
  | ShotScene;

export type Storyboard = {
  // 母版口播视频，放在 public/ 下
  master: string;
  fps: number;
  width: number;
  height: number;
  durationSec: number;
  // Whisper 输出的 JSON 文件名，放在 public/ 下
  transcript: string;
  // 字幕样式
  subtitle?: {
    fontFamily?: string;
    fontSize?: number;
    bottomPx?: number;
    maxWidthPx?: number;
  };
  scenes: Scene[];
};
