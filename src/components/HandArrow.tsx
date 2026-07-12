import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { HandArrowScene } from "../types";

// ============================================================
// HandArrow —— 「手绘箭头 + 尾部标签」镜头
// 直接叠在母版上，指人或画面里的东西。
// 手绘感来源：箭杆是带弧度的二次贝塞尔（不是笔直的线），
// 用 pathLength 描边动画模拟「画出来」的过程，先杆后头。
// ============================================================

type Props = {
  scene: HandArrowScene;
};

export const HandArrow: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 组件在 Composition 的 1920×1080 scale wrapper 内部，坐标必须用
  // 逻辑画布常量——useVideoConfig 给的是实际分辨率，4K 下会整体偏移一倍
  const width = 1920;
  const height = 1080;

  const localT = frame / fps;
  const remainT = scene.end - scene.start - localT;

  const color = scene.color ?? "#fff";
  const len = scene.length ?? 200;
  const angleRad = ((scene.angle ?? 40) * Math.PI) / 180;

  // 尖端（百分比 → px）；尾端沿 angle 方向退出去
  const tipX = (scene.x / 100) * width;
  const tipY = (scene.y / 100) * height;
  const tailX = tipX + Math.cos(angleRad) * len;
  const tailY = tipY - Math.sin(angleRad) * len;

  // 箭杆：二次贝塞尔，控制点在中点垂直方向外拱 18%，画出手写弧度
  const midX = (tipX + tailX) / 2;
  const midY = (tipY + tailY) / 2;
  const bow = len * 0.18;
  const perpX = -(tipY - tailY);
  const perpY = tipX - tailX;
  const perpLen = Math.hypot(perpX, perpY) || 1;
  const ctrlX = midX + (perpX / perpLen) * bow;
  const ctrlY = midY + (perpY / perpLen) * bow;

  // 箭头两翼：从尖端沿杆方向张开 ±26°
  const backAngle = Math.atan2(ctrlY - tipY, ctrlX - tipX);
  const headLen = Math.max(26, len * 0.16);
  const wing = (side: 1 | -1) => {
    const a = backAngle + side * (26 * Math.PI) / 180;
    return `M ${tipX} ${tipY} L ${tipX + Math.cos(a) * headLen} ${tipY + Math.sin(a) * headLen}`;
  };

  // 描边节奏：0-0.45s 画杆，0.4-0.65s 画头；退场前 0.25s 淡出
  const shaftDraw = interpolate(localT, [0, 0.45], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headDraw = interpolate(localT, [0.4, 0.65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelIn = interpolate(localT, [0.5, 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitFade = interpolate(remainT, [0, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 标签挂在尾端再往外一点
  const labelX = tailX + Math.cos(angleRad) * 28;
  const labelY = tailY - Math.sin(angleRad) * 28;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitFade }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: "absolute",
          inset: 0,
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))",
        }}
      >
        <path
          d={`M ${tailX} ${tailY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={shaftDraw}
        />
        {([1, -1] as const).map((side) => (
          <path
            key={side}
            d={wing(side)}
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={headDraw}
          />
        ))}
      </svg>

      {scene.label && (
        <div
          style={{
            position: "absolute",
            left: labelX,
            top: labelY,
            transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * labelIn})`,
            opacity: labelIn,
            color,
            fontSize: 46,
            fontWeight: 800,
            fontFamily: '"Muyao-Softbrush", "PingFang SC", sans-serif',
            letterSpacing: 2,
            whiteSpace: "nowrap",
            textShadow: [
              "-2px -2px 0 #000",
              "2px -2px 0 #000",
              "-2px 2px 0 #000",
              "2px 2px 0 #000",
              "0 4px 12px rgba(0,0,0,0.8)",
            ].join(", "),
          }}
        >
          {scene.label}
        </div>
      )}
    </AbsoluteFill>
  );
};
