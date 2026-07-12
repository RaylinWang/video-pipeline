import React from "react";
import { AbsoluteFill } from "remotion";
import catalog from "../../shot-language.catalog.json";

const PRESENTER = "#ff7a1a";
const MEDIA = "#e9f2ff";
const MEDIA_2 = "#b8d4ff";
const STAGE = "#111722";

const Box: React.FC<{
  left: string;
  top: string;
  width: string;
  height: string;
  color?: string;
  radius?: number | string;
  label?: string;
}> = ({ left, top, width, height, color = MEDIA, radius = 7, label }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      borderRadius: radius,
      background: color,
      border: "1px solid rgba(255,255,255,.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: color === PRESENTER ? "#1a0d02" : "#243247",
      fontSize: 12,
      fontWeight: 800,
    }}
  >
    {label}
  </div>
);

const Diagram: React.FC<{ id: string }> = ({ id }) => (
  <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
    {id === "L01" && (
      <>
        <Box left="3%" top="4%" width="94%" height="92%" color="#392113" label="原片人物画面" />
        <Box left="38%" top="9%" width="24%" height="84%" color={PRESENTER} label="人物" />
      </>
    )}
    {id === "L02" && (
      <>
        <Box left="3%" top="9%" width="36%" height="82%" color={PRESENTER} label="人物" />
        <Box left="43%" top="9%" width="54%" height="82%" label="素材" />
      </>
    )}
    {id === "L03" && (
      <>
        <Box left="3%" top="9%" width="54%" height="82%" label="素材" />
        <Box left="61%" top="9%" width="36%" height="82%" color={PRESENTER} label="人物" />
      </>
    )}
    {id === "L04" && (
      <>
        <Box left="3%" top="5%" width="94%" height="90%" label="主素材" />
        <Box left="75%" top="43%" width="19%" height="44%" color={PRESENTER} radius={9} label="人物窗" />
      </>
    )}
    {id === "L05" && (
      <>
        <Box left="3%" top="5%" width="94%" height="90%" label="主素材" />
        <Box left="80%" top="58%" width="14%" height="30%" color={PRESENTER} radius="50%" label="头像" />
      </>
    )}
    {id === "L06" && <Box left="2%" top="4%" width="96%" height="92%" label="全屏素材" />}
    {id === "L07" && (
      <>
        <Box left="3%" top="10%" width="45%" height="80%" label="A" />
        <Box left="52%" top="10%" width="45%" height="80%" color={MEDIA_2} label="B" />
      </>
    )}
    {id === "L08" && (
      <>
        <Box left="4%" top="9%" width="42%" height="37%" label="证据 1" />
        <Box left="52%" top="7%" width="43%" height="36%" color={MEDIA_2} label="证据 2" />
        <Box left="26%" top="51%" width="48%" height="38%" label="证据 3" />
      </>
    )}
    {id === "L09" && (
      <>
        <Box left="37%" top="10%" width="26%" height="80%" color={PRESENTER} label="人物" />
        <Box left="3%" top="10%" width="25%" height="28%" label="卡片" />
        <Box left="72%" top="10%" width="25%" height="28%" color={MEDIA_2} label="卡片" />
        <Box left="3%" top="61%" width="25%" height="28%" color={MEDIA_2} label="卡片" />
        <Box left="72%" top="61%" width="25%" height="28%" label="卡片" />
      </>
    )}
    {id === "L10" && (
      <>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "32%", color: "#fff", fontSize: 32, fontWeight: 950, textAlign: "center" }}>
          后置大字
        </div>
        <Box left="37%" top="8%" width="27%" height="84%" color={PRESENTER} label="人物前景" />
      </>
    )}
    {id === "L11" && (
      <>
        {[8, 31, 54, 77].map((left, i) => (
          <React.Fragment key={left}>
            <Box left={`${left}%`} top="36%" width="15%" height="30%" color={i === 1 ? PRESENTER : MEDIA} label={`STEP ${i + 1}`} />
            {i < 3 && <div style={{ position: "absolute", left: `${left + 16}%`, top: "49%", width: "7%", height: 3, background: PRESENTER }} />}
          </React.Fragment>
        ))}
      </>
    )}
    {id === "L12" && (
      <>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "27%", color: "#fff", fontSize: 36, fontWeight: 950, textAlign: "center" }}>
          一句核心结论
        </div>
        <div style={{ position: "absolute", left: "39%", top: "64%", width: "22%", height: 5, borderRadius: 3, background: PRESENTER }} />
      </>
    )}
    {id === "L13" && (
      <>
        <Box left="38%" top="9%" width="24%" height="84%" color={PRESENTER} label="人物" />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)" }} />
        <Box left="4%" top="22%" width="37%" height="56%" label="简笔画A" />
        <Box left="59%" top="22%" width="37%" height="56%" color={MEDIA_2} label="简笔画B" />
        <div style={{ position: "absolute", left: "43.5%", top: "48.5%", width: "11%", height: 4, borderRadius: 2, background: PRESENTER }} />
        <div
          style={{
            position: "absolute",
            left: "54%",
            top: "46%",
            width: 0,
            height: 0,
            borderLeft: `9px solid ${PRESENTER}`,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
          }}
        />
      </>
    )}
  </div>
);

export const ShotLanguageCatalog: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(135deg,#070a10,#111722)",
      color: "#fff",
      padding: "32px 42px 36px",
      fontFamily: '"PingFang SC", sans-serif',
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
      <div>
        <div style={{ fontSize: 38, fontWeight: 900 }}>原子镜头语言目录</div>
        <div style={{ color: "rgba(255,255,255,.62)", fontSize: 18, marginTop: 5 }}>
          先选 L 编号，再改人物位置、素材焦点和展开顺序
        </div>
      </div>
      <div style={{ fontFamily: "monospace", color: PRESENTER, fontSize: 20 }}>SHOT LANGUAGE v{catalog.version}</div>
    </div>

    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: 18,
      }}
    >
      {catalog.layouts.map((layout) => (
        <div
          key={layout.id}
          style={{
            minHeight: 0,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.045)",
            padding: 11,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, minHeight: 0, borderRadius: 9, background: STAGE, overflow: "hidden" }}>
            <Diagram id={layout.id} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <span style={{ color: PRESENTER, fontFamily: "monospace", fontSize: 20, fontWeight: 900 }}>{layout.id}</span>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{layout.name}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 2 }}>{layout.short}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
