import { Link, useLocation } from 'react-router-dom'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Navbar from './Navbar'
import Footer from './Footer'
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'

// Section titles carry numbering and spaces ("1. Acceptance of the Terms"), which
// cannot be an id, so every heading and jump link derives the same slug instead.
const slug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// The contact address appears inline in several paragraphs, in every language, so
// it is turned into a real mailto link at render time rather than repeated as a
// hardcoded element in the text.
const CONTACT_EMAIL = 'nyora.help@gmail.com'
const withMailto = (text) =>
    text.split(CONTACT_EMAIL).flatMap((part, index) =>
        index === 0
            ? [part]
            : [
                  <a
                      key={index}
                      href={`mailto:${CONTACT_EMAIL}`}
                      className='text-[#72ffce] underline underline-offset-2 transition-colors duration-200 hover:text-[#a7ffe2]'
                  >
                      {CONTACT_EMAIL}
                  </a>,
                  part,
              ]
    )

const Legal = () => {
    const { pathname } = useLocation()
    const { language } = useLanguage()
    const t = dictionary[language].legal

    // Both documents share this page and differ only by route, so /terms and
    // /privacy are real, linkable URLs for two documents written as one label in
    // the footer. Each one names the other at the top, which is where a reader who
    // landed on the wrong half needs it.
    const isPrivacy = pathname.startsWith('/privacy')
    const doc = {
        id: isPrivacy ? 'privacy' : 'terms',
        title: isPrivacy ? t.privacy : t.terms,
        intro: isPrivacy ? t.privacyIntro : t.termsIntro,
        sections: isPrivacy ? t.privacySections : t.termsSections,
    }
    const other = { id: isPrivacy ? 'terms' : 'privacy', title: isPrivacy ? t.terms : t.privacy }

    return (
        <div className='min-h-screen bg-default-gradient'>
            <Navbar />
            <main className='text-white pt-28 xl:pt-36 pb-24 px-4 sm:px-10 lg:px-20 xl:px-36'>
                <div className='mx-auto w-full max-w-3xl'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <Link
                            to='/'
                            className='inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors duration-200 hover:text-[#a7ffe2]'
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className='text-xs' />
                            {t.backHome}
                        </Link>
                        <Link
                            to={`/${other.id}`}
                            className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-medium transition-colors duration-200 hover:border-[#72ffce]/40 hover:text-[#a7ffe2]'
                        >
                            {other.title}
                            <FontAwesomeIcon icon={faArrowRight} className='text-xs text-[#72ffce]' />
                        </Link>
                    </div>

                    <p className='mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#72ffce]'>{t.updatedAt}</p>

                    {/* Jump list: the in-page navigation a long legal page ships with, one
                        entry per numbered section of the document below. */}
                    <nav
                        aria-label={t.onthispage}
                        className='mt-4 mb-12 rounded-2xl border border-white/10 bg-[#08130f]/60 p-4 backdrop-blur-md'
                    >
                        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/50 mb-2'>{t.onthispage}</p>
                        <ul className='list-[circle] list-inside space-y-0.5 text-sm text-white/60'>
                            {doc.sections.map((section) => (
                                <li key={section.title}>
                                    <a
                                        href={`#${slug(section.title)}`}
                                        className='transition-colors duration-200 hover:text-[#a7ffe2]'
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* The document itself: one h1 naming it, each numbered section an h2
                        under it - the heading order and semantics screen readers and the
                        in-page anchors both expect. */}
                    <article aria-labelledby={`${doc.id}-heading`}>
                        {/* The scroll offset has to sit on the element the hash names:
                            the wrapper is not the anchor target, so a margin on it would
                            do nothing and the heading would land under the fixed bar. */}
                        <h1
                            id={`${doc.id}-heading`}
                            className='scroll-mt-28 font-sora text-2xl xl:text-4xl font-bold text-white mb-3 hero-title-glow'
                        >
                            {doc.title}
                        </h1>
                        <p className='text-white/70 leading-relaxed mb-8'>{doc.intro}</p>
                        <div className='space-y-6'>
                            {doc.sections.map((section) => {
                                const id = slug(section.title)
                                return (
                                    <section key={section.title} aria-labelledby={id}>
                                        <h2 id={id} className='scroll-mt-28 text-lg xl:text-xl font-semibold text-[#a7ffe2] mb-2'>
                                            {section.title}
                                        </h2>
                                        {section.body.map((paragraph, index) => (
                                            <p key={index} className='text-white/70 leading-relaxed'>
                                                {withMailto(paragraph)}
                                            </p>
                                        ))}
                                    </section>
                                )
                            })}
                        </div>
                    </article>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default Legal
