import { fetchFile } from "@ffmpeg/ffmpeg";

import { loadFFMPEG } from "../services/loadFFMPEG"
import converterTime from "./converterTime";

const cutVideo = async ({ file, startTime, endTime }) => {
    const REGEX = /^(.+)\.\w+$/;
    const fileOutputName = `${file.name.match(REGEX)[1]}(media_video_cut).mp4`;

    // load ffmpeg
    const ffmpeg = await loadFFMPEG();

    // Write the file to memory
    ffmpeg.FS("writeFile", file.name, await fetchFile(file));
    
    console.log(fileOutputName)
    // Run the FFMpeg command
    await ffmpeg.run(
        "-i",
        file.name,
        "-ss",
        converterTime(startTime),
        "-to",
        converterTime(endTime),
        fileOutputName
    );

    // Read the result
    const data = ffmpeg.FS("readFile", fileOutputName);

    // create the file
    const videoFile = new File([data.buffer], fileOutputName, { type: "video/mp4" })

    // Create a URL
    const videoUrl = URL.createObjectURL(videoFile);

    return {
        url: videoUrl,
        name: fileOutputName,
        file: videoFile
    }
}

export default cutVideo