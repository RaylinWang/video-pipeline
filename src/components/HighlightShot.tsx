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
import type { HighlightShotScene } from "../types";

// ============================================================
// HighlightShot —— 「截图铺屏 + 原位橙色高亮框 + 引线 + 标签」镜头
// 跟 ZoomHighlight 的区别：不放大，只在原位画框划重点。
// 框是描边动画「画」出来的，框外区域聚光压暗，
// 引线从框边伸出接标签。rect 坐标体系与 zoom_highlight 相同。
// ============================================================

type Props = {
  scene: HighlightShotScene;
};

export const HighlightShot: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const sceneDur = scene.end - scene.start;
  const remainT = sceneDur - localT;

  const dim = scene.dim ?? 0.75;
  const spotDim = scene.spotDim ?? 0.35;
  const widthPct = scene.widthPct ?? 85;
  const color = scene.color ?? "#FF2442";
  const labelPos = scene.labelPos ?? "bottom";
  const { rect } = scene;

  // 遮罩淡入；退场前淡出
  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const shotEnter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  // 0.35s 后开始画框（0.5s 画完）→ 聚光渐入 → 引线 + 标签
  const boxDraw = interpolate(localT, [0.35, 0.85], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spotIn = interpolate(localT, [0.5, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineDraw = interpolate(localT, [0.85, 1.1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelIn = interpolate(localT, [1.0, 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 引线：从框的下（或上）边中点竖直伸出，标签接在末端
  const lineX = rect.x + rect.w / 2;
  const lineY1 = labelPos === "bottom" ? rect.y + rect.h : rect.y;
  const lineY2 = labelPos === "bottom" ? lineY1 + 9 : lineY1 - 9;

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
        {/* 截图容器：子元素的百分比定位即截图上的百分比坐标 */}
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

          {/* 聚光：框内挖空，框外压暗（大 box-shadow 实现） */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 10 }}>
            <div
              style={{
                position: "absolute",
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
                borderRadius: 6,
                boxShadow: `0 0 0 9999px rgba(0,0,0,${spotDim * spotIn})`,
              }}
            />
          </div>

          {/* 高亮框 + 引线：SVG 铺满截图，坐标即百分比。
              注意不能用 pathLength+dasharray 的描边动画——配合
              non-scaling-stroke 时 dash 会在屏幕空间按像素计算，
              渲染成碎虚线。改为四条边依次动端点「画」出来 */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            {(() => {
              const p = 1 - boxDraw; // 0→1 画框进度，四条边各占 1/4
              const corners = [
                [rect.x, rect.y],
                [rect.x + rect.w, rect.y],
                [rect.x + rect.w, rect.y + rect.h],
                [rect.x, rect.y + rect.h],
              ];
              return corners.map(([sx, sy], i) => {
                const [ex, ey] = corners[(i + 1) % 4];
                const sub = Math.min(Math.max(p * 4 - i, 0), 1);
                if (sub <= 0) return null;
                return (
                  <line
                    key={i}
                    x1={sx}
                    y1={sy}
                    x2={sx + (ex - sx) * sub}
                    y2={sy + (ey - sy) * sub}
                    stroke={color}
                    strokeWidth={5}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
                  />
                );
              });
            })()}
            {scene.label && lineDraw < 1 && (
              <line
                x1={lineX}
                y1={lineY1}
                x2={lineX}
                y2={lineY1 + (lineY2 - lineY1) * (1 - lineDraw)}
                stroke={color}
                strokeWidth={4}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* 标签：接在引线末端 */}
          {scene.label && (
            <div
              style={{
                position: "absolute",
                left: `${lineX}%`,
                top: `${lineY2}%`,
                transform: `translate(-50%, ${labelPos === "bottom" ? "0%" : "-100%"}) scale(${0.85 + 0.15 * labelIn})`,
                opacity: labelIn,
                background: color,
                color: "#fff",
                borderRadius: 10,
                padding: "10px 26px",
                fontSize: 34,
                fontWeight: 800,
                fontFamily: '"PingFang SC", sans-serif',
                whiteSpace: "nowrap",
                boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
                marginTop: labelPos === "bottom" ? 6 : -6,
              }}
            >
              {scene.label}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
