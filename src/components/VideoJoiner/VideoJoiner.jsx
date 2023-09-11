import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  useLayoutEffect,
  useMemo,
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
import {
  DownloadIcon,
  FastForwardIcon,
  FastRewindIcon,
  PauseIcon,
  PlayIcon,
} from "./icons";

import { LINE_GAP, TIMELINE_PADDING, EVENTS } from "./const";
import { EditPanelContext, TracksContext } from "./context";

import joinVideo from "../../helper/joinVideo";
import converterTime from "../../helper/converterTime";

import css from "./VideoJoiner.module.css";

const useEditPanel = () => {
  return useContext(EditPanelContext);
};

const usePositionTrack = () => {
  return useContext(TracksContext);
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

  const createTrackTimeUpdateEvent = (width) => {
    const minPxPerSec = parentSize / duration;
    const timeInSeconds = Number((width / minPxPerSec).toFixed(3));

    const event = new CustomEvent(EVENTS.TRACKTIMEUPDATE, {
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
          size.current.leftOffset = size.current.base - newWidth;
        }

        // Verificar si el newLeft es igual a 0 si es así reinicar el leftOffset
        // para permitir nueva mente el resize usando el side right.
        if (newLeft === 0) {
          size.current.leftOffset = 0;
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

        document.dispatchEvent(createTrackTimeUpdateEvent(size.current.width));

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
      const baseSize = Math.ceil(duration * minPxPerSec);

      size.current.base = baseSize;
      size.current.width = baseSize;

      document.dispatchEvent(createTrackTimeUpdateEvent(baseSize));

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
  const [videoElementsRef, setVideoElementRef] = useState([]);

  const currentVideoID = useRef(null);
  const intervalID = useRef(null);
  const currentTime = useRef(0);

  const getCurrentVideo = () => {
    // Buscar el video actual en función del tiempo actual
    const currentVideo = videoElementsRef.find(
      ({ timestart, duration }) =>
        currentTime.current >= timestart &&
        currentTime.current < timestart + duration
    );

    return currentVideo;
  };

  const handleCurrentVideo = () => {
    const video = getCurrentVideo();

    if (!video) {
      // Verificar si había un video previamente
      if (currentVideoID.current !== null) {
        // Encontrar el elemento de video correspondiente al ID actual
        const { videoElement } = videoElementsRef.find(
          ({ id }) => id === currentVideoID.current
        );

        // Ocultar el elemento de video, pausarlo y reiniciar su tiempo
        videoElement.classList.add(css["video__base--hidden"]);
        videoElement.pause();
        videoElement.currentTime = 0;

        // Establecer el ID de video actual como null
        currentVideoID.current = null;
      }
      return;
    }

    const { id, videoElement } = video;

    // Mostrar el elemento de video si estaba oculto
    if (videoElement.classList.contains(css["video__base--hidden"])) {
      videoElement.classList.remove(css["video__base--hidden"]);
    }

    // Reproducir el video si estaba en pausa
    if (videoElement.paused) {
      videoElement.play();
    }

    currentVideoID.current = id;
  };

  const updateTimeEvent = () => {
    // Crear un evento personalizado para indicar la actualización de tiempo en el track de video
    const timeUpdatedEvent = new Event(EVENTS.TIMELINETIMEUPDATE);

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
        setIsPlaying(!isPlaying);
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

      const { videoElement } = videoElementsRef.find(
        ({ id }) => id === currentVideoID.current
      );

      videoElement.pause();
    }
  };

  const onSeek = (seconds) => {
    const newCurrentTime = currentTime.current + seconds;

    if (newCurrentTime >= 0 && newCurrentTime <= duration) {
      const video = getCurrentVideo();

      if (video) {
        const { videoElement } = video;
        videoElement.currentTime += seconds;
      }

      currentTime.current += seconds;
      handleCurrentVideo();
    }
  };

  const addEvents = (ref) => {
    const updatedTime = ({ detail }) => {
      const { id, time } = detail;

      const videoIndex = ref.findIndex((video) => video.id === id);

      if (videoIndex !== -1) {
        setVideoElementRef((prev) => [
          ...prev.slice(0, videoIndex),
          { ...prev[videoIndex], duration: time },
          ...prev.slice(videoIndex + 1),
        ]);
      }
    };

    const updatedStartTime = ({ detail }) => {
      const { id, axisX } = detail;

      const pixelsPerSecond = parentSize / duration;
      const timeInSeconds = Number((axisX / pixelsPerSecond).toFixed(3));
      const videoIndex = ref.findIndex((video) => video.id === id);

      if (videoIndex !== -1) {
        setVideoElementRef((prev) => [
          ...prev.slice(0, videoIndex),
          { ...prev[videoIndex], timestart: timeInSeconds },
          ...prev.slice(videoIndex + 1),
        ]);
      }
    };

    document.addEventListener(EVENTS.TRACKTIMEUPDATE, updatedTime);
    document.addEventListener(EVENTS.TRACKLEFTSIDECHANGED, updatedStartTime);
  };

  const videoElements = (videos) =>
    videos.map((id) => {
      const videoElement = document.querySelector(`video[id="${id}"]`);
      return {
        id,
        videoElement,
        timestart: 0,
        duration: 0,
      };
    });

  useLayoutEffect(() => {
    if (videosID.length > 0) {
      const videosState = videoElements(videosID);
      addEvents(videosState);

      setVideoElementRef(videosState);
    }
  }, [videosID, parentSize, duration]);

  // useEffect(() => {
  //   if (videoElementsRef.length === 0) return;

  //   const updatedTime = ({ detail }) => {
  //     const { id, time } = detail;

  //     const videoIndex = videoElementsRef.findIndex((video) => video.id === id);

  //     if (videoIndex !== -1) {
  //       setVideoElementRef((prev) => (
  //         [
  //           ...prev.slice(0, videoIndex),
  //           { ...prev[videoIndex], duration: time },
  //           ...prev.slice(videoIndex + 1),
  //         ]
  //       ));
  //     }
  //   };

  //   const updatedStartTime = ({ detail }) => {
  //     const { id, axisX } = detail;

  //     const pixelsPerSecond = parentSize / duration;
  //     const timeInSeconds = Number((axisX / pixelsPerSecond).toFixed(3));

  //     const videoIndex = videoElementsRef.findIndex((video) => video.id === id);
  //     if (videoIndex !== -1) {
  //       const newState = [
  //         ...videoElementsRef.slice(0, videoIndex),
  //         { ...videoElementsRef[videoIndex], timestart: timeInSeconds },
  //         ...videoElementsRef.slice(videoIndex + 1),
  //       ];

  //       setVideoElementRef(newState);
  //     }
  //   };

  //   document.addEventListener(EVENTS.TRACKTIMEUPDATE, updatedTime);
  //   document.addEventListener(EVENTS.TRACKLEFTSIDECHANGED, updatedStartTime);

  //   return () => {
  //     document.removeEventListener(EVENTS.TRACKTIMEUPDATE, updatedTime);
  //     document.removeEventListener(EVENTS.TRACKLEFTSIDECHANGED, updatedStartTime);
  //   };
  // }, [videoElementsRef]);

  return {
    isPlaying,
    onPlay,
    onPause,
    onSeek,
    videoStats: videoElementsRef,
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
  return (
    <div className={css.container}>
      <section className={css.video}>
        <div className={`${css.video__base}`}>
          {videos.map((video) => (
            <video
              key={video.id}
              id={video.id}
              src={video.url}
              preload="metadata"
              controls
              crossOrigin="anonymous"
              className={`${css.video__element} ${css["video__base--hidden"]}`}
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

  const getTotalDuration = (videos) => {
    return videos.reduce((time, video) => time + video.duration, 0);
  };

  const duration = useMemo(
    () => getTotalDuration(videos) * TIMELINE_PADDING.INCREASE,
    [videos]
  );

  const videosID = useMemo(() => videos.map((video) => video.id), [videos]);

  const timeLineSize = useMemo(
    () => containerSize * videos.length,
    [containerSize, videos]
  );

  const { isPlaying, onPlay, onPause, onSeek, videoStats } = useTrack({
    videosID,
    parentSize: timeLineSize,
    duration,
    lineGap: LINE_GAP,
  });

  const transformedVideoStats = useMemo(() => {
    if (videoStats.length === 0) return [];

    return videoStats
      .map(({ id, duration, timestart }) => {
        const { file } = videos.find((video) => video.id === id);
        const endTime = timestart + duration;

        return {
          file,
          startTime: timestart,
          endTime,
        };
      })
      .sort((current, next) => current.startTime - next.startTime);
  }, [videos, videoStats]);

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
        <Toolbar
          onSeek={onSeek}
          onPlay={onTogglePlay}
          isPlaying={isPlaying}
          videos={transformedVideoStats}
        />

        <div
          ref={getContinerRef}
          className={css["work-area"]}
          style={{ "--width-container": `${containerSize * videos.length}px` }}
        >
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

function Toolbar({ onPlay, isPlaying, videos, onSeek }) {
  const { duration } = useEditPanel();
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const updateTime = ({ currentTime }) => {
      setCurrentTime(currentTime);
    };

    document.addEventListener(EVENTS.TIMELINETIMEUPDATE, updateTime);

    return () => {
      document.removeEventListener(EVENTS.TIMELINETIMEUPDATE, updateTime);
    };
  }, []);

  const createDownloadAudioLink = ({ url, name }) => {
    const downloadAudio = document.createElement("a");
    downloadAudio.href = url;
    downloadAudio.style.display = "none";

    downloadAudio.setAttribute("download", name);
    downloadAudio.click();
  };

  const exportVideoFile = async () => {
    try {
      // Mix the audio with the main audio file and other tracks
      const newAudio = await joinVideo({ files: videos });

      // Create a link to download the new audio
      createDownloadAudioLink(newAudio);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={css["toolbar"]}>
      <p>{converterTime(duration)}</p>

      <button
        className={css["toolbar__normal-button"]}
        onClick={() => onSeek(-10)}
      >
        <FastRewindIcon />
      </button>

      <button onClick={onPlay} className={css["toolbar__normal-button"]}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <button
        className={css["toolbar__normal-button"]}
        onClick={() => onSeek(10)}
      >
        <FastForwardIcon />
      </button>

      <p>{converterTime(currentTime)}</p>

      <button
        className={css["toolbar__download-button"]}
        onClick={exportVideoFile}
      >
        <DownloadIcon />
        Save
      </button>
    </div>
  );
}

function Tracker() {
  const { duration, timeLineSize } = useEditPanel();
  const [axisX, setAxisX] = useState(0);

  useEffect(() => {
    const updateTime = ({ currentTime }) => {
      setAxisX(Math.floor((currentTime / duration) * timeLineSize));
    };

    document.addEventListener(EVENTS.TIMELINETIMEUPDATE, updateTime);

    return () => {
      document.removeEventListener(EVENTS.TIMELINETIMEUPDATE, updateTime);
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

  const minPxPerSec = timeLineSize / duration;
  const slider = lineGap / minPxPerSec;

  const timeLineNumbers = Array.from(
    { length: Math.ceil(duration / slider) },
    (_, i) => i * slider
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

  const nodes = useRef([]);

  const setNodesRef = (drag) => {
    const dragIndex = nodes.current.findIndex((ref) => ref.id === drag.id);

    if (dragIndex >= 0) return;
    nodes.current.push(drag);
  };

  const AxisAlignedBoundingBox = (a, b) => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  const calculateIntersection = (a, b) => {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    return x2 - x1;
  };

  const isInside = (a, b) => a.x >= b.x && a.x + a.width <= b.x + b.width;

  const distanceToExitX = (a, b) => {
    const leftDistance = b.x - (a.x + a.width);
    const rightDistance = a.x - (b.x + b.width);

    return Math.min(leftDistance, rightDistance);
  };

  const calculateXAxisGap = (id) => {
    const activeElement = nodes.current.find((ref) => ref.id === id);
    const activeElementCoordinates = activeElement.getBoundingClientRect();

    const matchingNodes = nodes.current.filter((node) => {
      if (node.id === id) return false;

      const sliblingElementCoordinates = node.getBoundingClientRect();

      return AxisAlignedBoundingBox(
        activeElementCoordinates,
        sliblingElementCoordinates
      );
    });

    if (matchingNodes.length === 0) return 0;

    // TODO: Fix position of active element when it's between two elements.
    // if (matchingNodes.length > 1) {
    //   const moveElements = matchingNodes.reduce((beforeNode, afterNode) => {
    //     const beforeNodeIntersection = calculateIntersection(
    //       activeElementCoordinates,
    //       beforeNode.getBoundingClientRect()
    //     );

    //     const afterNodeIntersection = calculateIntersection(
    //       activeElementCoordinates,
    //       afterNode.getBoundingClientRect()
    //     );

    //     if (beforeNodeIntersection.gap > afterNodeIntersection.gap) {
    //       console.log(beforeNodeIntersection.gap, afterNodeIntersection.gap)
    //       return (
    //         beforeNode.getBoundingClientRect().width + afterNodeIntersection.gap
    //       );
    //     }

    //     return (
    //       (afterNode.getBoundingClientRect().width - afterNodeIntersection.gap) + afterNodeIntersection.gap
    //     );
    //   });

    //   return moveElements;
    // }

    let newAxisX = 0;

    for (const node of matchingNodes) {
      const siblingElementCoordinates = node.getBoundingClientRect();
      const differenceX =
        activeElementCoordinates.x - siblingElementCoordinates.x;

      if (isInside(activeElementCoordinates, siblingElementCoordinates)) {
        const distance = distanceToExitX(
          activeElementCoordinates,
          siblingElementCoordinates
        );
        newAxisX += differenceX > 0 ? distance : -distance;
        continue;
      }

      const intersection = calculateIntersection(
        activeElementCoordinates,
        siblingElementCoordinates
      );
      newAxisX += differenceX > 0 ? intersection : -intersection;
    }

    return newAxisX;
  };

  return (
    <TracksContext.Provider value={{ setNodesRef, calculateXAxisGap }}>
      <ol className={css.track}>
        <li>
          <div className={css.track__item}>
            {frames.map(({ id, duration, frames }) => (
              <Drag
                key={id}
                id={id}
                duration={duration}
                parentSize={containerSize * TIMELINE_PADDING.DECREASE}
              >
                <Frames frames={frames} />
              </Drag>
            ))}
          </div>
        </li>
        <li>
          <div className={css.track__item}></div>
        </li>
      </ol>
    </TracksContext.Provider>
  );
};

function Drag({ children, ...props }) {
  const { calculateXAxisGap } = usePositionTrack();

  const [coordinates, setCoordinates] = useState({ axisX: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { delta } = event;
    const {
      active: { id },
    } = event;
    const { axisX } = coordinates;

    const newCoordinates = {
      axisX: axisX + delta.x,
    };

    const gapBetweenDrags = calculateXAxisGap(id);
    
    newCoordinates.axisX += gapBetweenDrags;
    setCoordinates(newCoordinates);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <Drag.Item axisX={coordinates.axisX} {...props}>
        {children}
      </Drag.Item>
    </DndContext>
  );
}

const Item = ({ children, id, parentSize, duration, axisX }) => {
  const { listeners, setNodeRef, transform } = useDraggable({ id });
  const { setNodesRef } = usePositionTrack();

  const refContainer = useRef();

  useEffect(() => {
    if (refContainer.current !== null) {
      setNodesRef(refContainer.current);
    }
  }, [refContainer.current]);

  const { styles } = useResize({
    id,
    container: refContainer.current,
    parentSize,
    duration,
  });

  const createtrackLeftSideChangedEvent = (axisX) =>
    new CustomEvent(EVENTS.TRACKLEFTSIDECHANGED, { detail: { id, axisX } });

  const calculateNewTrackLeft = useMemo(
    () => parseInt(styles.left) + axisX,
    [styles.left, axisX]
  );

  useLayoutEffect(() => {
    const event = createtrackLeftSideChangedEvent(calculateNewTrackLeft);
    document.dispatchEvent(event);
  }, [calculateNewTrackLeft]);

  const elementStyles = {
    "--translate-x": `${transform?.x ?? 0}px`,
    "--track-left": `${calculateNewTrackLeft}px`,
    "--track-width": styles.width,
    zIndex: `${transform?.x ? 5 : 0}`,
  };

  return (
    <div
      ref={setNodeRef}
      className={`${css["drag-item"]}`}
      style={elementStyles}
    >
      <div
        ref={refContainer}
        id={id}
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

Toolbar.propTypes = {
  onPlay: PropTypes.func,
  isPlaying: PropTypes.bool,
  onSeek: PropTypes.func,
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
