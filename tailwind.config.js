// tailwind.config.js
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
        'custom-gradient': 'linear-gradient(90deg, rgba(18,18,18,1) 9%, rgba(16,20,19,1) 22%, rgba(27,37,30,1) 33%, rgba(48,56,38,1) 63%, rgba(15,17,19,1) 100%)'
      },
      backdropBlur: {
        '3xl': '40px',
        '4xl': '70px'
      },
      boxShadow: {
        'intense': '0px 0px 10px rgba(255, 255, 255, 1)'
      }
    },
  },
  variants: {
    extend: {
      scrollbar: ['rounded'], // <- Keep this if using tailwind-scrollbar plugin
    },
  },
  plugins: [
    require('tailwind-scrollbar'), // <- Fix: use `require` instead of `import`
  ],
}
