import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { FloatClipScene } from "../types";

// ============================================================
// FloatClip —— 「画面压暗 + 视频浮窗」镜头（FloatShot 的视频版）
// 竖屏录屏做成圆角手机浮窗浮在口播上，静音，声音仍是母版。
// 浮窗视频从本镜头起点开始播（Sequence 内 OffthreadVideo 自然对齐）。
// ============================================================

type Props = {
  scene: FloatClipScene;
};

export const FloatClip: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const dim = scene.dim ?? 0.5;
  const widthPct = scene.widthPct ?? 22;
  const radius = scene.radius ?? 28;

  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const justify =
    scene.position === "left"
      ? "flex-start"
      : scene.position === "right"
        ? "flex-end"
        : "center";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: justify,
          padding: "0 7%",
          opacity: exitFade,
        }}
      >
        <div
          style={{
            width: `${widthPct}%`,
            position: "relative",
            transform: `scale(${0.88 + 0.12 * enter}) translateY(${(1 - enter) * 40}px)`,
          }}
        >
          {scene.label && (
            <div
              style={{
                position: "absolute",
                top: -26,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                background: "#000",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: 10,
                padding: "6px 24px",
                fontSize: 30,
                fontWeight: 700,
                fontFamily: '"PingFang SC", sans-serif',
                whiteSpace: "nowrap",
              }}
            >
              {scene.label}
            </div>
          )}
          <div
            style={{
              borderRadius: radius,
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.35)",
              boxShadow: "0 16px 56px rgba(0,0,0,0.7)",
              lineHeight: 0,
            }}
          >
            <OffthreadVideo
              muted
              src={staticFile(scene.src)}
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
