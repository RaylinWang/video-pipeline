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
import type { PhotoScatterScene } from "../types";

// ============================================================
// PhotoScatter —— 「人物两侧散落真实截图」镜头
// 每张截图像拍立得一样带白边、阴影、轻微旋转，错峰弹入，
// 弹入后有极轻的呼吸摆动（sin 驱动，确定性，不吃随机数）。
// 位置由 storyboard 里的 items[].xPct/yPct 手动摆，
// 避开人像轮廓安全区（左 0-28%，右 68-100%，参考 TextBehind）。
// ============================================================

type Props = {
  scene: PhotoScatterScene;
};

export const PhotoScatter: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;
  const dim = scene.dim ?? 0.35;

  const dimOpacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const exitFade = interpolate(remainT, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dimOpacity})` }} />

      <AbsoluteFill style={{ opacity: exitFade }}>
        {scene.items.map((item, i) => {
          const at = item.at ?? i * 0.7;
          const enter = spring({
            frame: frame - Math.round(at * fps),
            fps,
            config: { damping: 12, mass: 0.7 },
          });
          const rotate = item.rotateDeg ?? (i % 2 === 0 ? -5 : 5);
          // 弹入后的呼吸摆动：极轻，周期 3s，只在 enter 接近 1 时生效
          const bob = Math.sin((localT / 3) * Math.PI * 2 + i) * 1.2 * enter;
          const widthPct = item.widthPct ?? 15;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${item.xPct}%`,
                top: `${item.yPct}%`,
                width: `${widthPct}%`,
                opacity: enter,
                transform: `scale(${0.8 + 0.2 * enter}) rotate(${rotate + bob}deg) translateY(${(1 - enter) * 30}px)`,
                transformOrigin: "center",
                background: "#fff",
                padding: 6,
                borderRadius: 8,
                boxShadow: "0 14px 40px rgba(0,0,0,0.55)",
              }}
            >
              <Img
                src={staticFile(item.src)}
                style={{ width: "100%", display: "block", borderRadius: 3 }}
              />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
