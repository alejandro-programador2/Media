import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import Regions from "https://unpkg.com/wavesurfer.js@7.0.0-beta.11/dist/plugins/regions.js";
import Hover from "https://unpkg.com/wavesurfer.js@beta/dist/plugins/hover.js";

import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import converterTime from "../../helper/converterTime";

import css from "./WavePlayer.module.css";

export const WavePlayer = forwardRef(
  (
    {
      id,
      url,
      name,
      interact = true,
      hasPlugins = true,
      hiddenTime,
      minPxPerSec,
      onRegionTime,
      ...props
    },
    ref
  ) => {
    const [regionTime, setRegionTime] = useState({
      startRegion: 0,
      endRegion: 0,
    });

    const playerRef = useRef();
    const { wavesurfer, time } = useWaveSurfer(playerRef, {
      url,
      minPxPerSec,
      interact,
      ...(hasPlugins && {
        plugins: [
          Regions.create(),
          Hover.create({
            lineColor: "rgb(53, 50, 62)",
            lineWidth: 3,
            labelBackground: "rgb(53, 50, 62)",
            labelColor: "#fff",
            labelSize: "11px",
          }),
        ],
      }),
    });

    const TogglePlay = () => {
      wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
    };

    const setWaveTime = (time) => {
      wavesurfer.setTime(time)
    }

    const WaveSurferRegion = useCallback(
      () => hasPlugins && wavesurfer.plugins[0],
      [wavesurfer, hasPlugins]
    );

    useEffect(() => {
      if (!wavesurfer || !hasPlugins) return;

      // Events
      wavesurfer.on("ready", () => {
        const duration = wavesurfer.getDuration();

        WaveSurferRegion().addRegion({
          start: 0,
          end: duration,
          color: "rgb(42 207 207 / 22%)",
        });

        setRegionTime((prev) => ({ ...prev, endRegion: duration }));
      });

      WaveSurferRegion().on("region-updated", (region) => {
        setRegionTime({
          startRegion: region.start,
          endRegion: region.end,
        });
      });

      return () => {
        wavesurfer.unAll();
      };
    }, [wavesurfer, WaveSurferRegion, hasPlugins]);

    useImperativeHandle(
      ref,
      () => {
        if (wavesurfer) {
          return {
            id,
            isPlaying: wavesurfer.isPlaying.bind(wavesurfer),
            duration: time.duration,
            currentTime: time.currentTime,
            TogglePlay,
            setWaveTime
          };
        }
      },
      [wavesurfer, time]
    );

    useEffect(() => {
      if (onRegionTime) {
        onRegionTime(regionTime);
      }
    }, [regionTime]);

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
      <button
        id={id}
        className="w-full"
        {...props}
      >
        <small className="block text-left">
          {!hiddenTime &&
            `${converterTime(time.currentTime)} - ${converterTime(
              time.duration
            )} | `}
          <b>{name}</b>
        </small>
        <div
          ref={playerRef}
          className={`${css.waveplayer} border-4 border-[color:var(--clr-body)] rounded-md`}
        />
      </button>
    );
  }
);

WavePlayer.propTypes = {
  id: PropTypes.string,
  url: PropTypes.string,
  name: PropTypes.string,
  interact: PropTypes.bool,
  noPlugins: PropTypes.bool,
  hiddenTime: PropTypes.bool,
  minPxPerSec: PropTypes.number,
  onRegionTime: PropTypes.func,
  hasPlugins: PropTypes.bool,
};
