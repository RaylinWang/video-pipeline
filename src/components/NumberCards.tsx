import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { NumberCardsScene } from "../types";

// ============================================================
// NumberCards —— 「画面压暗 + 01/02/03 编号卡逐条弹出」镜头
// 每张卡：橙色大编号 + 白底黑字内容，spring 弹入。
// 出现时刻默认等间隔，可用 itemTimes 精确对齐口播。
// ============================================================

type Props = {
  scene: NumberCardsScene;
};

export const NumberCards: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const dim = scene.dim ?? 0.65;
  const color = scene.color ?? "#FF2442";
  const times =
    scene.itemTimes ?? scene.items.map((_, i) => 0.4 + i * 0.7);

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
          padding: "0 8%",
          opacity: exitFade,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
                  gap: 24,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 36}px) scale(${0.9 + 0.1 * enter})`,
                }}
              >
                <div
                  style={{
                    color,
                    fontSize: 64,
                    fontWeight: 900,
                    fontFamily: '"Helvetica Neue", "PingFang SC", sans-serif',
                    fontStyle: "italic",
                    textShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    width: 96,
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    background: "#fff",
                    color: "#111",
                    borderRadius: 12,
                    padding: "18px 32px",
                    fontSize: 40,
                    fontWeight: 700,
                    fontFamily: '"PingFang SC", sans-serif',
                    boxShadow: "0 10px 36px rgba(0,0,0,0.55)",
                    maxWidth: 900,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
