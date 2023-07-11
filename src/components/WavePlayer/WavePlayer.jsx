/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/display-name */
import { useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import PropTypes from "prop-types";

import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import converterTime from "../../helper/converterTime";

import css from "./WavePlayer.module.css";

export const WavePlayer = forwardRef(
  (
    {
      id,
      url,
      name,
      onRegionTime,
      onDuration,
      onlyName,
      fillParent,
      minPxPerSec,
      hideScrollbar,
      ...props
    },
    ref
  ) => {
    const playerRef = useRef();
    const { wavesurfer, time, regionTime } = useWaveSurfer(playerRef, {
      url,
      fillParent,
      minPxPerSec,
      hideScrollbar,
    });

    const TogglePlay = () => {
      wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
    };

    useImperativeHandle(
      ref,
      () => {
        if (wavesurfer === null) return;

        return {
          id,
          isPlaying: wavesurfer.isPlaying.bind(wavesurfer),
          TogglePlay,
        };
      },
      [wavesurfer]
    );

    useEffect(() => {
      if (onRegionTime) {
        onRegionTime(regionTime);
      }
    }, [regionTime]);


    useEffect(() => {
      if (time?.duration && onDuration) {
        onDuration(time.duration)
      }
    }, [time])

    // useEffect(() => {
    //   if (!wavesurfer) return;

    //   wavesurfer.once('decode', () => {
    //     const slider = document.querySelector('input[type="range"]')

    //     const ZOOM = {
    //       '1': 18.75,
    //       '2': 20,
    //       '3': 30,
    //       '4': 10,
    //       '5': 5,
    //       '6': 1
    //     }
      
    //     slider.addEventListener('input', (e) => {
    //       const minPxPerSec = e.target.valueAsNumber

    //       console.log(ZOOM[minPxPerSec])
    //       wavesurfer.zoom(ZOOM[minPxPerSec])
    //     })

        //   })
    // }, [wavesurfer])

    return (
      <button id={id} className="w-full" {...props}>
        <small className="block text-left">
          {!onlyName &&
            `${converterTime(time.currentTime)} - ${converterTime(
              time.duration
            )} | `}
          <b>{name}</b>
        </small>
        <div
          ref={playerRef}
          className={`${css.waveplayer} border-4 border-[color:var(--clr-body)] rounded-md px-2`}
        />
      </button>
    );
  }
);

WavePlayer.defaultProps = {
  fillParent: true
}

WavePlayer.propTypes = {
  id: PropTypes.string,
  url: PropTypes.string,
  name: PropTypes.string,
  onRegionTime: PropTypes.func,
  onDuration: PropTypes.func,
  onlyName: PropTypes.bool,
  fillParent: PropTypes.bool,
  minPxPerSec: PropTypes.number,
  hideScrollbar: PropTypes.bool,
};
