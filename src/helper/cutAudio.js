import { fetchFile } from "@ffmpeg/ffmpeg";

import { loadFFMPEG } from "../services/loadFFMPEG"
import converterTime from "./converterTime";

const cutAudio = async ({ file, startTime, endTime }) => {
    const REGEX = /^(.+)\.\w+$/;
    const fileOutputName = `${file.name.match(REGEX)[1]}(media_cut).mp3`;

    // load ffmpeg
    const ffmpeg = await loadFFMPEG();

    // Write the file to memory
    ffmpeg.FS("writeFile", file.name, await fetchFile(file));

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
    const audioFile = new File([data.buffer], fileOutputName, { type: "audio/mpeg" })

    // Create a URL
    const audioUrl = URL.createObjectURL(audioFile);

    return {
        url: audioUrl,
        name: fileOutputName,
        file: audioFile
    }
}

export default cutAudio