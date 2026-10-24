// Storage fallback returns an MP3 body; normal cached responses return a URL.
export async function readVoiceResponse(response) {
  if(response.ok && (response.headers.get('content-type')||'').startsWith('audio/')) {
    const blob = await response.blob()
    if(!blob.size) throw new Error('The voice service returned an empty audio file.')
    return {url:URL.createObjectURL(blob),temporary:true}
  }
  const data = await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(data.error || (response.status===429
    ? 'Listening limit reached — try again in a bit.' : 'Audio unavailable right now.'))
  if(!data.url) throw new Error('Audio unavailable right now.')
  return {url:data.url,temporary:false}
}
