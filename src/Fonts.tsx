import React from "react";
import { staticFile } from "remotion";

// ============================================================
// Fonts —— 手写强调字体全局注册（@font-face）
// 用户 2026-07 选定的一套，圆润可爱系 + 一个硬朗海报体，不要毛笔。
// 只当「偶尔出现的主旨/关键句」用，不是正文字幕（正文字幕见 Subtitle.tsx）。
// 挂在 Root.tsx 顶层一次即可，全片任何组件都能直接用这几个 fontFamily 名。
// ============================================================

export const FONT_FAMILIES = {
  smiley: "Smiley Sans",        // 得意黑：斜体硬朗海报感，适合冲击力标题
  xiaolai: "Xiaolai",           // 小赖字体：软手写，像手写笔记
  chillround: "ChillRound",     // 寒蝉圆黑：圆黑体，规整
  yozai: "Yozai",               // 悠哉：手账感手写
} as const;

export type FontKey = keyof typeof FONT_FAMILIES;

export const Fonts: React.FC = () => (
  <style>{`
    @font-face {
      font-family: "Smiley Sans";
      src: url("${staticFile("fonts/SmileySans-Oblique.ttf")}") format("truetype");
      font-weight: 400;
    }
    @font-face {
      font-family: "Xiaolai";
      src: url("${staticFile("fonts/Xiaolai-Regular.ttf")}") format("truetype");
      font-weight: 400;
    }
    @font-face {
      font-family: "ChillRound";
      src: url("${staticFile("fonts/ChillRoundM.ttf")}") format("truetype");
      font-weight: 400;
    }
    @font-face {
      font-family: "Yozai";
      src: url("${staticFile("fonts/Yozai-Regular.ttf")}") format("truetype");
      font-weight: 400;
    }
  `}</style>
);
