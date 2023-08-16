import { useState, useRef } from "react";
import { FileAudio } from "../FileAudio";
// import { createWorkerFactory, useWorker } from "@shopify/react-web-worker";

// const createWorker = createWorkerFactory(() => import('./frame'));

export function VideoCutter() {
  const [file, setFile] = useState();
  const [frames, setFrames] = useState([]);

  const videoRef = useRef();
  const canvasRef = useRef();

  const handleFile = (file) => {
    setFile(...file);
  };

  const drawFrame = (video, canvas, ctx, width, height, timeInSeconds) => {
    return new Promise((resolve) => {
      const onTimeUpdateHandler = () => {
        ctx.drawImage(video, 0, 0, width, height);
        video.removeEventListener("timeupdate", onTimeUpdateHandler);
        resolve(canvas.toDataURL());
      };

      video.addEventListener("timeupdate", onTimeUpdateHandler);
      video.currentTime = timeInSeconds;
    });
  };

  const handleFrames = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const durationInSeconds = video.duration;
    const frameRate = 10;

    const duration = Array.from(
      { length: Math.floor(durationInSeconds / frameRate) },
      (_, i) => i * frameRate
    );

    // const audioFrames = duration.map(async (timeInSeconds) => {
    //   return
    // });

    const frames = [];
    for (const timeInSeconds of duration) {
      const frame = await drawFrame(
        video,
        canvas,
        ctx,
        canvas.width,
        canvas.height,
        timeInSeconds
      );
      frames.push(frame);
    }

    console.log(frames);

    // setFrames([...(await Promise.all(audioFrames))]);
    setFrames(frames);
    video.currentTime = 0.01;
  };

  // const frame = useMemo(() => {
  //   return new Worker(new URL("./frame.js", import.meta.url));
  // }, []);



  // useEffect(() => {
  //   if (window.Worker) {
  //     console.log("🚀", frame);
  //     frame.postMessage('Message to worker');

  //     frame.onmessage = (e) => {
  //       console.log(e.data);
  //     };
  //   }

  //   return () => {
  //     frame.terminate();
  //   };
  // }, [frame]);
  // const worker = useWorker(createWorker);
  // useEffect(() => {
  //   (async () => {
  //     // Note: in your actual app code, make sure to check if Home
  //     // is still mounted before setting state asynchronously!
  //     const webWorkerMessage = await worker.hello('Tobi');
  //     console.log(webWorkerMessage)
  //   })();
  // }, [worker]);

  return (
    <div className="flow">
      {!file ? (
        <FileAudio onFile={handleFile} accept="video/mp4" />
      ) : (
        <>
          <video
            preload="auto"
            src={file?.url}
            ref={videoRef}
            controls
            className="aspect-video m-auto"
            onLoadedData={handleFrames}
          ></video>
          <div className="flex overflow-x-scroll w-full justify-items-center">
            {frames.map((frameDataUrl, index) => (
              <img
                key={index}
                src={frameDataUrl}
                alt=""
                className="w-28 m-auto"
              />
            ))}
          </div>
          <canvas
            ref={canvasRef}
            width="640px"
            height="360px"
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
