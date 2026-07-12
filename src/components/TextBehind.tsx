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
import type { TextBehindScene } from "../types";
import { FONT_FAMILIES } from "../Fonts";

// ============================================================
// TextBehind —— 「人头后大字」镜头
// 三层：母版（底，Composition 已铺）→ 大字 → 人物抠像序列（顶）。
// 抠像是预处理产物：public/<cutoutPrefix>NNN.png（001 起），
// 由 rembg 对母版对应时间段逐帧抠人得到，人挡字、字挡背景。
// align="left" 时整块贴左侧安全区、不进人像范围，避免字被吞。
// ============================================================

type Props = {
  scene: TextBehindScene;
};

export const TextBehind: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const align = scene.align ?? "center";
  const fontSize = scene.fontSize ?? (align === "left" ? 110 : 260);
  const topPct = scene.topPct ?? 40;
  const maxWidthPct = scene.maxWidthPct ?? 30;

  // 当前帧对应的抠像序号：母版时刻 → 序列帧（1 起，越界取端值）
  const masterT = scene.start + localT;
  const idx = Math.min(
    scene.cutoutCount,
    Math.max(1, Math.round((masterT - scene.cutoutFrom) * fps) + 1),
  );
  const cutoutSrc = `${scene.cutoutPrefix}${String(idx).padStart(3, "0")}.png`;

  const exitFade = interpolate(remainT, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 大字层（在人物后面） */}
      <AbsoluteFill style={{ opacity: exitFade }}>
        <div
          style={
            align === "left"
              ? {
                  position: "absolute",
                  left: "6%",
                  width: `${maxWidthPct}%`,
                  top: `${topPct}%`,
                  transform: "translateY(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 18,
                }
              : {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${topPct}%`,
                  transform: "translateY(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 26,
                }
          }
        >
          {scene.lines.map((line, i) => {
            const enter = spring({
              frame: frame - Math.round((0.3 + i * 0.5) * fps),
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            return (
              <div
                key={i}
                style={{
                  color: "#fff",
                  fontSize,
                  fontWeight: 900,
                  fontFamily: scene.font
                    ? `"${FONT_FAMILIES[scene.font]}"`
                    : '"PingFang SC", sans-serif',
                  letterSpacing: align === "left" ? 6 : 22,
                  // 绝不自动换行——折行位置永远由 lines 数组的作者手动决定，
                  // 避免浏览器在词中间硬切，切出「外」这种孤字单独一行
                  whiteSpace: "nowrap",
                  lineHeight: 1.25,
                  textShadow: "0 8px 36px rgba(0,0,0,0.7), 0 2px 10px rgba(0,0,0,0.6)",
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 50}px) scale(${0.9 + 0.1 * enter})`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* 人物抠像层（在文字前面，遮挡文字） */}
      <AbsoluteFill>
        <Img
          src={staticFile(cutoutSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
