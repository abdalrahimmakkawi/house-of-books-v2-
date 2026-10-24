import test from 'node:test'
import assert from 'node:assert/strict'
import {voiceFailure,diagnoseVoice} from '../api/_lib/voice-errors.js'
import {readVoiceResponse} from '../src/lib/voiceResponse.js'

test('quota errors returned as 401 are not mislabeled as invalid keys',()=>{
  assert.equal(voiceFailure(401,{detail:{status:'quota_exceeded'}}).code,'VOICE_QUOTA_EXCEEDED')
  assert.equal(voiceFailure(401,{detail:{status:'invalid_api_key'}}).code,'VOICE_AUTH_FAILED')
  assert.equal(voiceFailure(400,{detail:{status:'voice_not_found'}}).code,'VOICE_UNAVAILABLE')
  assert.equal(voiceFailure(403,{detail:{status:'missing_permissions'}}).code,'VOICE_PERMISSION_DENIED')
})
test('upstream error bodies never leak into returned messages',()=>{
  const result=voiceFailure(500,{detail:{message:'private upstream details'}})
  assert.ok(!JSON.stringify(result).includes('private upstream'))
})
test('diagnostics use only a read request and return no key',async()=>{
  const result=await diagnoseVoice({key:'fake-private-key',storageConfigured:true,fetchImpl:async(url,opts)=>{
    assert.equal(url,'https://api.elevenlabs.io/v1/user/subscription')
    assert.equal(opts.headers['xi-api-key'],'fake-private-key')
    assert.equal(opts.method,undefined)
    return Response.json({character_count:100,character_limit:100})
  }})
  assert.equal(result.code,'VOICE_QUOTA_EXCEEDED')
  assert.equal(result.remaining,0)
  assert.ok(!JSON.stringify(result).includes('fake-private-key'))
})
test('missing keys and diagnostic-only permission failures are distinguished',async()=>{
  assert.equal((await diagnoseVoice({storageConfigured:true})).code,'VOICE_KEY_MISSING')
  const result=await diagnoseVoice({key:'test',storageConfigured:true,fetchImpl:async()=>Response.json({detail:{status:'missing_permissions'}},{status:403})})
  assert.match(result.message,/does not establish/)
})
test('player accepts the binary MP3 fallback and releases its temporary URL',async()=>{
  const result=await readVoiceResponse(new Response(new Uint8Array([73,68,51,0]),{headers:{'Content-Type':'audio/mpeg'}}))
  assert.equal(result.temporary,true)
  assert.ok(result.url.startsWith('blob:'))
  URL.revokeObjectURL(result.url)
})
test('player preserves cached URLs and surfaces actionable provider errors',async()=>{
  assert.deepEqual(await readVoiceResponse(Response.json({url:'https://example.test/audio.mp3'})),{url:'https://example.test/audio.mp3',temporary:false})
  await assert.rejects(readVoiceResponse(Response.json({error:'The audio service credentials were rejected.'},{status:503})),/credentials were rejected/)
})
