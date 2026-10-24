// Return curated messages only; upstream bodies and credentials never reach clients.
export function voiceFailure(httpStatus, payload = {}) {
  const detail = payload?.detail
  const reason = typeof detail === 'object' && !Array.isArray(detail)
    ? String(detail.status || detail.code || detail.type || '') : ''
  if (['quota_exceeded','insufficient_credits'].includes(reason) || httpStatus === 402)
    return { status:503, code:'VOICE_QUOTA_EXCEEDED', error:'Audio generation is unavailable because the ElevenLabs credit limit has been reached.' }
  if (['missing_permissions','insufficient_permissions','permission_denied'].includes(reason))
    return { status:503, code:'VOICE_PERMISSION_DENIED', error:'ElevenLabs denied this request. Check the key permissions and account access.' }
  if (['invalid_api_key','authentication_error','invalid_authorization_header'].includes(reason) || httpStatus === 401)
    return { status:503, code:'VOICE_AUTH_FAILED', error:'The audio service credentials were rejected. The administrator needs to check the ElevenLabs key.' }
  if (['voice_not_found','voice_access_denied','voice_not_allowed','paid_plan_required'].includes(reason))
    return { status:503, code:'VOICE_UNAVAILABLE', error:'The selected narrator is unavailable for this ElevenLabs account.' }
  if (httpStatus === 403)
    return { status:503, code:'VOICE_PERMISSION_DENIED', error:'ElevenLabs denied this request. Check the key permissions and account access.' }
  if (httpStatus === 429)
    return { status:429, code:'VOICE_RATE_LIMITED', error:'The voice provider is busy. Please try again shortly.' }
  return { status:502, code:'VOICE_PROVIDER_ERROR', error:'The voice provider could not generate audio. Please try again later.' }
}

export async function diagnoseVoice({key,storageConfigured,fetchImpl=fetch}) {
  if (!storageConfigured) return { ok:false, code:'VOICE_STORAGE_MISSING', message:'SUPABASE_SERVICE_ROLE_KEY is missing in this deployment.' }
  if (!key) return { ok:false, code:'VOICE_KEY_MISSING', message:'ELEVENLABS_API_KEY is missing in this deployment.' }
  const response = await fetchImpl('https://api.elevenlabs.io/v1/user/subscription', {
    headers:{'xi-api-key':key},signal:AbortSignal.timeout(12000),
  })
  const payload = await response.json().catch(()=>({}))
  if (!response.ok) {
    const failure = voiceFailure(response.status,payload)
    return {ok:false,code:failure.code,message:failure.code==='VOICE_PERMISSION_DENIED'
      ? 'This key cannot read subscription diagnostics. This does not establish whether Text to Speech permission works.' : failure.error}
  }
  const used = Number(payload.character_count), limit = Number(payload.character_limit)
  const remaining = Number.isFinite(used)&&Number.isFinite(limit) ? Math.max(0,limit-used) : null
  return {ok:remaining===null||remaining>0,code:remaining===0?'VOICE_QUOTA_EXCEEDED':'VOICE_KEY_ACCEPTED',
    message:remaining===0?'The key is accepted, but the ElevenLabs character allowance is exhausted.':'ElevenLabs accepted the key for subscription diagnostics. Narrator access and Text to Speech permission still need a playback check.',remaining}
}
