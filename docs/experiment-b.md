# Experiment B — Visible vs Hidden Recommendation Reasoning

Generated 2026-05-18T15:37:22.165Z · model: `openai/gpt-4.1-mini` · judge: `openai/gpt-4.1-mini` · 10 prompts

## Method

Each prompt runs through the grounded assistant once. The single response is then served two ways — variant **visible** keeps the `[slug]` citation chips intact, variant **hidden** strips them. An LLM judge sees both (with order randomised per pair) and scores each on three dimensions, then picks one to show a shopper.

Same model + same system prompt + same tools — only the user-visible reasoning differs. So this experiment is about UX, not grounding.

## Aggregate scores

| Variant                   | Trustworthiness | Clarity | Usefulness | Forced preferences |
| ------------------------- | --------------: | ------: | ---------: | -----------------: |
| Visible (with slug chips) |            4.90 |    4.30 |       4.50 |         **3 / 10** |
| Hidden (slugs stripped)   |            4.90 |    5.00 |       4.90 |         **7 / 10** |

## Per-prompt

### Prompt — _Recommend a thin laptop under €1500 for travel._

**Preferred:** hidden (plain prose) · **Judge saw hidden first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 4 · hidden: 5 / 5 / 5

**Rationale:** Response 1 is clearer and more readable without the bracketed product references, making it more user-friendly while equally trustworthy and useful.

<details><summary>Visible variant</summary>

```
For a thin laptop under €1500 suitable for travel, I found two good options:

1. MacBook Air 13" (M4) [macbook-air-m4-13] at €1299
   - Weight: 1.24 kg
   - Apple M4 chip (10-core CPU, 10-core GPU)
   - 16 GB unified memory, 512 GB SSD
   - 13.6" Liquid Retina display (2560×1664, 500 nits)
   - Up to 18 hours battery life, fanless and silent
   - Ports: 2× Thunderbolt 4, MagSafe 3, 3.5 mm jack

2. XPS 13 Plus (9340) [xps-13-plus] at €1449
   - Weight: 1.24 kg
   - Intel Core Ultra 7 155H CPU
   - 16 GB LPDDR5X memory, 512 GB PCIe 4.0 SSD
   - 13.4" 3.5K OLED touch display (2880×1800)
   - Battery: 55 Wh
   - Ports: 2× Thunderbolt 4

Both are very light and thin, with excellent displays and good battery life. The MacBook Air offers longer battery life and a fanless design, great for quiet travel use. The Dell XPS 13 Plus has a higher resolution OLED touchscreen and a more traditional Intel CPU.

Would you prefer macOS or Windows? Or any other specific features for your travel laptop?
```

</details>

<details><summary>Hidden variant</summary>

```
For a thin laptop under €1500 suitable for travel, I found two good options:

1. MacBook Air 13" (M4) at €1299
 - Weight: 1.24 kg
 - Apple M4 chip (10-core CPU, 10-core GPU)
 - 16 GB unified memory, 512 GB SSD
 - 13.6" Liquid Retina display (2560×1664, 500 nits)
 - Up to 18 hours battery life, fanless and silent
 - Ports: 2× Thunderbolt 4, MagSafe 3, 3.5 mm jack

2. XPS 13 Plus (9340) at €1449
 - Weight: 1.24 kg
 - Intel Core Ultra 7 155H CPU
 - 16 GB LPDDR5X memory, 512 GB PCIe 4.0 SSD
 - 13.4" 3.5K OLED touch display (2880×1800)
 - Battery: 55 Wh
 - Ports: 2× Thunderbolt 4

Both are very light and thin, with excellent displays and good battery life. The MacBook Air offers longer battery life and a fanless design, great for quiet travel use. The Dell XPS 13 Plus has a higher resolution OLED touchscreen and a more traditional Intel CPU.

Would you prefer macOS or Windows? Or any other specific features for your travel laptop?
```

</details>

### Prompt — _I need wired headphones for an open-plan office._

**Preferred:** visible (slug chips) · **Judge saw visible first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 5 / 5 · hidden: 5 / 5 / 5

**Rationale:** Response 1 includes a product reference tag which could help the shopper identify or find the product more easily, enhancing usefulness without sacrificing clarity or trustworthiness.

<details><summary>Visible variant</summary>

```
For wired headphones suitable for an open-plan office, the Sennheiser HD 660S2 [sennheiser-hd660s2] stands out. They are over-ear, open-back headphones designed for deep, detailed listening with a refined midrange. They come with a 1.8 m cable and have a frequency response from 8 Hz to 41.5 kHz, which is excellent for audio clarity. However, being open-back, they may leak sound and let in some ambient noise, which might be a consideration in an open office.

If you want headphones that isolate better for office use, open-back might not be ideal despite the sound quality. Would you prefer I look for wired closed-back headphones that block more external noise?
```

</details>

<details><summary>Hidden variant</summary>

```
For wired headphones suitable for an open-plan office, the Sennheiser HD 660S2 stands out. They are over-ear, open-back headphones designed for deep, detailed listening with a refined midrange. They come with a 1.8 m cable and have a frequency response from 8 Hz to 41.5 kHz, which is excellent for audio clarity. However, being open-back, they may leak sound and let in some ambient noise, which might be a consideration in an open office.

If you want headphones that isolate better for office use, open-back might not be ideal despite the sound quality. Would you prefer I look for wired closed-back headphones that block more external noise?
```

</details>

### Prompt — _What is the best phone for camera quality you sell?_

**Preferred:** hidden (plain prose) · **Judge saw hidden first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 4 · hidden: 5 / 5 / 5

**Rationale:** Response 1 is clearer and more readable without the bracketed product codes, making it more user-friendly and equally trustworthy and useful.

<details><summary>Visible variant</summary>

```
The top phones for camera quality in Joule's catalog are:

- Samsung Galaxy S25 Ultra [samsung-galaxy-s25-ultra]: Has a 200 MP main sensor, plus 50 MP 5× telephoto, 10 MP 3× telephoto, and 50 MP ultra-wide cameras. It's a titanium-framed flagship with a 6.9" QHD+ AMOLED display.

- Apple iPhone 17 Pro [iphone-17-pro]: Features three 48 MP cameras—main, ultra-wide, and 4× telephoto (8× optical-quality). It has a 6.3" Super Retina XDR display with ProMotion.

- Google Pixel 10 Pro [google-pixel-10-pro]: Offers a 50 MP main camera, 48 MP ultra-wide, and 48 MP 5× telephoto. Known for computational photography and software enhancements.

If camera quality is your priority, the Galaxy S25 Ultra leads with its very high-resolution main sensor and versatile telephoto options. The iPhone 17 Pro and Pixel 10 Pro also have excellent multi-camera setups with strong software support. Would you like details on pricing or other features?
```

</details>

<details><summary>Hidden variant</summary>

```
The top phones for camera quality in Joule's catalog are:

- Samsung Galaxy S25 Ultra: Has a 200 MP main sensor, plus 50 MP 5× telephoto, 10 MP 3× telephoto, and 50 MP ultra-wide cameras. It's a titanium-framed flagship with a 6.9" QHD+ AMOLED display.

- Apple iPhone 17 Pro: Features three 48 MP cameras—main, ultra-wide, and 4× telephoto (8× optical-quality). It has a 6.3" Super Retina XDR display with ProMotion.

- Google Pixel 10 Pro: Offers a 50 MP main camera, 48 MP ultra-wide, and 48 MP 5× telephoto. Known for computational photography and software enhancements.

If camera quality is your priority, the Galaxy S25 Ultra leads with its very high-resolution main sensor and versatile telephoto options. The iPhone 17 Pro and Pixel 10 Pro also have excellent multi-camera setups with strong software support. Would you like details on pricing or other features?
```

</details>

### Prompt — _Compare a small Mac desktop with a small Windows mini PC._

**Preferred:** visible (slug chips) · **Judge saw visible first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 5 / 5 · hidden: 5 / 5 / 5

**Rationale:** Response 1 includes product identifiers which can help shoppers quickly find the exact models, enhancing usefulness without sacrificing clarity or trustworthiness.

<details><summary>Visible variant</summary>

```
Here's a comparison between a small Mac desktop and a small Windows mini PC from Joule's catalog:

Mac mini (M4 Pro) [mac-mini-m4-pro]:
- Apple M4 Pro chip with 12-core CPU and 16-core GPU
- 24 GB unified memory
- 512 GB SSD storage
- Ports: 3× Thunderbolt 5, HDMI, 2× USB-A, optional 10GbE
- Networking: Wi-Fi 6E, Bluetooth 5.3
- Size: 12.7 × 12.7 × 5.0 cm
- Price: 1499 EUR
- Focus: Workstation muscle, great for ProRes compression and Xcode builds

Beelink SER8 (Ryzen 7 8845HS) [beelink-ser8]:
- AMD Ryzen 7 8845HS CPU (8 cores, 16 threads, up to 5.1 GHz)
- Radeon 780M integrated GPU
- 32 GB DDR5-5600 memory
- 1 TB PCIe 4.0 NVMe storage
- Ports: USB4 40 Gbps, 2× HDMI 2.1, 2.5GbE, 3× USB-A
- Size: 12.6 × 11.3 × 4.2 cm
- Price: 729 EUR
- Focus: Versatile mini PC for development, media server, or quiet HTPC

Trade-offs:
- The Mac mini has a more specialized Apple Silicon chip optimized for creative and development workloads, but it is pricier.
- The Beelink SER8 offers more memory and storage at about half the price, with a strong AMD CPU suitable for general Windows tasks and media.
- Mac mini supports Thunderbolt 5 and has better networking options; Beelink has USB4 and dual HDMI 2.1 outputs.

What will you primarily use the mini PC for? That can help narrow down which fits your needs better.
```

</details>

<details><summary>Hidden variant</summary>

```
Here's a comparison between a small Mac desktop and a small Windows mini PC from Joule's catalog:

Mac mini (M4 Pro):
- Apple M4 Pro chip with 12-core CPU and 16-core GPU
- 24 GB unified memory
- 512 GB SSD storage
- Ports: 3× Thunderbolt 5, HDMI, 2× USB-A, optional 10GbE
- Networking: Wi-Fi 6E, Bluetooth 5.3
- Size: 12.7 × 12.7 × 5.0 cm
- Price: 1499 EUR
- Focus: Workstation muscle, great for ProRes compression and Xcode builds

Beelink SER8 (Ryzen 7 8845HS):
- AMD Ryzen 7 8845HS CPU (8 cores, 16 threads, up to 5.1 GHz)
- Radeon 780M integrated GPU
- 32 GB DDR5-5600 memory
- 1 TB PCIe 4.0 NVMe storage
- Ports: USB4 40 Gbps, 2× HDMI 2.1, 2.5GbE, 3× USB-A
- Size: 12.6 × 11.3 × 4.2 cm
- Price: 729 EUR
- Focus: Versatile mini PC for development, media server, or quiet HTPC

Trade-offs:
- The Mac mini has a more specialized Apple Silicon chip optimized for creative and development workloads, but it is pricier.
- The Beelink SER8 offers more memory and storage at about half the price, with a strong AMD CPU suitable for general Windows tasks and media.
- Mac mini supports Thunderbolt 5 and has better networking options; Beelink has USB4 and dual HDMI 2.1 outputs.

What will you primarily use the mini PC for? That can help narrow down which fits your needs better.
```

</details>

### Prompt — _Show me a noise-cancelling pair of headphones from Sony._

**Preferred:** hidden (plain prose) · **Judge saw visible first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 5 · hidden: 5 / 5 / 5

**Rationale:** Response 2 is clearer because it avoids the confusing bracketed product code, making it easier to read while providing the same useful information.

<details><summary>Visible variant</summary>

```
The Sony WH-1000XM6 [sony-wh-1000xm6] is a top noise-cancelling headphone from Sony. It features best-in-class active noise cancelling with a new QN3 processor and 12 microphones. These are over-ear, closed headphones with a 30-hour battery life with ANC on (40 hours off), support for LDAC and other codecs, and fast USB-C charging.

If you want a strong noise-cancelling headphone from Sony, this is the flagship model in Joule's catalog. Would you like to know about other options or details on this one?
```

</details>

<details><summary>Hidden variant</summary>

```
The Sony WH-1000XM6 is a top noise-cancelling headphone from Sony. It features best-in-class active noise cancelling with a new QN3 processor and 12 microphones. These are over-ear, closed headphones with a 30-hour battery life with ANC on (40 hours off), support for LDAC and other codecs, and fast USB-C charging.

If you want a strong noise-cancelling headphone from Sony, this is the flagship model in Joule's catalog. Would you like to know about other options or details on this one?
```

</details>

### Prompt — _Pick a tablet for an architect who sketches and reads PDFs._

**Preferred:** hidden (plain prose) · **Judge saw hidden first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 5 · hidden: 5 / 5 / 5

**Rationale:** Response 1 is clearer without the bracketed product codes, making it easier to read at a glance while providing equally useful and trustworthy information.

<details><summary>Visible variant</summary>

```
For an architect who sketches and reads PDFs, here are some tablet options from Joule's catalog:

1. iPad Pro 13" (M4) [ipad-pro-m5-13]
   - 13" Ultra Retina XDR Tandem OLED display, 120 Hz refresh rate
   - Apple M4 chip with up to 10-core CPU and GPU
   - Apple Pencil Pro with haptics and squeeze features
   - Storage options up to 2 TB
   - Very thin (5.1 mm) and light (579 g)

2. iPad Air 11" (M3) [ipad-air-m3-11]
   - 11" Liquid Retina display, 60 Hz
   - Apple M3 chip with 8-core CPU and 9-core GPU
   - Supports Apple Pencil Pro
   - Storage up to 1 TB
   - Lighter at 460 g

3. Galaxy Tab S10 Ultra [galaxy-tab-s10-ultra]
   - 14.6" Dynamic AMOLED 2X display, 120 Hz
   - MediaTek Dimensity 9300+ chip
   - Includes S Pen stylus
   - Storage up to 1 TB plus microSD expansion
   - Heavier at 718 g

4. reMarkable Paper Pro [remarkable-paper-pro]
   - 11.8" color e-ink display designed for writing and reading
   - Marker Plus stylus with eraser included
   - Long battery life up to 2 weeks
   - 64 GB storage
   - No apps or notifications, focused on deep reading and sketching

If sketching precision and screen quality are top priorities, the iPad Pro or Galaxy Tab S10 Ultra are strong choices. For a lighter, more affordable option with good sketching support, the iPad Air works well. If the focus is more on reading PDFs and sketching with minimal distractions, the reMarkable Paper Pro is unique with its e-ink display and long battery.

Do you want me to help narrow down based on budget or any other preferences?
```

</details>

<details><summary>Hidden variant</summary>

```
For an architect who sketches and reads PDFs, here are some tablet options from Joule's catalog:

1. iPad Pro 13" (M4)
 - 13" Ultra Retina XDR Tandem OLED display, 120 Hz refresh rate
 - Apple M4 chip with up to 10-core CPU and GPU
 - Apple Pencil Pro with haptics and squeeze features
 - Storage options up to 2 TB
 - Very thin (5.1 mm) and light (579 g)

2. iPad Air 11" (M3)
 - 11" Liquid Retina display, 60 Hz
 - Apple M3 chip with 8-core CPU and 9-core GPU
 - Supports Apple Pencil Pro
 - Storage up to 1 TB
 - Lighter at 460 g

3. Galaxy Tab S10 Ultra
 - 14.6" Dynamic AMOLED 2X display, 120 Hz
 - MediaTek Dimensity 9300+ chip
 - Includes S Pen stylus
 - Storage up to 1 TB plus microSD expansion
 - Heavier at 718 g

4. reMarkable Paper Pro
 - 11.8" color e-ink display designed for writing and reading
 - Marker Plus stylus with eraser included
 - Long battery life up to 2 weeks
 - 64 GB storage
 - No apps or notifications, focused on deep reading and sketching

If sketching precision and screen quality are top priorities, the iPad Pro or Galaxy Tab S10 Ultra are strong choices. For a lighter, more affordable option with good sketching support, the iPad Air works well. If the focus is more on reading PDFs and sketching with minimal distractions, the reMarkable Paper Pro is unique with its e-ink display and long battery.

Do you want me to help narrow down based on budget or any other preferences?
```

</details>

### Prompt — _I want a smartwatch that lasts more than three days on one charge._

**Preferred:** hidden (plain prose) · **Judge saw hidden first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 4 · hidden: 5 / 5 / 5

**Rationale:** Response 1 is clearer and more readable without the bracketed product codes, making it more useful and easier to understand for the shopper.

<details><summary>Visible variant</summary>

```
For a smartwatch lasting more than three days on one charge, here are some options from Joule:

- Garmin fēnix 8 [garmin-fenix-8]: Battery lasts up to 16 days in smartwatch mode (MIP display) or 10 days with AMOLED. It's rugged with multi-band GNSS and dive capabilities.
- Apple Watch Ultra 2 [apple-watch-ultra-3]: Battery lasts up to 36 hours normally, or 72 hours in low-power mode (about 3 days). It's a premium rugged watch with a bright display.
- Oura Ring 4 [oura-ring-gen4]: While not a watch, this smart ring lasts up to 8 days on one charge and tracks health data without a screen.

The Apple Watch Series 10 [apple-watch-series-11] lasts up to 18 hours normally, so it doesn't meet your 3-day battery requirement.

If you want the longest battery life, the Garmin fēnix 8 is the best choice here. The Apple Watch Ultra 2 is close but just under 3 days in normal use. Let me know if you want details or other criteria.
```

</details>

<details><summary>Hidden variant</summary>

```
For a smartwatch lasting more than three days on one charge, here are some options from Joule:

- Garmin fēnix 8: Battery lasts up to 16 days in smartwatch mode (MIP display) or 10 days with AMOLED. It's rugged with multi-band GNSS and dive capabilities.
- Apple Watch Ultra 2: Battery lasts up to 36 hours normally, or 72 hours in low-power mode (about 3 days). It's a premium rugged watch with a bright display.
- Oura Ring 4: While not a watch, this smart ring lasts up to 8 days on one charge and tracks health data without a screen.

The Apple Watch Series 10 lasts up to 18 hours normally, so it doesn't meet your 3-day battery requirement.

If you want the longest battery life, the Garmin fēnix 8 is the best choice here. The Apple Watch Ultra 2 is close but just under 3 days in normal use. Let me know if you want details or other criteria.
```

</details>

### Prompt — _What's the cheapest decent laptop you carry?_

**Preferred:** hidden (plain prose) · **Judge saw visible first**

**Scores (trust / clarity / usefulness)** — visible: 4 / 4 / 4 · hidden: 4 / 5 / 4

**Rationale:** Response 2 is slightly clearer without the bracketed product code, making it easier to read while providing the same useful information.

<details><summary>Visible variant</summary>

```
The cheapest decent laptop we carry is the MacBook Air 13" (M4) [macbook-air-m4-13], priced at 1299 EUR. It features a silent, fanless design and all-day battery life.

If you want, I can provide details on other laptops or help you compare them. What will you mainly use the laptop for?
```

</details>

<details><summary>Hidden variant</summary>

```
The cheapest decent laptop we carry is the MacBook Air 13" (M4), priced at 1299 EUR. It features a silent, fanless design and all-day battery life.

If you want, I can provide details on other laptops or help you compare them. What will you mainly use the laptop for?
```

</details>

### Prompt — _I get wrist pain — recommend an ergonomic mouse._

**Preferred:** hidden (plain prose) · **Judge saw hidden first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 4 / 4 · hidden: 5 / 5 / 5

**Rationale:** Response 1 is clearer and more readable without the bracketed product codes, making it more user-friendly while maintaining trustworthiness and usefulness.

<details><summary>Visible variant</summary>

```
For wrist pain and ergonomic support, the Logitech MX Vertical [mx-vertical] is a strong choice. It features a 57° grip angle designed to reduce forearm strain by holding your hand in a more natural position. It also has a 4000 DPI sensor and wireless connectivity with Bluetooth and Logi Unifying, plus a long battery life of about 4 months per charge.

The MX Master 3S [logi-mx-master-3s] is a more traditional shape but well-regarded for productivity with silent clicks and a high 8000 DPI sensor. However, it is less specialized for wrist ergonomics than the MX Vertical. The Razer DeathAdder V3 Pro [razer-deathadder-v3-pro] and Glorious Model O 2 Pro [glorious-model-o2-pro] are lighter gaming mice but not specifically ergonomic for wrist pain.

If wrist comfort is your priority, the MX Vertical is the best ergonomic mouse here. Would you like details on where to buy or more options?
```

</details>

<details><summary>Hidden variant</summary>

```
For wrist pain and ergonomic support, the Logitech MX Vertical is a strong choice. It features a 57° grip angle designed to reduce forearm strain by holding your hand in a more natural position. It also has a 4000 DPI sensor and wireless connectivity with Bluetooth and Logi Unifying, plus a long battery life of about 4 months per charge.

The MX Master 3S is a more traditional shape but well-regarded for productivity with silent clicks and a high 8000 DPI sensor. However, it is less specialized for wrist ergonomics than the MX Vertical. The Razer DeathAdder V3 Pro and Glorious Model O 2 Pro are lighter gaming mice but not specifically ergonomic for wrist pain.

If wrist comfort is your priority, the MX Vertical is the best ergonomic mouse here. Would you like details on where to buy or more options?
```

</details>

### Prompt — _What's a good drone for travel videos?_

**Preferred:** visible (slug chips) · **Judge saw visible first**

**Scores (trust / clarity / usefulness)** — visible: 5 / 5 / 5 · hidden: 5 / 5 / 5

**Rationale:** Response 1 includes product codes which can help shoppers quickly identify or search for the products, enhancing usefulness without sacrificing clarity or trustworthiness.

<details><summary>Visible variant</summary>

```
For travel videos, two good drones in Joule's catalog are:

- DJI Air 3S [dji-air-3s]: A dual-camera prosumer drone with a 1" 50 MP main sensor plus a 70 mm telephoto camera. It offers 4K 100 fps HDR video, 45 minutes flight time, and forward LiDAR plus omnidirectional obstacle sensing. It weighs 724 g.

- DJI Mini 4 Pro [dji-mini-4-pro]: A lighter sub-250 g drone with a 1/1.3" CMOS camera, 4K 100 fps HDR video, omnidirectional sensing, and ActiveTrack 360°. It has 34 min flight time standard (45 min with Plus battery) and OcuSync 4 transmission.

The Air 3S is better for higher image quality and telephoto shots but heavier. The Mini 4 Pro is more travel-friendly due to its light weight and still has strong video and sensing features. Which trade-off fits your travel style better?
```

</details>

<details><summary>Hidden variant</summary>

```
For travel videos, two good drones in Joule's catalog are:

- DJI Air 3S: A dual-camera prosumer drone with a 1" 50 MP main sensor plus a 70 mm telephoto camera. It offers 4K 100 fps HDR video, 45 minutes flight time, and forward LiDAR plus omnidirectional obstacle sensing. It weighs 724 g.

- DJI Mini 4 Pro: A lighter sub-250 g drone with a 1/1.3" CMOS camera, 4K 100 fps HDR video, omnidirectional sensing, and ActiveTrack 360°. It has 34 min flight time standard (45 min with Plus battery) and OcuSync 4 transmission.

The Air 3S is better for higher image quality and telephoto shots but heavier. The Mini 4 Pro is more travel-friendly due to its light weight and still has strong video and sensing features. Which trade-off fits your travel style better?
```

</details>

## Caveats

- The judge is the same model family as the writer, which is a known weakness of LLM-as-judge — same biases on both sides. Cross-family judging (e.g. Claude judges GPT) would strengthen the result; we did not run that here.
- Order randomisation only blocks the crudest position bias. Wording (which variant is labelled "Response 1") can still leak signal.
- Sample size is small. Treat the headline as directional, not significant. Reasonable next step: 30+ prompts with bootstrap CIs.
- The "hidden" variant strips only the `[slug]` brackets. Real-world removal of "reasoning" UI would also drop the tool-call chips, which the experiment cannot measure end-to-end without an actual user study.
