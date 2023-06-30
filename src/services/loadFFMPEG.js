import { createFFmpeg } from "@ffmpeg/ffmpeg";

export const loadFFMPEG = async () => {
    const FFMPEG_CONFIGURATION = Object.freeze({
        log: true,
        mainName: "main",
        corePath: "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js",
    });

    const ffmpeg = createFFmpeg(FFMPEG_CONFIGURATION);
    await ffmpeg.load();

    return ffmpeg
}