// Development-only fixture screen. It never loads authenticated app data.
import { useState } from 'react'
import { FocusCard, buildStyles, THEMES } from '../App'
import { Icon, categoryIcon } from '../components/Icon'
import { MetricTile } from '../components/DepthSurface'
import marineJson from '../../data/marine-biology.json?raw'

export default function DesignPreview() {
  const [themeId,setThemeId]=useState('classic')
  const [category,setCategory]=useState('All')
  const [saved,setSaved]=useState<Record<string,boolean>>({})
  const [selected,setSelected]=useState<any>(null)
  const books=JSON.parse(marineJson)
  const theme=THEMES.find(t=>t.id===themeId)!
  return <><style>{buildStyles(theme,'ltr')}</style><div className="app-bg"/>
    <header className="app-header"><span className="logo-text"><Icon name="library"/> House of Books</span><div className="header-right">{['classic','light','beach'].map(id=><button className="view-tab" key={id} onClick={()=>setThemeId(id)} aria-pressed={themeId===id}>{id}</button>)}</div></header>
    <main className="main-content"><div className="section-header"><h1 className="section-title">A little curiosity,<br/><span>a whole new world.</span></h1><span className="section-count">Design preview</span></div>
      <div className="metric-grid"><MetricTile value="307" label="Books to explore" icon="library"/><MetricTile value={Object.values(saved).filter(Boolean).length} label="On your shelf" icon="bookmark"/><MetricTile value="5" label="Languages" icon="globe"/></div>
      <div className="cat-tabs">{['All','Science','Psychology','Philosophy','Business','Finance','Self-help','Biography','History','Fiction','Health','Creativity','Productivity'].map(c=><button className={'cat-tab'+(category===c?' active':'')} key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}><Icon name={categoryIcon(c)}/>{c}</button>)}</div>
      <div className="books-grid">{books.filter((b:any)=>category==='All'||category===b.category).map((book:any)=><FocusCard key={book.id} book={book} isLocked={false} shelfStatus={saved[book.id]?'want':'none'} onToggleShelf={()=>setSaved(p=>({...p,[book.id]:!p[book.id]}))} onOpen={()=>setSelected(book)}/>)}</div>
      {selected&&<div className="email-modal-wrap" onClick={()=>setSelected(null)}><div style={{maxWidth:640,maxHeight:'80vh',overflowY:'auto',padding:28,background:'var(--modal-bg)',borderRadius:20}} onClick={e=>e.stopPropagation()}><button className="icon-btn" aria-label="Close book" onClick={()=>setSelected(null)}><Icon name="close"/></button><h2>{selected.title}</h2><p style={{lineHeight:1.8,marginTop:20}}>{selected.summary}</p></div></div>}
    </main></>
}
