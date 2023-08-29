

export default function converterTime(time) {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    // const milliseconds = Math.floor((time % 1) * 1000);

    return (
        ("0" + minutes).slice(-2) +
        ":" +
        ("0" + seconds).slice(-2) 
    );
}
