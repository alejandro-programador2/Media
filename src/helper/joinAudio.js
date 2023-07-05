import { fetchFile } from "@ffmpeg/ffmpeg";
import { loadFFMPEG } from "../services/loadFFMPEG"
import cutAudio from "./cutAudio";


const joinAudio = async ({ files }) => {
    const audioFiles = [];
    let filterComplex = "";

    // Cut the audio files
    for (const audio of files) {
        const { file } = await cutAudio({
            file: audio.file,
            startTime: audio.startTime,
            endTime: audio.endTime,
        });
        audioFiles.push(file);
    }

    // Load ffmpeg
    const ffmpeg = await loadFFMPEG();

    // Write the audio files to memory
    for (let i = 0; i < audioFiles.length; i++) {
        ffmpeg.FS("writeFile", `input${i}.mp3`, await fetchFile(audioFiles[i]));
    }

    // Make the "filter complex" configuration
    for (let i = 0; i < audioFiles.length; i++) {
        filterComplex += `[${i}:a]`;
    }

    filterComplex += `concat=n=${audioFiles.length}:v=0:a=1[a]`;

    const inputArgs = audioFiles.map((_, i) => `input${i}.mp3`);

    /**
     * Link together the audio files.
     * We need to create the next query:
     * @example: 
     *  ffmpeg -i input0.mp3 -i input1.mp3 -i input2.mp3 -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]" -map "[a]" output.mp3
     */
    await ffmpeg.run(...inputArgs.map(arg => ['-i', arg]).flat(), '-filter_complex', filterComplex, '-map', '[a]', 'output.mp3');

    // Read the file result
    const data = ffmpeg.FS("readFile", "output.mp3");

    // Create a URL
    const audioUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'audio/mpeg' })
    );

    return { url: audioUrl, name: "media_join.mp3" }
}

export default joinAudio