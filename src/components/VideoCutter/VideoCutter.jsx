import { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

import { FileAudio } from "../FileAudio";
import cutVideo from "../../helper/cutVideo";

import css from "./VideoCutter.module.css";

function useResize({ container, video: videoRef, parent: parentRef }) {
  const [styles, setStyles] = useState({ left: "0%", right: "0%" });

  const time = useRef({ start: 0, end: 0 });
  const startXRef = useRef(0);
  const isResizingRef = useRef(false);

  const isValidElement = (element) =>
    typeof element === "string" ||
    typeof element === "undefined" ||
    typeof element !== "object";

  const validateResizeSideData = useCallback(() => {
    if (
      !container.querySelector('[data-resize-side="left"]') ||
      !container.querySelector('[data-resize-side="right"]')
    ) {
      throw new Error(
        'You need to put the "data-resize-side" prop in someone element.'
      );
    }
  }, [container]);

  const onPointerDown = (event) => {
    // Verificar si el botón clickeado es el botón derecho
    if (event?.button === 2) return;
    // Verificar si el elemento clickeado tiene el atributo 'resizeSide'
    if (!event.target.dataset?.resizeSide) return;

    // Prevenir que otros controladores de eventos respondan al evento
    event.stopPropagation();
    event.preventDefault();

    // Marcar que se está redimensionando
    isResizingRef.current = true;
    // Guardar la posición inicial del puntero
    startXRef.current = event.clientX;

    // Obtener el lado de redimensionamiento del elemento clickeado
    const handle = event.target.dataset.resizeSide;

    const onPointerMove = (event) => {
      // Prevenir que otros controladores de eventos respondan al evento
      event.stopPropagation();
      event.preventDefault();

      // Obtener la posición actual del puntero
      const x = event.clientX;
      // Calcular el cambio en la posición X
      const deltaX = x - startXRef.current;
      // Calcular el cambio en segundos basado en la posición X
      const deltaSeconds = (deltaX / parentRef.clientWidth) * videoRef.duration;

      // Actualizar el tiempo de inicio o fin según el lado de redimensionamiento
      const newStart =
        !handle || handle === "left"
          ? time.current.start + deltaSeconds
          : time.current.start;

      const newEnd =
        !handle || handle === "right"
          ? time.current.end + deltaSeconds
          : time.current.end;

      if (newStart >= 0 && newEnd <= videoRef.duration ) {
        // Actualizar los valores de tiempo actuales
        time.current.start = newStart;
        time.current.end = newEnd;

        // Calcular nuevas posiciones para los lados izquierdo y derecho
        const newLeft = (time.current.start / videoRef.duration) * 100;
        const newRight =
          ((videoRef.duration - time.current.end) / videoRef.duration) * 100;

        // Aplicar estilos actualizados al elemento redimensionado
        setStyles({
          left: `${newLeft * (parentRef.clientWidth / videoRef.duration)}px`,
          right: `${newRight * (parentRef.clientWidth / videoRef.duration)}px`,
        });

        // Actualizar la posición inicial del puntero
        startXRef.current = x;
      }
    };

    const onPointerUp = () => {
      if (isResizingRef.current) {
        // Finalizar el proceso de redimensionamiento
        isResizingRef.current = false;
        // Eliminar los controladores de eventos de movimiento y liberación
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      }
    };

    // Agregar controladores de eventos para movimiento y liberación
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  useEffect(() => {
    // Verificar si el 'container' es un elemento válido o si los datos del redimensionamiento no son válidos
    if (isValidElement(container) || validateResizeSideData() instanceof Error)
      return;

    // Agregar escuchador de eventos 'pointerdown' al 'container' cuando el componente se monta
    container.addEventListener("pointerdown", onPointerDown);

    // Eliminar el escuchador de eventos 'pointerdown' cuando el componente se desmonta
    return () => {
      container?.removeEventListener("pointerdown", onPointerDown);
    };
  }, [container]);

  useEffect(() => {
    if (videoRef) {
      time.current.end = videoRef.duration;
    }
  }, [videoRef]);

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

            <ResizeAudio
              onResize={handleResize}
              videoRef={videoRef}
              containerRef={containerRef}
            />

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

function ResizeAudio({ onResize, videoRef, containerRef }) {
  const ref = useRef();

  const { styles } = useResize({
    container: ref.current,
    video: videoRef.current,
    parent: containerRef.current,
  });

  useEffect(() => {
    if (!ref.current) return;

    if (onResize) {
      onResize({
        offsetLeft: ref.current?.offsetLeft ?? 0,
        width: ref.current?.clientWidth ?? 0,
      });
    }
  }, [onResize, styles]);

  return (
    <div ref={ref} className={css.resize} style={{ ...styles }}>
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
  videoRef: PropTypes.any,
  containerRef: PropTypes.any,
};

Tracker.propTypes = {
  videoRef: PropTypes.object,
};
