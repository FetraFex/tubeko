import { faDownload, faImage, faLink, faSliders } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'

// One icon per step, in the order the dictionary lists them: paste the link,
// choose the format, start the download.
const STEP_ICONS = [faLink, faSliders, faDownload]

const HowToUse = () => {
  const { language } = useLanguage()
  const t = dictionary[language]

  return (
    <section
      id='how-to-use'
      aria-labelledby='how-to-use-heading'
      // scroll-mt-20 is what keeps the heading clear of the fixed bar when the menu
      // jumps here, the same offset the other landing sections carry.
      className='scroll-mt-20 bg-default-gradient flex justify-center px-4 py-16 sm:px-10 lg:px-20 xl:px-36 xl:py-24'
    >
      <div className='w-full max-w-6xl'>
        <h2 id='how-to-use-heading' className='text-3xl xl:text-5xl text-white font-bold text-center mb-1 xl:mb-3'>
          {t.howToUse}
        </h2>
        <p className='text-gray-400 xl:text-lg text-xs mb-4 text-center'>{t.howToUseDescription}</p>

        {/* An ordered list, because the order is the instruction: the browser hands a
            screen reader the step numbers the cards show as figures. */}
        <ol className='grid gap-4 xl:grid-cols-3 xl:gap-6 mt-5 xl:mt-10'>
          {t.howToUseSteps.map((step, index) => (
            <li
              key={step.title}
              className='relative rounded-lg p-[2px] border-gradient-c group transition-all duration-300 hover:shadow-2xl hover:shadow-[#72ffce9f]'
            >
              <div className='features-card h-full rounded-lg px-5 py-6 text-white xl:p-8'>
                {/* Image slot for the step. It renders the step's `image` path when the
                    dictionary eventually provides one, and holds this empty frame
                    (same 16:9 ratio as a screenshot) until then. */}
                <div className='mb-5 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-[#0f1112]'>
                  {step.image ? (
                    <img src={step.image} alt={step.title} loading='lazy' className='h-full w-full object-cover' />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center text-[#72ffce]/25 transition-colors duration-300 group-hover:text-[#72ffce]/45'>
                      <FontAwesomeIcon icon={faImage} className='text-4xl' />
                    </div>
                  )}
                </div>
                <div className='mb-4 flex items-center justify-between'>
                  <span className='flex h-11 w-11 items-center justify-center rounded-full border border-[#72ffce]/40 bg-[#72ffce]/10 text-[#a7ffe2]'>
                    <FontAwesomeIcon icon={STEP_ICONS[index]} />
                  </span>
                  <span className='font-sora text-3xl font-bold text-white/10 transition-colors duration-300 group-hover:text-[#72ffce]/25'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className='text-lg xl:text-2xl font-bold'>{step.title}</h3>
                <p className='mt-3 leading-relaxed text-gray-300'>{step.content}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowToUse
