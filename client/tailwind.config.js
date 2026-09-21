/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ["Nunito"],
        breathney: ["Breathney"],
        mistergrape: ["MisterGrape"],
        sinera: ["Sinera"],
        // Brand wordmark face: contemporary geometric sans, variable 100-800.
        sora: ["Sora"]
      },
      backgroundImage: {
        // The hero's ramp, painted by every section from the hero down to the footer so
        // the page reads as one continuous background. Three foci with black between them.
        'default-gradient': 'linear-gradient(90deg, #060B0A 9%, #071210 22%, #091B16 33%, #0C241C 46%, #0E3222 63%, #0C241C 80%, #050806 100%)'
      },
      backdropBlur: {
        '3xl' : '40px',
        '4xl' : '70px'
      },
      boxShadow: {
        'intense' : '0px 0px 10px rgba(114, 255, 206, 1)'
      }
    },
  },
  plugins: [],
}