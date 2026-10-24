# Audio diagnostics

Existing recordings play from Supabase Storage. First listens without a recording
call ElevenLabs, upload an MP3, and save its URL. Failure on new titles while
saved recordings play narrows the problem to generation or its persistence;
it does not by itself establish that the key is invalid.

An administrator can open the account panel and choose **Check voice service**.
The server verifies the Supabase session and admin email before making a read-only
ElevenLabs subscription request. It never returns or logs the key. This check
uses no speech credits. A key lacking subscription-read permission cannot be
fully diagnosed this way; an actual playback response is then the useful signal.

Voice errors distinguish rejected keys, permissions, exhausted credits, unavailable
narrators, throttling, and timeouts. Upstream error bodies are not exposed.
See the [ElevenLabs error reference](https://elevenlabs.io/docs/eleven-api/resources/errors).

The player accepts both cached URL JSON and the binary MP3 fallback used when
storage uploads fail, releasing temporary URLs on cleanup. Media load failures
are shown as errors, while browser autoplay restrictions leave audio paused.
The seek controls use the same book-and-language key as the loaded recording.

Validate without calling ElevenLabs: `node --test scripts/voice.test.mjs`.
No live key validity or account quota has been asserted from local fixture tests.
