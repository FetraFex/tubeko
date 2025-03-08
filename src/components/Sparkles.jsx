import React from 'react'
import { useState, useEffect } from 'react';
import { motion } from "framer-motion";

const Sparkles = ({ direction }) => {
    const randomX = Math.floor(Math.random() * (350 - 0 + 1)) + 0;
    const initialX = Math.random > 0.5 ? randomX : -randomX;

    const initialY = Math.floor(Math.random() * (50));

    const particleDuration = Math.random() * (10 - 7) + 2;

    if (direction === "up") {
        return (
            <motion.div
                className="w-1 h-1 blurry-border shadow-intense shadow-white bg-white absolute z-50"
                initial={{ x: initialX, y: initialY }}
                animate={{
                    x: [initialX - 64, initialX - 60, initialX - 68, initialX - 120, initialX - 170], 
                    y: [-initialY - 100, -initialY - 300], // Wiggle effect in y-axis
                    opacity: [0, 1, 1, 0], // Gradual fade-out
                }}
                transition={{
                    duration: particleDuration,
                    ease: "easeIn",
                    repeat: Infinity,
                    repeatType: "loop",
                    times: [0, 0.3, 0.6, 1]
                }}
            />
        );
    } else {
        return (
            <motion.div
                className="w-1 h-1 blurry-border shadow-intense shadow-white bg-white absolute z-50"
                initial={{ x: initialX + 270, y: initialY }} 
                animate={{
                    x: [initialX + 64 + 270, initialX + 60 + 270, initialX + 68 + 270, initialX + 120 + 270, initialX + 170 + 270], // Wiggle effect in x-axis
                    y: [initialY + 100, initialY + 300], 
                    opacity: [0, 1, 1, 0], 
                }}
                transition={{
                    duration: particleDuration,
                    ease: "easeIn",
                    repeat: Infinity,
                    repeatType: "loop",
                    times: [0, 0.3, 0.6, 1]
                }}
            />
        );
    }
}

export default Sparkles