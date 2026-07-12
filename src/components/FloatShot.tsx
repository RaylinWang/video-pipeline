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
import type { FloatShotScene } from "../types";

// ============================================================
// FloatShot —— 「画面压暗 + 截图浮层 + 贴纸标签」镜头
// 对标参考图：黑色半透明遮罩盖住人物，截图带阴影弹入，
// 顶部黑底白字贴纸标签。
// 本组件挂在 Sequence 内，useCurrentFrame 从本镜头起点归零，
// 因此所有动画都用「本地时间」计算。
// ============================================================

type Props = {
  scene: FloatShotScene;
};

export const FloatShot: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;                       // 距本镜头开始
  const sceneDur = scene.end - scene.start;
  const remainT = sceneDur - localT;                // 距本镜头结束

  const dim = scene.dim ?? 0.65;
  const widthPct = scene.widthPct ?? 55;

  // 遮罩淡入（0.3s）；退场前 0.3s 淡出
  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // 截图 spring 弹入 + 退场淡出
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 呼吸缩放：弹入基本定住后（enter 接近 1）才生效，周期 4s、
  // 幅度极小（±1.5%），只是让静态插画「看起来在呼吸」，不喧宾夺主
  const breathe = scene.breathe
    ? 1 + 0.015 * Math.sin((localT / 4) * Math.PI * 2) * enter
    : 1;

  const justify =
    scene.position === "left"
      ? "flex-start"
      : scene.position === "right"
        ? "flex-end"
        : "center";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 压暗遮罩 */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      {/* 截图 + 贴纸标签 */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: justify,
          padding: "0 6%",
          opacity: exitFade,
        }}
      >
        <div
          style={{
            width: `${widthPct}%`,
            transform: `scale(${(0.85 + 0.15 * enter) * breathe}) translateY(${(1 - enter) * 40}px)`,
            position: "relative",
          }}
        >
          {scene.label && (
            <div
              style={{
                position: "absolute",
                top: -28,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                background: "#000",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: 10,
                padding: "8px 28px",
                fontSize: 34,
                fontWeight: 700,
                fontFamily: '"PingFang SC", sans-serif',
                whiteSpace: "nowrap",
              }}
            >
              {scene.label}
            </div>
          )}
          <Img
            src={staticFile(scene.src)}
            style={{
              width: "100%",
              display: "block",
              borderRadius: 6,
              boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
