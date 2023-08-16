import { Shell, VideoJoiner } from "../components"

export function JoinVideo () { 

    return (
        <Shell className="content-center text-center">
            <h1 className="text-[length:var(--fs-500)]">Join Video</h1>
            <p>Put your audios files and join them into a single file.</p>
            <VideoJoiner/>
        </Shell>
    )
}