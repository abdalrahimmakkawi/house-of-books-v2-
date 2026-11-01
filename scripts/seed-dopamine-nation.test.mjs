import test from 'node:test'
import assert from 'node:assert/strict'
import {books,seedDopamineNation,validateBooks,main} from './seed-dopamine-nation.mjs'
test('complete Psychology entry; repeated imports preserve existing content',async()=>{
  validateBooks(books)
  const rows=[{id:'existing',title:'Another title',author:'Author',category:'psychology'}]
  let writes=0
  const options={url:'https://example.test',key:'test',log:()=>{},fetchImpl:async(url,opts)=>{
    if(opts.method==='POST'){writes++;rows.push(...JSON.parse(opts.body));return new Response(null,{status:204})}
    return Response.json(rows)
  }}
  assert.equal((await seedDopamineNation(options)).verified,1)
  assert.equal(rows[1].category,'psychology')
  assert.equal((await seedDopamineNation(options)).candidates,0)
  assert.equal(writes,1)
})
test('existing author without the Dr honorific is recognized',async()=>{
  const result=await seedDopamineNation({url:'https://example.test',key:'test',log:()=>{},fetchImpl:async(url,opts)=>{
    assert.notEqual(opts.method,'POST')
    return Response.json([{...books[0],id:'existing-id',author:'Anna Lembke'}])
  }})
  assert.equal(result.candidates,0)
})
test('preview builds skip writes; failed database requests stop publication',async()=>{
  await main(['--production-only'],{VERCEL_ENV:'preview'})
  await assert.rejects(seedDopamineNation({url:'https://example.test',key:'test',fetchImpl:async()=>new Response(null,{status:403})}),/HTTP 403/)
})
