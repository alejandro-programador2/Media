import { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

import { FileAudio } from "../FileAudio";
import cutVideo from "../../helper/cutVideo";

import css from "./VideoCutter.module.css";

function useResize(elementRef) {
  const [styles, setStyles] = useState({ left: "0%", right: "0%" });

  const startXRef = useRef(0);
  const isResizingRef = useRef(false);

  const threshold = 10;

  const isValidElement = (element) =>
    typeof element === "string" ||
    typeof element === "undefined" ||
    typeof element !== "object";

  const validateResizeSideData = useCallback(() => {
    if (
      !elementRef.current.querySelector('[data-resize-side="left"]') ||
      !elementRef.current.querySelector('[data-resize-side="right"]')
    ) {
      throw new Error(
        'You need to put the "data-resize-side" prop in someone element.'
      );
    }
  }, [elementRef]);

  const onPointerDown = (event) => {
    if (event?.button === 2) return;
    if (!event.target.dataset?.resizeSide) return;

    event.stopPropagation();
    event.preventDefault();

    isResizingRef.current = true;
    startXRef.current = event.clientX;

    const handle = event.srcElement.dataset.resizeSide;

    const onPointerMove = (event) => {
      event.stopPropagation();
      event.preventDefault();

      const x = event.clientX;

      setStyles((prevStyles) => {
        const { left, right } = prevStyles;
        const start = parseFloat(left);
        const end = parseFloat(right);

        if (Math.abs(x - startXRef.current) >= threshold) {
          const sizeParentElement =
            document.querySelector("div#container").clientWidth;
          const totalDuration = document.querySelector("video").duration;

          const deltaX = x - startXRef.current;
          const deltaSeconds = (deltaX / sizeParentElement) * totalDuration;

          const newLeft =
            handle === "left"
              ? ((start + deltaSeconds) / totalDuration) * 100
              : start;

          const newRight =
            handle === "right"
              ? ((totalDuration - (end + deltaSeconds)) / totalDuration) * 100
              : end;

          return {
            ...styles,
            left: `${newLeft}%`,
            right: `${newRight}%`,
          };
        }
        return prevStyles;
      });

      // Update the startX reference
      startXRef.current = x / 2;
    };

    const onPointerUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      }
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  useEffect(() => {
    if (isValidElement(elementRef) || validateResizeSideData() instanceof Error)
      return;

    // Agregar escuchadores de eventos
    elementRef.current.addEventListener("pointerdown", onPointerDown);

    return () => {
      elementRef.current?.removeEventListener("pointerdown", onPointerDown);
    };
  }, [elementRef]);

  return {
    styles,
  };
}

export function VideoCutter() {
  const [file, setFile] = useState();
  const [frames, setFrames] = useState([]);

  const videoRef = useRef();
  const canvasRef = useRef();
  const containerRef = useRef();
  const resizeRef = useRef({});

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

    const SIZE_SCREENSHOT = 96;
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

    setFrames(frames);
    video.currentTime = 1;
  };

  const handleResize = ({ offsetLeft, width }) => {
    resizeRef.current = {
      start: offsetLeft,
      width,
    };
  };

  const createDownloadAudioLink = ({ url, name }) => {
    const downloadAudio = document.createElement("a");
    downloadAudio.href = url;
    downloadAudio.style.display = "none";

    downloadAudio.setAttribute("download", name);
    downloadAudio.click();
  };

  const exportVideoFile = async () => {
    try {
      const PixelPerSecond =
        containerRef.current.clientWidth / videoRef.current.duration;
      const startTime = resizeRef.current.start / PixelPerSecond;
      const endTime = resizeRef.current.width / PixelPerSecond + startTime;

      // Mix the audio with the main audio file and other tracks
      const newAudio = await cutVideo({
        file: file.file,
        startTime,
        endTime,
      });

      // Create a link to download the new audio
      createDownloadAudioLink(newAudio);
    } catch (error) {
      console.log(error);
    }
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
          <div
            id="container"
            className="relative border-[color:var(--clr-body)] border-4 rounded-md overflow-hidden"
            ref={containerRef}
          >
            <Tracker videoRef={videoRef.current} />

            <ul className="flex wrapper overflow-x-auto snap-x pointer-events-none">
              {frames.map(({ id, url }) => (
                <li
                  key={id}
                  className="w-24 shrink-0 grow-0 pointer-events-none"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-auto block pointer-events-none "
                  />
                </li>
              ))}
            </ul>

            <ResizeAudio onResize={handleResize} />

            <canvas
              ref={canvasRef}
              width="640px"
              height="360px"
              className="hidden"
            />
          </div>
          <div className="flex justify-between">
            <button className="button" onClick={exportVideoFile}>
              Export
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ResizeAudio({ onResize }) {
  const containerRef = useRef();
  const { styles } = useResize(containerRef);

  useEffect(() => {
    if (!containerRef.current) return;

    if (onResize) {
      onResize({
        offsetLeft: containerRef.current?.offsetLeft ?? 0,
        width: containerRef.current?.clientWidth ?? 0,
      });
    }
  }, [onResize, styles]);

  return (
    <div ref={containerRef} className={css.resize} style={{ ...styles }}>
      <span data-resize-side="left" className={css.resize__side}></span>
      <span data-resize-side="right" className={css.resize__side}></span>
    </div>
  );
}

function Tracker({ videoRef }) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!videoRef) return;

    const updateTime = () => {
      const newCurrentTime = videoRef.currentTime;
      const durationVideo = videoRef.duration;
      const containerElement = document.querySelector("div#container");

      setCurrentTime(
        Math.floor(
          (newCurrentTime / durationVideo) * containerElement.clientWidth
        )
      );
    };

    // Agregar el event listener al evento timeupdate
    videoRef.addEventListener("timeupdate", updateTime);

    return () => {
      videoRef.removeEventListener("timeupdate", updateTime);
    };
  }, [videoRef]);

  return (
    <div
      className="bg-teal-500 absolute h-full w-[2px] z-[40] top-0 cursor-ew-resize"
      style={{
        left: `${currentTime}px`,
      }}
    >
      <div className="bg-teal-500 absolute w-[12px] h-[12px] rounded-sm top-0 left-[calc(50%+1px)] -translate-x-1/2"></div>
      <div className="bg-teal-500 absolute w-[9px] h-[9px] rounded-sm rotate-45 top-[6px] left-[calc(50%+1px)] -translate-x-1/2"></div>
    </div>
  );
}

ResizeAudio.propTypes = {
  onResize: PropTypes.func,
};

Tracker.propTypes = {
  videoRef: PropTypes.object,
};
