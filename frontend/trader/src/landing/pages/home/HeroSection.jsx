import PrismaticBurst from '../../components/PrismaticBurst'
import ShimmerText from '../../components/ShimmerText'

export default function HeroSection() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: 'rgb(5, 10, 8)', overflow: 'hidden' }}>
      {/* Background PrismaticBurst WebGL Animation */}
      <div className="absolute inset-0 z-0">
        <PrismaticBurst
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={0}
          mixBlendMode="lighten"
          colors={['#00d048', '#34d979', '#ffffff']}
        />
      </div>

      {/* Text overlay — left aligned, vertically centered */}
      <div className="absolute inset-0 z-10 flex items-center pointer-events-none px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32">
        <div className="w-full max-w-7xl text-left pointer-events-auto">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <ShimmerText
              className="text-[28px] sm:text-[36px] md:text-[45px] lg:text-[56px] xl:text-[67px] font-extrabold text-white leading-[1.08] tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]"
              duration={1.5}
              delay={0.5}
            >
              Execution trade with lightning speed
            </ShimmerText>
            <ShimmerText
              className="text-[28px] sm:text-[36px] md:text-[45px] lg:text-[56px] xl:text-[67px] font-extrabold text-white leading-[1.08] tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]"
              duration={1.5}
              delay={1.5}
            >
              Trade with confidence
            </ShimmerText>
          </div>
          <h6 className="mt-5 sm:mt-6 md:mt-8 text-sm sm:text-base md:text-lg text-white/60 max-w-3xl leading-relaxed font-normal whitespace-normal">
            Trade smarter with ultra-fast execution, tight spreads, and powerful brokerage tools that ensure precision, stability, and confidence in every transaction.
          </h6>
        </div>
      </div>
    </div>
  )
}
