import math, random, struct, wave
K = 1 / 0.6  # versión lenta: t_video = t_composición / 0,6
SR = 44100; DUR = 78.0; BEAT = 0.6 * K; N = int(SR * DUR)
random.seed(7)
mix = [0.0] * N
fx = [0.0] * N   # canal que recibe reverberación/eco

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(buf, t, samples, amp=1.0):
    i0 = int(t * SR)
    for k, v in enumerate(samples):
        j = i0 + k
        if 0 <= j < N: buf[j] += v * amp

def tone(f, dur, a=0.005, r=0.2, harm=((1, 1.0),), detune=0.0, decay=None):
    n = int((dur + r) * SR); out = []
    for k in range(n):
        t = k / SR
        env = min(1, t / a) if a > 0 else 1
        if t > dur: env *= max(0, 1 - (t - dur) / r)
        if decay: env *= math.exp(-t * decay)
        v = 0.0
        for h, g in harm:
            v += g * math.sin(2 * math.pi * f * h * t)
            if detune: v += g * 0.6 * math.sin(2 * math.pi * f * h * (1 + detune) * t)
        out.append(v * env)
    return out

def pluck(m, dur=0.5):   # campana suave
    return tone(hz(m), 0.02, a=0.002, r=dur, harm=((1, 1), (2, 0.35), (3, 0.12), (4.2, 0.08)), decay=5.5)
def pad(m, dur):
    return tone(hz(m), dur, a=0.5, r=0.7, harm=((1, 1), (2, 0.25), (3, 0.08)), detune=0.004)
def bass(m, dur):
    return tone(hz(m), dur, a=0.01, r=0.12, harm=((1, 1), (2, 0.3)), decay=1.6)
def kick(dur=0.28):
    out = []; ph = 0
    for k in range(int(dur * SR)):
        t = k / SR; f = 48 + 90 * math.exp(-t * 28)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 11))
    return out
def hat(dur=0.05, bright=1.0):
    out = []; prev = 0
    for k in range(int(dur * SR)):
        t = k / SR; x = random.uniform(-1, 1); y = x - prev * 0.9; prev = x
        out.append(y * math.exp(-t * 70) * bright)
    return out
def tick(f=1900, dur=0.035):
    return [math.sin(2 * math.pi * f * k / SR) * math.exp(-k / SR * 160) + 0.4 * random.uniform(-1, 1) * math.exp(-k / SR * 300) for k in range(int(dur * SR))]
def whoosh(dur, up=True, lo=300, hi=5000):
    out = []; lp = 0.0
    n = int(dur * SR)
    for k in range(n):
        p = k / n; p = p if up else 1 - p
        c = lo + (hi - lo) * p * p
        a = 1 - math.exp(-2 * math.pi * c / SR)
        lp += a * (random.uniform(-1, 1) - lp)
        env = math.sin(math.pi * k / n) ** 1.5
        out.append(lp * env * 2.2)
    return out
def impact(dur=1.4):
    out = []; ph = 0
    for k in range(int(dur * SR)):
        t = k / SR; f = 38 + 120 * math.exp(-t * 14); ph += 2 * math.pi * f / SR
        out.append((math.sin(ph) * math.exp(-t * 3.2) + 0.25 * random.uniform(-1, 1) * math.exp(-t * 18)))
    return out

# ── música: Re mayor, 100 BPM, Bm–G–D–A ──
CH = [(47, [59, 62, 66], [71, 74, 78]),   # Bm
      (43, [55, 59, 62], [67, 71, 74]),   # G
      (50, [54, 57, 62], [66, 69, 74]),   # D
      (45, [57, 61, 64], [69, 73, 76])]   # A
BAR = BEAT * 4
nbar = int(DUR / BAR) + 1
def bar_t(b): return b * BAR

for b in range(nbar):
    t0 = bar_t(b)
    if t0 >= DUR: break
    root, tri, arp = CH[b % 4]
    final = t0 >= 43.19 * K
    if final: root, tri, arp = (50, [54, 57, 62], [66, 69, 74]) if b % 2 == 0 else (43, [55, 59, 62], [67, 71, 74])
    intro = t0 < 4.79 * K
    # pad
    for m in tri: add(mix, t0, pad(m, BAR * (1 if not final else 1.0)), 0.07 if intro else 0.09)
    if intro: 
        # tic-tac de reloj en cada tiempo (el plazo corre)
        for k in range(4):
            add(mix, t0 + k * BEAT, tick(2100 if k % 2 == 0 else 1500), 0.22)
        continue
    # bajo en 1 y 3 + síncopa
    for off, d in ((0, 1.0), (2, 1.0), (3.5, 0.4)):
        add(mix, t0 + off * BEAT, bass(root, d * BEAT * 0.9), 0.30)
    # arpegio en corcheas (pluck)
    pat = [0, 1, 2, 1, 0, 1, 2, 1]
    for k in range(8):
        m = arp[pat[k]] if not (k % 4 == 3) else arp[2] + 0
        add(fx, t0 + k * BEAT / 2, pluck(m + (12 if k % 8 == 7 else 0), 0.45), 0.075)
    # bombo y hats
    quiet = 4.79 * K <= t0 < 9.59 * K or t0 >= 43.19 * K
    for k in range(4):
        if not (t0 >= 43.19 * K and b > nbar - 4):
            add(mix, t0 + k * BEAT, kick(), 0.26 if not quiet else 0.18)
    for k in range(8):
        if k % 2 == 1: add(fx, t0 + k * BEAT / 2, hat(0.05, 1.0), 0.075)
        elif not quiet: add(fx, t0 + k * BEAT / 2, hat(0.025, 0.6), 0.03)

# ── check-bells: escala de Re mayor ascendente ──
CHECK = [(11.4, 74), (13.8, 76), (16.2, 78), (18.6, 79), (21.0, 81), (23.4, 83), (28.2, 85), (33.0, 86)]
for t, m in CHECK:
    t *= K
    add(fx, t, pluck(m, 0.9), 0.22); add(fx, t, pluck(m - 12, 0.9), 0.10)
# 8/8: destello (arpegio rápido) sincronizado con las 8 tildas de cierre
for i, m in enumerate([74, 76, 78, 79, 81, 83, 85, 86]):
    add(fx, (39.0 + i * 0.075) * K, pluck(m, 0.7), 0.17)
add(fx, 39.7 * K, pluck(90, 1.4), 0.12)

# ── efectos de transición, en la grilla ──
add(mix, (4.8 - 0.0) * K, impact(), 0.55)          # arco → escudo
add(fx, (4.8 - 0.6) * K, whoosh(0.9, True), 0.20)
add(fx, (9.6 - 0.35) * K, whoosh(0.8, True, 400, 6000), 0.14)
add(fx, (14.4 - 0.3) * K, whoosh(0.45, True), 0.11)
add(fx, (16.8 - 0.0) * K, whoosh(0.4, False, 300, 3000), 0.07)
add(fx, (38.4 - 0.2) * K, whoosh(0.5, True), 0.11)
add(fx, (43.2 - 0.6) * K, whoosh(0.9, True), 0.20)
add(mix, (43.2) * K, impact(1.8), 0.50)
# resalte de plazos en el contrato (tictac ya suena); clic de UI al presionar el botón
add(fx, (32.4) * K, tick(900, 0.05), 0.5); add(fx, (32.4) * K, tick(2400, 0.03), 0.25)
# toast
add(fx, (32.52) * K, pluck(81, 0.5), 0.10); add(fx, (32.64) * K, pluck(86, 0.7), 0.10)
# acorde final de cierre (D mayor abierto) que se apaga
for m in (50, 57, 62, 66, 69, 74): add(mix, (43.2) * K, tone(hz(m), 6.0, a=0.2, r=1.0, harm=((1, 1), (2, 0.2)), detune=0.003), 0.055)

# ── eco de corchea con realimentación + reverb simple ──
d1, d2 = int(BEAT * 0.75 * SR), int(BEAT * 1.5 * SR)
wet = [0.0] * N
for i in range(N):
    v = fx[i]
    if i >= d1: v += wet[i - d1] * 0.33
    if i >= d2: v += wet[i - d2] * 0.18
    wet[i] = v
# reverb: 4 combs
for dly, g in ((int(0.029 * SR), 0.42), (int(0.037 * SR), 0.36), (int(0.043 * SR), 0.30), (int(0.051 * SR), 0.26)):
    for i in range(dly, N): wet[i] += wet[i - dly] * g * 0.5
out = [mix[i] + wet[i] * 0.85 for i in range(N)]

# sidechain suave: los pads bajan un poco en cada bombo (solo desde 4.8)
# envolvente global
peak = max(abs(x) for x in out) or 1
g = 0.89 / peak
fade_in = int(0.25 * SR); fade_out = int(2.2 * SR)
data = bytearray()
for i, v in enumerate(out):
    v = math.tanh(v * g * 1.15) * 0.93
    if i < fade_in: v *= i / fade_in
    if i > N - fade_out: v *= max(0.0, (N - i) / fade_out)
    data += struct.pack('<h', int(max(-1, min(1, v)) * 32767))
with wave.open('/home/user/brag-output/work/audio/uni_v2.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(data))
print('ok', N, round(peak, 3))
