import test from 'node:test';
import assert from 'node:assert/strict';
import {runSoloGames} from './helpers/solo.mjs';
// This override lives only in the isolated test process. Production crypto is
// unchanged. A failure reports the seed; no assertion is retried or suppressed.
for(const seed of [1,22,161,1558,20261107])test(`replayable BOT games seed ${seed} (3/5/7 BOTs, normal/hard)`,t=>{
 let state=seed>>>0,calls=0;
 t.mock.method(globalThis.crypto,'getRandomValues',a=>{for(let i=0;i<a.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;a[i]=state>>>0;}calls++;return a;});
 runSoloGames();assert.ok(calls>0,'seeded RNG must be exercised');
});
