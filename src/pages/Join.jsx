import { Shell, AudioJoiner } from "../components"

export function Join () { 

    return (
        <Shell className="content-center text-center">
            <h1 className="text-[length:var(--fs-500)]">Join Audio</h1>
            <p>Put your audios files and join them into a single file.</p>
            <AudioJoiner/>
        </Shell>
    )
}