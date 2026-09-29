import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { faCircleCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// How long a toast stays up before it leaves on its own. Long enough to read a
// count and a name, short enough that a second fetch is not hidden behind the
// first toast.
export const TOAST_DURATION_MS = 5000

// A success card, deliberately presentational: the caller owns the wording and
// when the card is gone, so the same component can report any finished job.
// Mounting *is* the event - give it a new key per toast and the countdown below
// starts fresh, while a re-render of the parent never restarts it.
const Toast = ({ title, message, onClose }) => {
    // Held in a ref so the timeout effect can keep empty deps: an inline onClose
    // is a new function on every parent render, and depending on it would reset
    // the timer each time and leave the card up for good.
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        const timer = setTimeout(() => onCloseRef.current(), TOAST_DURATION_MS)
        return () => clearTimeout(timer)
    }, [])

    return (
        <motion.div
            role='status'
            aria-live='polite'
            initial={{ y: -16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className='pointer-events-auto relative w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[#72ffce]/25 bg-[#08130f]/95 p-4 shadow-[0_22px_50px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl'
        >
            <div className='flex items-start gap-3'>
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#72ffce]/15'>
                    <FontAwesomeIcon icon={faCircleCheck} className='text-sm text-[#72ffce]' />
                </span>
                <div className='min-w-0 flex-1 text-left'>
                    <p className='font-semibold text-white'>{title}</p>
                    <p className='mt-0.5 text-xs leading-relaxed text-white/60'>{message}</p>
                </div>
                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Dismiss notification'
                    className='-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors duration-150 hover:bg-white/10 hover:text-white'
                >
                    <FontAwesomeIcon icon={faXmark} className='text-xs' />
                </button>
            </div>
            {/* Counts down the time left on screen, echoing the progress bars in
                the rows below. */}
            <motion.span
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: TOAST_DURATION_MS / 1000, ease: 'linear' }}
                className='absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-[#16b98c] to-[#72ffce]'
            />
        </motion.div>
    )
}

export default Toast
