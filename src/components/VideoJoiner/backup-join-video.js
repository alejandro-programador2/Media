import { fetchFile } from "@ffmpeg/ffmpeg";
import { loadFFMPEG } from "../services/loadFFMPEG"
import cutVideo from "./cutVideo";


const joinVideo = async ({ files }) => {
    const videoFiles = [];
    let filterComplex = "";
    let filterMap = "[v]";

    // Cut the audio files
    for (const video of files) {
        const { file } = await cutVideo({
            file: video.file,
            startTime: video.startTime,
            endTime: video.endTime,
        });
        videoFiles.push(file);
    }

    // Load ffmpeg
    const ffmpeg = await loadFFMPEG();

    // Define las dimensiones objetivo
    const targetWidth = 640;
    const targetHeight = 480;

    // Calcula el filtro pad basado en las dimensiones objetivo
    const padFilter = `pad=width=${targetWidth}:height=${targetHeight}:x=(ow-iw)/2:y=(oh-ih)/2:color=black`;
    // Aplica el filtro pad a los videos y escribe los archivos modificados en memoria
    for (let i = 0; i < videoFiles.length; i++) {

        // Write the video files to memory
        ffmpeg.FS("writeFile", `input${i}.mp4`, await fetchFile(videoFiles[i]));

        const ffprobeResult = await ffmpeg.run(
            '-i', `input${i}.mp4`,
            '-v', 'error'
        );

        // Find the video stream information in the FFprobe output
        const streamInfo = ffprobeResult.stderr.match(/Stream #[0-9]+\.[0-9]+[^\n]*Video: [^,]+, ([0-9]+)x([0-9]+)/);

        const shouldPad = streamInfo && streamInfo.length === 3 &&
            (parseInt(streamInfo[1]) !== targetWidth || parseInt(streamInfo[2]) !== targetHeight);

        const paddedVideo = `padded_${i}.mp4`;


        // Apply the pad filter if necessary
        if (shouldPad) {
            await ffmpeg.run(
                '-i', `input${i}.mp4`,
                '-vf', padFilter,
                paddedVideo
            );
        } else {
            // No need to pad, copy the original video
            await ffmpeg.run('-i', `input${i}.mp4`, '-c', 'copy', paddedVideo);
        }

        // Use the padded video for further processing
        videoFiles[i] = paddedVideo;

        filterComplex += `[${i}:v][${i}:a]`;
        filterMap += `[a${i}]`;
    }

    filterComplex += `concat=n=${videoFiles.length}:v=1:a=${videoFiles.length}[v][a]`;


    const inputArgs = videoFiles.map((_, i) => `input${i}.mp3`);

    /**
     * Link the audio files together.
     * We need to create the following query:
     * @example: 
     *  ffmpeg -i input1.mp4 -i input2.mp4 -i input3.mp4 -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4
     */
    await ffmpeg.run(...inputArgs, '-filter_complex', filterComplex, '-map', filterMap, '-c:v', 'libx264', '-c:a', 'aac', 'output.mp4');

    // Read the file result
    const data = ffmpeg.FS("readFile", "output.mp4");

    // Create a URL
    const audioUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
    );

    return { url: audioUrl, name: "media_video_join.mp4" }
}

export default joinVideo

const joinVideo = async ({ files }) => {
    const videoFiles = [];
    let filterComplex = "";

    // Define las dimensiones objetivo y el frame rate objetivo
    const targetWidth = 640;
    const targetHeight = 480;
    const targetFrameRate = 30; // Ajusta esto al valor deseado


    // Cut the audio files and normalize dimensions and frame rate
    for (const video of files) {
        const { file } = await cutVideo({
            file: video.file,
            startTime: video.startTime,
            endTime: video.endTime,
        });

        videoFiles.push(file);
    }


    // Load ffmpeg
    const ffmpeg = await loadFFMPEG();

    for (let i = 0; i < videoFiles.length; i++) {
        const normalizedVideo = `normalized_${i}.mp4`;


        // Write the video files to memory
        ffmpeg.FS("writeFile", `input${i}.mp4`, await fetchFile(videoFiles[i]));


        await ffmpeg.run(
            '-i', `input${i}.mp4`,
            '-vf', `scale=${targetWidth}:${targetHeight}`,
            normalizedVideo
        );

        videoFiles[i] = normalizedVideo;

        // Configure the "filter complex"
        filterComplex += `[${i}:v][${i}:a]`;
    }

    filterComplex += `concat=n=${videoFiles.length}:v=1:a=1[v][a]`;

    const inputArgs = videoFiles.map((_, i) => `input${i}.mp4`);

    /**
     * Link the audio files together.
     * We need to create the following query:
     * @example: 
     *  ffmpeg -i input0.mp3 -i input1.mp3 -i input2.mp3 -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]" -map "[a]" output.mp3
     */
    // ffmpeg -i input1.mp4 -i input2.mp4 -i input3.mp4 -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4
    // ffmpeg -i input1.mp4 -i input2.wmv -filter_complex "[0:0][0:1][1:0][1:1]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output.mp4
    await ffmpeg.run(...inputArgs.map(arg => ['-i', arg]).flat(), '-filter_complex', filterComplex, '-map', '[v]', '-map', '[a]', 'output.mp4');

    // Read the file result
    const data = ffmpeg.FS("readFile", "output.mp4");

    // Create a URL
    const audioUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
    );

    return { url: audioUrl, name: "media_video_join.mp4" }
}

export default joinVideo