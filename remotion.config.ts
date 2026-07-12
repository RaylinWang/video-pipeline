import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 渲染并发按机器性能调，M系列芯片可以开高
// Config.setConcurrency(4); // 按本机核数调，M系列可开4-8
