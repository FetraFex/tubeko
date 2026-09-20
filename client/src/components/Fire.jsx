import React from "react";
import { Particles } from "react-particles";
import { loadSlim } from "tsparticles-slim";

const Fire = () => {
  const particlesInit = async (engine) => {
    await loadSlim(engine); // Loads the lightweight tsparticles version
  };

  return (
    <Particles
      id="fire-particles"
      init={particlesInit}
      options={{
        fullScreen: false, // Keeps fire inside the parent div
        background: { color: "transparent" },
        particles: {
          number: { value: 100 },
          color: { value: ["#ff4500", "#ff8c00", "#ffd700"] }, // Fire colors
          shape: { type: "circle" },
          opacity: { value: 0.8, random: true },
          size: { value: 4, random: true },
          move: {
            direction: "top",
            speed: 2,
            outModes: { default: "destroy" },
          },
        },
      }}
    />
  );
};

export default Fire;
