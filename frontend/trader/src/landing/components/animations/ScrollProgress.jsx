import { motion, useScroll } from 'framer-motion'

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: 'left',
        height: 3,
        background: 'linear-gradient(to right, #00d048, #00d048)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
      }}
    />
  )
}

export default ScrollProgress
