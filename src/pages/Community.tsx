import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@supabase/supabase-js"

// ── Supabase client ────────────────────────────────────────────────
const supabase = createClient(
  "https://ulxzyjqmvzyqjynmqywe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI"
)

// ── Theme ──────────────────────────────────────────────────────────
const G   = "#c9a84c"
const GL  = "#e8c97a"
const GD  = "rgba(201,168,76,0.08)"
const GB  = "rgba(201,168,76,0.15)"
const BG  = "#0f0e0b"
const SURFACE = "#1a1813"
const SURFACE2 = "#221f18"
const TX  = "#f0e8d8"
const TM  = "rgba(240,232,216,0.5)"
const GRN = "#4ac878"
const SF  = "rgba(255,255,255,0.08)"
const BORDER = "rgba(255,255,255,0.08)"

// ── Helpers ────────────────────────────────────────────────────────
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago` 
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago` 
  const d = Math.floor(h / 24)
  return `${d}d ago` 
}

function getAvatarColor(name: string) {
  const colors = ["#c9a84c","#7eb8f7","#7ec87e","#f08080","#9b8dd4","#4fc3c3","#e8c97a","#88e0e0","#f0a070","#a0d4f0"]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const letter = (name || "?")[0].toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:getAvatarColor(name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.44, fontWeight:700, color:"#fff", flexShrink:0, fontFamily:"Crimson Pro, Georgia, serif" }}>
      {letter}
    </div>
  )
}

function StarRating({ value, onChange, size = 16 }: { value: number; onChange?: (v: number)=>void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(s=>(
        <span key={s}
          style={{ fontSize:size, cursor:onChange?"pointer":"default", color:s<=(hover||value)?"#c9a84c":"rgba(201,168,76,0.2)", transition:"color .15s" }}
          onMouseEnter={()=>onChange&&setHover(s)}
          onMouseLeave={()=>onChange&&setHover(0)}
          onClick={()=>onChange&&onChange(s)}>★</span>
      ))}
    </div>
  )
}

// ── User session (simple — just name + email from localStorage) ────
function useUser() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    const n = localStorage.getItem("hob_community_name")
    const e = localStorage.getItem("hob_email") || ""
    if (n) setName(n)
    else setShowSetup(true)
    setEmail(e)
  }, [])

  const saveUser = (n: string, e: string) => {
    localStorage.setItem("hob_community_name", n)
    if (e) localStorage.setItem("hob_email", e)
    setName(n); setEmail(e); setShowSetup(false)
  }

  return { name, email, showSetup, saveUser }
}

// ── User Setup Modal ───────────────────────────────────────────────
function UserSetupModal({ onSave }: { onSave: (name: string, email: string) => void }) {
  const [n, setN] = useState("")
  const [e, setE] = useState(localStorage.getItem("hob_email") || "")

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
      <motion.div initial={{ scale:.95, y:20 }} animate={{ scale:1, y:0 }}
        style={{ background:"#0d0d12", border:`1px solid ${GB}`, borderRadius:14, padding:"2rem", maxWidth:400, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:10 }}>👥</div>
        <h3 style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:G, marginBottom:8 }}>Join the Community</h3>
        <p style={{ fontSize:12, color:TM, marginBottom:20, lineHeight:1.6 }}>Choose a display name to start discussing books with other readers.</p>
        <input placeholder="Your display name (e.g. Sarah K.)" value={n} onChange={e=>setN(e.target.value)}
          style={{ width:"100%", padding:"9px 13px", background:"rgba(255,255,255,0.05)", border:`1px solid ${GB}`, borderRadius:8, color:TX, fontSize:13, outline:"none", marginBottom:10, boxSizing:"border-box" as any, fontFamily:"Georgia,serif" }}
          onFocus={ev=>ev.target.style.borderColor=G} onBlur={ev=>ev.target.style.borderColor=GB}/>
        <input placeholder="Email (optional — to identify you across devices)" value={e} onChange={ev=>setE(ev.target.value)}
          style={{ width:"100%", padding:"9px 13px", background:"rgba(255,255,255,0.05)", border:`1px solid ${GB}`, borderRadius:8, color:TX, fontSize:13, outline:"none", marginBottom:16, boxSizing:"border-box" as any, fontFamily:"Georgia,serif" }}
          onFocus={ev=>ev.target.style.borderColor=G} onBlur={ev=>ev.target.style.borderColor=GB}/>
        <button disabled={!n.trim()}
          onClick={()=>n.trim()&&onSave(n.trim(), e.trim())}
          style={{ width:"100%", padding:"11px", background:n.trim()?`linear-gradient(135deg,${G},${GL})`:"rgba(255,255,255,0.05)", color:n.trim()?"#06050a":TM, border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:n.trim()?"pointer":"not-allowed", letterSpacing:".04em" }}>
          Join Community →
        </button>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DISCUSS TAB — Real book discussions from Supabase
// ══════════════════════════════════════════════════════════════════
function DiscussTab({ user }: { user: { name: string; email: string } }) {
  const [books, setBooks]             = useState<any[]>([])
  const [selBook, setSelBook]         = useState<any>(null)
  const [discussions, setDiscussions] = useState<any[]>([])
  const [newComment, setNewComment]   = useState("")
  const [replyingTo, setReplyingTo]   = useState<string|null>(null)
  const [replyText, setReplyText]     = useState("")
  const [userRatings, setUserRatings] = useState<Record<string,number>>({})
  const [bookRatings, setBookRatings] = useState<Record<string,{avg:number,count:number}>>({})
  const [showRateModal, setShowRateModal] = useState(false)
  const [tempRating, setTempRating]   = useState(0)
  const [loading, setLoading]         = useState(false)
  const [posting, setPosting]         = useState(false)

  // Load books from Supabase
  useEffect(() => {
    supabase.from("books").select("id,title,author,cover_url,category").order("title").range(0, 49)
      .then(({ data }) => { if (data) setBooks(data) })
  }, [])

  // Load discussions when book selected
  useEffect(() => {
    if (!selBook) return
    setLoading(true)
    supabase.from("discussions").select("*").eq("book_id", selBook.id).is("parent_id", null).order("created_at", { ascending:false })
      .then(async({ data: posts }) => {
        if (!posts) { setDiscussions([]); setLoading(false); return }
        // Load replies for each post
        const withReplies = await Promise.all(posts.map(async post => {
          const { data: replies } = await supabase.from("discussions").select("*").eq("parent_id", post.id).order("created_at")
          return { ...post, replies: replies || [] }
        }))
        setDiscussions(withReplies)
        setLoading(false)
      })

    // Load ratings for this book
    supabase.from("book_ratings").select("rating").eq("book_id", selBook.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((s, r) => s + r.rating, 0) / data.length
          setBookRatings(p => ({ ...p, [selBook.id]: { avg: Math.round(avg * 10) / 10, count: data.length } }))
        }
      })

    // Load user's own rating
    if (user.email) {
      supabase.from("book_ratings").select("rating").eq("book_id", selBook.id).eq("user_email", user.email).single()
        .then(({ data }) => { if (data) setUserRatings(p => ({ ...p, [selBook.id]: data.rating })) })
    }
  }, [selBook?.id])

  const postComment = async () => {
    if (!newComment.trim() || !selBook || !user.name) return
    setPosting(true)
    const { data } = await supabase.from("discussions").insert({
      book_id: selBook.id, book_title: selBook.title,
      user_email: user.email || `anon_${Date.now()}`,
      user_name: user.name, content: newComment.trim(),
    }).select().single()
    if (data) setDiscussions(p => [{ ...data, replies:[] }, ...p])
    setNewComment("")
    setPosting(false)
  }

  const postReply = async (parentId: string) => {
    if (!replyText.trim() || !user.name) return
    const { data } = await supabase.from("discussions").insert({
      book_id: selBook.id, book_title: selBook.title,
      user_email: user.email || `anon_${Date.now()}`,
      user_name: user.name, content: replyText.trim(), parent_id: parentId,
    }).select().single()
    if (data) {
      setDiscussions(p => p.map(d => d.id===parentId ? { ...d, replies:[...d.replies, data] } : d))
    }
    setReplyingTo(null); setReplyText("")
  }

  const likePost = async (discId: string) => {
    await supabase.from("discussion_likes").insert({ discussion_id: discId, user_email: user.email || "anon" })
    await supabase.from("discussions").update({ likes: supabase.rpc ? undefined : 0 }).eq("id", discId)
    // Optimistic update
    setDiscussions(p => p.map(d => d.id===discId ? { ...d, likes:(d.likes||0)+1 } : d))
  }

  const rateBook = async () => {
    if (!tempRating || !selBook) return
    await supabase.from("book_ratings").upsert({
      book_id: selBook.id, user_email: user.email || `anon_${Date.now()}`,
      rating: tempRating,
    }, { onConflict: "book_id,user_email" })
    setUserRatings(p => ({ ...p, [selBook.id]: tempRating }))
    setShowRateModal(false)
    setTempRating(0)
  }

  const rating = selBook ? (bookRatings[selBook.id] || null) : null
  const userRating = selBook ? userRatings[selBook.id] : 0

  return (
    <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 116px)" }}>
      {/* Book sidebar */}
      <div style={{ width:260, borderRight:`1px solid ${GB}`, overflow:"auto", flexShrink:0 }}>
        <div style={{ padding:"10px 14px 6px", fontSize:9, color:G, letterSpacing:".14em", textTransform:"uppercase" }}>📚 Select Book</div>
        {books.length===0 && <div style={{ padding:"1rem 14px", fontSize:11, color:TM }}>Loading books…</div>}
        {books.map(book=>(
          <div key={book.id}
            style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid rgba(201,168,76,0.05)`, display:"flex", gap:9, alignItems:"center", background:selBook?.id===book.id?GD:"transparent", borderLeft:`2px solid ${selBook?.id===book.id?G:"transparent"}`, transition:"all .2s" }}
            onClick={()=>setSelBook(book)}>
            <img src={book.cover_url} alt={book.title} style={{ width:32, height:48, objectFit:"cover", borderRadius:3, flexShrink:0 }} onError={(e:any)=>e.target.src=`https://picsum.photos/seed/${book.id}/32/48`}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:500, color:selBook?.id===book.id?G:TX, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.3 }}>{book.title}</div>
              <div style={{ fontSize:9, color:TM, marginTop:2 }}>{book.author}</div>
              {bookRatings[book.id] && (
                <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:3 }}>
                  <StarRating value={Math.round(bookRatings[book.id].avg)} size={9}/>
                  <span style={{ fontSize:8, color:"rgba(201,168,76,0.6)" }}>{bookRatings[book.id].avg}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Discussion panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {!selBook ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:TM }}>
            <div style={{ fontSize:36 }}>📖</div>
            <div style={{ fontSize:13, fontFamily:"Georgia,serif" }}>Select a book to read discussions</div>
            <div style={{ fontSize:11 }}>Be the first to start a conversation</div>
          </div>
        ) : (
          <>
            {/* Book header */}
            <div style={{ padding:"12px 18px", borderBottom:`1px solid ${GB}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <img src={selBook.cover_url} alt={selBook.title} style={{ width:36, height:54, objectFit:"cover", borderRadius:3 }} onError={(e:any)=>e.target.src=`https://picsum.photos/seed/${selBook.id}/36/54`}/>
                <div>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem", color:G, fontWeight:600 }}>{selBook.title}</div>
                  <div style={{ fontSize:10, color:TM }}>by {selBook.author} · {selBook.category}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                    <StarRating value={userRating || Math.round(rating?.avg||0)} size={12}/>
                    <span style={{ fontSize:9, color:TM }}>
                      {userRating ? `Your rating: ${userRating}★` : rating ? `${rating.avg}★ avg (${rating.count})` : "Not yet rated"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={()=>{ setTempRating(userRating||0); setShowRateModal(true) }}
                style={{ padding:"6px 14px", background:"transparent", border:`1px solid ${GB}`, color:TM, borderRadius:6, fontSize:10, cursor:"pointer", letterSpacing:".06em", textTransform:"uppercase", transition:"all .2s" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=G)} onMouseLeave={e=>(e.currentTarget.style.borderColor=GB)}>
                ★ Rate Book
              </button>
            </div>

            {/* Post comment */}
            <div style={{ padding:"14px 18px", borderBottom:`1px solid rgba(201,168,76,0.07)`, flexShrink:0 }}>
              <div style={{ display:"flex", gap:9 }}>
                <Avatar name={user.name} size={28}/>
                <div style={{ flex:1 }}>
                  <textarea
                    style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:8, padding:"9px 12px", color:TX, fontSize:13, outline:"none", resize:"none", fontFamily:"Georgia,serif", lineHeight:1.5, minHeight:58, boxSizing:"border-box" as any, transition:"border-color .2s" }}
                    placeholder={`Share your thoughts on "${selBook.title}"…`}
                    value={newComment} onChange={e=>setNewComment(e.target.value)}
                    onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GB}
                    onKeyDown={e=>{ if(e.key==="Enter"&&e.metaKey) postComment() }}
                  />
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
                    <button disabled={!newComment.trim()||posting} onClick={postComment}
                      style={{ padding:"7px 18px", background:newComment.trim()?`linear-gradient(135deg,${G},${GL})`:"rgba(255,255,255,0.05)", color:newComment.trim()?"#06050a":TM, border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:newComment.trim()?"pointer":"not-allowed", letterSpacing:".04em" }}>
                      {posting?"Posting…":"Post Discussion"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Discussions */}
            <div style={{ flex:1, overflow:"auto", padding:"14px 18px" }}>
              {loading && <div style={{ textAlign:"center", padding:"2rem", color:TM, fontSize:12 }}>Loading discussions…</div>}
              {!loading && discussions.length===0 && (
                <div style={{ textAlign:"center", padding:"3rem", color:TM, fontSize:13 }}>
                  No discussions yet. Be the first! ✦
                </div>
              )}
              {discussions.map(disc=>(
                <div key={disc.id} style={{ background:SURFACE, border:"0.5px solid " + BORDER, borderLeft:"3px solid rgba(201,168,76,0.2)", borderRadius:14, padding:"14px 16px", marginBottom:12, transition:"borderLeftColor .2s, background .2s", animation:"fadeUp .3s ease forwards" }}>
                  <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                    <Avatar name={disc.user_name} size={38}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                        <span style={{ fontSize:14, fontWeight:500, color:TX }}>{disc.user_name}</span>
                        <span style={{ fontSize:9, color:TM }}>{timeAgo(disc.created_at)}</span>
                      </div>
                      <p style={{ fontSize:14, color:"rgba(240,232,216,0.85)", lineHeight:1.65, marginBottom:9 }}>{disc.content}</p>
                      <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                        <button onClick={()=>likePost(disc.id)}
                          style={{ background:"none", border:"none", color:"rgba(201,168,76,0.6)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4, padding:0 }}>
                          ♥ {disc.likes||0}
                        </button>
                        <button onClick={()=>setReplyingTo(replyingTo===disc.id?null:disc.id)}
                          style={{ background:"none", border:"none", color:TM, fontSize:11, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:5, fontFamily:"'Crimson Pro', serif", transition:"color .2s" }}>
                          ↩ Reply {disc.replies?.length>0&&`(${disc.replies.length})`}
                        </button>
                      </div>

                      {/* Replies */}
                      {disc.replies?.length>0&&(
                        <div style={{ marginTop:12, marginLeft:46, paddingLeft:16, borderLeft:"1px solid " + GB, display:"none", animation:"fadeUp .25s ease forwards" }} id={`replies-${disc.id}`} className={replyingTo===disc.id?"open":""}>
                          {disc.replies.map((r:any)=>(
                            <div key={r.id} style={{ display:"flex", gap:7, marginBottom:8 }}>
                              <Avatar name={r.user_name} size={30}/>
                              <div>
                                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                  <span style={{ fontSize:11, fontWeight:600, color:TX }}>{r.user_name}</span>
                                  <span style={{ fontSize:9, color:TM }}>{timeAgo(r.created_at)}</span>
                                </div>
                                <p style={{ fontSize:12.5, color:"rgba(240,232,216,0.75)", lineHeight:1.6, marginTop:2 }}>{r.content}</p>
                              </div>
                            </div>
                          ))}
                          <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginTop:10 }}>
                            <Avatar name={user.name} size={30}/>
                            <div style={{ flex:1, display:"flex", gap:8, alignItems:"flex-start" }}>
                              <textarea
                                style={{ flex:1, background:SURFACE, border:"0.5px solid " + GB, borderRadius:10, padding:"8px 12px", fontSize:13, fontFamily:"'Crimson Pro', serif", color:TX, resize:"none", minHeight:44, transition:"border-color .2s" }}
                                placeholder="Leave a reply…"
                                value={replyText} onChange={e=>setReplyText(e.target.value)}
                                onKeyDown={e=>{ if(e.key==="Enter") postReply(disc.id) }}
                                onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GB}
                              />
                              <button onClick={()=>postReply(disc.id)} style={{ padding:"7px 14px", background:GD, border:"0.5px solid " + GB, borderRadius:8, fontSize:12, color:G, cursor:"pointer", fontFamily:"'Crimson Pro', serif", transition:"background .2s", whiteSpace:"nowrap", alignSelf:"flex-end" }}>Reply</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rate modal */}
      <AnimatePresence>
        {showRateModal&&selBook&&(
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setShowRateModal(false)}>
            <motion.div initial={{ scale:.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.9 }}
              style={{ background:"rgba(14,14,20,0.98)", border:`1px solid ${GB}`, borderRadius:12, padding:"28px", maxWidth:320, width:"90%", textAlign:"center" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"1.2rem", color:G, marginBottom:6 }}>Rate This Book</div>
              <div style={{ fontSize:12, color:TM, marginBottom:18 }}>{selBook.title}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:16 }}>
                <StarRating value={tempRating} onChange={setTempRating} size={30}/>
              </div>
              <div style={{ fontSize:11, color:TM, marginBottom:16 }}>
                {["","Didn't enjoy it","It was okay","Liked it","Really liked it","It was amazing"][tempRating]||"Tap to rate"}
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                <button onClick={()=>setShowRateModal(false)} style={{ padding:"7px 16px", background:"transparent", border:`1px solid ${GB}`, color:TM, borderRadius:6, fontSize:11, cursor:"pointer" }}>Cancel</button>
                <button disabled={!tempRating} onClick={rateBook} style={{ padding:"7px 18px", background:tempRating?`linear-gradient(135deg,${G},${GL})`:"rgba(255,255,255,0.05)", color:tempRating?"#06050a":TM, border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:tempRating?"pointer":"not-allowed" }}>Save Rating</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// GROUPS TAB — Real groups + Realtime chat
// ══════════════════════════════════════════════════════════════════
function GroupsTab({ user }: { user: { name: string; email: string } }) {
  const [groups, setGroups]           = useState<any[]>([])
  const [selGroup, setSelGroup]       = useState<any>(null)
  const [messages, setMessages]       = useState<any[]>([])
  const [newMsg, setNewMsg]           = useState("")
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate]   = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupEmoji, setNewGroupEmoji] = useState("📚")
  const [newGroupCat, setNewGroupCat] = useState("General")
  const [searchQ, setSearchQ]         = useState("")
  const [posting, setPosting]         = useState(false)
  const messagesEndRef = useRef<any>(null)

  // Load groups
  useEffect(() => {
    supabase.from("groups").select("*").order("member_count", { ascending:false })
      .then(({ data }) => { if (data) setGroups(data) })

    // Load joined groups for this user
    if (user.email) {
      supabase.from("group_members").select("group_id").eq("user_email", user.email)
        .then(({ data }) => { if (data) setJoinedGroups(new Set(data.map(d=>d.group_id))) })
    }
  }, [user.email])

  // Load messages + subscribe to realtime when group selected
  useEffect(() => {
    if (!selGroup) return
    setMessages([])

    supabase.from("group_messages").select("*").eq("group_id", selGroup.id).order("created_at").limit(50)
      .then(({ data }) => { if (data) setMessages(data) })

    // Realtime subscription
    const channel = supabase.channel(`group-${selGroup.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"group_messages", filter:`group_id=eq.${selGroup.id}` },
        payload => setMessages(p => [...p, payload.new])
      ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selGroup?.id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  const joinGroup = async (group: any) => {
    if (joinedGroups.has(group.id)) return
    await supabase.from("group_members").insert({ group_id:group.id, user_email:user.email||`anon_${Date.now()}`, user_name:user.name })
    await supabase.from("groups").update({ member_count: (group.member_count||0)+1 }).eq("id", group.id)
    setJoinedGroups(p => new Set([...p, group.id]))
    setGroups(p => p.map(g => g.id===group.id ? { ...g, member_count:(g.member_count||0)+1 } : g))
  }

  const sendMsg = async () => {
    if (!newMsg.trim() || !selGroup || !user.name) return
    setPosting(true)
    await supabase.from("group_messages").insert({
      group_id: selGroup.id,
      user_email: user.email || `anon_${Date.now()}`,
      user_name: user.name,
      content: newMsg.trim(),
    })
    // Update last_message in group
    await supabase.from("groups").update({ last_message: newMsg.trim().slice(0,80) }).eq("id", selGroup.id)
    setNewMsg(""); setPosting(false)
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    const { data } = await supabase.from("groups").insert({
      name: newGroupName.trim(), emoji: newGroupEmoji, category: newGroupCat,
      created_by: user.email || user.name, is_private: false, member_count: 1,
      last_message: "Group created!"
    }).select().single()
    if (data) {
      setGroups(p => [data, ...p])
      await supabase.from("group_members").insert({ group_id:data.id, user_email:user.email||user.name, user_name:user.name, role:"admin" })
      setJoinedGroups(p => new Set([...p, data.id]))
      setSelGroup(data)
    }
    setShowCreate(false); setNewGroupName("")
  }

  const filtered = groups.filter(g => g.name.toLowerCase().includes(searchQ.toLowerCase()) || (g.category||"").toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 116px)" }}>
      {/* Groups sidebar */}
      <div style={{ width:260, borderRight:`1px solid ${GB}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"10px 12px", display:"flex", gap:8, alignItems:"center" }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search groups…"
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:6, padding:"6px 10px", color:TX, fontSize:11, outline:"none", fontFamily:"Georgia,serif" }}/>
          <button onClick={()=>setShowCreate(true)}
            style={{ padding:"6px 11px", background:`linear-gradient(135deg,${G},${GL})`, color:"#06050a", border:"none", borderRadius:6, fontSize:10, fontWeight:700, cursor:"pointer" }}>
            + New
          </button>
        </div>
        <div style={{ flex:1, overflow:"auto" }}>
          {filtered.map(group=>(
            <div key={group.id}
              style={{ padding:"11px 14px", cursor:"pointer", borderBottom:`1px solid rgba(201,168,76,0.05)`, background:selGroup?.id===group.id?GD:"transparent", borderLeft:`2px solid ${selGroup?.id===group.id?G:"transparent"}`, transition:"all .2s" }}
              onClick={()=>setSelGroup(group)}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                <span style={{ fontSize:15 }}>{group.emoji||"📚"}</span>
                <span style={{ fontSize:12, fontWeight:500, color:selGroup?.id===group.id?G:TX }}>{group.name}</span>
                {group.is_private&&<span style={{ fontSize:7, background:GD, color:G, padding:"1px 5px", borderRadius:3 }}>PRIVATE</span>}
              </div>
              <div style={{ fontSize:9, color:TM, paddingLeft:22 }}>{group.member_count||0} members</div>
              {group.last_message&&<div style={{ fontSize:9, color:"rgba(232,228,217,0.3)", paddingLeft:22, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{group.last_message}</div>}
              {joinedGroups.has(group.id)&&<div style={{ paddingLeft:22, marginTop:3 }}><span style={{ fontSize:7.5, color:GRN, letterSpacing:".04em" }}>● JOINED</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Group chat */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {!selGroup ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:TM }}>
            <div style={{ fontSize:36 }}>👥</div>
            <div style={{ fontSize:13, fontFamily:"Georgia,serif" }}>Select a group to start reading together</div>
            <div style={{ fontSize:11 }}>Or create your own reading circle</div>
          </div>
        ) : (
          <>
            <div style={{ padding:"12px 18px", borderBottom:`1px solid ${GB}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <span style={{ fontSize:20 }}>{selGroup.emoji}</span>
                <div>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"0.95rem", color:G, fontWeight:600 }}>{selGroup.name}</div>
                  <div style={{ fontSize:9, color:TM }}>{selGroup.member_count||0} members · {selGroup.category}</div>
                </div>
              </div>
              {!joinedGroups.has(selGroup.id)
                ? <button onClick={()=>joinGroup(selGroup)} style={{ padding:"6px 16px", background:`linear-gradient(135deg,${G},${GL})`, color:"#06050a", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Join Group</button>
                : <span style={{ fontSize:9, color:GRN, letterSpacing:".08em" }}>● Joined</span>
              }
            </div>

            <div style={{ flex:1, overflow:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:12 }}>
              {messages.length===0&&<div style={{ textAlign:"center", padding:"2rem", color:TM, fontSize:12 }}>No messages yet. Start the conversation!</div>}
              {messages.map((msg:any)=>(
                <motion.div key={msg.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} style={{ display:"flex", gap:9 }}>
                  <Avatar name={msg.user_name} size={28}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:7, alignItems:"baseline", marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:msg.user_name===user.name?G:TX }}>{msg.user_name}</span>
                      <span style={{ fontSize:9, color:TM }}>{timeAgo(msg.created_at)}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:"4px 10px 10px 10px", padding:"9px 13px", fontSize:13, color:"rgba(232,228,217,0.85)", lineHeight:1.62 }}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef}/>
            </div>

            <div style={{ padding:"10px 16px", borderTop:`1px solid ${GB}`, display:"flex", gap:8, flexShrink:0 }}>
              {joinedGroups.has(selGroup.id) ? (
                <>
                  <input
                    style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:8, padding:"10px 13px", color:TX, fontSize:13, outline:"none", fontFamily:"Georgia,serif", transition:"border-color .2s" }}
                    placeholder={`Message ${selGroup.name}…`}
                    value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey) sendMsg() }}
                    onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GB}
                    disabled={posting}/>
                  <button onClick={sendMsg} disabled={!newMsg.trim()||posting}
                    style={{ width:40, height:40, background:newMsg.trim()?`linear-gradient(135deg,${G},${GL})`:"rgba(255,255,255,0.05)", border:"none", borderRadius:8, cursor:newMsg.trim()?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:newMsg.trim()?1:0.35 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={newMsg.trim()?"#06050a":G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </>
              ) : (
                <div style={{ flex:1, textAlign:"center", fontSize:11, color:TM, padding:"10px" }}>Join this group to send messages</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create group modal */}
      <AnimatePresence>
        {showCreate&&(
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(10px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setShowCreate(false)}>
            <motion.div initial={{ scale:.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.9 }}
              style={{ background:"rgba(14,14,20,0.98)", border:`1px solid ${GB}`, borderRadius:12, padding:"24px", maxWidth:380, width:"90%" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", color:G, marginBottom:16 }}>Create Reading Group</div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, color:TM, letterSpacing:".1em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Emoji</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["📚","🏛️","🚀","💰","🔮","🌅","🎨","🔬","🌍","✍️"].map(e=>(
                    <button key={e} onClick={()=>setNewGroupEmoji(e)}
                      style={{ width:34, height:34, background:newGroupEmoji===e?GD:SF, border:`1px solid ${newGroupEmoji===e?G:GB}`, borderRadius:6, fontSize:16, cursor:"pointer" }}>{e}</button>
                  ))}
                </div>
              </div>
              <input placeholder="Group name…" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:7, color:TX, fontSize:13, outline:"none", marginBottom:10, boxSizing:"border-box" as any, fontFamily:"Georgia,serif" }}/>
              <select value={newGroupCat} onChange={e=>setNewGroupCat(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", background:"rgba(10,10,15,0.98)", border:`1px solid ${GB}`, borderRadius:7, color:TX, fontSize:13, outline:"none", marginBottom:18 }}>
                {["Philosophy","Business","Finance","Self-Help","Psychology","Science","Productivity","History","General"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setShowCreate(false)} style={{ flex:1, padding:"9px", background:"transparent", border:`1px solid ${GB}`, color:TM, borderRadius:7, fontSize:12, cursor:"pointer" }}>Cancel</button>
                <button disabled={!newGroupName.trim()} onClick={createGroup}
                  style={{ flex:1, padding:"9px", background:newGroupName.trim()?`linear-gradient(135deg,${G},${GL})`:"rgba(255,255,255,0.05)", color:newGroupName.trim()?"#06050a":TM, border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:newGroupName.trim()?"pointer":"not-allowed" }}>
                  Create Group
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DISCOVER TAB — trending discussions + top rated books
// ══════════════════════════════════════════════════════════════════
function DiscoverTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [topGroups, setTopGroups]           = useState<any[]>([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from("groups").select("*").order("member_count", { ascending:false }).limit(5),
    ]).then(([grps]) => {
      setTopGroups(grps.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding:"3rem", textAlign:"center", color:TM, fontSize:12 }}>Loading community highlights…</div>

  return (
    <div style={{ padding:"22px", overflow:"auto", height:"calc(100vh - 116px)" }}>
      {/* Featured Groups — Display Cards */}
      <div style={{ marginBottom:22, textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:".15em", textTransform:"uppercase", color:G, marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:10 }}>Featured Groups</div>
      </div>
      
      <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", minHeight:220, padding:"20px 0 40px" }}>
        <div style={{ display:"grid", gridTemplateAreas:"'stack'", placeItems:"start center", width:360 }}>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateY(0)", filter:"grayscale(90%) brightness(.7)", zIndex:1 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>📖</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>Philosophy Club</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Deep dives into stoicism, existentialism & more</div>
            <div style={{ fontSize:11, color:TM }}>128 members · Active now</div>
          </div>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateX(44px) translateY(28px)", filter:"grayscale(55%) brightness(.85)", zIndex:2 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🌍</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>World Literature</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Books from 15+ countries, 10+ languages</div>
            <div style={{ fontSize:11, color:TM }}>94 members · 3 reading now</div>
          </div>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateX(88px) translateY(56px)", filter:"none", zIndex:3 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>�</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>Sci-Fi Readers</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Classic and modern science fiction picks</div>
            <div style={{ fontSize:11, color:TM }}>67 members · New chapter dropped</div>
          </div>
        </div>
      </div>

      {/* All Groups */}
      <div style={{ marginTop:20, marginBottom:10, textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:".15em", textTransform:"uppercase", color:G, marginBottom:10 }}>All Groups</div>
      </div>
      
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))", gap:14 }}>
        {topGroups.map((group:any)=>(
          <div key={group.id} style={{ background:SURFACE, border:"0.5px solid " + BORDER, borderLeft:"3px solid " + GB, borderRadius:14, padding:"1.1rem 1rem", cursor:"pointer", transition:"transform .25s, borderLeftColor .25s, background .25s" }}
            onClick={()=>onNavigate("groups")}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderLeftColor=G; e.currentTarget.style.background=SURFACE2}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderLeftColor=GB; e.currentTarget.style.background=SURFACE}}>
            <span style={{ fontSize:24, marginBottom:10, display:"block" }}>{group.emoji||"📚"}</span>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:14, color:TX, marginBottom:5 }}>{group.name}</div>
            <div style={{ fontSize:12, color:TM }}>{group.member_count||0} members</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMMUNITY APP
// ══════════════════════════════════════════════════════════════════
export default function Community() {
  const [tab, setTab] = useState("discover")
  const { name, email, showSetup, saveUser } = useUser()
  const user = { name, email }

  return (
    <div style={{ fontFamily:"'Crimson Pro', Georgia, serif", background:BG, color:TX, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {showSetup && <UserSetupModal onSave={saveUser}/>}

      {/* ─── PAGE HEADER ─── */}
      <div style={{ textAlign:"center", marginBottom:"3rem", paddingBottom:"2rem", borderBottom:"0.5px solid " + GB }}>
        <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:"2.2rem", color:G, letterSpacing:".04em", marginBottom:".4rem" }}>📚 House of Books</h1>
        <p style={{ fontSize:"1rem", color:TM }}>Community — Live Discussions & Reading Groups</p>
      </div>

      {/* ─── TABS ─── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:"2rem" }}>
        <div style={{ display:"inline-flex", background:SURFACE, border:"0.5px solid " + GB, borderRadius:"999px", padding:"5px", position:"relative", gap:"2px" }}>
          <div style={{ position:"absolute", top:"5px", height:"calc(100% - 10px)", background:GD, border:"0.5px solid " + GB, borderRadius:"999px", transition:"all .35s cubic-bezier(.4,0,.2,1)", zIndex:0, width:tab === "discover" ? "60px" : tab === "discuss" ? "80px" : "60px", left:tab === "discover" ? "0px" : tab === "discuss" ? "60px" : "140px" }}></div>
          <div style={{ position:"absolute", top:"-5px", left:"50%", transform:"translateX(-50%)", width:"60%", height:"3px", background:G, borderRadius:"0 0 4px 4px", boxShadow:"0 6px 30px 6px rgba(201,168,76,0.35)" }}></div>
          {[
            {id:"discover",label:"✦ Discover"},
            {id:"discuss",label:"💬 Discussions"}, 
            {id:"groups",label:"👥 Groups"}
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"8px 24px", borderRadius:"999px", fontSize:14, fontFamily:"'Crimson Pro', serif", cursor:"pointer", color:TM, transition:"color .2s", position:"relative", zIndex:1, border:"none", background:"none", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.15 }} style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {tab==="discuss"  && <DiscussTab user={user}/>}
          {tab==="groups"   && <GroupsTab user={user}/>}
          {tab==="discover" && <DiscoverTab onNavigate={setTab}/>}
        </motion.div>
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Crimson+Pro:wght@300;400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0 }
        
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .community-header {
            padding: 1rem 0.75rem !important;
          }
          
          .community-title {
            font-size: 1.4rem !important;
          }
          
          .community-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
            padding: 0 0.75rem !important;
          }
          
          .post-card {
            padding: 1rem !important;
            border-radius: 12px !important;
          }
          
          .post-content {
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          .post-header {
            flex-direction: column !important;
            gap: 8px !important;
            text-align: center !important;
          }
          
          .post-meta {
            font-size: 12px !important;
          }
          
          .post-actions {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          
          .post-action-btn {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
