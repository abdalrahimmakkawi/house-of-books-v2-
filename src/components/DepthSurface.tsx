import { motion, useReducedMotion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { Icon } from './Icon'

// Keep the dimensional artwork fixed; only fade in once, without spring or tilt.
export function DepthSurface({ children, style, className='', ...props }: HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion()
  return <motion.div {...props} className={'depth-surface '+className}
    initial={reduced ? false : { opacity:0 }} whileInView={{opacity:1}}
    viewport={{once:true,amount:0.08}} transition={{duration:0.25,ease:'easeOut'}}
    style={style}>
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
