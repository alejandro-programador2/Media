import { useState, useRef, useCallback, useEffect } from "react";
import { FileAudio } from "../FileAudio";

import css from './VideoCutter.module.css'

function useResize(ref) {
  const [isResizing, setisResizing] = useState(false);
  const [styles, setStyles] = useState({ width: "400px" });

  const resizeOptions = useRef({});

  const isValidElement = (element) =>
    typeof element === "string" ||
    typeof element === "undefined" ||
    typeof element !== "object";

  const validateResizeSideData = useCallback(() => {
    if (!ref.current.querySelector('[data-resize-side="true"]')) {
      throw new Error(
        'You need to put the "data-resize-side" prop in someone element.'
      );
    }
  }, [ref]);

  useEffect(() => {
    if (isValidElement(ref) || validateResizeSideData() instanceof Error)
      return;

    const { current: element } = ref;

    const onPointerMove = ({ clientX }) => {
      if (!isResizing) return;
      console.log("onPointerMove", isResizing);

      setStyles((prevStyles) => {
        const { start, width } = resizeOptions.current;

        const deltaX = clientX - start;
        const newWidth = `${width + deltaX}px`;

        return {
          ...prevStyles,
          width: newWidth,
        };
      });
    };

    const onPointerDown = (event) => {
      if (!event.srcElement.dataset?.resizeSide) return;
      console.log("onPointerDown", isResizing);

      resizeOptions.current = {
        start: event.clientX,
        width: parseInt(styles.width),
      };

      setisResizing(true);
    };

    const onPointerUp = () => {
      if (isResizing) {
        console.log("onPointerUp", isResizing);
        setisResizing(!isResizing);
      }
    };

    // Agregar escuchadores de eventos
    element.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);

    return () => {
      element.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
    };
  }, [ref, isResizing, validateResizeSideData, styles.width]);

  return {
    styles,
  };
}

export function VideoCutter() {
  const [file, setFile] = useState();
  const [frames, setFrames] = useState([]);
  const [width, setWidth] = useState(0)

  const videoRef = useRef();
  const canvasRef = useRef();
  const containerRef = useRef();


  useEffect(() => {
    if (containerRef.current) {
      // console.log(containerRef.current.clientWidth)
      setWidth(containerRef.current.clientWidth)
    }
  }, [containerRef.current?.clientWidth])

  const handleFile = (file) => {
    setFile(...file);
  };

  const drawFrame = (video, canvas, ctx, width, height, timeInSeconds) => {
    return new Promise((resolve) => {
      const onTimeUpdateHandler = () => {
        ctx.drawImage(video, 0, 0, width, height);
        video.removeEventListener("timeupdate", onTimeUpdateHandler);

        const frameDataUrl = canvas.toDataURL();

        resolve({
          id: crypto.randomUUID(),
          url: frameDataUrl,
        });
      };

      video.addEventListener("timeupdate", onTimeUpdateHandler);
      video.currentTime = timeInSeconds;
    });
  };

  const handleFrames = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    console.log(containerRef.current.clientWidth)

    const SIZE_SCREENSHOT= 96
    const durationInSeconds = video.duration;

    const minPxPerSec = containerRef.current.clientWidth / durationInSeconds;
    const frameRate = SIZE_SCREENSHOT / minPxPerSec;

    const duration = Array.from(
      { length: Math.floor(durationInSeconds / frameRate) },
      (_, i) => i * frameRate
    );

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

    setFrames(frames);
    video.currentTime = 1;
  };

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
          <div className="relative border-[color:var(--clr-body)] border-4 rounded-md py-2 overflow-hidden" ref={containerRef}>
            <ul className="flex wrapper overflow-x-auto snap-x">
              {frames.map(({ id, url }) => (
                <li key={id} className="w-24 shrink-0 grow-0">
                  <img src={url} alt="" className="w-full h-auto block" />
                </li>
              ))}
            </ul>

            <ResizeAudio/>

            <canvas
              ref={canvasRef}
              width="640px"
              height="360px"
              className="hidden"
            />
          </div>
        </>
      )}
    </div>
  );
}

function ResizeAudio() {
  const containerRef = useRef();
  const { styles } = useResize(containerRef);

  return (
    <div ref={containerRef} className={css.resize} style={{ ...styles }}>
      <span data-resize-side className={css.resize__side}></span>
      <span data-resize-side className={css.resize__side}></span>
    </div>
  );
}
