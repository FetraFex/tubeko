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
        'custom-gradient': 'linear-gradient(90deg, rgba(14,25,17,1) 9%, rgba(19,34,23,1) 22%, rgba(25,44,32,1) 33%, rgba(33,65,46,1) 63%, rgba(13,22,16,1) 100%)'
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