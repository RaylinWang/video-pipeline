import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const input = args.find((arg) => !arg.startsWith("--")) ?? "storyboard.json";
const inputPath = path.resolve(cwd, input);
const catalogPath = path.resolve(cwd, "shot-language.catalog.json");

const fail = (message) => {
  console.error(`镜头卡校验失败：${message}`);
  process.exit(1);
};

if (!fs.existsSync(inputPath)) fail(`找不到 ${inputPath}`);
if (!fs.existsSync(catalogPath)) fail(`找不到 ${catalogPath}`);

let storyboard;
let catalog;
try {
  storyboard = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const layouts = new Map(catalog.layouts.map((item) => [item.id, item]));
const scenes = Array.isArray(storyboard.scenes) ? storyboard.scenes : [];
const shots = scenes.filter((scene) => scene?.type === "shot");
const errors = [];
const warnings = [];
const assets = new Map();
const ids = new Set();
const allowedIntents = new Set(["presenter", "explain", "evidence", "compare", "process", "conclusion", "breather", "chapter"]);
const allowedPrimary = new Set(["presenter", "screen", "document", "image", "video", "diagram", "text", "data"]);

const push = (list, scene, message) => list.push(`${scene.id ?? "未命名镜头"}：${message}`);
const finite = (value) => Number.isFinite(value);
const checkRect = (scene, rect, label) => {
  if (!rect) return;
  for (const key of ["xPct", "yPct", "widthPct", "heightPct"]) {
    if (!finite(rect[key])) push(errors, scene, `${label}.${key} 必须是数字`);
  }
  if (
    finite(rect.xPct) &&
    finite(rect.yPct) &&
    finite(rect.widthPct) &&
    finite(rect.heightPct) &&
    (rect.xPct < 0 ||
      rect.yPct < 0 ||
      rect.widthPct <= 0 ||
      rect.heightPct <= 0 ||
      rect.xPct + rect.widthPct > 100 ||
      rect.yPct + rect.heightPct > 100)
  ) {
    push(errors, scene, `${label} 必须完整落在 0–100% 画面内`);
  }
};

for (const scene of scenes) {
  if (!finite(scene?.start) || !finite(scene?.end) || scene.end <= scene.start) {
    errors.push(`${scene?.id ?? scene?.type ?? "未知镜头"}：start/end 不合法`);
  }
  if (finite(storyboard.durationSec) && finite(scene?.end) && scene.end > storyboard.durationSec) {
    errors.push(`${scene?.id ?? scene?.type ?? "未知镜头"}：结束时间超出母版时长`);
  }
}

for (const scene of shots) {
  const duration = scene.end - scene.start;
  if (!scene.id || typeof scene.id !== "string") push(errors, scene, "缺少唯一 id");
  else if (ids.has(scene.id)) push(errors, scene, "id 重复");
  else ids.add(scene.id);

  const layout = layouts.get(scene.layout);
  if (!layout) {
    push(errors, scene, `未知布局 ${String(scene.layout)}`);
    continue;
  }
  if (!allowedIntents.has(scene.intent)) push(errors, scene, `intent 不合法：${String(scene.intent)}`);
  if (!allowedPrimary.has(scene.primary)) push(errors, scene, `primary 不合法：${String(scene.primary)}`);
  if (!scene.focus || typeof scene.focus !== "string") push(errors, scene, "缺少 focus（观众该看哪里）");
  if (!scene.anchor) push(warnings, scene, "建议补 anchor，写明对应口播句子");

  const media = Array.isArray(scene.media) ? scene.media : [];
  // 只列渲染器真正响应的系统层目标；"scene" 没有对应实现，不放行
  const targetIds = new Set(["presenter", "title"]);
  // L13 的中缝手绘箭头是渲染器内置对象，beats 里用 "arrow" 控制画出时刻
  if (scene.layout === "L13") targetIds.add("arrow");
  const localIds = new Set();
  if (media.length < (layout.requiredMediaMin ?? 0)) {
    push(errors, scene, `${layout.name} 至少需要 ${layout.requiredMediaMin} 份素材`);
  }
  if (scene.layout === "L08" && media.length > 6) {
    push(warnings, scene, `证据拼贴最多渲染 6 份素材，多出的 ${media.length - 6} 份会被忽略`);
  }
  if (scene.layout === "L09" && media.length > 4) {
    push(warnings, scene, `卡片环绕最多渲染 4 份素材，多出的 ${media.length - 4} 份会被忽略`);
  }
  for (const item of media) {
    if (!item.id) push(errors, scene, "media 中有素材缺少 id");
    if (item.id && localIds.has(item.id)) push(errors, scene, `对象 id 重复：${item.id}`);
    if (item.id) {
      localIds.add(item.id);
      targetIds.add(item.id);
      targetIds.add(`${item.id}.focus`);
    }
    if (!item.src) {
      push(errors, scene, `${item.id ?? "素材"} 缺少 src`);
      continue;
    }
    const assetPath = path.resolve(cwd, "public", item.src);
    assets.set(item.src, fs.existsSync(assetPath));
    checkRect(scene, item.focus, `${item.id ?? item.src}.focus`);
    if (finite(item.atSec) && (item.atSec < 0 || item.atSec >= duration)) {
      push(errors, scene, `${item.id}.atSec 必须落在镜头时长内`);
    }
  }

  for (const item of scene.copy?.items ?? []) {
    if (localIds.has(item.id)) push(errors, scene, `对象 id 重复：${item.id}`);
    localIds.add(item.id);
    targetIds.add(item.id);
  }
  for (const label of scene.copy?.labels ?? []) {
    if (localIds.has(label.id)) push(errors, scene, `对象 id 重复：${label.id}`);
    localIds.add(label.id);
    targetIds.add(label.id);
  }
  for (const node of scene.diagram?.nodes ?? []) {
    if (localIds.has(node.id)) push(errors, scene, `对象 id 重复：${node.id}`);
    localIds.add(node.id);
    targetIds.add(node.id);
  }

  if (layout.requiresCutout) {
    if (!scene.presenter?.cutoutPrefix || !scene.presenter?.cutoutCount) {
      push(errors, scene, `${layout.name} 需要 presenter.cutoutPrefix 和 cutoutCount`);
    }
    if (strict && scene.presenter?.cutoutPrefix) {
      const firstCutout = path.resolve(cwd, "public", `${scene.presenter.cutoutPrefix}001.png`);
      if (!fs.existsSync(firstCutout)) push(errors, scene, `严格模式找不到人物抠像首帧：${firstCutout}`);
    }
  }
  if (layout.requiresItems && !scene.diagram?.nodes?.length && !scene.copy?.items?.length) {
    push(errors, scene, `${layout.name} 需要 diagram.nodes 或 copy.items`);
  }
  if (layout.requiresTitle && !scene.copy?.title) {
    push(errors, scene, `${layout.name} 需要 copy.title`);
  }

  if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
    push(errors, scene, "beats 至少写一步，明确先/再/最后");
  } else {
    for (const beat of scene.beats) {
      if (!finite(beat.atSec) || beat.atSec < 0 || beat.atSec >= duration) {
        push(errors, scene, `beat ${beat.target ?? "未命名"} 的 atSec 超出镜头`);
      }
      if (!beat.target || !beat.action) push(errors, scene, "beat 必须包含 target 和 action");
      if (beat.target && !targetIds.has(beat.target)) {
        push(warnings, scene, `beat target “${beat.target}” 没有对应的素材、节点、标签或系统层`);
      }
    }
  }

  if (scene.layout === "L04" && scene.presenter?.form === "avatar") {
    push(warnings, scene, "L04 是圆角矩形人物窗；若确实要圆头像请改用 L05");
  }
  if (scene.layout === "L05" && scene.presenter?.form === "window") {
    push(warnings, scene, "L05 是圆头像；若要圆角矩形人物窗请改用 L04");
  }
  if (scene.copy?.title && scene.copy.title.length > 28) {
    push(warnings, scene, "主标题超过 28 个字，建议拆成两镜或改为注释");
  }
}

const ordered = [...shots].sort((a, b) => a.start - b.start);
for (let i = 1; i < ordered.length; i += 1) {
  if (ordered[i].start < ordered[i - 1].end) {
    warnings.push(`${ordered[i - 1].id} 与 ${ordered[i].id} 时间重叠；确认是否故意叠层`);
  }
}

for (const shot of shots) {
  // tree_toc 是常驻目录 overlay，设计上就横跨所有镜头，不算重叠
  for (const legacy of scenes.filter(
    (scene) => scene?.type !== "shot" && scene?.type !== "talk" && scene?.type !== "tree_toc",
  )) {
    if (shot.start < legacy.end && legacy.start < shot.end) {
      warnings.push(`${shot.id} 与旧镜头 ${legacy.type}(${legacy.start}–${legacy.end}) 重叠；确认图层与压暗不会叠加`);
    }
  }
}

if (strict) {
  for (const [src, exists] of assets) {
    if (!exists) errors.push(`严格模式缺少素材：public/${src}`);
  }
  for (const key of ["master", "transcript"]) {
    const src = storyboard[key];
    if (!src || !fs.existsSync(path.resolve(cwd, "public", src))) {
      errors.push(`严格模式缺少 ${key}：public/${src ?? "未填写"}`);
    }
  }
}

console.log(`镜头语言目录：v${catalog.version}`);
console.log(`分镜文件：${inputPath}`);
console.log(`校验模式：${strict ? "渲染前严格模式" : "规划模式（允许素材待补）"}`);
console.log(`语义镜头卡：${shots.length} 个`);
for (const scene of ordered) {
  const layout = layouts.get(scene.layout);
  console.log(
    `${scene.id.padEnd(12)} ${scene.start.toFixed(2).padStart(7)}–${scene.end.toFixed(2).padEnd(7)} ${scene.layout} ${layout?.name ?? "未知"}｜${scene.focus}`,
  );
}

if (assets.size > 0) {
  console.log("\n素材清单：");
  for (const [src, exists] of assets) console.log(`${exists ? "✓ 已有" : "○ 待补"} public/${src}`);
}
if (warnings.length > 0) {
  console.log("\n提醒：");
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length > 0) {
  console.error("\n错误：");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const missingAssetCount = [...assets.values()].filter((exists) => !exists).length;
console.log(
  missingAssetCount > 0
    ? `\n结构校验通过；还有 ${missingAssetCount} 份素材待补。`
    : "\n校验通过。可进入 Remotion Studio 预览。",
);
