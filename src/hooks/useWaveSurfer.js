import { useCallback, useEffect, useState } from "react"
import WaveSurfer from "https://unpkg.com/wavesurfer.js@beta";
import Regions from "https://unpkg.com/wavesurfer.js@7.0.0-beta.11/dist/plugins/regions.js";
import Hover from 'https://unpkg.com/wavesurfer.js@beta/dist/plugins/hover.js'

export const useWaveSurfer = (element, url) => {
    const [wavesurfer, setWaveSurfer] = useState(null)

    const [time, setTime] = useState({
        duration: 0,
        currentTime: 0
    })

    const [regionTime, setRegionTime] = useState({
        startRegion: 0,
        endRegion: 0
    })

    const WaveSurferRegion = useCallback(() => wavesurfer.plugins[0], [wavesurfer]);

    useEffect(() => {
        if (!element.current) return;

        const wave = WaveSurfer.create({
            container: element.current,
            url,
            waveColor: "rgb(53, 50, 62)",
            progressColor: "rgb(171, 171, 171)",
            plugins: [
                Regions.create(),
                Hover.create({
                    lineColor: 'rgb(53, 50, 62)',
                    lineWidth: 4,
                    labelBackground: 'rgb(53, 50, 62)',
                    labelColor: '#fff',
                    labelSize: '11px',
                }),
            ],
            barWidth: "3",
            barGap: "2",
            barRadius: "2",
            // fillParent: true,
            normalize: true,
            // minPxPerSec: 1
        });

        setWaveSurfer(wave);

        return () => {
            wave.destroy();
        };
    }, [url, element]);

    useEffect(() => {
        if (!wavesurfer) return;

        setTime((prev) => ({ ...prev, currentTime: 0 }));

        // Events
        wavesurfer.on("ready", () => {
            const duration = wavesurfer.getDuration();

            WaveSurferRegion().addRegion({
                start: 0,
                end: duration,
                color: "rgb(42 207 207 / 22%)"
            });

            setTime(prev => ({ ...prev, duration }))
            setRegionTime(prev => ({ ...prev, endRegion: duration }))
        });

        wavesurfer.on("timeupdate", (currentTime) => {
            setTime(prev => ({ ...prev, currentTime }))
        });

        WaveSurferRegion().on("region-updated", (region) => {
            setRegionTime({
                startRegion: region.start,
                endRegion: region.end,
            })
        });

        return () => {
            wavesurfer.unAll();
        };

    }, [wavesurfer, WaveSurferRegion]);


    return {
        wavesurfer,
        time,
        regionTime: regionTime
    }
}