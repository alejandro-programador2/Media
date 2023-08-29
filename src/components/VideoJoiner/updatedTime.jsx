import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  useLayoutEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  useDraggable,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import { Shell } from "../Shell";
import { FileAudio } from "../FileAudio";
import { FastForwardIcon, FastRewindIcon, PauseIcon, PlayIcon } from "./icons";

import css from "./VideoJoiner.module.css";
import converterTime from "../../helper/converterTime";

import { LINE_GAP, TIMELINE_PADDING, EVENTS } from "./const";

const EditPanelContext = createContext();

const useEditPanel = () => {
  return useContext(EditPanelContext);
};

function useResize({ id, container, duration, parentSize }) {
  const [styles, setStyles] = useState({ left: "0px", width: "0px" });

  const size = useRef({ width: 0, left: 0, base: 0, leftOffset: 0 });
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

  const newTimeEvent = () => {
    const minPxPerSec = parentSize / duration;
    const timeInSeconds = size.current.width / minPxPerSec;

    const event = new CustomEvent("time", {
      detail: { id, time: timeInSeconds },
    });

    return event;
  };

  const onPointerDown = (event) => {
    console.log("Down 👇");

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
      console.log("Move 👈");

      // Evitar que otros manejadores de eventos respondan al evento
      event.stopPropagation();
      event.preventDefault();

      // Obtener la posición actual del puntero
      const x = event.clientX;

      // Calcular el cambio en la posición X desde el inicio
      const deltaX = x - startXRef.current;

      // Calcular la nueva posición izquierda según el lado de redimensionamiento
      const newLeft =
        !handle || handle === "left"
          ? size.current.left + deltaX
          : size.current.left;

      // Calcular el nuevo ancho según el lado de redimensionamiento
      const newWidth =
        !handle || handle === "right"
          ? size.current.width + deltaX
          : size.current.width - deltaX;

      // Verificar que el nuevo ancho sea válido y que la nueva posición izquierda esté dentro de los límites permitidos
      if (newWidth <= size.current.base && newLeft >= 0) {
        // Verificar si la posición izquierda ha cambiado para calcular el desplazamiento
        if (size.current.left !== newLeft) {
          // Calcular el desplazamiento izquierdo basado en la diferencia entre el nuevo ancho y el tamaño base
          size.current.leftOffset = newWidth - size.current.base;
        }

        // Calcular de que el ancho actual no exceda el tamaño base ajustando si es necesario
        const adjustedWidth =
          Math.abs(size.current.leftOffset) + newWidth <= size.current.base
            ? newWidth
            : size.current.width;

        // Actualizar los valores de ancho y posición izquierda actuales
        size.current.width = adjustedWidth;
        size.current.left = newLeft;

        // Aplicar estilos actualizados al elemento redimensionado
        setStyles({
          left: `${size.current.left}px`,
          width: `${size.current.width}px`,
        });

        document.dispatchEvent(newTimeEvent());

        // Actualizar la posición inicial del puntero para la próxima vez
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
    if (duration) {
      // Calcular el número mínimo de píxeles por segundo basado en el ancho del elemento contenedor
      const minPxPerSec = parentSize / duration;

      // Calcular el tamaño base en función de la duración y el número mínimo de píxeles por segundo
      const baseSize = duration * minPxPerSec;

      size.current.base = baseSize;
      size.current.width = baseSize;

      document.dispatchEvent(newTimeEvent());

      setStyles((prevStyles) => ({
        ...prevStyles,
        width: size.current.width + "px",
      }));
    }
  }, [duration]);

  return {
    styles,
  };
}

function useFrame({ videos, parentSize, frameSize = 80 }) {
  const [frames, setFrames] = useState([]);

  const drawFrame = (video, canvas, timeInSeconds) => {
    return new Promise((resolve) => {
      const onTimeUpdateHandler = () => {
        const ctx = canvas.getContext("2d");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
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

  const handleFrames = async ({ videoElement, canvas, parentSize }) => {
    const SIZE_SCREENSHOT = frameSize;
    const durationInSeconds = videoElement.duration;

    const minPxPerSec = parentSize / durationInSeconds;
    const frameRate = SIZE_SCREENSHOT / minPxPerSec;

    const duration = Array.from(
      { length: Math.floor(durationInSeconds / frameRate) },
      (_, i) => i * frameRate
    );

    const frames = [];
    for (const timeInSeconds of duration) {
      const frame = await drawFrame(videoElement, canvas, timeInSeconds);
      frames.push(frame);
    }

    setFrames((prevFrames) => {
      const filteredFrames = prevFrames.filter(
        ({ id }) => id !== videoElement.id
      );

      // Crear un nuevo grupo de fotogramas con la información actualizada
      const newFrameGroup = {
        id: videoElement.id,
        duration: durationInSeconds,
        frames: [...frames],
      };

      // Agregar el nuevo grupo de fotogramas al arreglo filtrado
      const updatedFrames = [...filteredFrames, newFrameGroup];

      return updatedFrames;
    });
  };

  const createVideoElement = (video) => {
    // Crear un elemento de video
    const element = document.createElement("video");

    element.setAttribute("id", video.id);
    element.setAttribute("preload", "auto");
    element.src = video.url;

    return element;
  };

  useEffect(() => {
    if (videos.length === 0) return;

    const createCanvasElement = () => {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("width", "640px");
      canvas.setAttribute("height", "360px");
      canvas.className = "hidden";

      return canvas;
    };

    const loadedDataHandler = (videoElement, canvas) =>
      handleFrames({ videoElement, canvas, parentSize });

    const canvas = createCanvasElement();

    const videoGroup = videos.map((video) => {
      const videoElement = createVideoElement(video);

      videoElement.addEventListener("loadeddata", () =>
        loadedDataHandler(videoElement, canvas)
      );

      return videoElement;
    });

    // Limpia los controladores de evento cuando el componente se desmonta
    return () => {
      videoGroup.forEach((video) => {
        video.removeEventListener("loadeddata", () => loadedDataHandler());
      });
    };
  }, [videos, parentSize]);

  return { frames };
}

const useTrack = ({ videosID, parentSize, duration, lineGap }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const videoElementsRef = useRef([]);
  const currentVideoID = useRef(null);
  const currentTime = useRef(0);
  const intervalID = useRef(null);

  const setNewRefVideo = (video) => {
    const videoElementIndex = videoElementsRef.current.findIndex(
      (ref) => ref.id === video.id
    );

    if (videoElementIndex >= 0) return;
    videoElementsRef.current.push(video);
  };

  const getCurrentVideo = () => {
    const currentVideo = videoElementsRef.current.find(
      ({ timestart, duration }) =>
        currentTime.current >= timestart &&
        currentTime.current < timestart + duration
    );

    return currentVideo;
  };

  const handleCurrentVideo = () => {
    const video = getCurrentVideo();
    // console.log(currentTime.current);
    if (!video) {
      return;
    }

    // console.log(video?.id, currentVideo.current)
    const { id, videoElement } = video;

    // if (videoElement.classList.contains(css["video__base--hidden"])) {
    //   videoElement.classList.remove(css["video__base--hidden"]);
    // }

    if (videoElement.paused) {
      videoElement.play();
    }

    currentVideoID.current = id;
  };

  const updateTimeEvent = () => {
    // Crear un evento personalizado para indicar la actualización de tiempo en el track de video
    const timeUpdatedEvent = new Event("timeUpdated");

    // Calcular píxeles por segundo en el timeline del editor de video
    const pixelsPerSecond = parentSize / duration;

    // Calcular el tiempo que representa una unidad de track en el timeline
    const timePerTrackUnit = duration / (parentSize / lineGap);

    // Calcular el incremento de tiempo por unidad de track en el timeline,
    // ajustado para lograr un incremento más gradual en currentTime
    const timeIncrementPerTrackUnit =
      timePerTrackUnit / pixelsPerSecond / lineGap;

    // Constante para convertir milisegundos a segundos
    const MILLISECONDS_PER_SECOND = 1000;

    // Calcular el intervalo de tiempo entre actualizaciones del track,
    // basado en el incremento de tiempo por unidad de track
    const trackScrollSpeed =
      timeIncrementPerTrackUnit * MILLISECONDS_PER_SECOND;

    // Configurar un intervalo para actualizar el tiempo en el track del timeline
    intervalID.current = setInterval(() => {
      // Aumentar el tiempo actual según el incremento de tiempo por unidad de track
      currentTime.current += timeIncrementPerTrackUnit;

      // Verificar si se ha alcanzado o superado la duración total del video
      if (currentTime.current >= duration) {
        clearInterval(intervalID.current);
      }

      // Actualizar el valor de tiempo en el evento
      timeUpdatedEvent.currentTime = currentTime.current;
      // Emitir el evento de tiempo actualizado
      document.dispatchEvent(timeUpdatedEvent);

      // Realizar acciones relacionadas con el video
      handleCurrentVideo();
      // Mostrar el tiempo actual en la consola
      console.log(currentTime.current);
    }, trackScrollSpeed);
  };

  const onPlay = () => {
    updateTimeEvent();
    setIsPlaying(!isPlaying);
  };

  const onPause = () => {
    if (isPlaying) {
      clearInterval(intervalID.current);
      setIsPlaying(!isPlaying);

      if (currentVideoID.current === null) return;

      const { videoElement } = videoElementsRef.current.find(
        ({ id }) => id === currentVideoID.current
      );

      videoElement.pause();
    }
  };

  const videoElements = (list) => {
    list.forEach((id) => {
      const video = document.querySelector(`video[id="${id}"]`);
      setNewRefVideo({ id, videoElement: video, timestart: 0, duration: 0 });
    });
  };

  useLayoutEffect(() => {
    if (videosID.length > 0) {
      videoElements(videosID);
    }
  }, [videosID]);

  useEffect(() => {
    const updatedTime = ({ detail }) => {
      const { id, time } = detail;

      const videoIndex = videoElementsRef.current.findIndex(
        (video) => video.id === id
      );

      if (videoIndex !== -1) {
        videoElementsRef.current[videoIndex] = {
          ...videoElementsRef.current[videoIndex],
          duration: time,
        };
      }
    };

    const updatedStartTime = ({ detail }) => {
      const { id, axisX } = detail;

      const pixelsPerSecond =
        (parentSize * TIMELINE_PADDING.DECREASE) / duration;

      const timeInSeconds = axisX / pixelsPerSecond;

      const videoIndex = videoElementsRef.current.findIndex(
        (video) => video.id === id
      );

      if (videoIndex !== -1) {
        videoElementsRef.current[videoIndex] = {
          ...videoElementsRef.current[videoIndex],
          timestart: timeInSeconds,
        };
      }
    };

    document.addEventListener("time", updatedTime);
    document.addEventListener("leftSideEvent", updatedStartTime);

    return () => {
      document.removeEventListener("time", updatedTime);
      document.removeEventListener("leftSideEvent", updatedStartTime);
    };
  }, [parentSize]);

  return {
    isPlaying,
    onPlay,
    onPause,
  };
};

export const VideoJoiner = () => {
  const [files, setFiles] = useState([]);

  const handleFile = (files) => {
    setFiles(files);
    console.log("called 👁‍🗨");
  };

  return files.length === 0 ? (
    <Shell className="content-center text-center">
      <h1 className="text-[length:var(--fs-500)]">Join Video</h1>
      <p>Put your audios files and join them into a single file.</p>
      <FileAudio multiple onFile={handleFile} accept="video/mp4" />
    </Shell>
  ) : (
    <VideoEditor videos={files} />
  );
};

function VideoEditor({ videos }) {
  // const [activeVideo, setActiveVideo] = useState(0);

  // useEffect(() => {
  //   if (!refVideo) return;

  //   const nextVideo = ({ target }) => {
  //     const currentVideo = target;
  //     const videoElement = document.querySelector(
  //       `video[data-component="video"]:not(video[id="${currentVideo.id}"])`
  //     );

  //     currentVideo.classList.add(css["video__base--hidden"]);
  //     videoElement.classList.remove(css["video__base--hidden"]);

  //     setActiveVideo(parseInt(videoElement.dataset.index));
  //   };

  //   refVideo.addEventListener("ended", nextVideo);

  //   return () => {
  //     refVideo.removeEventListener("Ended", nextVideo);
  //   };
  // }, [isPlaying]);

  return (
    <div className={css.container}>
      <section className={css.video}>
        <div className={`${css.video__base}`}>
          {videos.map((video, index) => (
            <video
              key={video.id}
              id={video.id}
              src={video.url}
              preload="metadata"
              controls
              crossOrigin="anonymous"
              className={`${css.video__element} ${
                index >= 1 && css["video__base--hidden"]
              }`}
            />
          ))}
        </div>
      </section>

      <EditPanel videos={videos} />
    </div>
  );
}

const EditPanel = memo(({ videos }) => {
  const [containerSize, setContainerSize] = useState(0);

  const getContinerRef = useCallback((node) => {
    if (node) {
      setContainerSize(node.clientWidth);
    }
  }, []);

  const duration = useMemo(
    () => videos.reduce((time, video) => time + video.duration, 0),
    [videos]
  );

  const videosID = useMemo(() => videos.map((video) => video.id), [videos]);

  const timeLineSize = useMemo(
    () => containerSize * videos.length,
    [containerSize, videos]
  );

  const { isPlaying, onPlay, onPause } = useTrack({
    videosID,
    parentSize: timeLineSize,
    duration,
    lineGap: LINE_GAP,
  });

  const onTogglePlay = () => (isPlaying ? onPause() : onPlay());

  return (
    <EditPanelContext.Provider
      value={{
        duration,
        containerSize,
        timeLineSize,
        lineGap: LINE_GAP,
      }}
    >
      <section className={css["edit-panel"]}>
        <div className={css["toolbar"]}>
          <p>{converterTime(duration)}</p>
          {/* <button onClick={() => onSeek(-10)}>
              <FastRewindIcon />
            </button> */}

          <button onClick={onTogglePlay}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* <button onClick={() => onSeek(10)}>
              <FastForwardIcon />
            </button> */}
          <p>{converterTime(0)}</p>
        </div>

        <div ref={getContinerRef} className={css["work-area"]}>
          <Tracker />

          <div className={css.timeline__wrapper}>
            <TimeLine />
          </div>

          <Tracks videos={videos} />
        </div>
      </section>
    </EditPanelContext.Provider>
  );
});

function Tracker() {
  const { duration, timeLineSize } = useEditPanel();
  const [axisX, setAxisX] = useState(0);

  useEffect(() => {
    const updateTime = ({ currentTime }) => {
      // setAxisX(currentTime);

      setAxisX(Math.floor((currentTime / duration) * timeLineSize));
    };

    document.addEventListener("timeUpdated", updateTime);

    return () => {
      document.removeEventListener("timeUpdated", updateTime);
    };
  }, [timeLineSize]);

  return (
    <div
      className={css.tracker}
      style={{
        left: `${axisX}px`,
      }}
    >
      <div className={css["tracker__header-square"]}></div>
      <div className={css["tracker__header-triangle"]}></div>
    </div>
  );
}

function TimeLine() {
  const { duration, timeLineSize, lineGap } = useEditPanel();
  const modifiedDuration = duration;

  const minPxPerSec = timeLineSize / modifiedDuration;
  const slider = lineGap / minPxPerSec;

  const timeLineNumbers = Array.from(
    { length: Math.ceil(modifiedDuration / slider) },
    (_, i) => i * slider
  );
  console.log(
    "🚀 ~ file: VideoJoiner.jsx:674 ~ TimeLine ~ timeLineNumbers:",
    timeLineNumbers
  );

  const lines = timeLineNumbers.map((_, i) => (
    <div
      key={i}
      className={css.timeline__line}
      style={{ left: `${LINE_GAP * i}px` }}
    >
      <small>{i === 0 ? 0 : converterTime(timeLineNumbers[i])}</small>
      <div></div>
    </div>
  ));

  return <div className={`${css.timeline}`}>{duration ? lines : null}</div>;
}

const Tracks = ({ videos }) => {
  const { containerSize } = useEditPanel();
  const { frames } = useFrame({
    videos,
    parentSize: containerSize,
  });

  return (
    <ol className={css.track}>
      <li>
        <div
          className={css.track__item}
          style={{
            maxWidth: `${containerSize * frames.length}px`,
            width: "100%",
          }}
        >
          {frames.map(({ id, duration, frames }) => (
            <Drag
              key={id}
              id={id}
              duration={duration}
              parentSize={containerSize}
            >
              <Frames frames={frames} />
            </Drag>
          ))}
        </div>
      </li>
      <li>2</li>
    </ol>
  );
};

function Drag({ children, ...props }) {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (e) => {
    const { delta } = e;
    const { x: axisX, y: axisY } = coordinates;

    const newCoordinates = {
      x: axisX + delta.x,
      y: axisY + delta.y,
    };

    setCoordinates(newCoordinates);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <Drag.Item axisX={coordinates.x} {...props}>
        {children}
      </Drag.Item>
    </DndContext>
  );
}

const Item = ({ children, id, parentSize, duration, axisX }) => {
  const { listeners, setNodeRef, transform } = useDraggable({ id });
  const refContainer = useRef();

  const { styles } = useResize({
    id,
    container: refContainer.current,
    parentSize,
    duration,
  });

  const createLeftSideEvent = (axisX) =>
    new CustomEvent("leftSideEvent", { detail: { id, axisX } });

  const calculateNewTrackLeft = useMemo(() => {
    const newLeft = parseInt(styles.left) + axisX;
    document.dispatchEvent(createLeftSideEvent(newLeft));

    return newLeft;
  }, [styles.left, axisX]);

  const elementStyles = {
    "--translate-x": `${transform?.x ?? 0}px`,
    "--track-left": `${calculateNewTrackLeft}px`,
    "--track-width": styles.width,
  };

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`${css["drag-item"]}`}
      style={elementStyles}
    >
      <div
        ref={refContainer}
        className={` ${css["drag-item__track"]}`}
        data-element="drag"
        {...listeners}
      >
        {children}
        <span
          data-resize-side="left"
          className={`${css["drag-item__buttons"]} ${css["drag-item__buttons--left"]}`}
        ></span>
        <span
          data-resize-side="right"
          className={`${css["drag-item__buttons"]} ${css["drag-item__buttons--right"]}`}
        ></span>
      </div>
    </div>
  );
};

function Frames({ frames }) {
  return (
    <div className={css.frame}>
      <ul className="flex items-center h-full">
        {frames.map(({ id, url }) => (
          <li key={id} className="w-20 shrink-0 grow-0 ">
            <img src={url} alt="" className="w-full h-auto block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

Drag.Item = Item;

Drag.propTypes = {
  children: PropTypes.any,
};

Item.propTypes = {
  children: PropTypes.any,
  id: PropTypes.string,
  parentSize: PropTypes.any,
  duration: PropTypes.number,
  axisX: PropTypes.number,
};

VideoEditor.propTypes = {
  videos: PropTypes.array,
};

EditPanel.propTypes = {
  videos: PropTypes.array,
};

Tracker.propTypes = {
  parentSize: PropTypes.number,
  duration: PropTypes.number,
};

Tracks.propTypes = {
  videos: PropTypes.array,
  containerSize: PropTypes.number,
};

Frames.propTypes = {
  frames: PropTypes.array,
};

TimeLine.propTypes = {
  duration: PropTypes.any,
  countVideos: PropTypes.any,
  parentSize: PropTypes.any,
};
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  useLayoutEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  useDraggable,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import { Shell } from "../Shell";
import { FileAudio } from "../FileAudio";
import { FastForwardIcon, FastRewindIcon, PauseIcon, PlayIcon } from "./icons";

import css from "./VideoJoiner.module.css";
import converterTime from "../../helper/converterTime";

import { LINE_GAP, TIMELINE_PADDING, EVENTS } from "./const";

const EditPanelContext = createContext();

const useEditPanel = () => {
  return useContext(EditPanelContext);
};

function useResize({ id, container, duration, parentSize }) {
  const [styles, setStyles] = useState({ left: "0px", width: "0px" });

  const size = useRef({ width: 0, left: 0, base: 0, leftOffset: 0 });
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

  const newTimeEvent = () => {
    const minPxPerSec = parentSize / duration;
    const timeInSeconds = size.current.width / minPxPerSec;

    const event = new CustomEvent("time", {
      detail: { id, time: timeInSeconds },
    });

    return event;
  };

  const onPointerDown = (event) => {
    console.log("Down 👇");

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
      console.log("Move 👈");

      // Evitar que otros manejadores de eventos respondan al evento
      event.stopPropagation();
      event.preventDefault();

      // Obtener la posición actual del puntero
      const x = event.clientX;

      // Calcular el cambio en la posición X desde el inicio
      const deltaX = x - startXRef.current;

      // Calcular la nueva posición izquierda según el lado de redimensionamiento
      const newLeft =
        !handle || handle === "left"
          ? size.current.left + deltaX
          : size.current.left;

      // Calcular el nuevo ancho según el lado de redimensionamiento
      const newWidth =
        !handle || handle === "right"
          ? size.current.width + deltaX
          : size.current.width - deltaX;

      // Verificar que el nuevo ancho sea válido y que la nueva posición izquierda esté dentro de los límites permitidos
      if (newWidth <= size.current.base && newLeft >= 0) {
        // Verificar si la posición izquierda ha cambiado para calcular el desplazamiento
        if (size.current.left !== newLeft) {
          // Calcular el desplazamiento izquierdo basado en la diferencia entre el nuevo ancho y el tamaño base
          size.current.leftOffset = newWidth - size.current.base;
        }

        // Calcular de que el ancho actual no exceda el tamaño base ajustando si es necesario
        const adjustedWidth =
          Math.abs(size.current.leftOffset) + newWidth <= size.current.base
            ? newWidth
            : size.current.width;

        // Actualizar los valores de ancho y posición izquierda actuales
        size.current.width = adjustedWidth;
        size.current.left = newLeft;

        // Aplicar estilos actualizados al elemento redimensionado
        setStyles({
          left: `${size.current.left}px`,
          width: `${size.current.width}px`,
        });

        document.dispatchEvent(newTimeEvent());

        // Actualizar la posición inicial del puntero para la próxima vez
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
    if (duration) {
      // Calcular el número mínimo de píxeles por segundo basado en el ancho del elemento contenedor
      const minPxPerSec = parentSize / duration;

      // Calcular el tamaño base en función de la duración y el número mínimo de píxeles por segundo
      const baseSize = duration * minPxPerSec;

      size.current.base = baseSize;
      size.current.width = baseSize;

      document.dispatchEvent(newTimeEvent());

      setStyles((prevStyles) => ({
        ...prevStyles,
        width: size.current.width + "px",
      }));
    }
  }, [duration]);

  return {
    styles,
  };
}

function useFrame({ videos, parentSize, frameSize = 80 }) {
  const [frames, setFrames] = useState([]);

  const drawFrame = (video, canvas, timeInSeconds) => {
    return new Promise((resolve) => {
      const onTimeUpdateHandler = () => {
        const ctx = canvas.getContext("2d");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
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

  const handleFrames = async ({ videoElement, canvas, parentSize }) => {
    const SIZE_SCREENSHOT = frameSize;
    const durationInSeconds = videoElement.duration;

    const minPxPerSec = parentSize / durationInSeconds;
    const frameRate = SIZE_SCREENSHOT / minPxPerSec;

    const duration = Array.from(
      { length: Math.floor(durationInSeconds / frameRate) },
      (_, i) => i * frameRate
    );

    const frames = [];
    for (const timeInSeconds of duration) {
      const frame = await drawFrame(videoElement, canvas, timeInSeconds);
      frames.push(frame);
    }

    setFrames((prevFrames) => {
      const filteredFrames = prevFrames.filter(
        ({ id }) => id !== videoElement.id
      );

      // Crear un nuevo grupo de fotogramas con la información actualizada
      const newFrameGroup = {
        id: videoElement.id,
        duration: durationInSeconds,
        frames: [...frames],
      };

      // Agregar el nuevo grupo de fotogramas al arreglo filtrado
      const updatedFrames = [...filteredFrames, newFrameGroup];

      return updatedFrames;
    });
  };

  const createVideoElement = (video) => {
    // Crear un elemento de video
    const element = document.createElement("video");

    element.setAttribute("id", video.id);
    element.setAttribute("preload", "auto");
    element.src = video.url;

    return element;
  };

  useEffect(() => {
    if (videos.length === 0) return;

    const createCanvasElement = () => {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("width", "640px");
      canvas.setAttribute("height", "360px");
      canvas.className = "hidden";

      return canvas;
    };

    const loadedDataHandler = (videoElement, canvas) =>
      handleFrames({ videoElement, canvas, parentSize });

    const canvas = createCanvasElement();

    const videoGroup = videos.map((video) => {
      const videoElement = createVideoElement(video);

      videoElement.addEventListener("loadeddata", () =>
        loadedDataHandler(videoElement, canvas)
      );

      return videoElement;
    });

    // Limpia los controladores de evento cuando el componente se desmonta
    return () => {
      videoGroup.forEach((video) => {
        video.removeEventListener("loadeddata", () => loadedDataHandler());
      });
    };
  }, [videos, parentSize]);

  return { frames };
}

const useTrack = ({ videosID, parentSize, duration, lineGap }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const videoElementsRef = useRef([]);
  const currentVideoID = useRef(null);
  const currentTime = useRef(0);
  const intervalID = useRef(null);

  const setNewRefVideo = (video) => {
    const videoElementIndex = videoElementsRef.current.findIndex(
      (ref) => ref.id === video.id
    );

    if (videoElementIndex >= 0) return;
    videoElementsRef.current.push(video);
  };

  const getCurrentVideo = () => {
    const currentVideo = videoElementsRef.current.find(
      ({ timestart, duration }) =>
        currentTime.current >= timestart &&
        currentTime.current < timestart + duration
    );

    return currentVideo;
  };

  const handleCurrentVideo = () => {
    const video = getCurrentVideo();
    // console.log(currentTime.current);
    if (!video) {
      return;
    }

    // console.log(video?.id, currentVideo.current)
    const { id, videoElement } = video;

    // if (videoElement.classList.contains(css["video__base--hidden"])) {
    //   videoElement.classList.remove(css["video__base--hidden"]);
    // }

    if (videoElement.paused) {
      videoElement.play();
    }

    currentVideoID.current = id;
  };

  const updateTimeEvent = () => {
    // Crear un evento personalizado para indicar la actualización de tiempo en el track de video
    const timeUpdatedEvent = new Event("timeUpdated");

    // Calcular píxeles por segundo en el timeline del editor de video
    const pixelsPerSecond = parentSize / duration;

    // Calcular el tiempo que representa una unidad de track en el timeline
    const timePerTrackUnit = duration / (parentSize / lineGap);

    // Calcular el incremento de tiempo por unidad de track en el timeline,
    // ajustado para lograr un incremento más gradual en currentTime
    const timeIncrementPerTrackUnit =
      timePerTrackUnit / pixelsPerSecond / lineGap;

    // Constante para convertir milisegundos a segundos
    const MILLISECONDS_PER_SECOND = 1000;

    // Calcular el intervalo de tiempo entre actualizaciones del track,
    // basado en el incremento de tiempo por unidad de track
    const trackScrollSpeed =
      timeIncrementPerTrackUnit * MILLISECONDS_PER_SECOND;

    // Configurar un intervalo para actualizar el tiempo en el track del timeline
    intervalID.current = setInterval(() => {
      // Aumentar el tiempo actual según el incremento de tiempo por unidad de track
      currentTime.current += timeIncrementPerTrackUnit;

      // Verificar si se ha alcanzado o superado la duración total del video
      if (currentTime.current >= duration) {
        clearInterval(intervalID.current);
      }

      // Actualizar el valor de tiempo en el evento
      timeUpdatedEvent.currentTime = currentTime.current;
      // Emitir el evento de tiempo actualizado
      document.dispatchEvent(timeUpdatedEvent);

      // Realizar acciones relacionadas con el video
      handleCurrentVideo();
      // Mostrar el tiempo actual en la consola
      console.log(currentTime.current);
    }, trackScrollSpeed);
  };

  const onPlay = () => {
    updateTimeEvent();
    setIsPlaying(!isPlaying);
  };

  const onPause = () => {
    if (isPlaying) {
      clearInterval(intervalID.current);
      setIsPlaying(!isPlaying);

      if (currentVideoID.current === null) return;

      const { videoElement } = videoElementsRef.current.find(
        ({ id }) => id === currentVideoID.current
      );

      videoElement.pause();
    }
  };

  const videoElements = (list) => {
    list.forEach((id) => {
      const video = document.querySelector(`video[id="${id}"]`);
      setNewRefVideo({ id, videoElement: video, timestart: 0, duration: 0 });
    });
  };

  useLayoutEffect(() => {
    if (videosID.length > 0) {
      videoElements(videosID);
    }
  }, [videosID]);

  useEffect(() => {
    const updatedTime = ({ detail }) => {
      const { id, time } = detail;

      const videoIndex = videoElementsRef.current.findIndex(
        (video) => video.id === id
      );

      if (videoIndex !== -1) {
        videoElementsRef.current[videoIndex] = {
          ...videoElementsRef.current[videoIndex],
          duration: time,
        };
      }
    };

    const updatedStartTime = ({ detail }) => {
      const { id, axisX } = detail;

      const pixelsPerSecond =
        (parentSize * TIMELINE_PADDING.DECREASE) / duration;

      const timeInSeconds = axisX / pixelsPerSecond;

      const videoIndex = videoElementsRef.current.findIndex(
        (video) => video.id === id
      );

      if (videoIndex !== -1) {
        videoElementsRef.current[videoIndex] = {
          ...videoElementsRef.current[videoIndex],
          timestart: timeInSeconds,
        };
      }
    };

    document.addEventListener("time", updatedTime);
    document.addEventListener("leftSideEvent", updatedStartTime);

    return () => {
      document.removeEventListener("time", updatedTime);
      document.removeEventListener("leftSideEvent", updatedStartTime);
    };
  }, [parentSize]);

  return {
    isPlaying,
    onPlay,
    onPause,
  };
};

export const VideoJoiner = () => {
  const [files, setFiles] = useState([]);

  const handleFile = (files) => {
    setFiles(files);
    console.log("called 👁‍🗨");
  };

  return files.length === 0 ? (
    <Shell className="content-center text-center">
      <h1 className="text-[length:var(--fs-500)]">Join Video</h1>
      <p>Put your audios files and join them into a single file.</p>
      <FileAudio multiple onFile={handleFile} accept="video/mp4" />
    </Shell>
  ) : (
    <VideoEditor videos={files} />
  );
};

function VideoEditor({ videos }) {
  // const [activeVideo, setActiveVideo] = useState(0);

  // useEffect(() => {
  //   if (!refVideo) return;

  //   const nextVideo = ({ target }) => {
  //     const currentVideo = target;
  //     const videoElement = document.querySelector(
  //       `video[data-component="video"]:not(video[id="${currentVideo.id}"])`
  //     );

  //     currentVideo.classList.add(css["video__base--hidden"]);
  //     videoElement.classList.remove(css["video__base--hidden"]);

  //     setActiveVideo(parseInt(videoElement.dataset.index));
  //   };

  //   refVideo.addEventListener("ended", nextVideo);

  //   return () => {
  //     refVideo.removeEventListener("Ended", nextVideo);
  //   };
  // }, [isPlaying]);

  return (
    <div className={css.container}>
      <section className={css.video}>
        <div className={`${css.video__base}`}>
          {videos.map((video, index) => (
            <video
              key={video.id}
              id={video.id}
              src={video.url}
              preload="metadata"
              controls
              crossOrigin="anonymous"
              className={`${css.video__element} ${
                index >= 1 && css["video__base--hidden"]
              }`}
            />
          ))}
        </div>
      </section>

      <EditPanel videos={videos} />
    </div>
  );
}

const EditPanel = memo(({ videos }) => {
  const [containerSize, setContainerSize] = useState(0);

  const getContinerRef = useCallback((node) => {
    if (node) {
      setContainerSize(node.clientWidth);
    }
  }, []);

  const duration = useMemo(
    () => videos.reduce((time, video) => time + video.duration, 0),
    [videos]
  );

  const videosID = useMemo(() => videos.map((video) => video.id), [videos]);

  const timeLineSize = useMemo(
    () => containerSize * videos.length,
    [containerSize, videos]
  );

  const { isPlaying, onPlay, onPause } = useTrack({
    videosID,
    parentSize: timeLineSize,
    duration,
    lineGap: LINE_GAP,
  });

  const onTogglePlay = () => (isPlaying ? onPause() : onPlay());

  return (
    <EditPanelContext.Provider
      value={{
        duration,
        containerSize,
        timeLineSize,
        lineGap: LINE_GAP,
      }}
    >
      <section className={css["edit-panel"]}>
        <div className={css["toolbar"]}>
          <p>{converterTime(duration)}</p>
          {/* <button onClick={() => onSeek(-10)}>
              <FastRewindIcon />
            </button> */}

          <button onClick={onTogglePlay}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* <button onClick={() => onSeek(10)}>
              <FastForwardIcon />
            </button> */}
          <p>{converterTime(0)}</p>
        </div>

        <div ref={getContinerRef} className={css["work-area"]}>
          <Tracker />

          <div className={css.timeline__wrapper}>
            <TimeLine />
          </div>

          <Tracks videos={videos} />
        </div>
      </section>
    </EditPanelContext.Provider>
  );
});

function Tracker() {
  const { duration, timeLineSize } = useEditPanel();
  const [axisX, setAxisX] = useState(0);

  useEffect(() => {
    const updateTime = ({ currentTime }) => {
      // setAxisX(currentTime);

      setAxisX(Math.floor((currentTime / duration) * timeLineSize));
    };

    document.addEventListener("timeUpdated", updateTime);

    return () => {
      document.removeEventListener("timeUpdated", updateTime);
    };
  }, [timeLineSize]);

  return (
    <div
      className={css.tracker}
      style={{
        left: `${axisX}px`,
      }}
    >
      <div className={css["tracker__header-square"]}></div>
      <div className={css["tracker__header-triangle"]}></div>
    </div>
  );
}

function TimeLine() {
  const { duration, timeLineSize, lineGap } = useEditPanel();
  const modifiedDuration = duration;

  const minPxPerSec = timeLineSize / modifiedDuration;
  const slider = lineGap / minPxPerSec;

  const timeLineNumbers = Array.from(
    { length: Math.ceil(modifiedDuration / slider) },
    (_, i) => i * slider
  );
  console.log(
    "🚀 ~ file: VideoJoiner.jsx:674 ~ TimeLine ~ timeLineNumbers:",
    timeLineNumbers
  );

  const lines = timeLineNumbers.map((_, i) => (
    <div
      key={i}
      className={css.timeline__line}
      style={{ left: `${LINE_GAP * i}px` }}
    >
      <small>{i === 0 ? 0 : converterTime(timeLineNumbers[i])}</small>
      <div></div>
    </div>
  ));

  return <div className={`${css.timeline}`}>{duration ? lines : null}</div>;
}

const Tracks = ({ videos }) => {
  const { containerSize } = useEditPanel();
  const { frames } = useFrame({
    videos,
    parentSize: containerSize,
  });

  return (
    <ol className={css.track}>
      <li>
        <div
          className={css.track__item}
          style={{
            maxWidth: `${containerSize * frames.length}px`,
            width: "100%",
          }}
        >
          {frames.map(({ id, duration, frames }) => (
            <Drag
              key={id}
              id={id}
              duration={duration}
              parentSize={containerSize}
            >
              <Frames frames={frames} />
            </Drag>
          ))}
        </div>
      </li>
      <li>2</li>
    </ol>
  );
};

function Drag({ children, ...props }) {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (e) => {
    const { delta } = e;
    const { x: axisX, y: axisY } = coordinates;

    const newCoordinates = {
      x: axisX + delta.x,
      y: axisY + delta.y,
    };

    setCoordinates(newCoordinates);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <Drag.Item axisX={coordinates.x} {...props}>
        {children}
      </Drag.Item>
    </DndContext>
  );
}

const Item = ({ children, id, parentSize, duration, axisX }) => {
  const { listeners, setNodeRef, transform } = useDraggable({ id });
  const refContainer = useRef();

  const { styles } = useResize({
    id,
    container: refContainer.current,
    parentSize,
    duration,
  });

  const createLeftSideEvent = (axisX) =>
    new CustomEvent("leftSideEvent", { detail: { id, axisX } });

  const calculateNewTrackLeft = useMemo(() => {
    const newLeft = parseInt(styles.left) + axisX;
    document.dispatchEvent(createLeftSideEvent(newLeft));

    return newLeft;
  }, [styles.left, axisX]);

  const elementStyles = {
    "--translate-x": `${transform?.x ?? 0}px`,
    "--track-left": `${calculateNewTrackLeft}px`,
    "--track-width": styles.width,
  };

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`${css["drag-item"]}`}
      style={elementStyles}
    >
      <div
        ref={refContainer}
        className={` ${css["drag-item__track"]}`}
        data-element="drag"
        {...listeners}
      >
        {children}
        <span
          data-resize-side="left"
          className={`${css["drag-item__buttons"]} ${css["drag-item__buttons--left"]}`}
        ></span>
        <span
          data-resize-side="right"
          className={`${css["drag-item__buttons"]} ${css["drag-item__buttons--right"]}`}
        ></span>
      </div>
    </div>
  );
};

function Frames({ frames }) {
  return (
    <div className={css.frame}>
      <ul className="flex items-center h-full">
        {frames.map(({ id, url }) => (
          <li key={id} className="w-20 shrink-0 grow-0 ">
            <img src={url} alt="" className="w-full h-auto block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

Drag.Item = Item;

Drag.propTypes = {
  children: PropTypes.any,
};

Item.propTypes = {
  children: PropTypes.any,
  id: PropTypes.string,
  parentSize: PropTypes.any,
  duration: PropTypes.number,
  axisX: PropTypes.number,
};

VideoEditor.propTypes = {
  videos: PropTypes.array,
};

EditPanel.propTypes = {
  videos: PropTypes.array,
};

Tracker.propTypes = {
  parentSize: PropTypes.number,
  duration: PropTypes.number,
};

Tracks.propTypes = {
  videos: PropTypes.array,
  containerSize: PropTypes.number,
};

Frames.propTypes = {
  frames: PropTypes.array,
};

TimeLine.propTypes = {
  duration: PropTypes.any,
  countVideos: PropTypes.any,
  parentSize: PropTypes.any,
};
