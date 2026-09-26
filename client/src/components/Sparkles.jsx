import React, { useState } from 'react'

/* A single spark.
 *
 * The drift is a CSS keyframe animation rather than a framer-motion tween, for
 * two reasons:
 *
 *  1. Cost. Two dozen of these run at once behind the hero's full-screen backdrop
 *     blur. A transform/opacity keyframe animation is driven by the compositor, so
 *     it costs no main-thread time, where 24 JS-driven tweens competed with React
 *     for every frame.
 *  2. Continuity. The random path used to be rebuilt during render, so any
 *     re-render of the hero (every keystroke in the URL field) handed framer
 *     motion a fresh set of targets and the drift visibly restarted. The seed is
 *     now decided once per mount, and a CSS animation is untouched by renders.
 */
const Sparkles = React.memo(function Sparkles({ direction }) {
    // Lazy initialiser: runs on mount only, so a re-render cannot disturb the path.
    const [seed] = useState(() => ({
        // Was `Math.random > 0.5` - comparing the function itself, so every spark
        // always drifted to the left. Now a real coin flip.
        x: (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 351),
        y: Math.floor(Math.random() * 50),
        // Same 2-5s spread as before.
        duration: (Math.random() * 3 + 2).toFixed(2),
    }))

    const isUp = direction === 'up'

    return (
        <div
            className={`w-1 h-1 blurry-border shadow-intense bg-[#72ffce] absolute z-50 will-change-transform ${isUp ? 'spark-up' : 'spark-down'}`}
            style={{
                // The falling field starts to the right of the rising one, as before.
                '--spark-x': `${seed.x + (isUp ? 0 : 270)}px`,
                '--spark-y': `${seed.y}px`,
                '--spark-duration': `${seed.duration}s`,
            }}
        />
    )
})

export default Sparkles
