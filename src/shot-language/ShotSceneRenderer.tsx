import React, { type CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TextBehind } from "../components/TextBehind";
import type {
  DiagramEdge,
  DiagramNode,
  NineGridPlacement,
  ShotMedia,
  ShotScene,
} from "./types";

const ACCENT = "#FF2442";
const PANEL = "rgba(9, 13, 20, 0.94)";
const BORDER = "rgba(255,255,255,0.78)";

type Rect = {
  left: string;
  top: string;
  width: string;
  height: string;
  rotateDeg?: number;
};

const pipRect = (
  placement: NineGridPlacement,
  widthPct: number,
  heightPct: number,
  bottomEdgePct = 90,
): Rect => {
  const horizontal = placement.endsWith("left")
    ? 4
    : placement.endsWith("right")
      ? 96 - widthPct
      : 50 - widthPct / 2;
  const vertical = placement.startsWith("top")
    ? 7
    : placement.startsWith("bottom")
      ? bottomEdgePct - heightPct
      : 50 - heightPct / 2;
  return {
    left: `${horizontal}%`,
    top: `${vertical}%`,
    width: `${widthPct}%`,
    height: `${heightPct}%`,
  };
};

const progressAt = (timeSec: number, atSec = 0, durationSec = 0.34) =>
  interpolate(timeSec, [atSec, atSec + durationSec], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const exitProgress = (timeSec: number, durationSec: number, mode: ShotScene["motion"]) => {
  if (mode?.exit === "cut") return 1;
  return interpolate(timeSec, [durationSec - 0.24, durationSec], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const beatTime = (
  scene: ShotScene,
  target: string,
  fallback: number,
  actions: ShotScene["beats"][number]["action"][] = ["show"],
) => (scene.beats ?? []).find((beat) => beat.target === target && actions.includes(beat.action))?.atSec ?? fallback;

const mediaKind = (item: ShotMedia) =>
  item.kind ?? (/\.(mp4|mov|webm|m4v)$/i.test(item.src) ? "video" : "image");

// 确定性伪随机：Remotion 禁 Math.random（会破坏逐帧一致），
// 用素材 id 当种子，同一镜头每次渲染抖动完全一致
const hashSeed = (text: string) =>
  text.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 9973, 7);

const seededJitter = (seed: number, index: number) => {
  const value = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return value - Math.floor(value) - 0.5; // -0.5 ~ 0.5
};

// 手写圈：绕 (cx,cy) 画一圈带抖动的椭圆，转角超过 360°（约 54°）
// 让笔画首尾搭接，模拟手画过头的随意感。坐标是百分比空间（0-100）。
const handCirclePath = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
  const total = Math.PI * 2 * 1.15;
  const segs = 10;
  const step = total / segs;
  const k = (4 / 3) * Math.tan(step / 4);
  const startAngle = -Math.PI * 0.7 + seededJitter(seed, 99) * 0.5;
  const point = (angle: number, i: number): [number, number] => {
    const wobble = 1 + seededJitter(seed, i) * 0.07;
    return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble];
  };
  let angle = startAngle;
  let [prevX, prevY] = point(angle, 0);
  let d = `M ${prevX.toFixed(2)} ${prevY.toFixed(2)}`;
  for (let i = 1; i <= segs; i += 1) {
    const nextAngle = startAngle + i * step;
    const [x, y] = point(nextAngle, i);
    const c1x = prevX - Math.sin(angle) * rx * k;
    const c1y = prevY + Math.cos(angle) * ry * k;
    const c2x = x + Math.sin(nextAngle) * rx * k;
    const c2y = y - Math.cos(nextAngle) * ry * k;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`;
    angle = nextAngle;
    prevX = x;
    prevY = y;
  }
  return d;
};

const placementStyle = (placement: NineGridPlacement): CSSProperties => {
  const horizontal = placement.endsWith("left")
    ? { left: "5%" }
    : placement.endsWith("right")
      ? { right: "5%" }
      : { left: "50%", transform: "translateX(-50%)" };
  const vertical = placement.startsWith("top")
    ? { top: "8%" }
    : placement.startsWith("bottom")
      ? { bottom: "16%" }
      : { top: "50%", marginTop: -36 };
  return { ...horizontal, ...vertical };
};

const MediaSurface: React.FC<{
  item: ShotMedia;
  rect: Rect;
  scene: ShotScene;
  index: number;
  surfaceOverride?: ShotMedia["surface"];
}> = ({ item, rect, scene, index, surfaceOverride }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const atSec = item.atSec ?? beatTime(scene, item.id, 0.12 + index * 0.12);
  const enter = progressAt(localT, atSec);
  const focusAt =
    item.focus?.atSec ??
    beatTime(scene, `${item.id}.focus`, atSec + 0.45, ["focus", "highlight", "promote"]);
  const focusEnter = item.focus ? progressAt(localT, focusAt, 0.42) : 0;
  const hideAt = beatTime(scene, item.id, Number.POSITIVE_INFINITY, ["hide"]);
  const dimAt = beatTime(scene, item.id, Number.POSITIVE_INFINITY, ["dim"]);
  const promoteAt = beatTime(scene, item.id, Number.POSITIVE_INFINITY, ["promote"]);
  const hideProgress = Number.isFinite(hideAt) ? 1 - progressAt(localT, hideAt, 0.24) : 1;
  const dimProgress = Number.isFinite(dimAt) ? progressAt(localT, dimAt, 0.24) : 0;
  const promoteProgress = Number.isFinite(promoteAt) ? progressAt(localT, promoteAt, 0.34) : 0;
  const fit = item.fit ?? "contain";
  const surface = surfaceOverride ?? item.surface ?? "framed";
  const motion = scene.motion?.enter ?? "slide";
  const motionTransform =
    motion === "pop"
      ? `scale(${0.9 + enter * 0.1})`
      : motion === "slide"
        ? `translateY(${(1 - enter) * 34}px) scale(${0.97 + enter * 0.03})`
        : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: enter * hideProgress * (1 - dimProgress * 0.58),
        transform: `${motionTransform} scale(${1 + promoteProgress * 0.035}) rotate(${rect.rotateDeg ?? 0}deg)`,
        overflow: "hidden",
        borderRadius: ["bare", "sticker"].includes(surface) ? 0 : surface === "paper" ? 8 : 20,
        border:
          surface === "sticker" || surface === "bare"
            ? "none"
            : surface === "paper"
              ? "6px solid #f5f1e8"
              : `2px solid ${BORDER}`,
        background: surface === "sticker" ? "transparent" : surface === "bare" ? "#000" : "#f5f3ee",
        boxShadow: ["bare", "sticker"].includes(surface) ? "none" : "0 22px 70px rgba(0,0,0,0.48)",
      }}
    >
      {mediaKind(item) === "video" ? (
        <Sequence from={Math.round(atSec * fps)} layout="none">
          {/* 用 OffthreadVideo：@remotion/media 的 Video 画到 canvas 上，
              不吃 objectFit，cover 会退化成 contain 出黑边 */}
          <OffthreadVideo
            src={staticFile(item.src)}
            trimBefore={Math.round((item.trimFromSec ?? 0) * fps)}
            muted
            style={{ width: "100%", height: "100%", objectFit: fit }}
          />
        </Sequence>
      ) : (
        <Img
          src={staticFile(item.src)}
          style={{ width: "100%", height: "100%", objectFit: fit }}
        />
      )}

      {item.label && (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 18,
            padding: "8px 16px",
            borderRadius: 9,
            background: "rgba(0,0,0,0.82)",
            color: "#fff",
            fontSize: 27,
            fontWeight: 750,
          }}
        >
          {item.label}
        </div>
      )}

      {item.focus && !["magnify", "circle"].includes(item.focus.mode ?? "") && (
        <>
          {item.focus.mode === "spotlight" && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  left: `${item.focus.xPct}%`,
                  top: `${item.focus.yPct}%`,
                  width: `${item.focus.widthPct}%`,
                  height: `${item.focus.heightPct}%`,
                  boxShadow: `0 0 0 9999px rgba(0,0,0,${0.48 * focusEnter})`,
                }}
              />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              left: `${item.focus.xPct}%`,
              top: `${item.focus.yPct}%`,
              width: `${item.focus.widthPct}%`,
              height: `${item.focus.heightPct}%`,
              border: `5px solid ${ACCENT}`,
              borderRadius: 8,
              opacity: focusEnter,
              transform: `scale(${0.96 + 0.04 * focusEnter})`,
              boxShadow: "0 0 0 2px rgba(0,0,0,0.35), 0 8px 28px rgba(0,0,0,0.42)",
            }}
          >
            {item.focus.label && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  [item.focus.yPct + item.focus.heightPct > 82 ? "top" : "bottom"]: -48,
                  padding: "7px 14px",
                  borderRadius: 7,
                  background: ACCENT,
                  color: "#111",
                  fontSize: 24,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {item.focus.label}
              </div>
            )}
          </div>
        </>
      )}
      {item.focus?.mode === "circle" && (() => {
        const focus = item.focus;
        const cx = focus.xPct + focus.widthPct / 2;
        const cy = focus.yPct + focus.heightPct / 2;
        const rx = (focus.widthPct / 2) * 1.18 + 1.5;
        const ry = (focus.heightPct / 2) * 1.45 + 1.5;
        const color = focus.color ?? ACCENT;
        const draw = progressAt(localT, focusAt, 0.62);
        const labelIn = progressAt(localT, focusAt + 0.45, 0.3);
        const labelBelow = cy + ry < 76;
        return (
          <>
            {/* preserveAspectRatio=none 会非均匀拉伸，线宽必须用
                non-scaling-stroke 锁住，否则横竖粗细不一（同 FlowDiagram 的坑） */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.55))",
              }}
            >
              <path
                d={handCirclePath(cx, cy, rx, ry, hashSeed(item.id))}
                stroke={color}
                strokeWidth={6}
                strokeLinecap="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
                opacity={localT >= focusAt ? 1 : 0}
              />
            </svg>
            {focus.label && (
              <div
                style={{
                  position: "absolute",
                  left: `${Math.min(Math.max(cx - 32, 2), 60)}%`,
                  top: labelBelow
                    ? `${Math.min(cy + ry + 3, 88)}%`
                    : `${Math.max(cy - ry - 10, 2)}%`,
                  opacity: labelIn,
                  transform: `translateY(${(1 - labelIn) * 14}px)`,
                  color,
                  fontSize: 34,
                  fontWeight: 800,
                  fontFamily: '"Muyao-Softbrush", "PingFang SC", sans-serif',
                  letterSpacing: 2,
                  whiteSpace: "nowrap",
                  textShadow: [
                    "-2px -2px 0 rgba(0,0,0,0.85)",
                    "2px -2px 0 rgba(0,0,0,0.85)",
                    "-2px 2px 0 rgba(0,0,0,0.85)",
                    "2px 2px 0 rgba(0,0,0,0.85)",
                    "0 4px 12px rgba(0,0,0,0.8)",
                  ].join(", "),
                }}
              >
                {focus.label}
              </div>
            )}
          </>
        );
      })()}
      {item.focus?.mode === "magnify" && mediaKind(item) === "image" && (() => {
        const zoom = item.focus?.zoomScale ?? 1.6;
        const cardWidth = Math.min(item.focus.widthPct * zoom, 88);
        const cardHeight = Math.min(item.focus.heightPct * zoom, 76);
        const cardLeft = Math.min(Math.max(item.focus.xPct - (cardWidth - item.focus.widthPct) / 2, 4), 96 - cardWidth);
        const cardTop = Math.min(Math.max(item.focus.yPct - (cardHeight - item.focus.heightPct) / 2, 4), 90 - cardHeight);
        return (
          <div
            style={{
              position: "absolute",
              left: `${cardLeft}%`,
              top: `${cardTop}%`,
              width: `${cardWidth}%`,
              height: `${cardHeight}%`,
              opacity: focusEnter,
              transform: `scale(${0.9 + focusEnter * 0.1})`,
              overflow: "hidden",
              borderRadius: 10,
              border: `5px solid ${ACCENT}`,
              background: "#fff",
              boxShadow: "0 16px 52px rgba(0,0,0,.56)",
            }}
          >
            <Img
              src={staticFile(item.src)}
              style={{
                position: "absolute",
                width: `${10000 / item.focus.widthPct}%`,
                left: `${(-item.focus.xPct / item.focus.widthPct) * 100}%`,
                top: `${(-item.focus.yPct / item.focus.heightPct) * 100}%`,
              }}
            />
          </div>
        );
      })()}
    </div>
  );
};

const PresenterSurface: React.FC<{
  scene: ShotScene;
  master: string;
  rect: Rect;
  avatar?: boolean;
}> = ({ scene, master, rect, avatar = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const showBeat = (scene.beats ?? []).find(
    (beat) => beat.target === "presenter" && beat.action === "show",
  );
  const hideAt = beatTime(scene, "presenter", Number.POSITIVE_INFINITY, ["hide"]);
  const dimAt = beatTime(scene, "presenter", Number.POSITIVE_INFINITY, ["dim"]);
  const enter = progressAt(localT, showBeat?.atSec ?? 0.08, 0.4);
  const hideProgress = Number.isFinite(hideAt) ? 1 - progressAt(localT, hideAt, 0.24) : 1;
  const dimProgress = Number.isFinite(dimAt) ? progressAt(localT, dimAt, 0.24) : 0;
  const radius = avatar ? "50%" : `${scene.presenter?.cornerRadiusPx ?? 24}px`;

  return (
    <div
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: enter * hideProgress * (1 - dimProgress * 0.58),
        transform: `translateY(${(1 - enter) * 26}px) scale(${0.96 + enter * 0.04})`,
        overflow: "hidden",
        borderRadius: radius,
        border: "3px solid rgba(255,255,255,0.86)",
        boxShadow: "0 18px 54px rgba(0,0,0,0.58)",
        background: "#111",
      }}
    >
      <OffthreadVideo
        src={staticFile(master)}
        trimBefore={Math.round(scene.start * fps)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

const GlobalCopy: React.FC<{ scene: ShotScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  // 没写 title 的 beat 就保持全程常驻
  const titleShowBeat = (scene.beats ?? []).find(
    (beat) => beat.target === "title" && beat.action === "show",
  );
  const titleHideAt = beatTime(scene, "title", Number.POSITIVE_INFINITY, ["hide"]);
  const titleEnter = titleShowBeat ? progressAt(localT, titleShowBeat.atSec, 0.34) : 1;
  const titleHide = Number.isFinite(titleHideAt) ? 1 - progressAt(localT, titleHideAt, 0.24) : 1;
  return (
    <>
      {scene.copy?.title && !["L10", "L11", "L12"].includes(scene.layout) && (
        <div
          style={{
            position: "absolute",
            left: "5%",
            top: "5%",
            opacity: titleEnter * titleHide,
            transform: `translateY(${(1 - titleEnter) * 18}px)`,
            color: "#fff",
            fontSize: 46,
            fontWeight: 850,
            textShadow: "0 3px 16px rgba(0,0,0,0.75)",
          }}
        >
          {scene.copy.title}
        </div>
      )}
      {scene.copy?.labels?.map((label, i) => {
        const enter = progressAt(localT, label.atSec ?? beatTime(scene, label.id, 0.3 + i * 0.18));
        return (
          <div
            key={label.id}
            style={{
              position: "absolute",
              ...placementStyle(label.placement),
              opacity: enter,
              color: "#fff",
              background: "rgba(0,0,0,0.84)",
              border: `2px solid ${label.color ?? ACCENT}`,
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 28,
              fontWeight: 760,
              boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
              whiteSpace: "nowrap",
            }}
          >
            {label.text}
          </div>
        );
      })}
      {scene.copy?.source && (
        <div
          style={{
            position: "absolute",
            right: "4%",
            bottom: "14%",
            color: "rgba(255,255,255,0.72)",
            fontSize: 22,
            fontFamily: "monospace",
          }}
        >
          来源：{scene.copy.source}
        </div>
      )}
    </>
  );
};

const diagramPositions = (nodes: DiagramNode[], variant: "linear" | "cycle" | "tree") => {
  const count = Math.max(nodes.length, 1);
  return nodes.map((node, i) => {
    if (node.xPct !== undefined && node.yPct !== undefined) {
      return { x: node.xPct, y: node.yPct };
    }
    if (variant === "cycle") {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
      return { x: 50 + Math.cos(angle) * 34, y: 51 + Math.sin(angle) * 27 };
    }
    if (variant === "tree") {
      if (i === 0) return { x: 50, y: 26 };
      return { x: 12 + ((i - 1) / Math.max(count - 2, 1)) * 76, y: 63 };
    }
    return { x: 12 + (i / Math.max(count - 1, 1)) * 76, y: 52 };
  });
};

const autoEdges = (nodes: DiagramNode[], variant: "linear" | "cycle" | "tree"): DiagramEdge[] => {
  if (variant === "tree") {
    return nodes.slice(1).map((node) => ({ from: nodes[0]?.id ?? "", to: node.id }));
  }
  const edges = nodes.slice(0, -1).map((node, i) => ({ from: node.id, to: nodes[i + 1].id }));
  if (variant === "cycle" && nodes.length > 2) {
    edges.push({ from: nodes[nodes.length - 1].id, to: nodes[0].id });
  }
  return edges;
};

// 流程图节点的内置线条图标（48×48 viewBox，描边用节点色）。
// 新概念要加图标就在这里补一个 key，storyboard 里 node.icon 引用
const DIAGRAM_ICON_SHAPES: Record<string, React.ReactNode> = {
  // 委派：人把任务交出去
  delegation: (
    <>
      <circle cx="13" cy="13" r="6" />
      <path d="M3 37c0-8 6-13 10-13s10 5 10 13" />
      <path d="M27 20h13m0 0-5-5m5 5-5 5" />
      <rect x="33" y="30" width="11" height="11" rx="2" />
    </>
  ),
  // 描述：一页写清楚的文档
  description: (
    <>
      <rect x="10" y="5" width="28" height="38" rx="3" />
      <path d="M16 15h16M16 23h16M16 31h10" />
    </>
  ),
  // 辨别：睁眼细看
  discernment: (
    <>
      <path d="M5 24c6-9 12-13 19-13s13 4 19 13c-6 9-12 13-19 13S11 33 5 24z" />
      <circle cx="24" cy="24" r="6" />
    </>
  ),
  // 勤勉：循环跟进不撒手
  diligence: (
    <>
      <path d="M39 24a15 15 0 1 1-4.4-10.6" />
      <path d="M40 6v9h-9" />
      <path d="M18 24l5 5 8-9" />
    </>
  ),
};

const DiagramIcon: React.FC<{ name: string; color: string; size?: number }> = ({
  name,
  color,
  size = 46,
}) => {
  const shape = DIAGRAM_ICON_SHAPES[name];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shape}
    </svg>
  );
};

const FlowDiagram: React.FC<{ scene: ShotScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const fallbackNodes: DiagramNode[] =
    scene.copy?.items?.map((item) => ({
      id: item.id,
      text: item.text,
      atSec: item.atSec,
    })) ?? [];
  const variant = scene.diagram?.variant ?? "linear";
  const nodes = scene.diagram?.nodes ?? fallbackNodes;
  const edges = scene.diagram?.edges ?? autoEdges(nodes, variant);
  const points = diagramPositions(nodes, variant);
  const byId = new Map(nodes.map((node, i) => [node.id, { node, point: points[i], index: i }]));
  const markerId = `arrow-${scene.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const nodeTimes = nodes.map((node, i) => node.atSec ?? beatTime(scene, node.id, i * 0.55));
  const activeIndex = nodeTimes.reduce((latest, atSec, i) => (localT >= atSec ? i : latest), -1);
  const showRealBackground = scene.presenter?.form === "background";

  return (
    <AbsoluteFill
      style={{
        background: showRealBackground
          ? `rgba(0,0,0,${scene.presenter?.dimOpacity ?? 0.72})`
          : "linear-gradient(135deg,#090d14,#131923)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {scene.copy?.title && (
        <div style={{ position: "absolute", left: "5%", top: "7%", color: "#fff", fontSize: 58, fontWeight: 850 }}>
          {scene.copy.title}
        </div>
      )}
      {/* viewBox 必须与画布同比例：百分比坐标系(100×100)配 none 会把
          线宽和箭头按 19.2:10.8 非均匀拉伸，横线比竖线粗近一倍 */}
      <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill={ACCENT} />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          const atSec = edge.atSec ?? Math.max(from.node.atSec ?? from.index * 0.55, to.node.atSec ?? to.index * 0.55) + 0.18;
          const draw = progressAt(localT, atSec, 0.48);
          return (
            <line
              key={`${edge.from}-${edge.to}-${i}`}
              x1={(from.point.x / 100) * 1920}
              y1={(from.point.y / 100) * 1080}
              x2={(to.point.x / 100) * 1920}
              y2={(to.point.y / 100) * 1080}
              pathLength={100}
              stroke={ACCENT}
              strokeWidth={7}
              strokeDasharray={100}
              strokeDashoffset={100 * (1 - draw)}
              markerEnd={`url(#${markerId})`}
              opacity={draw}
            />
          );
        })}
      </svg>
      {nodes.map((node, i) => {
        const p = points[i];
        const enter = progressAt(localT, nodeTimes[i], 0.38);
        const dynamicStatus = i < activeIndex ? "past" : i === activeIndex ? "current" : "future";
        const color = node.status === "error" ? "#ff3b30" : node.status === "success" ? "#34c759" : ACCENT;
        const opacity = dynamicStatus === "future" ? 0.3 : dynamicStatus === "past" ? 0.58 : 1;
        const stacked = Boolean(node.icon || node.textEn);
        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: variant === "linear" ? 230 : 250,
              minHeight: stacked ? 158 : 112,
              transform: `translate(-50%,-50%) scale(${0.88 + enter * 0.12})`,
              opacity: enter * opacity,
              borderRadius: 16,
              border: `3px solid ${color}`,
              background: PANEL,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "18px 22px",
              textAlign: "center",
              boxShadow: dynamicStatus === "current" ? `0 0 36px ${color}66` : "0 14px 34px rgba(0,0,0,.4)",
            }}
          >
            {node.icon && <DiagramIcon name={node.icon} color={color} />}
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>{node.text}</div>
            {node.textEn && (
              <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.72, letterSpacing: 1 }}>
                {node.textEn}
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const TitleBeat: React.FC<{ scene: ShotScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const titleEnter = progressAt(localT, 0.16, 0.5);
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 45%,#20242d 0,#10131a 48%,#080a0f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div style={{ width: 110, height: 8, borderRadius: 4, background: ACCENT, transform: `scaleX(${titleEnter})` }} />
      <div
        style={{
          maxWidth: "82%",
          color: "#fff",
          fontSize: 96,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.15,
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * 34}px)`,
        }}
      >
        {scene.copy?.title ?? scene.focus}
      </div>
      {scene.copy?.subtitle && (
        <div style={{ color: "rgba(255,255,255,.68)", fontSize: 30, opacity: progressAt(localT, 0.48) }}>
          {scene.copy.subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Collage: React.FC<{ scene: ShotScene }> = ({ scene }) => {
  const rects: Rect[] = [
    { left: "4%", top: "13%", width: "42%", height: "34%", rotateDeg: -3 },
    { left: "53%", top: "9%", width: "42%", height: "34%", rotateDeg: 2 },
    { left: "27%", top: "51%", width: "46%", height: "35%", rotateDeg: -1 },
    { left: "2%", top: "54%", width: "30%", height: "28%", rotateDeg: 3 },
    { left: "70%", top: "52%", width: "28%", height: "29%", rotateDeg: -3 },
    { left: "36%", top: "28%", width: "30%", height: "28%", rotateDeg: 1 },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#080b11,#171d28)" }}>
      {scene.media?.slice(0, rects.length).map((item, i) => (
        <MediaSurface key={item.id} item={item} rect={rects[i]} scene={scene} index={i} />
      ))}
    </AbsoluteFill>
  );
};

// L13 中缝的手绘箭头：坐标写死在 1920×1080 逻辑画布上——组件在
// Composition 的 scale wrapper 内部，用 useVideoConfig 的实际分辨率
// 会在 4K 下整体偏移一倍
const SketchArrow: React.FC<{ scene: ShotScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const atSec = beatTime(scene, "arrow", 1.1);
  const tailX = 852;
  const tipX = 1076;
  const y = 540;
  const ctrlX = (tailX + tipX) / 2;
  const ctrlY = y - 44;
  const shaftDraw = progressAt(localT, atSec, 0.45);
  const headDraw = progressAt(localT, atSec + 0.4, 0.25);
  const headLen = 42;
  const backAngle = Math.atan2(ctrlY - y, ctrlX - tipX);
  const wing = (side: 1 | -1) => {
    const a = backAngle + (side * 26 * Math.PI) / 180;
    return `M ${tipX} ${y} L ${tipX + Math.cos(a) * headLen} ${y + Math.sin(a) * headLen}`;
  };
  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))",
        opacity: localT >= atSec ? 1 : 0,
      }}
    >
      <path
        d={`M ${tailX} ${y} Q ${ctrlX} ${ctrlY} ${tipX} ${y}`}
        stroke={ACCENT}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - shaftDraw}
      />
      {([1, -1] as const).map((side) => (
        <path
          key={side}
          d={wing(side)}
          stroke={ACCENT}
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - headDraw}
        />
      ))}
    </svg>
  );
};

export const ShotSceneRenderer: React.FC<{
  scene: ShotScene;
  master: string;
}> = ({ scene, master }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const durationSec = scene.end - scene.start;
  const enter = scene.motion?.enter === "cut" ? 1 : progressAt(localT, 0, 0.28);
  const visible = enter * exitProgress(localT, durationSec, scene.motion);
  const media = scene.media ?? [];
  const primary = media[0];

  if (scene.layout === "L10") {
    const presenter = scene.presenter;
    if (presenter?.cutoutPrefix && presenter.cutoutCount) {
      // align=left：整块贴左侧安全区，不进人像范围——居中大字会被
      // 人头挡住（35ddd8e 重设计的结论），shot 链路必须继承这个约定
      return (
        <TextBehind
          scene={{
            type: "text_behind",
            start: scene.start,
            end: scene.end,
            lines: scene.copy?.lines ?? [scene.copy?.title ?? scene.focus],
            align: "left",
            cutoutPrefix: presenter.cutoutPrefix,
            cutoutFrom: presenter.cutoutFromSec ?? scene.start,
            cutoutCount: presenter.cutoutCount,
            topPct: 42,
          }}
        />
      );
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: visible }}>
      {scene.layout === "L01" && (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${scene.presenter?.dimOpacity ?? 0})` }} />
      )}

      {scene.layout === "L02" && primary && (
        <AbsoluteFill style={{ background: "linear-gradient(135deg,#090d14,#151b25)" }}>
          {scene.presenter?.form !== "hidden" && (
            <PresenterSurface
              scene={scene}
              master={master}
              rect={{ left: "3%", top: "9%", width: `${scene.presenter?.widthPct ?? 37}%`, height: "76%" }}
            />
          )}
          <MediaSurface
            item={primary}
            rect={
              scene.presenter?.form === "hidden"
                ? { left: "3%", top: "9%", width: "94%", height: "76%" }
                : {
                    left: `${(scene.presenter?.widthPct ?? 37) + 6}%`,
                    top: "9%",
                    width: `${91 - (scene.presenter?.widthPct ?? 37)}%`,
                    height: "76%",
                  }
            }
            scene={scene}
            index={0}
          />
        </AbsoluteFill>
      )}

      {scene.layout === "L03" && primary && (
        <AbsoluteFill style={{ background: "linear-gradient(135deg,#090d14,#151b25)" }}>
          <MediaSurface
            item={primary}
            rect={{
              left: "3%",
              top: "9%",
              width: scene.presenter?.form === "hidden" ? "94%" : `${91 - (scene.presenter?.widthPct ?? 37)}%`,
              height: "76%",
            }}
            scene={scene}
            index={0}
          />
          {scene.presenter?.form !== "hidden" && (
            <PresenterSurface
              scene={scene}
              master={master}
              rect={{
                left: `${97 - (scene.presenter?.widthPct ?? 37)}%`,
                top: "9%",
                width: `${scene.presenter?.widthPct ?? 37}%`,
                height: "76%",
              }}
            />
          )}
        </AbsoluteFill>
      )}

      {scene.layout === "L04" && primary && (
        <AbsoluteFill style={{ background: "#070a0f" }}>
          <MediaSurface item={primary} rect={{ left: "2%", top: "3%", width: "96%", height: "87%" }} scene={scene} index={0} />
          {scene.presenter?.form !== "hidden" && (
            <PresenterSurface
              scene={scene}
              master={master}
              rect={pipRect(
                scene.presenter?.placement ?? "bottom-right",
                scene.presenter?.widthPct ?? 19,
                39,
              )}
            />
          )}
        </AbsoluteFill>
      )}

      {scene.layout === "L05" && primary && (
        <AbsoluteFill style={{ background: "#070a0f" }}>
          <MediaSurface item={primary} rect={{ left: "2%", top: "3%", width: "96%", height: "87%" }} scene={scene} index={0} />
          {scene.presenter?.form !== "hidden" && (() => {
            const widthPct = scene.presenter?.widthPct ?? 12;
            return (
              <PresenterSurface
                scene={scene}
                master={master}
                avatar
                rect={pipRect(
                scene.presenter?.placement ?? "bottom-right",
                widthPct,
                widthPct * (16 / 9),
                78,
              )}
              />
            );
          })()}
        </AbsoluteFill>
      )}

      {scene.layout === "L06" && primary && (
        <AbsoluteFill style={{ background: "#070a0f" }}>
          <MediaSurface item={primary} rect={{ left: "0%", top: "0%", width: "100%", height: "100%" }} scene={scene} index={0} surfaceOverride="bare" />
        </AbsoluteFill>
      )}

      {scene.layout === "L07" && media.length >= 2 && (
        <AbsoluteFill style={{ background: "linear-gradient(135deg,#080b11,#151b25)" }}>
          <MediaSurface item={media[0]} rect={{ left: "2%", top: "13%", width: "46%", height: "70%" }} scene={scene} index={0} />
          <MediaSurface item={media[1]} rect={{ left: "52%", top: "13%", width: "46%", height: "70%" }} scene={scene} index={1} />
          <div style={{ position: "absolute", left: "50%", top: "14%", bottom: "17%", width: 2, background: "rgba(255,255,255,.28)" }} />
        </AbsoluteFill>
      )}

      {scene.layout === "L08" && <Collage scene={scene} />}

      {scene.layout === "L09" && (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: "rgba(0,0,0,.28)" }} />
          {media.slice(0, 4).map((item, i) => {
            const rects: Rect[] = [
              { left: "4%", top: "13%", width: "22%", height: "25%" },
              { left: "74%", top: "13%", width: "22%", height: "25%" },
              { left: "4%", top: "53%", width: "24%", height: "25%" },
              { left: "72%", top: "53%", width: "24%", height: "25%" },
            ];
            return <MediaSurface key={item.id} item={item} rect={rects[i]} scene={scene} index={i} />;
          })}
        </AbsoluteFill>
      )}

      {scene.layout === "L10" && (
        // 无抠像时的降级：人物旁左排字（手册组合规则 9），不做穿插
        <AbsoluteFill style={{ background: "rgba(0,0,0,.35)" }}>
          <div
            style={{
              position: "absolute",
              left: "6%",
              top: "42%",
              transform: "translateY(-50%)",
              width: "30%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 18,
            }}
          >
            {(scene.copy?.lines ?? [scene.copy?.title ?? scene.focus]).map((line, i) => (
              <div
                key={i}
                style={{
                  color: "#fff",
                  fontSize: 100,
                  fontWeight: 900,
                  lineHeight: 1.12,
                  textShadow: "0 4px 20px rgba(0,0,0,0.6)",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {scene.layout === "L11" && <FlowDiagram scene={scene} />}
      {scene.layout === "L12" && <TitleBeat scene={scene} />}

      {scene.layout === "L13" && media.length >= 2 && (
        <AbsoluteFill>
          {/* 压暗但透出母版原片人物，人在暗处继续讲 */}
          <AbsoluteFill style={{ background: `rgba(0,0,0,${scene.presenter?.dimOpacity ?? 0.66})` }} />
          <MediaSurface
            item={{ surface: "paper", ...media[0] }}
            rect={{ left: "5%", top: "19%", width: "39%", height: "58%" }}
            scene={scene}
            index={0}
          />
          <SketchArrow scene={scene} />
          <MediaSurface
            item={{ surface: "paper", ...media[1] }}
            rect={{ left: "56%", top: "19%", width: "39%", height: "58%" }}
            scene={scene}
            index={1}
          />
        </AbsoluteFill>
      )}

      <GlobalCopy scene={scene} />
    </AbsoluteFill>
  );
};
