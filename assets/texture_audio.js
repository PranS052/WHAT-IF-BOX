/* What If? — touch sounds, synthesised live (no sample files).
   TextureAudio(ctx) -> { tap(material, hand), rub(material, hand) -> {speed(v), stop()} }
   6 materials x 3 hands x 2 gestures (tap / rub) = 36 sounds.

   A material decides WHAT rings (its resonances and how long they last, its scrape texture).
   A hand decides HOW it is touched (how soft the contact is, how much it muffles,
   how heavy and wet it feels).
   Tweak the numbers in MAT / HAND / RUB below, or swap in your own recordings. */
(function (root) {
  'use strict';

  /* ---- hands: contact softness, muffling, weight, wetness ---- */
  var HAND = {
    human:       { lp: 12000, soft: .12, damp: 1.0, gain: 1.00, thump: [150, .55, .30, .09], wet: 0,  smooth: 0   },
    sausage:     { lp: 3800,  soft: .55, damp: 1.5, gain: 1.10, thump: [100, .60, .60, .15], wet: 1,  smooth: .25 },
    marshmallow: { lp: 1900,  soft: .90, damp: 2.6, gain: 1.50, thump: [ 72, .45, .55, .22], wet: 0,  smooth: .75 }
  };

  /* ---- materials, tap: [frequency Hz, level, ring time s] for every resonance ---- */
  var MAT = {
    wood:   { modes: [[190,1,.22],[430,.8,.16],[790,.5,.10],[1250,.3,.06]], thump: .8, click: [1800, 1.0] },
    metal:  { modes: [[560,.7,1.3],[1380,.8,1.1],[2250,.7,.9],[3600,.5,.7],[5100,.3,.5]], thump: .15, click: [4500, 1.2] },
    fabric: { modes: [], thump: .55, puff: 1 },
    glass:  { modes: [[1250,.8,.55],[2950,.9,.45],[4800,.6,.3],[6900,.3,.2]], thump: .1, click: [5200, 1.1] },
    stone:  { modes: [[260,1,.09],[640,.8,.07],[1150,.6,.05],[2100,.3,.03]], thump: .35, click: [2600, 1.0] },
    jelly:  { modes: [[130,1,.30],[210,.6,.25]], thump: .3, squelch: 1 }
  };

  /* ---- materials, rub: filtered noise with a scrape texture ----
     t1/f1/q1 main filter, t2/f2/q2 second filter, grain = depth of the stick-slip
     texture (rate = how fast), sparse = crackly instead of smooth, ring = resonances
     that hum while you rub, lvl = loudness trim, sweep = filter follows finger speed */
  var RUB = {
    wood:   { t1:'bandpass', f1:1100, q1:.9, t2:'lowpass',  f2:3500, q2:.7, grain:.65, rate:1.3, lvl:1.0, sweep:.5, ring:[[430,6,.5],[790,6,.3]] },
    metal:  { t1:'highpass', f1:2600, q1:.7, t2:'lowpass',  f2:9000, q2:.7, grain:.15, rate:2.0, lvl:.55, sweep:.3, ring:[[1380,30,2.2],[2250,30,1.8],[3600,30,1.2]] },
    fabric: { t1:'bandpass', f1:3000, q1:.5, t2:'lowpass',  f2:6000, q2:.7, grain:.18, rate:.9,  lvl:.7, sweep:.2, ring:[] },
    glass:  { t1:'bandpass', f1:2300, q1:14, t2:'allpass',  f2:1000, q2:.7, grain:.35, rate:2.4, lvl:1.4, sweep:.9, ring:[[4800,25,1.0]] },
    stone:  { t1:'highpass', f1:400,  q1:.7, t2:'lowpass',  f2:3200, q2:.7, grain:.95, rate:2.0, lvl:1.1, sweep:.3, sparse:true, ring:[] },
    jelly:  { t1:'bandpass', f1:380,  q1:3,  t2:'lowpass',  f2:1600, q2:.7, grain:.5,  rate:.8,  lvl:1.6, sweep:.4, ring:[], blips:true }
  };

  function TextureAudio(ctx, dest) {
    var master = ctx.createGain(); master.gain.value = .9;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(dest || ctx.destination);

    /* shared buffers */
    var sr = ctx.sampleRate, noise = ctx.createBuffer(1, sr * 2, sr), nd = noise.getChannelData(0), i;
    for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // slow random wobble for stick-slip (8 kHz buffer, so playbackRate scales it to tens of Hz)
    var smooth = ctx.createBuffer(1, 16000, 8000), sd = smooth.getChannelData(0), v = 0, lo = 9, hi = -9;
    for (i = 0; i < sd.length; i++) { v += (Math.random() * 2 - 1 - v) * .06; sd[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    for (i = 0; i < sd.length; i++) sd[i] = (sd[i] - lo) / (hi - lo);
    var sparse = ctx.createBuffer(1, 16000, 8000), pd = sparse.getChannelData(0), e = 0;
    for (i = 0; i < pd.length; i++) { if (Math.random() < .012) e = Math.random() * .7 + .3; pd[i] = e; e *= .93; }

    function biquad(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
    function gain(g) { var n = ctx.createGain(); n.gain.value = g; return n; }
    function bus(H) { var out = gain(H.gain * .9), lp = biquad('lowpass', H.lp, .7); out.connect(lp); lp.connect(master); return out; }
    function burst(out, t, dur, type, f, q, g) {            // short noise puff
      var s = ctx.createBufferSource(); s.buffer = noise;
      var b = biquad(type, f, q), a = ctx.createGain();
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + Math.min(.004, dur / 3));
      a.gain.exponentialRampToValueAtTime(.0008, t + dur);
      s.connect(b); b.connect(a); a.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + .02);
    }
    function sine(out, t, f0, f1, dur, g, atk) {             // glide + decay
      var o = ctx.createOscillator(), a = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + (atk || .003));
      a.gain.exponentialRampToValueAtTime(.0008, t + dur);
      o.connect(a); a.connect(out); o.start(t); o.stop(t + dur + .02);
    }

    /* ---------------- tap ---------------- */
    function tap(mat, hand) {
      var H = HAND[hand] || HAND.human, M = MAT[mat], t = ctx.currentTime + .008;
      var out = bus(H), pitch = 1 + (Math.random() - .5) * .05, vel = .85 + Math.random() * .15;
      var total = 0, k;
      for (k = 0; k < M.modes.length; k++) total += M.modes[k][1];
      M.modes.forEach(function (m) {
        var f = m[0] * pitch, T = m[2] / H.damp;
        var hiCut = 1 - H.soft * Math.min(1, f / 3000) * .9;   // soft contact doesn't excite the highs
        sine(out, t, f, f * .998, T, (m[1] / total) * .75 * hiCut * vel, .0015);
      });
      if (M.click) burst(out, t, .012 + H.soft * .03, 'bandpass', M.click[0] * (1 - H.soft * .6), .8, .45 * M.click[1] * (1 - H.soft * .7) * vel);
      var th = H.thump;                                         // the hand's own weight
      sine(out, t, th[0] * pitch, th[0] * th[1], th[3], th[2] * M.thump * vel, .004);
      if (M.puff) burst(out, t, .11, 'bandpass', 2200 * (1 - H.soft * .5), .5, .6 * vel);
      if (M.squelch) {
        sine(out, t, 300 * pitch, 110, .13, .45 * vel, .004);
        sine(out, t + .09, 120, 190, .12, .25 * vel, .01);
      }
      if (H.wet) {                                             // wet pops
        burst(out, t + .010, .014, 'bandpass', 1500, 9, .5 * H.wet);
        burst(out, t + .034, .012, 'bandpass', 1100, 9, .35 * H.wet);
      }
      if (H.smooth > .5 && !M.puff) burst(out, t, .08, 'lowpass', 900, .5, .25);   // marshmallow breath
    }

    /* ---------------- rub (continuous) ---------------- */
    function rub(mat, hand) {
      var H = HAND[hand] || HAND.human, R = RUB[mat], t = ctx.currentTime;
      var out = bus(H); out.gain.cancelScheduledValues(t); out.gain.value = 0;
      var trim = out, srcs = [], timer = 0, alive = true;
      var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; srcs.push(s);
      var f1 = biquad(R.t1, R.f1, R.q1), f2 = biquad(R.t2, R.f2, R.q2);
      var depth = R.grain * (1 - H.smooth * .8);
      var gg = gain(1 - depth), gs = ctx.createBufferSource(); gs.buffer = R.sparse ? sparse : smooth; gs.loop = true; gs.playbackRate.value = R.rate; srcs.push(gs);
      var dg = gain(depth); gs.connect(dg); dg.connect(gg.gain);
      s.connect(f1); f1.connect(f2); f2.connect(gg); gg.connect(trim);
      R.ring.forEach(function (r) { var b = biquad('bandpass', r[0], r[1]), g = gain(r[2]); s.connect(b); b.connect(g); g.connect(trim); });
      s.start(t, Math.random() * 1.5); gs.start(t, Math.random() * 1);

      var base = R.lvl * (H.gain);
      function blip() {                                         // wet / squishy bubbles while rubbing
        if (!alive) return;
        var now = ctx.currentTime;
        if (R.blips) sine(trim, now, 220 + Math.random() * 120, 100 + Math.random() * 40, .09, .22, .005);
        if (H.wet) burst(trim, now, .012, 'bandpass', 900 + Math.random() * 900, 9, .3);
      }
      if (R.blips || H.wet) { timer = setInterval(blip, R.blips ? 130 : 240); }
      var cur = 0;
      function speed(sp) {
        if (!alive) return; sp = Math.max(0, Math.min(1, sp)); cur = sp;
        var now = ctx.currentTime;
        out.gain.setTargetAtTime(base * (.4 + .6 * sp), now, .05);
        f1.frequency.setTargetAtTime(R.f1 * (1 + R.sweep * (sp - .35)), now, .05);
        gs.playbackRate.setTargetAtTime(R.rate * (.6 + 1.4 * sp), now, .05);
      }
      speed(.35);
      return {
        speed: speed,
        stop: function () {
          if (!alive) return; alive = false; clearInterval(timer);
          var now = ctx.currentTime;
          out.gain.cancelScheduledValues(now); out.gain.setTargetAtTime(0, now, .035);
          srcs.forEach(function (x) { try { x.stop(now + .25); } catch (err) {} });
        }
      };
    }

    return { tap: tap, rub: rub, materials: Object.keys(MAT), master: master };
  }

  TextureAudio.HAND = HAND; TextureAudio.MAT = MAT; TextureAudio.RUB = RUB;
  root.TextureAudio = TextureAudio;
})(typeof window !== 'undefined' ? window : this);
