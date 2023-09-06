import { fetchFile } from "@ffmpeg/ffmpeg";
import { loadFFMPEG } from "../services/loadFFMPEG"
import cutVideo from "./cutVideo";


const joinVideo = async ({ files }) => {
    const targetWidth = 1280;
    const targetHeight = 720;

    const ffmpeg = await loadFFMPEG();
    const scaledFiles = [];
    let filterComplex = "";

    try {
        // Asegurémonos de que todos los videos tengan la misma tasa de fotogramas
        let commonFrameRate = null;

        // Cut the audio files
        for (let i = 0; i < files.length; i++) {
            const { file } = await cutVideo({
                file: files[i].file,
                startTime: files[i].startTime,
                endTime: files[i].endTime,
            });

            const scaledFileName = `scaled_${i}.mp4`;

            ffmpeg.FS("writeFile", `input${i}.mp4`, await fetchFile(file));

            try {
                await ffmpeg.run(
                    '-i', `input${i}.mp4`,
                    '-vf', `scale=${targetWidth}:${targetHeight}`,
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-strict', 'experimental',
                    '-r', commonFrameRate || '30', // Establecer la tasa de fotogramas
                    scaledFileName
                );
            } catch (error) {
                console.log(error);
            }


            // Obtener la tasa de fotogramas del video escalado
            const ffprobeData = await ffmpeg.run('-i', scaledFileName);

            if (ffprobeData && ffprobeData.stderr) {
                const frameRateMatch = ffprobeData.stderr.match(/(\d+(\.\d+)? fps)/);
                if (frameRateMatch) {
                    commonFrameRate = parseFloat(frameRateMatch[1]);
                }
            }

            scaledFiles.push(scaledFileName);

            // Agrega los videos redimensionados al filtro complex
            filterComplex += `[${i}:v][${i}:a]`;
        }

        // Configura la cadena de filtro complex para la concatenación
        filterComplex += `concat=n=${files.length}:v=1:a=1[v][a]`;

        // Ejecuta FFmpeg con los argumentos actualizados
        await ffmpeg.run(
            ...scaledFiles.map(arg => ['-i', arg]).flat(),
            '-filter_complex', filterComplex,
            '-map', '[v]', '-map', '[a]',
            'output.mp4'
        );

        // Lee el resultado del archivo
        const data = ffmpeg.FS("readFile", "output.mp4");

        // Crea una URL para el video de salida
        const videoUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

        return { url: videoUrl, name: "media_video_join.mp4" };
    } catch (error) {
        console.error(error);
        return { url: null, name: null };
    }
};




// const joinVideo = async ({ files }) => {
//     const videoFiles = [];
//     let filterComplex = "";

//     const targetWidth = 1280;
//     const targetHeight = 720;

//     // Cut the audio files
//     for (const video of files) {
//         const { file } = await cutVideo({
//             file: video.file,
//             startTime: video.startTime,
//             endTime: video.endTime,
//         });
//         videoFiles.push(file);
//     }

//     const ffmpeg = await loadFFMPEG();

//     // Cut the audio files and normalize dimensions and frame rate    
//     for (let i = 0; i < videoFiles.length; i++) {

//         // Write the video files to memory       
//        await ffmpeg.FS("writeFile", `input${i}.mp4`, await fetchFile(videoFiles[i]));

//         // Configure the "filter complex" correctly    
//         if (i !== 0) {
//             filterComplex += ';';
//         }

//         filterComplex += `[${i}:v][${i}:a]`;
//     }

//     for (let i = 0; i < videoFiles.length; i++) {
//         try {
//             await ffmpeg.run(
//                 '-i', ` input${i}.mp4`,
//                 '-vf', `scale=${targetWidth}:${targetHeight}`,
//                 `scaled_${i}.mp4`
//             );
//         } catch (error) {
//             console.log(error)
//         }

//         videoFiles[i] = `scaled_${i}.mp4`
//     }

//     filterComplex += `concat=n=${files.length}:v=1:a=1[v][a]`;

//     const inputArgs = videoFiles.map((file) => `-i ${file}`).join(' ');

//     console.log("🚀 ~ file: joinVideo.js:57 ~ joinVideo ~ inputArgs:", inputArgs)
//     /**   
//      *   * Link the video files together.   
//      *   * We need to create the following query:    
//      * * @example:   
//      *   *  ffmpeg -i input0.mp4 -i input1.mp4 -i input2.mp4 -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4     */
//     await ffmpeg.run(`${inputArgs} -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4`);


//     // Read the file result    

//     const data = ffmpeg.FS("readFile", "output.mp4");

//     // Create a URL   
//     const videoUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

//     return { url: videoUrl, name: "media_video_join.mp4" };
// }

export default joinVideo