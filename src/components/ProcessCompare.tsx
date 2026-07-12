import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ============================================================
// ProcessCompare —— 左右「传统流程 vs AI 流程」横向步骤对比
//
// 每一栏内部是 3 个短句步骤，从左向右用箭头串联。适合做「传统 60
// 分钟写稿 vs AI 10 分钟协作」等清晰对比。默认抬高到字幕安全区上方，
// 文字始终单行。组件不负责母版压暗，按需要在外层叠 DimOverlay。
// ============================================================

export type ProcessCompareLane = {
  title: string;
  /** 推荐刚好 3 个短句步骤。 */
  steps: readonly string[];
  /** 该栏相对镜头起点的出现时间（秒）。 */
  atSec?: number;
  /** 可选：覆盖默认强调色。 */
  color?: string;
};

export type ProcessCompareProps = {
  traditional: ProcessCompareLane;
  ai: ProcessCompareLane;
  /** 可选的总标题，例如「同一个任务，两个流程」。 */
  title?: string;
  /** 默认传统栏在 0.18s、AI 栏在 0.44s 出现。 */
  traditionalAtSec?: number;
  aiAtSec?: number;
  /** 一栏内相邻步骤的点亮间隔。 */
  stepIntervalSec?: number;
  /** 底部字幕安全区高度。 */
  subtitleSafeBottomPx?: number;
  safeGapPx?: number;
  /** 对比区总宽度百分比。 */
  widthPct?: number;
  /** 默认步骤字号。组件会为过长标签缩小字号，但不会换行。 */
  stepFontSize?: number;
  /** 传统流程色。 */
  traditionalColor?: string;
  /** AI 流程色。 */
  aiColor?: string;
  /** 设置后，在该时刻开始淡出。 */
  exitAtSec?: number;
  exitDurationSec?: number;
};

const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

const visualLength = (text: string) =>
  [...text].reduce((sum, char) => sum + (/^[\u0000-\u00ff]$/.test(char) ? 0.58 : 1), 0);

const fitSingleLineFontSize = (
  text: string,
  preferred: number,
  availableWidth: number,
) => {
  const byLength = availableWidth / Math.max(visualLength(text) * 1.02, 1);
  return Math.max(20, Math.min(preferred, byLength));
};

type LaneProps = {
  lane: ProcessCompareLane;
  atSec: number;
  frame: number;
  fps: number;
  timeSec: number;
  width: number;
  stepIntervalSec: number;
  stepFontSize: number;
  color: string;
};

const Lane: React.FC<LaneProps> = ({
  lane,
  atSec,
  frame,
  fps,
  timeSec,
  width,
  stepIntervalSec,
  stepFontSize,
  color,
}) => {
  const laneEnter = spring({
    frame: frame - Math.round(atSec * fps),
    fps,
    config: { damping: 15, mass: 0.76, stiffness: 150 },
  });
  const steps = lane.steps.slice(0, 3);
  const stepAreaWidth = Math.max(230, (width * 0.39 - 114) / Math.max(steps.length, 1));

  return (
    <div
      style={{
        width: "48.5%",
        opacity: laneEnter,
        transform: `translateY(${(1 - laneEnter) * 32}px) scale(${0.96 + laneEnter * 0.04})`,
        borderRadius: 22,
        padding: "22px 26px 26px",
        background: "rgba(5,9,18,0.76)",
        border: `1.5px solid ${color}aa`,
        boxShadow: `0 15px 42px rgba(0,0,0,0.43), inset 0 1px 0 rgba(255,255,255,0.12)`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            background: color,
            boxShadow: `0 0 14px ${color}`,
          }}
        />
        <div
          style={{
            color: "#fff",
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: 1.2,
            whiteSpace: "nowrap",
            textShadow: "0 3px 12px rgba(0,0,0,0.68)",
          }}
        >
          {lane.title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
        }}
      >
        {steps.map((label, index) => {
          const itemAt = atSec + 0.18 + index * stepIntervalSec;
          const enter = spring({
            frame: frame - Math.round(itemAt * fps),
            fps,
            config: { damping: 15, mass: 0.65, stiffness: 175 },
          });
          const isLit = timeSec >= itemAt;
          const labelFontSize = fitSingleLineFontSize(
            label,
            stepFontSize,
            stepAreaWidth - 26,
          );

          return (
            <React.Fragment key={`${label}-${index}`}>
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 12px",
                  borderRadius: 12,
                  opacity: 0.35 + enter * 0.65,
                  transform: `translateY(${(1 - enter) * 22}px) scale(${0.92 + enter * 0.08})`,
                  color: isLit ? "#fff" : "rgba(255,255,255,0.50)",
                  background: isLit ? `${color}2c` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isLit ? `${color}cc` : "rgba(255,255,255,0.16)"}`,
                  boxShadow: isLit ? `0 0 18px ${color}30` : "none",
                }}
              >
                <span
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    fontSize: labelFontSize,
                    fontWeight: 850,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    textShadow: "0 2px 8px rgba(0,0,0,0.54)",
                  }}
                >
                  {label}
                </span>
              </div>

              {index < steps.length - 1 ? (
                <div
                  aria-hidden
                  style={{
                    width: 34,
                    height: 3,
                    flexShrink: 0,
                    margin: "0 8px",
                    borderRadius: 999,
                    position: "relative",
                    background: "rgba(255,255,255,0.20)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${interpolate(
                        timeSec,
                        [itemAt + 0.1, itemAt + 0.32],
                        [0, 100],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                      )}%`,
                      borderRadius: 999,
                      background: color,
                      boxShadow: `0 0 10px ${color}88`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: -1,
                      top: "50%",
                      width: 9,
                      height: 9,
                      borderTop: `3px solid ${timeSec >= itemAt + 0.18 ? color : "rgba(255,255,255,0.36)"}`,
                      borderRight: `3px solid ${timeSec >= itemAt + 0.18 ? color : "rgba(255,255,255,0.36)"}`,
                      transform: "translateY(-50%) rotate(45deg)",
                    }}
                  />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const ProcessCompare: React.FC<ProcessCompareProps> = ({
  traditional,
  ai,
  title,
  traditionalAtSec = 0.18,
  aiAtSec = 0.44,
  stepIntervalSec = 0.48,
  subtitleSafeBottomPx = 170,
  safeGapPx = 40,
  widthPct = 90,
  stepFontSize = 30,
  traditionalColor = "#A9B3C7",
  aiColor = "#FF8A00",
  exitAtSec,
  exitDurationSec = 0.28,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const timeSec = frame / fps;
  const exitOpacity =
    exitAtSec === undefined
      ? 1
      : interpolate(timeSec, [exitAtSec, exitAtSec + exitDurationSec], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: subtitleSafeBottomPx + safeGapPx,
          width: `${widthPct}%`,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: FONT,
        }}
      >
        {title ? (
          <div
            style={{
              alignSelf: "center",
              color: "#fff",
              fontSize: 42,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: 2,
              whiteSpace: "nowrap",
              textShadow: "0 4px 18px rgba(0,0,0,0.78)",
            }}
          >
            {title}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "stretch",
            gap: "3%",
            width: "100%",
          }}
        >
          <Lane
            lane={traditional}
            atSec={traditional.atSec ?? traditionalAtSec}
            frame={frame}
            fps={fps}
            timeSec={timeSec}
            width={width}
            stepIntervalSec={stepIntervalSec}
            stepFontSize={stepFontSize}
            color={traditional.color ?? traditionalColor}
          />
          <Lane
            lane={ai}
            atSec={ai.atSec ?? aiAtSec}
            frame={frame}
            fps={fps}
            timeSec={timeSec}
            width={width}
            stepIntervalSec={stepIntervalSec}
            stepFontSize={stepFontSize}
            color={ai.color ?? aiColor}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
