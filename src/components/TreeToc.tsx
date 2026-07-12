import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { TreeTocScene } from "../types";

// ============================================================
// TreeToc —— 常驻树状目录（章标）
// 左上角一块半透明背板：根标题 + 主干线，讲到新章节时
// 枝线画出、节点滑入，先用强调色高亮 ~1.5s 再回落成白色。
// 出现后不退场，跟着 scene 的时间区间一直挂到片尾。
// 所有尺寸都是 1920×1080 逻辑画布 px（组件在 scale wrapper 内）。
// ============================================================

const clampOpts = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

type Props = {
  scene: TreeTocScene;
};

export const TreeToc: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;

  const accent = scene.color ?? "#FF2442";
  const left = scene.leftPx ?? 32;
  const top = scene.topPx ?? 40;
  const width = scene.widthPx ?? 330;
  const panelOpacity = scene.panelOpacity ?? 0.45;

  const panelIn = interpolate(localT, [0, 0.4], [0, 1], clampOpts);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        opacity: panelIn,
        transform: `translateY(${(1 - panelIn) * -12}px)`,
        borderRadius: 14,
        background: `rgba(10, 14, 20, ${panelOpacity})`,
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 10px 32px rgba(0,0,0,0.35)",
        padding: "14px 18px 12px",
        color: "#fff",
        fontFamily: '"PingFang SC", sans-serif',
      }}
    >
      {scene.root && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 850 }}>{scene.root.zh}</span>
          {scene.root.en && (
            <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.6, letterSpacing: 1 }}>
              {scene.root.en}
            </span>
          )}
        </div>
      )}

      <div style={{ position: "relative", marginLeft: 6 }}>
        {/* 主干线：随节点展开逐段向下生长 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.32)",
            height: scene.nodes.reduce((sum, node) => {
              const grow = interpolate(
                localT,
                [node.atSec - 0.3, node.atSec + 0.15],
                [0, 1],
                clampOpts,
              );
              return sum + 66 * grow;
            }, 0),
          }}
        />
        {scene.nodes.map((node, i) => {
          const reveal = interpolate(localT, [node.atSec, node.atSec + 0.35], [0, 1], clampOpts);
          const slide = interpolate(localT, [node.atSec, node.atSec + 0.45], [0, 1], clampOpts);
          // 展开瞬间强调色高亮，~1.5s 内回落白色
          const highlight = interpolate(
            localT,
            [node.atSec + 0.9, node.atSec + 1.7],
            [1, 0],
            clampOpts,
          );
          return (
            <div
              key={i}
              style={{
                position: "relative",
                height: 66 * reveal,
                overflow: "hidden",
                paddingLeft: 26,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* 枝线 */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: 18,
                  height: 3,
                  borderRadius: 2,
                  background: highlight > 0.02 ? accent : "rgba(255,255,255,0.32)",
                  transform: `scaleX(${slide})`,
                  transformOrigin: "left center",
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 750,
                    lineHeight: 1.15,
                    color: "rgba(255,255,255,0.92)",
                    opacity: slide,
                    transform: `translateX(${(1 - slide) * -14}px)`,
                  }}
                >
                  {node.zh}
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    fontSize: 28,
                    fontWeight: 750,
                    lineHeight: 1.15,
                    color: accent,
                    opacity: slide * highlight,
                  }}
                >
                  {node.zh}
                </div>
              </div>
              {node.en && (
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: 1,
                    opacity: slide * 0.62,
                    marginTop: 2,
                  }}
                >
                  {node.en}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
