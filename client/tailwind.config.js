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
        sinera: ["Sinera"]
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(90deg, rgba(13,17,26,1) 9%, rgba(15,23,38,1) 22%, rgba(17,31,52,1) 33%, rgba(20,44,78,1) 63%, rgba(11,15,24,1) 100%)'
      },
      backdropBlur: {
        '3xl' : '40px',
        '4xl' : '70px'
      },
      boxShadow: {
        'intense' : '0px 0px 10px rgba(255, 255, 255, 1)'
      }
    },
  },
  plugins: [],
}