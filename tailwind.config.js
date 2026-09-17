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
        'custom-gradient': 'linear-gradient(90deg, rgba(18,18,18,1) 9%, rgba(24,16,16,1) 22%, rgba(37,20,20,1) 33%, rgba(56,28,28,1) 63%, rgba(19,15,15,1) 100%)'
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