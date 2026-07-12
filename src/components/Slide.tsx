import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideScene } from "../types";

// ============================================================
// Slide —— 全屏 PPT 页镜头
// 整页深色底完全盖住母版（口播声音继续），大标题+橙色底线，
// 编号条目按 itemTimes 逐条弹入。整页 0.3s 淡入淡出。
// ============================================================

const ACCENT = "#FF2442";

type Props = {
  scene: SlideScene;
};

export const Slide: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;
  const numbered = scene.numbered ?? true;

  const pageFade =
    interpolate(localT, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const titleEnter = spring({
    frame: frame - Math.round(0.25 * fps),
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const times =
    scene.itemTimes ?? scene.items.map((_, i) => 0.5 + i * 0.8);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: pageFade }}>
      {/* 整页底色：深色渐变 + 左上橙色角标条 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(135deg, #131a26 0%, #0d1119 60%, #10151f 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 220,
          height: 14,
          background: ACCENT,
          borderBottomRightRadius: 8,
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 12%",
          gap: 44,
        }}
      >
        <div
          style={{
            opacity: titleEnter,
            transform: `translateY(${(1 - titleEnter) * 34}px)`,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: 72,
              fontWeight: 800,
              fontFamily: '"PingFang SC", sans-serif',
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              width: 150,
              height: 10,
              borderRadius: 5,
              background: ACCENT,
              marginTop: 16,
              transform: `scaleX(${titleEnter})`,
              transformOrigin: "left",
            }}
          />
        </div>

        {scene.items.map((text, i) => {
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
                gap: 30,
                opacity: enter,
                transform: `translateX(${(1 - enter) * 60}px)`,
              }}
            >
              {numbered && (
                <div
                  style={{
                    color: ACCENT,
                    fontSize: 58,
                    fontWeight: 900,
                    fontStyle: "italic",
                    fontFamily: '"Helvetica Neue", "PingFang SC", sans-serif',
                    width: 90,
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              )}
              <div
                style={{
                  color: "#fff",
                  fontSize: 46,
                  fontWeight: 700,
                  fontFamily: '"PingFang SC", sans-serif',
                  lineHeight: 1.45,
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
