import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SplitBoardScene, SplitSide } from "../types";

// ============================================================
// SplitBoard —— 「左右两栏对比板」镜头
// 重压暗后左右各一栏：标题+橙色底线（沿用 PersonSlide 的面板
// 语言）+ 圆点列点，中间竖分割线。两侧标题/条目时刻独立可调，
// 支持"左栏先讲完、右栏再进"的口播节奏。
// ============================================================

const ACCENT = "#FF2442";

type Props = {
  scene: SplitBoardScene;
};

const Column: React.FC<{
  side: SplitSide;
  frame: number;
  fps: number;
  defaultTitleAt: number;
}> = ({ side, frame, fps, defaultTitleAt }) => {
  const titleAt = side.titleAt ?? defaultTitleAt;
  const titleEnter = spring({
    frame: frame - Math.round(titleAt * fps),
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const times =
    side.itemTimes ?? side.items.map((_, i) => titleAt + 0.6 + i * 0.8);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        padding: "0 4%",
      }}
    >
      <div
        style={{
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * 30}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 54,
            fontWeight: 800,
            fontFamily: '"PingFang SC", sans-serif',
            textShadow: "0 4px 16px rgba(0,0,0,0.7)",
          }}
        >
          {side.title}
        </div>
        <div
          style={{
            width: 130,
            height: 8,
            borderRadius: 4,
            background: ACCENT,
            marginTop: 12,
            transform: `scaleX(${titleEnter})`,
          }}
        />
      </div>

      {side.items.map((text, i) => {
        const enter = spring({
          frame: frame - Math.round((times[i] ?? 0) * fps),
          fps,
          config: { damping: 13, mass: 0.7 },
        });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 30}px)`,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: ACCENT,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                color: "#fff",
                fontSize: 36,
                fontWeight: 700,
                fontFamily: '"PingFang SC", sans-serif',
                textShadow: "0 3px 12px rgba(0,0,0,0.8)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const SplitBoard: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;
  const dim = scene.dim ?? 0.8;

  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          opacity: exitFade,
          padding: "7% 3% 20%",
        }}
      >
        <Column side={scene.left} frame={frame} fps={fps} defaultTitleAt={0.3} />
        <Column side={scene.right} frame={frame} fps={fps} defaultTitleAt={0.3} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
