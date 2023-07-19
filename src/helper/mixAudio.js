import { fetchFile } from "@ffmpeg/ffmpeg";
import { loadFFMPEG } from "../services/loadFFMPEG";


function segundosAMilisegundos(segundos) {
    return Math.floor(segundos) * 1000;
  }

const mixAudio = async ({ files }) => {
    const audioFiles = [...files]
    console.log("🚀 ~ file: mixAudio.js:11 ~ mixAudio ~ audioFiles:", audioFiles)
    let filterComplex = "";

    // load ffmpeg
    const ffmpeg = await loadFFMPEG()

    // Write the audio files to memory
    for (let i = 0; i < audioFiles.length; i++) {
        ffmpeg.FS("writeFile", `input${i}.mp3`, await fetchFile(audioFiles[i].file));
    }

    // Configure the "filter complex"
    for (let i = 0; i < audioFiles.length; i++) {
        filterComplex += `[${i}:a]adelay=${segundosAMilisegundos(audioFiles[i].startTime)}|${segundosAMilisegundos(audioFiles[i].endTime)}[${i}a];`;
    }

    for (let i = 0; i < audioFiles.length; i++) {
        filterComplex += `[${i}a]`;
    }

    filterComplex += `amix=inputs=${audioFiles.length}:duration=first:dropout_transition=${audioFiles.length}`;

    const inputArgs = audioFiles.map((_, i) => `input${i}.mp3`);

    /**
    * Link the audio files together.
    * We need to create the following query:
    * @example: 
    *  ffmpeg -i input1.mp3 -i input2.mp3 -i input3.mp3 -filter_complex "[0:a]adelay=1000|1000[0a]; [1:a]adelay=2000|2000[1a]; [2:a]adelay=3000|3000[2a]; [0a][1a][2a]amix=inputs=3:duration=first:dropout_transition=3" output.mp3
    */
    await ffmpeg.run(...inputArgs.map(arg => ['-i', arg]).flat(), '-filter_complex', filterComplex, 'output.mp3');

    // Read the file result
    const data = ffmpeg.FS("readFile", "output.mp3");

    // Create a URL
    const audioUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'audio/mpeg' })
    );

    return { url: audioUrl, name: "media_mix.mp3" }
}


export default mixAudio