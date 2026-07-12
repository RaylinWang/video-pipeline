import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PersonSlideScene } from "../types";

// ============================================================
// PersonSlide —— 「人物让位 + 侧边文字面板」镜头的面板部分
// 母版视频本身的位移/缩放由 Composition 统一驱动（见
// masterTransform），本组件只负责空出来那一侧的文字面板：
// 标题 + 橙色下划线 + 列点逐条滑入。
// ============================================================

type Props = {
  scene: PersonSlideScene;
};

export const PersonSlide: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const side = scene.side ?? "left"; // 人物让到的一侧；面板在对侧
  const times =
    scene.itemTimes ?? scene.items.map((_, i) => 0.5 + i * 0.8);

  const titleEnter = spring({
    frame: frame - Math.round(0.25 * fps),
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const exitFade = interpolate(remainT, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideDir = side === "left" ? 1 : -1; // 面板从屏幕外侧滑入

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitFade }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [side === "left" ? "right" : "left"]: "4%",
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {scene.title && (
          <div
            style={{
              opacity: titleEnter,
              transform: `translateX(${(1 - titleEnter) * 40 * slideDir}px)`,
              marginBottom: 8,
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
              {scene.title}
            </div>
            <div
              style={{
                width: 120,
                height: 8,
                borderRadius: 4,
                background: "#FF2442",
                marginTop: 12,
                transform: `scaleX(${titleEnter})`,
                transformOrigin: "left",
              }}
            />
          </div>
        )}

        {scene.items.map((text, i) => {
          const delay = Math.round((times[i] ?? 0) * fps);
          const enter = spring({
            frame: frame - delay,
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
                transform: `translateX(${(1 - enter) * 60 * slideDir}px)`,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#FF2442",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
              />
              <div
                style={{
                  color: "#fff",
                  fontSize: 40,
                  fontWeight: 700,
                  fontFamily: '"PingFang SC", sans-serif',
                  textShadow: "0 3px 12px rgba(0,0,0,0.8)",
                  lineHeight: 1.4,
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
