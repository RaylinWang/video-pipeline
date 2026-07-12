export type ShotLayoutId =
  | "L01"
  | "L02"
  | "L03"
  | "L04"
  | "L05"
  | "L06"
  | "L07"
  | "L08"
  | "L09"
  | "L10"
  | "L11"
  | "L12"
  | "L13";

export type ShotIntent =
  | "presenter"
  | "explain"
  | "evidence"
  | "compare"
  | "process"
  | "conclusion"
  | "breather"
  | "chapter";

export type ShotPrimary =
  | "presenter"
  | "screen"
  | "document"
  | "image"
  | "video"
  | "diagram"
  | "text"
  | "data";

export type NineGridPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type RectPct = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
};

export type ShotFocus = RectPct & {
  atSec?: number;
  label?: string;
  // circle：手写圈注——围着 rect 画一圈不完美椭圆（描边动画），
  // 图片和视频素材都能用；label 走手写字标注而不是色块芯片
  mode?: "outline" | "spotlight" | "magnify" | "circle";
  zoomScale?: number;
  color?: string;
};

export type ShotMedia = {
  id: string;
  src: string;
  kind?: "image" | "video";
  label?: string;
  role?: "primary" | "support" | "evidence";
  atSec?: number;
  trimFromSec?: number;
  fit?: "contain" | "cover";
  // sticker：透明底贴纸（抠过色键的简笔画/IP 贴图），无边框无底色直接叠画面
  surface?: "bare" | "framed" | "paper" | "sticker";
  focus?: ShotFocus;
};

export type PresenterAtom = {
  form?: "original" | "window" | "avatar" | "cutout" | "background" | "hidden";
  placement?: NineGridPlacement;
  widthPct?: number;
  cornerRadiusPx?: number;
  dimOpacity?: number;
  cutoutPrefix?: string;
  cutoutFromSec?: number;
  cutoutCount?: number;
};

export type ShotLabel = {
  id: string;
  text: string;
  placement: NineGridPlacement;
  atSec?: number;
  color?: string;
};

export type ShotCopy = {
  title?: string;
  subtitle?: string;
  lines?: string[];
  items?: Array<{ id: string; text: string; atSec?: number }>;
  labels?: ShotLabel[];
  source?: string;
};

export type DiagramNode = {
  id: string;
  text: string;
  // 节点第二行英文小字（中英双语节点用）
  textEn?: string;
  // 内置图标 key（见 ShotSceneRenderer 的 DIAGRAM_ICONS），画在文字上方
  icon?: string;
  atSec?: number;
  status?: "past" | "current" | "future" | "success" | "error";
  xPct?: number;
  yPct?: number;
};

export type DiagramEdge = {
  from: string;
  to: string;
  atSec?: number;
  label?: string;
};

export type ShotDiagram = {
  variant: "linear" | "cycle" | "tree";
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
};

export type ShotBeatAction =
  | "show"
  | "focus"
  | "highlight"
  | "dim"
  | "hide"
  | "promote";

export type ShotBeat = {
  atSec: number;
  action: ShotBeatAction;
  target: string;
  note?: string;
};

export type ShotMotion = {
  enter?: "cut" | "fade" | "slide" | "pop";
  exit?: "cut" | "fade";
};

/**
 * 面向“分镜共创”的语义镜头卡。
 *
 * layout 决定画面骨架；presenter/media/copy 是可组合原子；beats 决定
 * 口播过程中的展开顺序。它与旧 scene 并存，旧 storyboard 无需迁移。
 */
export type ShotScene = {
  type: "shot";
  id: string;
  start: number;
  end: number;
  anchor?: string | { start: string; end?: string };
  intent: ShotIntent;
  primary: ShotPrimary;
  layout: ShotLayoutId;
  focus: string;
  presenter?: PresenterAtom;
  media?: ShotMedia[];
  copy?: ShotCopy;
  diagram?: ShotDiagram;
  beats: ShotBeat[];
  motion?: ShotMotion;
};
