/* eslint-disable react/prop-types */
import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { FileAudio } from "../FileAudio";

import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  useDraggable,
} from "@dnd-kit/core";

import styleCSS from "./VideoJoiner.module.css";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import converterTime from "../../helper/converterTime";

function useResize({ container, duration, parent: parentRef }) {
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
      if (newWidth <= size.current.base &&  newLeft >= 0) {
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
      const minPxPerSec = parentRef.clientWidth / duration;

      // Calcular el tamaño base en función de la duración y el número mínimo de píxeles por segundo
      const baseSize = duration * minPxPerSec;

      size.current.base = baseSize;
      size.current.width = baseSize;

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

export const VideoJoiner = () => {
  const [files, setFiles] = useState([]);
  const [frames, setFrames] = useState([]);

  //   const videoRef = useRef();
  const canvasRef = useRef();
  const containerRef = useRef();

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

  const handleFrames = async (e) => {
    const video = e.target;
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

    setFrames((prev) => [
      ...prev,
      {
        id: video.id,
        duration: durationInSeconds,
        frames: [...frames],
      },
    ]);
  };

  const createVideoElement = (data) => {
    const element = document.createElement("video");
    element.setAttribute("id", data.id);
    element.setAttribute("preload", "auto");
    element.src = data.url;

    element.onloadeddata = handleFrames;
  };

  const handleFile = (files) => {
    files.forEach((video) => {
      createVideoElement(video);
    });

    setFiles(files);
    console.log("called 👁‍🗨");
  };

  // console.log(containerRef.current?.clientWidth)

  return (
    <div className="flow">
      {files.length === 0 ? (
        <FileAudio multiple onFile={handleFile} accept="video/mp4" />
      ) : (
        <div className="flow py-4">
          <video
            preload="auto"
            src={files[0]?.url}
            controls
            className="aspect-video m-auto"
          ></video>
          <div
            ref={containerRef}
            id="container"
            className="flex relative border-[color:var(--clr-body)] border-4 rounded-md  py-9 my-2 w-full overflow-x-auto"
          >
            <div className="h-[36px] z-[30] absolute top-0 bg-neutral-100 rounded flex-shrink-0">
              <TimeLine
                slider={2}
                duration={frames.reduce((t, frame) => t + frame.duration, 0)}
              />
            </div>

            {frames.map((group) => (
              <Drag
                key={group.id}
                id={group.id}
                duration={group.duration}
                containerRef={containerRef}
              >
                <FrameVideo frames={group.frames} />
              </Drag>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            width="640px"
            height="360px"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

function Drag({ children, onPositionUpdate, ...props }) {
  const [{ x }, setCoordinates] = useState({ x: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = ({ delta }) => {
    setCoordinates(({ x }) => ({ x: x + delta.x }));
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <Drag.Item axisX={x} {...props}>
        {children}
      </Drag.Item>
    </DndContext>
  );
}

const Item = ({ children, id, containerRef, duration, axisX }) => {
  const { listeners, setNodeRef, transform } = useDraggable({ id });
  const refContainer = useRef();

  const {
    styles: { width, left },
  } = useResize({
    container: refContainer.current,
    parent: containerRef.current,
    duration,
  });

  const elementLeft = parseInt(left) + axisX;

  const elementStyle = {
    "--translate-x": `${transform?.x ?? 0}px`,
    left: elementLeft,
    width,
  };

  return (
    <div
      className="relative h-14 w-auto border-2 border-green-400"
      ref={setNodeRef}
      {...listeners}
    >
      <div
        style={elementStyle}
        ref={refContainer}
        className={`absolute  items-center cursor-default border-4 border-red-400 overflow-x-hidden ${styleCSS.test_drag}`}
      >
        {children}

        <span
          data-resize-side="left"
          className={`${styleCSS.resize__buttons} ${styleCSS["resize__buttons--left"]}`}
        ></span>
        <span
          data-resize-side="right"
          className={`${styleCSS.resize__buttons} ${styleCSS["resize__buttons--right"]}`}
        ></span>
      </div>
    </div>
  );
};

Drag.Item = Item;

const TimeLine = forwardRef(({ duration, slider = 5 }, ref) => {
  console.log(slider);

  const timeLineNumbers = Array.from(
    { length: Math.floor(duration / slider) },
    (_, i) => i * slider
  );

  const lines = timeLineNumbers.map((_, i) => {
    const visibleNumber = (Math.round(i * 100) / 100) % 5 === 0;

    return (
      <div
        key={i}
        className="select-none pointer-events-none flex flex-col items-center relative"
      >
        {visibleNumber && (
          <>
            <small className="text-[11px] absolute bottom-[16px] text-gray-300 font-bold">
              {i === 0 ? 0 : converterTime(timeLineNumbers[i])}
            </small>
            <div className="bg-gray-300 flex-shrink-0 absolute bottom-0 w-[2px] h-[14px]"></div>
          </>
        )}
        <div className="bg-gray-300 flex-shrink-0 absolute bottom-0 w-[1px] h-[9px]"></div>
      </div>
    );
  });

  return duration ? (
    <div
      ref={ref}
      data-component="timeline"
      className="px-[4.8px] w-full h-full items-end flex"
      style={{ gap: "16px" }}
    >
      {lines}
    </div>
  ) : null;
});

function FrameVideo({ frames }) {
  return (
    <ul className="flex">
      {frames.map(({ id, url }) => (
        <li key={id} className="w-24 shrink-0 grow-0 ">
          <img src={url} alt="" className="w-full h-auto block" />
        </li>
      ))}
    </ul>
  );
}
