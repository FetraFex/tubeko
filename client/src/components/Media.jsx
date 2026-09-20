import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faNoteSticky, faFilm, faMicrophone, faHeadphones, faCirclePlay, faTv, faPlay, faPause, faVolumeDown, faVolumeUp, faCamera, faCameraRetro, faForward, faBackward } from '@fortawesome/free-solid-svg-icons'
import { faYoutube } from '@fortawesome/free-brands-svg-icons'
import { motion } from 'framer-motion'

const Media = () => {
    const mediaIcons = [faMusic, faNoteSticky, faFilm, faMicrophone, faHeadphones, faCirclePlay, faTv, faPlay, faPause, faVolumeDown, faVolumeUp, faCamera, faCameraRetro, faForward, faBackward, faYoutube]

    const getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const generateUniqueRandomArray = (length, min, max) => {
        if (max - min + 1 < length) {
            throw new Error("Range is too small to generate unique numbers.");
        }

        const uniqueNumbers = new Set();
        while (uniqueNumbers.size < length) {
            uniqueNumbers.add(getRandomInt(min, max));
        }

        return Array.from(uniqueNumbers);
    };

    const randomIndexes = generateUniqueRandomArray(16, 0, 15);
    const firstHalfIndexes = randomIndexes.slice(0, Math.floor(randomIndexes.length / 2));
    const secondHalfIndexes = randomIndexes.slice(Math.floor(randomIndexes.length / 2));

    let d = 0.3


    return (
        <div className='flex absolute z-40 w-screen justify-around'>
            <div>
                {firstHalfIndexes.map((indexValue, index) => (

                    <motion.div
                        key={index}
                        initial={{ scale: 2 }}
                        animate={{
                            opacity: [0, 0.2, 0],
                            scale: [2, 5],
                            x: [0, -450],
                            y: [0, (Math.random() > 0.5) ? -Math.random() * 300 : Math.random() * 300],
                        }}
                        transition={{
                            duration: Math.floor(Math.random() * (12 - 7 + 1)) + 7,
                            delay: d + (index * 1.5),
                            repeat: Infinity,
                            ease: "linear",
                            repeatType: "loop",
                        }}
                    >
                        <FontAwesomeIcon icon={mediaIcons[indexValue]} color='white' />
                    </motion.div>
                )
                )}
            </div>
            <div>
                {secondHalfIndexes.map((indexValue, index) => (
                    <motion.div
                        key={index}
                        initial={{ scale: 2 }}
                        animate={{
                            opacity: [0, 0.2, 0],
                            scale: [2, 5],
                            x: [0, 450],
                            y: [0, (Math.random() > 0.5) ? -Math.random() * 300 : Math.random() * 300],
                        }}
                        transition={{
                            duration: Math.floor(Math.random() * (12 - 7 + 1)) + 7,
                            delay: d + (index * 1.5),
                            repeat: Infinity,
                            ease: "linear",
                            repeatType: "loop",
                        }}
                    >
                        <FontAwesomeIcon icon={mediaIcons[indexValue]} color='white' />
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

export default Media