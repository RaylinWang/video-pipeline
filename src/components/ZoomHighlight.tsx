import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ZoomHighlightScene } from "../types";

// ============================================================
// ZoomHighlight —— 「截图铺屏 + 关键区域放大高亮 + 橙色标注点」镜头
// 对标参考视频：整屏展示界面截图，其中一段文字抠出来
// 放大成白底卡片浮在原位置上方，卡片底部一颗橙色呼吸点。
// 抠图不依赖 OCR：rect 用截图百分比手工标，studio 里目测校准。
// 本组件挂在 Sequence 内，所有动画用本地时间计算。
// ============================================================

type Props = {
  scene: ZoomHighlightScene;
};

export const ZoomHighlight: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const sceneDur = scene.end - scene.start;
  const remainT = sceneDur - localT;

  const dim = scene.dim ?? 0.75;
  const shotDim = scene.shotDim ?? 0.35;
  const widthPct = scene.widthPct ?? 85;
  const zoom = scene.zoom ?? 1.6;
  const dotColor = scene.dotColor ?? "#FF2442";
  const { rect } = scene;

  // 遮罩淡入（0.3s）；退场前 0.3s 淡出
  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // 截图先进场，卡片延迟 0.35s 再弹出
  const shotEnter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const cardDelay = Math.round(0.35 * fps);
  const cardEnter = spring({
    frame: frame - cardDelay,
    fps,
    config: { damping: 13, mass: 0.7 },
  });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 标注点呼吸（周期 1.2s，确定性：只依赖 localT）
  const dotPulse = 1 + 0.18 * Math.sin((localT / 1.2) * Math.PI * 2);

  // 卡片以 rect 为中心向四周放大 zoom 倍；
  // 放大后若越出截图边界则收拢回来（超宽就居中），避免文字被裁
  const cardW = rect.w * zoom;
  const cardH = rect.h * zoom;
  const clampPos = (pos: number, size: number) =>
    size >= 100 ? (100 - size) / 2 : Math.min(Math.max(pos, 0), 100 - size);
  const cardLeft = clampPos(rect.x - (rect.w * (zoom - 1)) / 2, cardW);
  const cardTop = clampPos(rect.y - (rect.h * (zoom - 1)) / 2, cardH);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 压暗遮罩 */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: exitFade,
        }}
      >
        {/* 截图容器：宽度定死，高度随图片撑开，
            子元素的百分比定位即截图上的百分比坐标 */}
        <div
          style={{
            width: `${widthPct}%`,
            position: "relative",
            transform: `scale(${0.9 + 0.1 * shotEnter}) translateY(${(1 - shotEnter) * 36}px)`,
          }}
        >
          <Img
            src={staticFile(scene.src)}
            style={{
              width: "100%",
              display: "block",
              borderRadius: 10,
              boxShadow: "0 16px 56px rgba(0,0,0,0.7)",
            }}
          />

          {/* 卡片出现后，截图本身再压暗一层，突出高亮区 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              background: `rgba(0,0,0,${shotDim * cardEnter})`,
            }}
          />

          {/* 放大卡片：白底 + 阴影，内容是截图 rect 区域的等比放大裁切 */}
          <div
            style={{
              position: "absolute",
              left: `${cardLeft}%`,
              top: `${cardTop}%`,
              width: `${cardW}%`,
              height: `${cardH}%`,
              overflow: "hidden",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 10px 40px rgba(0,0,0,0.55)",
              opacity: cardEnter,
              transform: `scale(${0.82 + 0.18 * cardEnter})`,
            }}
          >
            {/* 裁切原理：整张图放大 zoom 倍塞进卡片，
                再按 rect 偏移，让卡片窗口正好露出目标区域 */}
            <Img
              src={staticFile(scene.src)}
              style={{
                position: "absolute",
                width: `${10000 / rect.w}%`,
                left: `${(-rect.x / rect.w) * 100}%`,
                top: `${(-rect.y / rect.h) * 100}%`,
                display: "block",
              }}
            />
          </div>

          {/* 橙色标注点：挂在卡片下边缘 */}
          <div
            style={{
              position: "absolute",
              left: `${cardLeft + cardW * 0.32}%`,
              top: `${cardTop + cardH}%`,
              width: 22,
              height: 22,
              marginLeft: -11,
              marginTop: -11,
              borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 0 ${6 * dotPulse}px ${dotColor}33, 0 2px 8px rgba(0,0,0,0.4)`,
              opacity: cardEnter,
              transform: `scale(${dotPulse})`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
