# RGB-PC-evolution

## Introduction

RGB-PC-evolution is a bluetooth based client for Govee LED strips (specifically the Govee Dreamview G1 Pro) based on the amazing work from https://github.com/ib0b/RGB-PC.
This is based on reverse engineering the requests from android and translating them to PC. Thanks to [BeauJBurroughs/Govee-H6127-Reverse-Engineering](https://github.com/BeauJBurroughs/Govee-H6127-Reverse-Engineering) and [egold555/Govee-Reverse-Engineering](https://github.com/egold555/Govee-Reverse-Engineering)

<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_PhSwguuL2t.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_5CEaqROx09.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_FcC3Jl4UGW.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_2DOKkk0t3w.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_18vd52WJ6q.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_Fb1N5j60kC.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_1zFl1RsBWC.png">
<img width="800" alt="image" src="https://raw.githubusercontent.com/dayeggpi/RGB-PC-evolution/refs/heads/master/RGB-PC-evolution_BixkcF4XcA.png">
### Features

- [x] Keep alive
- [x] On/Off toggle
- [x] Change Color (per segment, or full)
- [x] Save palettes
- [x] Set global brightness
- [x] Music Modes — 8 styles (Rhythm, Windmill, Hooray, Sprouting, Expansion, Torch, Flowing, Hopping) with heavy bass toggle, calm/dynamic modes, CW/CCW direction, 2–8 custom colors, sensitivity slider
- [x] Scenes — 30+ built-in scenes across 5 categories (Life, Festival, Funny, Emotion, Games)
- [x] Color Schemes — 12 color schemes × 7 combination types (analogous, complementary, split complementary, etc.), preview before applying
- [x] System-wide hotkeys for music styles and scenes (work across all apps)
- [x] Ambilight Sync — sync LED colors to screen border regions
- [x] Shows real device MAC address when connected

---

## A Message to Govee

> In the U.S., Section 103(f) of the Digital Millennium Copyright Act (DMCA) [(17 USC § 1201 (f) - Reverse Engineering)](https://www.law.cornell.edu/uscode/text/17/1201) specifically states that it is legal to reverse engineer and circumvent the protection to achieve interoperability between computer programs (such as information transfer between applications). Interoperability is defined in paragraph 4 of Section 103(f).
>
> It is also often lawful to reverse-engineer an artifact or process as long as it is obtained legitimately. If the software is patented, it doesn't necessarily need to be reverse-engineered, as patents require a public disclosure of invention. It should be mentioned that, just because a piece of software is patented, that does not mean the entire thing is patented; there may be parts that remain undisclosed.

If @Govee you would like me to take this down, please contact me view email or create an issue on this repository.

## Download

See the [releases page](https://github.com/dayeggpi/RGB-PC-evolution/releases)

## How to Use

<ol>
  <li>Open RGB-PC-evolution</li>
  <li>Click scan — requires a Bluetooth-enabled PC/Laptop</li>
  <li>Connect to your Govee device</li>
  <li>A panel appears with all controls</li>
</ol>

**Color tab** — Set individual segment colors or apply a full color. Save/load palettes.

**Scenes tab** — Pick from 30+ built-in light scenes grouped by category. Click Enable to activate. Assign system-wide hotkeys per scene so you can trigger them from any app.

**Music tab** — Choose one of 8 music-reactive styles. Adjust heavy bass, mode (dynamic/calm), direction (CW/CCW), colors (2–8), and sensitivity. Assign system-wide hotkeys per style to switch on the fly.

**Schemes tab** — Generate color palettes from 12 preset schemes combined with 7 harmonic patterns. Preview the result, then apply to the full strip.

**Ambilight tab** — Map each LED segment to a screen region. Select your display and click Sync — LEDs mirror the dominant color of their mapped region in real time.

**Debug tab** — Send raw hex packets one-by-one or as a batch (one per line).

## Known issues

- They video sync mode is slow, because the controller has an internal queue that is dequeued approx 50ms, hence can only be updated about every 500ms (for every 15 sections for some strips), to avoid huge backlog of messages in the controller queue.
- Does not support all devices, use with caution. Sending wrong bluetooth command is unlikely to ruin your controller, but still possible.

## Building the app (for customisations)

```
clone repo
npm install
npm run dev

#building the app , change targets in vue.config.js
npm run electron:build
```

## Contributing and issues

Please check known issues first and create an issue with reproduceable steps.
