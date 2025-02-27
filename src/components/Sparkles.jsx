import React from 'react'
import { useState, useEffect } from 'react';
import { motion } from "framer-motion";

const Sparkles = () => {
    const [sparks, setSparks] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSparks((prevSparks) => [
                ...prevSparks,
                { id: Math.random(), x: Math.random() * 100, y: Math.random() * 100 }
            ]);
            setTimeout(() => {
                setSparks((prevSparks) => prevSparks.slice(1));
            }, 1000);
        }, 300);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full">
            {sparks.map((spark) => (
                <motion.div
                    key={spark.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    style={{
                        top: `${spark.y}%`,
                        left: `${spark.x}%`
                    }}
                />
            ))}
        </div>
    );
}

export default Sparkles