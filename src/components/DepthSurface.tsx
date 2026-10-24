import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { Icon } from './Icon'

// Motion values update transforms without re-rendering the library on pointer move.
export function DepthSurface({ children, style, className='', ...props }: HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0), y = useMotionValue(0)
  const rotateX = useSpring(x, { stiffness:180, damping:24 })
  const rotateY = useSpring(y, { stiffness:180, damping:24 })
  const reset = () => { x.set(0); y.set(0) }
  return <motion.div {...props} className={'depth-surface '+className}
    initial={reduced ? false : { opacity:0, y:12 }} whileInView={{opacity:1,y:0}}
    viewport={{once:true,amount:0.08}} transition={{duration:0.45}}
    whileHover={reduced ? undefined : {y:-4}} whileTap={reduced ? undefined : {scale:0.985}}
    style={{...style,rotateX:reduced?0:rotateX,rotateY:reduced?0:rotateY,transformPerspective:1000}}
    onPointerMove={e => { if(reduced || e.pointerType!=='mouse') return; const r=e.currentTarget.getBoundingClientRect(); x.set((0.5-(e.clientY-r.top)/r.height)*7); y.set(((e.clientX-r.left)/r.width-0.5)*9) }}
    onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
    {children}
  </motion.div>
}
export function StatSculpture({ icon='chart' }: {icon?:string}) {
  return <span className="stat-sculpture" aria-hidden="true"><span className="sculpture-base"/><span className="sculpture-tile sculpture-tile-back"/><span className="sculpture-tile"><Icon name={icon} size={25}/></span></span>
}
export function MetricTile({value,label,icon='chart',sub}:{value:string|number;label:string;icon?:string;sub?:string}) {
  return <DepthSurface className="metric-tile" tabIndex={0} aria-label={label+': '+value}>
    <StatSculpture icon={icon}/><div className="metric-copy"><div className="metric-value">{value}</div><div className="metric-label">{label}</div>{sub&&<div className="metric-sub">{sub}</div>}</div>
  </DepthSurface>
}
