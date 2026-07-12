import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { DimScene } from "../types";

// ============================================================
// DimOverlay —— 纯压暗镜头，什么都不浮
// 用在口播强调段：画面暗下来，观众注意力回到人和字幕上
// ============================================================

type Props = {
  scene: DimScene;
};

export const DimOverlay: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;
  const dim = scene.dim ?? 0.5;

  const opacity =
    interpolate(localT, [0, 0.3], [0, dim], { extrapolateRight: "clamp" }) *
    interpolate(remainT, [0, 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill
      style={{ background: `rgba(0,0,0,${opacity})`, pointerEvents: "none" }}
    />
  );
};
