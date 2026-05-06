import type { Category, Product, ProductSpec } from './types';

export const categories: Category[] = [
	{ slug: 'laptops', name: 'Laptops', blurb: 'Ultrabooks, creator machines, gaming rigs.' },
	{ slug: 'desktops', name: 'Desktops', blurb: 'Workstations, mini PCs, all-in-ones.' },
	{ slug: 'monitors', name: 'Monitors', blurb: 'Office, creator, gaming displays.' },
	{ slug: 'keyboards', name: 'Keyboards', blurb: 'Mechanical, low-profile, ergonomic.' },
	{ slug: 'mice', name: 'Mice', blurb: 'Productivity and esports pointers.' },
	{ slug: 'headphones', name: 'Headphones', blurb: 'Wireless, noise-cancelling, open-back.' },
	{ slug: 'speakers', name: 'Speakers', blurb: 'Portable, bookshelf, multiroom.' },
	{ slug: 'smartphones', name: 'Smartphones', blurb: 'iOS and Android flagships to compacts.' },
	{ slug: 'tablets', name: 'Tablets', blurb: 'Reading, drawing, on-the-move work.' },
	{ slug: 'smartwatches', name: 'Smartwatches', blurb: 'Fitness, health, hybrid analog.' },
	{ slug: 'cameras', name: 'Cameras', blurb: 'Mirrorless, compacts, action cams.' },
	{ slug: 'drones', name: 'Drones', blurb: 'Consumer aerial + FPV.' },
	{ slug: 'gaming-consoles', name: 'Gaming consoles', blurb: 'Living-room and handheld.' },
	{ slug: 'tvs', name: 'TVs', blurb: 'OLED, QD-OLED, mini-LED.' },
	{ slug: 'home-audio', name: 'Home audio', blurb: 'Receivers, soundbars, subs.' },
	{ slug: 'storage', name: 'Storage', blurb: 'Internal, portable, NAS.' },
	{ slug: 'networking', name: 'Networking', blurb: 'Wi-Fi 7, mesh, wired.' },
	{ slug: 'smart-home', name: 'Smart home', blurb: 'Hubs, bulbs, security, sensors.' }
];

function specs(pairs: Array<[string, string]>): ProductSpec[] {
	return pairs.map(([label, value]) => ({ label, value }));
}

function img(seed: string, alt: string): { url: string; alt: string } {
	return { url: `https://picsum.photos/seed/${seed}/1200/900`, alt };
}

function imgs(seed: string, name: string, n = 3) {
	return Array.from({ length: n }, (_, i) => img(`${seed}-${i + 1}`, `${name} — view ${i + 1}`));
}

function p(
	slug: string,
	name: string,
	brand: string,
	categorySlug: string,
	priceCents: number,
	tagline: string,
	description: string,
	specList: Array<[string, string]>,
	opts: Partial<Product> = {}
): Product {
	return {
		slug,
		name,
		brand,
		categorySlug,
		priceCents,
		tagline,
		description,
		specs: specs(specList),
		images: imgs(slug, name, 3),
		stockQty: opts.stockQty ?? 25,
		featured: opts.featured,
		rating: opts.rating,
		reviewCount: opts.reviewCount
	};
}

export const products: Product[] = [
	// --- Laptops ---
	p(
		'macbook-air-m4-13',
		'MacBook Air 13" (M4)',
		'Apple',
		'laptops',
		129900,
		'Silent, fanless, all-day battery.',
		'The fanless M4 MacBook Air handles writing, coding, and light video editing without a sound. Up to 18-hour battery and a 500-nit Liquid Retina display that holds up outdoors.',
		[
			['Chip', 'Apple M4 (10-core CPU, 10-core GPU)'],
			['Memory', '16 GB unified'],
			['Storage', '512 GB SSD'],
			['Display', '13.6" Liquid Retina · 2560×1664 · 500 nits'],
			['Ports', '2× Thunderbolt 4, MagSafe 3, 3.5 mm'],
			['Battery', 'Up to 18 h video playback'],
			['Weight', '1.24 kg']
		],
		{ featured: true, rating: 4.8, reviewCount: 412 }
	),
	p(
		'macbook-pro-m4-pro-14',
		'MacBook Pro 14" (M4 Pro)',
		'Apple',
		'laptops',
		239900,
		'Mini-LED, 12-core, quiet under load.',
		"A pro machine with Apple's 120 Hz Liquid Retina XDR mini-LED display, the M4 Pro chip, and Thunderbolt 5 ports for high-bandwidth external storage and displays.",
		[
			['Chip', 'Apple M4 Pro (12-core CPU, 16-core GPU)'],
			['Memory', '24 GB unified'],
			['Storage', '1 TB SSD'],
			['Display', '14.2" Liquid Retina XDR · 3024×1964 · ProMotion 120 Hz'],
			['Ports', '3× Thunderbolt 5, HDMI, SDXC, MagSafe 3'],
			['Battery', 'Up to 22 h video playback'],
			['Weight', '1.60 kg']
		],
		{ rating: 4.9, reviewCount: 298 }
	),
	p(
		'xps-13-plus',
		'XPS 13 Plus (9340)',
		'Dell',
		'laptops',
		144900,
		'Edge-to-edge keyboard, OLED option.',
		"Dell's minimalist thin-and-light with a capacitive function row, a seamless glass haptic trackpad, and an optional 3.5K OLED panel.",
		[
			['CPU', 'Intel Core Ultra 7 155H'],
			['Memory', '16 GB LPDDR5X-7467'],
			['Storage', '512 GB PCIe 4.0 SSD'],
			['Display', '13.4" 3.5K OLED · 2880×1800 · 60 Hz touch'],
			['Ports', '2× Thunderbolt 4'],
			['Battery', '55 Wh'],
			['Weight', '1.24 kg']
		],
		{ featured: true, rating: 4.4, reviewCount: 168 }
	),
	p(
		'thinkpad-x1-carbon-gen13',
		'ThinkPad X1 Carbon Gen 13',
		'Lenovo',
		'laptops',
		189900,
		'The boring-in-a-good-way business laptop.',
		"Lenovo's flagship carbon-fibre business ultrabook with a Core Ultra (Series 2) platform, a legendary keyboard, and an optional 5G modem for road warriors.",
		[
			['CPU', 'Intel Core Ultra 7 258V (Lunar Lake)'],
			['Memory', '32 GB LPDDR5X (on-package)'],
			['Storage', '1 TB PCIe 4.0 SSD'],
			['Display', '14" 2.8K OLED · 2880×1800 · 120 Hz'],
			['Ports', '2× Thunderbolt 4, 2× USB-A, HDMI 2.1'],
			['Battery', '57 Wh · up to 18 h'],
			['Weight', '0.99 kg']
		],
		{ rating: 4.7, reviewCount: 221 }
	),
	p(
		'surface-laptop-7',
		'Surface Laptop 7 (15")',
		'Microsoft',
		'laptops',
		164900,
		'Copilot+ with Snapdragon X Elite.',
		"Microsoft's first Copilot+ Surface. The Snapdragon X Elite pairs long battery life with Prism x86 emulation, a 120 Hz PixelSense display, and a haptic touchpad.",
		[
			['CPU', 'Snapdragon X Elite X1E-80-100 (12-core)'],
			['Memory', '16 GB LPDDR5X'],
			['Storage', '512 GB SSD'],
			['Display', '15" PixelSense · 2496×1664 · 120 Hz touch'],
			['Ports', '2× USB-C 4.0, USB-A 3.1, Surface Connect'],
			['Battery', 'Up to 22 h video'],
			['Weight', '1.66 kg']
		],
		{ rating: 4.5, reviewCount: 142 }
	),
	p(
		'zephyrus-g14-2025',
		'ROG Zephyrus G14 (2025)',
		'ASUS',
		'laptops',
		219900,
		'A gaming laptop that fits a backpack.',
		'A 14-inch thin-and-light gaming laptop with an RTX 50-series GPU, a 3K OLED 120 Hz display, and a CNC-milled magnesium-aluminium chassis under 1.6 kg.',
		[
			['CPU', 'AMD Ryzen AI 9 HX 370'],
			['GPU', 'NVIDIA GeForce RTX 5070 Laptop (8 GB)'],
			['Memory', '32 GB LPDDR5X-7500'],
			['Storage', '1 TB PCIe 4.0 SSD'],
			['Display', '14" ROG Nebula OLED · 2880×1800 · 120 Hz'],
			['Battery', '73 Wh'],
			['Weight', '1.59 kg']
		],
		{ featured: true, rating: 4.6, reviewCount: 186 }
	),
	p(
		'framework-laptop-16',
		'Framework Laptop 16',
		'Framework',
		'laptops',
		199900,
		'The one you can actually repair.',
		'A fully modular 16-inch laptop with a hot-swappable GPU bay, swappable expansion card ports, and every major part rated user-replaceable with QR codes to spares.',
		[
			['CPU', 'AMD Ryzen 9 7940HS'],
			['GPU', 'Radeon RX 7700S (graphics module, 8 GB)'],
			['Memory', '32 GB DDR5-5600 SO-DIMM'],
			['Storage', '1 TB PCIe 4.0 M.2 NVMe'],
			['Display', '16" · 2560×1600 · 165 Hz matte'],
			['Ports', '6× swappable Expansion Cards'],
			['Weight', '2.1 kg']
		],
		{ rating: 4.4, reviewCount: 95 }
	),

	// --- Desktops ---
	p(
		'mac-mini-m4-pro',
		'Mac mini (M4 Pro)',
		'Apple',
		'desktops',
		149900,
		'Tiny footprint, workstation muscle.',
		'A 12.7 cm-square desktop that compresses ProRes and runs Xcode builds faster than many tower PCs — with Thunderbolt 5 and near-silent cooling.',
		[
			['Chip', 'Apple M4 Pro (12-core CPU, 16-core GPU)'],
			['Memory', '24 GB unified'],
			['Storage', '512 GB SSD'],
			['Ports', '3× Thunderbolt 5, HDMI, 2× USB-A, 10GbE option'],
			['Networking', 'Wi-Fi 6E, Bluetooth 5.3'],
			['Size', '12.7 × 12.7 × 5.0 cm']
		],
		{ featured: true, rating: 4.8, reviewCount: 312 }
	),
	p(
		'imac-m4-24',
		'iMac 24" (M4)',
		'Apple',
		'desktops',
		159900,
		'All-in-one with a 4.5K screen.',
		"Apple's friendly family desktop in seven colours. A 4.5K Retina display, a 12 MP Center Stage camera, and the M4 chip in a 11.5 mm-thin chassis.",
		[
			['Chip', 'Apple M4 (10-core CPU, 10-core GPU)'],
			['Memory', '16 GB unified'],
			['Storage', '512 GB SSD'],
			['Display', '24" 4.5K Retina · 4480×2520 · 500 nits'],
			['Camera', '12 MP Center Stage'],
			['Ports', '2× Thunderbolt 4, 2× USB-C']
		],
		{ rating: 4.7, reviewCount: 178 }
	),
	p(
		'beelink-ser8',
		'Beelink SER8 (Ryzen 7 8845HS)',
		'Beelink',
		'desktops',
		72900,
		'A mini PC that punches up.',
		'A sub-litre mini PC with a Ryzen 8000-series APU — strong enough for a dev box, a Plex server, or a quiet HTPC under a TV.',
		[
			['CPU', 'AMD Ryzen 7 8845HS (8C/16T, up to 5.1 GHz)'],
			['GPU', 'Radeon 780M (integrated)'],
			['Memory', '32 GB DDR5-5600'],
			['Storage', '1 TB PCIe 4.0 NVMe'],
			['Ports', 'USB4 40 Gbps, 2× HDMI 2.1, 2.5GbE, 3× USB-A'],
			['Size', '12.6 × 11.3 × 4.2 cm']
		],
		{ rating: 4.5, reviewCount: 142 }
	),
	p(
		'nzxt-player-three-rtx5080',
		'NZXT Player: Three (RTX 5080)',
		'NZXT',
		'desktops',
		289900,
		"A pre-built you won't want to take apart.",
		"NZXT's top-tier Player: Three gaming PC: clean cable-managed build tested before shipping, RTX 5080 paired with the Ryzen 7 9800X3D, and a CAM-tuned fan curve.",
		[
			['CPU', 'AMD Ryzen 7 9800X3D (8C/16T, 3D V-Cache)'],
			['GPU', 'NVIDIA GeForce RTX 5080 (16 GB GDDR7)'],
			['Memory', '32 GB DDR5-6000'],
			['Storage', '2 TB PCIe 4.0 NVMe'],
			['PSU', '850 W 80+ Gold'],
			['Case', 'NZXT H6 Flow (mid-tower)']
		],
		{ featured: true, rating: 4.6, reviewCount: 84 }
	),

	// --- Monitors ---
	p(
		'dell-u2725qe',
		'UltraSharp 27 4K (U2725QE)',
		'Dell',
		'monitors',
		82900,
		'Calibrated IPS Black with Thunderbolt 4.',
		'A 27-inch 4K IPS Black panel with factory sRGB calibration, a Thunderbolt 4 hub that delivers 140 W to a laptop, and a dual-stream daisy-chain output.',
		[
			['Panel', '27" 4K IPS Black (3840×2160)'],
			['Refresh', '120 Hz'],
			['Contrast', '2000:1'],
			['Color', '100 % sRGB · 98 % DCI-P3'],
			['Ports', 'TB4 in (140 W) + out, 3× USB-C, 4× USB-A, DP 1.4, HDMI 2.1, 2.5GbE'],
			['HDR', 'VESA DisplayHDR 600']
		],
		{ featured: true, rating: 4.8, reviewCount: 204 }
	),
	p(
		'lg-27gr95qe',
		'UltraGear 27GR95QE (OLED)',
		'LG',
		'monitors',
		99900,
		'240 Hz OLED for esports.',
		"LG's 27-inch WOLED gaming monitor with a 0.03 ms response time, 240 Hz refresh, and a low-reflection matte coating. G-SYNC Compatible and FreeSync Premium.",
		[
			['Panel', '27" WOLED'],
			['Resolution', '2560×1440'],
			['Refresh', '240 Hz'],
			['Response', '0.03 ms GtG'],
			['HDR', 'DisplayHDR True Black 400'],
			['Ports', '2× HDMI 2.1, DP 1.4, 3× USB 3.0']
		],
		{ rating: 4.7, reviewCount: 156 }
	),
	p(
		'asus-proart-pa32ucg',
		'ProArt PA32UCG-K',
		'ASUS',
		'monitors',
		289900,
		'Mini-LED HDR reference.',
		'A reference 32-inch mini-LED display with 1152 dimming zones, 1600 nits peak brightness, Calman auto-calibration, and Dolby Vision support for colour-grading work.',
		[
			['Panel', '32" 4K IPS mini-LED (3840×2160)'],
			['Dimming zones', '1152'],
			['Peak brightness', '1600 nits'],
			['Color', '98 % DCI-P3 · 85 % Rec.2020 · Delta E < 1'],
			['Refresh', '120 Hz'],
			['Ports', 'Thunderbolt 4 (90 W), 3× HDMI 2.1, DP 1.4']
		]
	),
	p(
		'gigabyte-m32u',
		'M32U',
		'Gigabyte',
		'monitors',
		55900,
		'4K 144 Hz at a sane price.',
		'A generalist 32-inch 4K IPS with 144 Hz, HDMI 2.1, and a built-in KVM switch. Covers gaming, photo, and office without forcing a compromise.',
		[
			['Panel', '31.5" 4K SS IPS (3840×2160)'],
			['Refresh', '144 Hz'],
			['Response', '1 ms MPRT'],
			['HDR', 'VESA DisplayHDR 400'],
			['Color', '90 % DCI-P3'],
			['Ports', '2× HDMI 2.1, DP 1.4, USB-C (18 W), KVM']
		],
		{ rating: 4.4, reviewCount: 224 }
	),

	// --- Keyboards ---
	p(
		'keychron-q1-he',
		'Keychron Q1 HE',
		'Keychron',
		'keyboards',
		19900,
		'Hall-effect, QMK, hot-swap.',
		'A 75 % CNC-aluminium keyboard with Gateron Nebula magnetic Hall-effect switches, per-key actuation tuning, Rapid Trigger, and open-source QMK/VIA firmware.',
		[
			['Layout', '75 % (81 keys)'],
			['Switches', 'Gateron Nebula magnetic (Hall-effect)'],
			['Connection', 'Wired USB-C / Bluetooth 5.1 / 2.4 GHz'],
			['Polling', '1000 Hz'],
			['Firmware', 'QMK / VIA'],
			['Body', 'CNC aluminium, 1.9 kg']
		],
		{ featured: true, rating: 4.7, reviewCount: 312 }
	),
	p(
		'apple-magic-keyboard-usb-c',
		'Magic Keyboard with Touch ID (USB-C)',
		'Apple',
		'keyboards',
		17900,
		'Low-profile scissor, done right.',
		"Apple's full-size Magic Keyboard with Touch ID, USB-C charging, and a numeric keypad. Pairs with any Apple-silicon Mac for biometric login.",
		[
			['Layout', 'Full-size with numeric keypad'],
			['Wireless', 'Bluetooth'],
			['Battery', '~1 month per charge'],
			['Charging', 'USB-C'],
			['Extras', 'Touch ID (Apple silicon Macs)']
		]
	),
	p(
		'hhkb-studio',
		'HHKB Studio',
		'PFU',
		'keyboards',
		38900,
		'Topre-style meets a pointing stick.',
		'The HHKB reimagined for power users: mechanical contactless switches, a pointing stick, four mouse buttons and gesture pads. 60 % with the classic HHKB layout.',
		[
			['Layout', '60 % (HHKB)'],
			['Switches', 'HHKB Studio contactless (silent linear)'],
			['Connection', 'USB-C / Bluetooth 5.1 (up to 4 devices)'],
			['Power', '4× AA or USB-C'],
			['Extras', 'Pointing stick, 4 mouse buttons, 4 gesture pads']
		]
	),
	p(
		'logi-mx-keys-s',
		'MX Keys S',
		'Logitech',
		'keyboards',
		11900,
		'The safe office pick.',
		'A quiet low-profile scissor keyboard with smart backlighting, proximity wake, and Logi Flow to hop between a Mac and a PC on the same keystroke.',
		[
			['Layout', 'Full-size'],
			['Wireless', 'Bluetooth + Logi Bolt USB'],
			['Battery', '10 days (backlit) / 5 months (off)'],
			['Backlight', 'Auto-adjusting'],
			['Charging', 'USB-C']
		]
	),

	// --- Mice ---
	p(
		'logi-mx-master-3s',
		'MX Master 3S',
		'Logitech',
		'mice',
		9900,
		'Silent clicks, 8K DPI sensor.',
		"Logitech's flagship productivity mouse with quiet clicks, a MagSpeed electromagnetic scroll wheel, and a thumb-actuated horizontal scroll wheel. Flow across devices.",
		[
			['Sensor', 'Darkfield 8000 DPI'],
			['Buttons', '7 programmable'],
			['Wireless', 'Bluetooth Low Energy + Logi Bolt'],
			['Battery', '70 days per charge (USB-C)'],
			['Weight', '141 g']
		],
		{ featured: true, rating: 4.8, reviewCount: 512 }
	),
	p(
		'razer-deathadder-v3-pro',
		'DeathAdder V3 Pro',
		'Razer',
		'mice',
		14900,
		'63 g of ergonomic speed.',
		'An ultra-light ergonomic esports mouse with a 30K DPI optical sensor, third-gen optical switches rated for 90 million clicks, and optional 4000 Hz HyperPolling via the Wireless Dongle Pro.',
		[
			['Sensor', 'Focus Pro 30K optical'],
			['Weight', '63 g'],
			['Switches', 'Gen-3 Optical (90M clicks)'],
			['Polling', '1000 Hz (up to 4000 Hz with dongle)'],
			['Battery', '~90 h wireless']
		],
		{ rating: 4.6, reviewCount: 288 }
	),
	p(
		'glorious-model-o2-pro',
		'Model O 2 Pro',
		'Glorious',
		'mice',
		10900,
		'Featherweight wireless.',
		'A 58 g ambidextrous wireless esports mouse with the BAMF 2.0 sensor, 4K/8K optional receiver, and a solid (non-honeycomb) shell.',
		[
			['Sensor', 'BAMF 2.0 (26000 DPI)'],
			['Weight', '58 g'],
			['Polling', '1000 Hz (4K/8K receiver optional)'],
			['Battery', '~80 h wireless'],
			['Connection', '2.4 GHz / Bluetooth / USB-C']
		]
	),
	p(
		'mx-vertical',
		'MX Vertical',
		'Logitech',
		'mice',
		9900,
		'57° grip, wrist-friendly.',
		'A vertical ergonomic mouse that holds the hand at a natural 57-degree angle, reducing forearm strain. Works with Logi Flow across three paired devices.',
		[
			['Sensor', '4000 DPI'],
			['Grip angle', '57°'],
			['Wireless', 'Bluetooth + Logi Unifying'],
			['Battery', '4 months per charge (USB-C)'],
			['Weight', '135 g']
		]
	),

	// --- Headphones ---
	p(
		'sony-wh-1000xm6',
		'WH-1000XM6',
		'Sony',
		'headphones',
		44900,
		'Category-defining noise cancelling.',
		"Sony's sixth-gen flagship ANC headphones. New QN3 processor with twelve microphones, best-in-class noise cancelling, multipoint, LDAC, and a folding hinge.",
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'QN3 processor · 12 mics'],
			['Battery', '30 h (ANC on) · 40 h (off)'],
			['Codecs', 'LDAC, LC3, AAC, SBC'],
			['Charging', 'USB-C · 3 min = 3 h'],
			['Weight', '254 g']
		],
		{ featured: true, rating: 4.8, reviewCount: 487 }
	),
	p(
		'bose-qc-ultra',
		'QuietComfort Ultra Headphones',
		'Bose',
		'headphones',
		44900,
		'Still the comfort leader.',
		"Bose's lightest-feeling over-ear ANC headphones with Immersive Audio, CustomTune per-ear calibration, and Snapdragon Sound aptX Adaptive support.",
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'CustomTune adaptive'],
			['Battery', '24 h (ANC on) · 18 h (Immersive)'],
			['Codecs', 'aptX Adaptive, SBC, AAC'],
			['Weight', '253 g']
		]
	),
	p(
		'apple-airpods-pro-3',
		'AirPods Pro 2 (USB-C)',
		'Apple',
		'headphones',
		27900,
		'The default iPhone earbud.',
		"Apple's second-gen AirPods Pro with USB-C case, improved ANC, Adaptive Audio, Conversation Awareness, and certified clinical-grade Hearing Aid mode.",
		[
			['Type', 'In-ear, closed (silicone tips)'],
			['Chip', 'Apple H2'],
			['ANC', 'Adaptive Audio · Transparency'],
			['Battery', '6 h bud / 30 h case'],
			['Codecs', 'AAC, Lossless (with Vision Pro)'],
			['Case', 'USB-C · MagSafe · Qi · Apple Watch charger']
		]
	),
	p(
		'sennheiser-hd660s2',
		'HD 660S2',
		'Sennheiser',
		'headphones',
		54900,
		'Reference open-back for deep listening.',
		"Sennheiser's HD 600-lineage open-back with a deeper, more extended sub-bass response and the refined midrange that made this family a genre classic.",
		[
			['Type', 'Over-ear, open-back'],
			['Impedance', '300 Ω'],
			['Drivers', '42 mm dynamic transducers'],
			['Frequency response', '8 Hz – 41.5 kHz'],
			['Cable', '1.8 m 6.35 mm + 1.8 m 4.4 mm balanced'],
			['Weight', '260 g']
		]
	),
	p(
		'shure-aonic-50-gen2',
		'AONIC 50 Gen 2',
		'Shure',
		'headphones',
		37900,
		'Wireless + 24-bit USB audio.',
		'A studio-leaning wireless over-ear with adaptive ANC, Snapdragon Sound, and a USB-C wired mode that passes a 32-bit/384 kHz signal into the onboard DAC.',
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'Adaptive hybrid'],
			['Battery', '45 h'],
			['Codecs', 'aptX Lossless, aptX Adaptive, LDAC, AAC, SBC'],
			['Wired', 'USB-C (32-bit/384 kHz) · 3.5 mm']
		]
	),
	p(
		'sony-linkbuds-s',
		'LinkBuds S',
		'Sony',
		'headphones',
		17900,
		'Tiny earbuds, big feature set.',
		"Sony's smallest and lightest ANC earbud, with 360 Reality Audio, Speak-to-Chat, and LDAC support over Android.",
		[
			['Type', 'In-ear, closed'],
			['Driver', '5 mm dynamic'],
			['ANC', 'Adaptive'],
			['Battery', '6 h bud / 20 h case'],
			['Codecs', 'LDAC, AAC, SBC'],
			['Weight', '4.8 g per bud']
		]
	),

	// --- Speakers ---
	p(
		'sonos-era-300',
		'Era 300',
		'Sonos',
		'speakers',
		49900,
		'Spatial audio for the living room.',
		'The first Sonos built for Dolby Atmos Music. Six drivers fire sideways and upwards, Trueplay tunes to the room, and USB-C line-in accepts aux or Ethernet via adapter.',
		[
			['Drivers', '6 (4 tweeters + 2 woofers)'],
			['Inputs', 'Wi-Fi 6, Bluetooth 5.0, USB-C line-in'],
			['Voice', 'Amazon Alexa, Sonos Voice'],
			['Pairing', 'Stereo pair + Atmos rears on Arc/Beam'],
			['Weight', '4.47 kg']
		],
		{ rating: 4.5, reviewCount: 188 }
	),
	p(
		'kef-ls50-wireless-ii',
		'LS50 Wireless II',
		'KEF',
		'speakers',
		259900,
		'Bookshelf monitors with a brain.',
		'A pair of active bookshelf speakers with onboard amplification, room correction, HDMI eARC, and every major streaming protocol built in.',
		[
			['Drivers', 'Uni-Q 12th-gen coaxial'],
			['Amplification', '280 W per side (100 W Class A/B tweeter, 280 W Class D woofer)'],
			['Inputs', 'HDMI eARC, optical, coaxial, RCA, subwoofer out'],
			['Wireless', 'Wi-Fi, Bluetooth 4.2'],
			['Streaming', 'AirPlay 2, Chromecast, Roon Ready, Tidal Connect, Spotify Connect']
		],
		{ featured: true }
	),
	p(
		'bose-soundlink-revolve-plus-ii',
		'SoundLink Revolve+ II',
		'Bose',
		'speakers',
		32900,
		'The classic 360° portable.',
		'A 360-degree portable Bluetooth speaker with a built-in handle, full-range driver plus dual passive radiators, and IP55 dust and water resistance.',
		[
			['Type', 'Portable 360°'],
			['Battery', '17 h'],
			['Water rating', 'IP55'],
			['Inputs', 'Bluetooth 4.2, 3.5 mm aux, USB-C'],
			['Weight', '0.9 kg']
		]
	),
	p(
		'jbl-flip-7',
		'Flip 7',
		'JBL',
		'speakers',
		14900,
		'Party default.',
		"JBL's latest portable Bluetooth speaker — IP68-rated, Auracast-capable for linking multiple units, and a hardened metal grille that survives real use.",
		[
			['Type', 'Portable (oval tube)'],
			['Battery', '14 h (+ 2 h Playtime Boost)'],
			['Water rating', 'IP68'],
			['Linking', 'Auracast'],
			['Bluetooth', '5.4 LE Audio'],
			['Weight', '0.56 kg']
		]
	),

	// --- Smartphones ---
	p(
		'iphone-17-pro',
		'iPhone 17 Pro',
		'Apple',
		'smartphones',
		129900,
		'A19 Pro, vapor chamber cooling.',
		"Apple's most aggressive thermal design in years. A19 Pro silicon, a redesigned camera plateau, and ProMotion OLED at up to 3000 nits outdoors.",
		[
			['Chip', 'Apple A19 Pro'],
			['Display', '6.3" Super Retina XDR · 120 Hz ProMotion · 3000 nits'],
			['Storage', '256 GB / 512 GB / 1 TB / 2 TB'],
			['Battery', 'Up to 27 h video'],
			['Cameras', '48 MP main + 48 MP UW + 48 MP 4× tele (8× optical-quality)'],
			['Build', 'Aluminium unibody, Ceramic Shield 2'],
			['Connectivity', 'USB-C 3.2, Wi-Fi 7, Thread']
		],
		{ featured: true, rating: 4.8, reviewCount: 524 }
	),
	p(
		'samsung-galaxy-s25-ultra',
		'Galaxy S25 Ultra',
		'Samsung',
		'smartphones',
		134900,
		'Peak Android with an S Pen.',
		'A titanium-framed Android flagship with a 200 MP main sensor, S Pen in the body, and seven years of OS and security updates.',
		[
			['Chip', 'Snapdragon 8 Elite for Galaxy'],
			['Display', '6.9" QHD+ Dynamic AMOLED 2X · 120 Hz · 2600 nits'],
			['Storage', '256 GB / 512 GB / 1 TB'],
			['Battery', '5000 mAh · 45 W wired / 15 W Qi2'],
			['Cameras', '200 MP main + 50 MP 5× tele + 10 MP 3× tele + 50 MP UW'],
			['Build', 'Titanium frame, Gorilla Armor 2'],
			['Support', '7 years of OS + security updates']
		],
		{ rating: 4.7, reviewCount: 368 }
	),
	p(
		'google-pixel-10-pro',
		'Pixel 10 Pro',
		'Google',
		'smartphones',
		109900,
		'Computational photography, refined.',
		"Google's software-first flagship with the Tensor G5 on a TSMC 3 nm process, seven years of updates, and Magic Editor + on-device generative tools.",
		[
			['Chip', 'Google Tensor G5 (TSMC 3 nm)'],
			['Display', '6.3" LTPO OLED · 120 Hz · 3000 nits'],
			['Storage', '128 GB / 256 GB / 512 GB / 1 TB'],
			['Battery', '4870 mAh · 30 W wired / 15 W Qi2'],
			['Cameras', '50 MP main + 48 MP UW + 48 MP 5× tele'],
			['Support', '7 years of Pixel Drops + security']
		]
	),
	p(
		'oneplus-13',
		'OnePlus 13',
		'OnePlus',
		'smartphones',
		89900,
		'Fast charging, fast display.',
		'A flagship with Hasselblad-tuned cameras, 100 W wired SuperVOOC, 50 W wireless, and one of the largest batteries in a slab phone this year.',
		[
			['Chip', 'Snapdragon 8 Elite'],
			['Display', '6.82" LTPO AMOLED · QHD+ · 120 Hz · 4500 nits peak'],
			['Storage', '256 GB / 512 GB / 1 TB (UFS 4.0)'],
			['Battery', '6000 mAh Si-C'],
			['Charging', '100 W wired · 50 W wireless'],
			['Water rating', 'IP68 / IP69']
		]
	),
	p(
		'fairphone-6',
		'Fairphone 6',
		'Fairphone',
		'smartphones',
		59900,
		'The ethical, modular Android.',
		'The most repairable Android phone on sale — user-swappable battery, fair-traded cobalt and gold, 8 years of OS updates, and a 5-year warranty.',
		[
			['Chip', 'Snapdragon 7s Gen 3'],
			['Display', '6.31" LTPO OLED · 120 Hz'],
			['Memory', '8 GB RAM'],
			['Storage', '256 GB + microSD'],
			['Battery', '4415 mAh (user-replaceable)'],
			['Warranty', '5 years · 8 years of OS updates']
		]
	),
	p(
		'iphone-se-4',
		'iPhone 16e',
		'Apple',
		'smartphones',
		69900,
		"Apple's value iPhone.",
		"The budget iPhone with Apple Intelligence: A18 chip, USB-C, Face ID, and Apple's first in-house cellular modem (C1) for better battery life.",
		[
			['Chip', 'Apple A18 (4-core GPU)'],
			['Modem', 'Apple C1 (first-party 5G)'],
			['Display', '6.1" Super Retina XDR OLED · 60 Hz'],
			['Storage', '128 GB / 256 GB / 512 GB'],
			['Battery', 'Up to 26 h video playback'],
			['Camera', '48 MP Fusion (2-in-1 main)']
		]
	),

	// --- Tablets ---
	p(
		'ipad-pro-m5-13',
		'iPad Pro 13" (M4)',
		'Apple',
		'tablets',
		149900,
		'Tandem OLED, pencil haptics.',
		"Apple's thinnest product: a 5.1 mm 13-inch tablet with a Tandem OLED Ultra Retina XDR display, Apple Pencil Pro support, and the M4 chip.",
		[
			['Chip', 'Apple M4 (up to 10-core CPU, 10-core GPU)'],
			['Display', '13" Ultra Retina XDR Tandem OLED · 120 Hz'],
			['Storage', '256 GB / 512 GB / 1 TB / 2 TB'],
			['Connectivity', 'Wi-Fi 6E · 5G option'],
			['Ports', 'Thunderbolt 4 / USB 4'],
			['Pencil', 'Apple Pencil Pro (haptics, squeeze)'],
			['Thickness', '5.1 mm · 579 g']
		],
		{ featured: true }
	),
	p(
		'ipad-air-m3-11',
		'iPad Air 11" (M3)',
		'Apple',
		'tablets',
		74900,
		'The default iPad.',
		'The iPad most people should buy — M3 performance, Apple Pencil Pro support, and Magic Keyboard compatibility with a proper function row and trackpad.',
		[
			['Chip', 'Apple M3 (8-core CPU, 9-core GPU)'],
			['Display', '11" Liquid Retina · 2360×1640 · 60 Hz'],
			['Storage', '128 GB / 256 GB / 512 GB / 1 TB'],
			['Connectivity', 'Wi-Fi 6E · optional 5G'],
			['Pencil', 'Apple Pencil Pro / USB-C'],
			['Weight', '460 g']
		]
	),
	p(
		'galaxy-tab-s10-ultra',
		'Galaxy Tab S10 Ultra',
		'Samsung',
		'tablets',
		119900,
		'14.6-inch Android canvas.',
		"Samsung's biggest Android tablet: a 14.6-inch anti-reflective Dynamic AMOLED 2X panel, included S Pen, and DeX desktop mode for real productivity.",
		[
			['Chip', 'MediaTek Dimensity 9300+'],
			['Display', '14.6" Dynamic AMOLED 2X · 2960×1848 · 120 Hz'],
			['Storage', '256 GB / 512 GB / 1 TB + microSD'],
			['Memory', '12 / 16 GB RAM'],
			['S Pen', 'Included'],
			['Weight', '718 g']
		]
	),
	p(
		'remarkable-paper-pro',
		'reMarkable Paper Pro',
		'reMarkable',
		'tablets',
		57900,
		"A tablet that thinks it's paper.",
		'An 11.8-inch colour e-ink tablet with front lighting and Marker Plus stylus. Built for writing and deep reading, with no apps, no notifications, no social.',
		[
			['Display', '11.8" Canvas Color e-ink (4 096 colours, 2160×1620)'],
			['Lighting', 'Adjustable front-light'],
			['Storage', '64 GB'],
			['Battery', 'Up to 2 weeks'],
			['Connectivity', 'Wi-Fi, USB-C'],
			['Stylus', 'Marker Plus (with eraser)']
		]
	),

	// --- Smartwatches ---
	p(
		'apple-watch-ultra-3',
		'Apple Watch Ultra 2',
		'Apple',
		'smartwatches',
		89900,
		'Titanium, 3000 nits, days of battery.',
		"Apple's rugged 49 mm titanium smartwatch with dual-frequency GPS, a 3000-nit always-on display, and 100 m water resistance for diving and open-water swims.",
		[
			['Case', '49 mm titanium (natural or black)'],
			['Display', '3000-nit LTPO Always-On Retina'],
			['Battery', 'Up to 36 h · 72 h low-power'],
			['Sensors', 'ECG, SpO2, skin temperature, depth, altimeter'],
			['GPS', 'Dual-frequency L1/L5'],
			['Water rating', '100 m (WR100 + EN13319 dive)']
		],
		{ featured: true }
	),
	p(
		'apple-watch-series-11',
		'Apple Watch Series 10',
		'Apple',
		'smartwatches',
		44900,
		'Everyday health tracking.',
		"Apple's thinnest mainline watch, with a wider always-on LTPO3 OLED, sleep apnea detection, fall and crash detection, and fast charging.",
		[
			['Case', '42 mm / 46 mm aluminium or titanium'],
			['Display', 'LTPO3 Always-On Retina (2000 nits)'],
			['Battery', 'Up to 18 h · 36 h low-power'],
			['Sensors', 'ECG, SpO2, skin temperature, depth (up to 6 m)'],
			['Health', 'Sleep apnea, fall + crash detection']
		]
	),
	p(
		'garmin-fenix-8',
		'fēnix 8',
		'Garmin',
		'smartwatches',
		104900,
		'Two-week battery, military rugged.',
		"Garmin's flagship multisport watch: full offline topo maps, multi-band GNSS, a built-in mic and speaker for calls, leakproof dive capability, and AMOLED option.",
		[
			['Display', '1.3" / 1.4" AMOLED or MIP'],
			['Battery', 'Up to 16 days smartwatch (MIP) · 10 days (AMOLED)'],
			['GPS', 'Multi-band GNSS, SatIQ'],
			['Durability', '10 ATM + MIL-STD-810, leakproof buttons'],
			['Diving', 'Dive computer (to 40 m recreational)'],
			['Extras', 'Speaker, microphone, offline topo maps']
		]
	),
	p(
		'oura-ring-gen4',
		'Oura Ring 4',
		'Oura',
		'smartwatches',
		39900,
		'Health data without the screen.',
		'A titanium smart ring with improved SmartSensing for 24/7 heart rate, HRV, temperature and sleep tracking. Data access requires the Oura subscription.',
		[
			['Material', 'Titanium (6 finishes)'],
			['Battery', 'Up to 8 days'],
			['Water rating', '100 m'],
			['Sensors', 'PPG HR, SpO2, skin temperature, accelerometer'],
			['Sizes', '4–15']
		]
	),

	// --- Cameras ---
	p(
		'sony-a7cr',
		'α7CR (ILCE-7CR)',
		'Sony',
		'cameras',
		319900,
		'61 MP in a compact full-frame.',
		'A compact rangefinder-style full-frame with the 61 MP BSI CMOS sensor from the α7R V, AI subject recognition, and 7-stop in-body stabilisation.',
		[
			['Sensor', '61 MP BSI full-frame Exmor R'],
			['IBIS', '7 stops'],
			['Autofocus', 'AI subject recognition (693 phase points)'],
			['Video', '4K 60p (Super 35) / 4K 30p full-width'],
			['Viewfinder', '2.36 M-dot OLED EVF'],
			['Weight', '515 g (with battery + card)']
		]
	),
	p(
		'fujifilm-x100vi',
		'X100VI',
		'Fujifilm',
		'cameras',
		179900,
		"A camera you'll actually carry.",
		"The iconic fixed-lens rangefinder-style APS-C compact with a 23 mm f/2 lens, in-body stabilisation, 6.2K video, and Fujifilm's Film Simulations.",
		[
			['Sensor', '40 MP X-Trans CMOS 5 HR APS-C'],
			['Lens', '23 mm f/2 (35 mm equiv.)'],
			['IBIS', '6 stops (5-axis)'],
			['Video', '6.2K 30p / 4K 60p 10-bit'],
			['Viewfinder', 'Hybrid OVF/EVF (3.69 M-dot)'],
			['Weight', '521 g']
		]
	),
	p(
		'canon-r50',
		'EOS R50',
		'Canon',
		'cameras',
		79900,
		'Mirrorless for upgraders.',
		'An approachable APS-C mirrorless with Dual Pixel CMOS AF II subject tracking, 4K oversampled video, and RF-S lens mount. A strong first-system camera.',
		[
			['Sensor', '24.2 MP APS-C CMOS'],
			['Mount', 'Canon RF / RF-S'],
			['Autofocus', 'Dual Pixel CMOS AF II (subject detection)'],
			['Burst', 'Up to 15 fps (electronic)'],
			['Video', '4K 30p oversampled from 6K · FHD 120p'],
			['Weight', '375 g']
		]
	),
	p(
		'dji-osmo-action-5-pro',
		'Osmo Action 5 Pro',
		'DJI',
		'cameras',
		37900,
		'Action cam with a front OLED.',
		'A dual-OLED action cam with a 1/1.3-inch sensor, 4K/120 D-Log M, waterproof to 20 m without housing, and 47 GB of internal storage for offload-free shooting.',
		[
			['Sensor', '1/1.3" CMOS'],
			['Video', '4K 120 fps · 10-bit D-Log M / HLG'],
			['Depth', '20 m without housing (60 m with case)'],
			['Displays', '1.46" front + 2.5" rear OLED'],
			['Battery', '1950 mAh · 4 h at 1080p/24'],
			['Storage', '47 GB internal + microSD']
		]
	),

	// --- Drones ---
	p(
		'dji-air-3s',
		'Air 3S',
		'DJI',
		'drones',
		119900,
		'Dual-camera prosumer drone.',
		'A two-camera folding drone with a 1-inch main sensor paired with a 70 mm medium tele. Forward LiDAR and omnidirectional obstacle sensing, with up to 45 min flight.',
		[
			['Cameras', '1" CMOS 50 MP main + 1/1.3" 70 mm tele'],
			['Video', '4K 100 fps HDR · 10-bit D-Log M'],
			['Flight time', '45 min (Intelligent Battery)'],
			['Transmission', 'OcuSync 4 (O4) · up to 20 km'],
			['Sensing', 'Forward LiDAR + omnidirectional vision'],
			['Weight', '724 g']
		]
	),
	p(
		'dji-mini-4-pro',
		'Mini 4 Pro',
		'DJI',
		'drones',
		95900,
		'Sub-250 g with omnidirectional sensing.',
		'A sub-249 g folding drone with 4K/100 HDR, omnidirectional obstacle sensing, ActiveTrack 360°, and OcuSync 4 video transmission.',
		[
			['Weight', '< 249 g (C0 class)'],
			['Camera', '1/1.3" CMOS · f/1.7'],
			['Video', '4K 100 fps HDR · 10-bit D-Log M'],
			['Flight time', '34 min (standard) · 45 min (Plus battery)'],
			['Transmission', 'OcuSync 4 · up to 20 km'],
			['Sensing', 'Omnidirectional obstacle']
		],
		{ featured: true }
	),

	// --- Gaming consoles ---
	p(
		'playstation-5-pro',
		'PlayStation 5 Pro',
		'Sony',
		'gaming-consoles',
		79900,
		'Ray-traced, upscaled, quieter.',
		'A mid-generation PS5 refresh with a larger RDNA-based GPU (67 % more compute units), a ~45 % faster GPU clock, and the new PSSR AI-upscaler.',
		[
			['Storage', '2 TB NVMe SSD (custom)'],
			['GPU', 'RDNA-custom · 67 % more CUs than PS5 · PSSR upscaler'],
			['Memory', '16 GB GDDR6 + 2 GB DDR5'],
			['Networking', 'Wi-Fi 7'],
			['Ports', 'HDMI 2.1, 4× USB (2× USB-A, 2× USB-C)'],
			['Disc drive', 'Sold separately']
		],
		{ featured: true }
	),
	p(
		'nintendo-switch-2',
		'Nintendo Switch 2',
		'Nintendo',
		'gaming-consoles',
		46900,
		'The family console, refined.',
		'A bigger 7.9-inch 120 Hz LCD with HDR, NVIDIA-powered upscaling (DLSS-style) in dock mode up to 4K, and magnetic Joy-Con 2 controllers.',
		[
			['SoC', 'Custom NVIDIA (Ampere-generation)'],
			['Storage', '256 GB UFS internal (+ microSD Express)'],
			['Display', '7.9" 1080p 120 Hz HDR LCD'],
			['Dock', '4K 60 (up to 4K 120) HDR'],
			['Controllers', 'Magnetic Joy-Con 2 (with mouse mode)'],
			['Compatibility', 'Most Nintendo Switch games']
		]
	),
	p(
		'xbox-series-x-2tb',
		'Xbox Series X (2 TB Galaxy Black)',
		'Microsoft',
		'gaming-consoles',
		64900,
		'Highest-storage refresh.',
		'The most powerful Xbox in its quietest revision, with 2 TB of NVMe storage and a matte galaxy-black finish. Same 12 TFLOPS RDNA 2 GPU.',
		[
			['Storage', '2 TB NVMe SSD (custom)'],
			['GPU', '12 TFLOPS RDNA 2 · 52 CUs @ 1.825 GHz'],
			['Memory', '16 GB GDDR6'],
			['Output', 'HDMI 2.1 · up to 4K 120 / 8K'],
			['Disc drive', 'Ultra HD Blu-ray']
		]
	),
	p(
		'rog-ally-x',
		'ROG Ally X',
		'ASUS',
		'gaming-consoles',
		89900,
		'Windows handheld, properly cooled.',
		"ASUS's upgraded 7-inch Windows handheld: double the RAM, double the storage, an 80 Wh battery, and improved thermals over the original Ally.",
		[
			['SoC', 'AMD Ryzen Z1 Extreme (Zen 4, RDNA 3)'],
			['Memory', '24 GB LPDDR5X-7500'],
			['Storage', '1 TB PCIe 4.0 M.2 2280 NVMe'],
			['Display', '7" FHD 120 Hz IPS VRR'],
			['Battery', '80 Wh'],
			['Ports', '2× USB4 (USB-C), microSD UHS-II'],
			['Weight', '678 g']
		]
	),

	// --- TVs ---
	p(
		'lg-g5-oled',
		'OLED G5 (65")',
		'LG',
		'tvs',
		329900,
		'Gallery OLED, four HDMI 2.1.',
		"LG's Gallery-series flagship OLED with the four-stack Primary RGB Tandem OLED panel (no MLA needed), ~4000 nits peak brightness, and a wall-flush mount included.",
		[
			['Panel', '65" Primary RGB Tandem OLED evo'],
			['Peak brightness', '~4000 nits (HDR)'],
			['Refresh', '165 Hz VRR (4K 165)'],
			['HDR', 'Dolby Vision · HDR10 · HLG'],
			['Ports', '4× HDMI 2.1, 3× USB'],
			['Processor', 'α11 AI Gen 2']
		]
	),
	p(
		'sony-bravia-8-ii',
		'BRAVIA 8 II (65")',
		'Sony',
		'tvs',
		329900,
		'Motion + accuracy in one.',
		"Sony's QD-OLED flagship with the XR Processor, class-leading motion handling, and factory calibration. Includes Professional mode for Sony Pictures Core.",
		[
			['Panel', '65" QD-OLED'],
			['Processor', 'XR Processor'],
			['HDR', 'Dolby Vision · HDR10 · HLG'],
			['Gaming', '4K 120 Hz (2× HDMI 2.1), ALLM, VRR'],
			['Audio', 'Acoustic Surface Audio+'],
			['Smart TV', 'Google TV']
		]
	),
	p(
		'hisense-u8q',
		'U8Q Mini-LED (65")',
		'Hisense',
		'tvs',
		159900,
		'Value mini-LED that punches hard.',
		'A 65-inch mini-LED QLED with 3000+ nits peak brightness, 165 Hz native refresh, and aggressive local dimming at a fraction of OLED prices. Google TV.',
		[
			['Panel', '65" mini-LED QLED (quantum dot)'],
			['Peak brightness', '~3200 nits'],
			['Local dimming', '2000+ zones'],
			['Refresh', '165 Hz VRR'],
			['Ports', '2× HDMI 2.1, 2× HDMI 2.0'],
			['Smart TV', 'Google TV']
		]
	),

	// --- Home audio ---
	p(
		'denon-avrx3800h',
		'AVR-X3800H',
		'Denon',
		'home-audio',
		169900,
		'Nine-channel AVR with Audyssey XT32.',
		'A 9.4-channel 8K AV receiver with Audyssey MultEQ XT32 room correction, IMAX Enhanced, and HDMI 2.1 passthrough on all main inputs.',
		[
			['Channels', '9.4 (11.4 processing)'],
			['Power', '105 W/ch (8 Ω, 2ch driven)'],
			['Room EQ', 'Audyssey MultEQ XT32'],
			['HDMI', '7 in / 3 out · 8K 60 / 4K 120'],
			['Formats', 'Dolby Atmos, DTS:X Pro, IMAX Enhanced, Auro-3D'],
			['Streaming', 'HEOS, AirPlay 2, Spotify Connect, Tidal, Roon Tested']
		]
	),
	p(
		'sonos-arc-ultra',
		'Arc Ultra',
		'Sonos',
		'home-audio',
		99900,
		'Atmos soundbar, simplified setup.',
		"A 9.1.4 Dolby Atmos soundbar with Sonos's new Sound Motion woofer technology for deeper bass, HDMI eARC, and Trueplay tuning across iOS and Android.",
		[
			['Channels', '9.1.4 Dolby Atmos'],
			['Drivers', '14 (incl. 2 Sound Motion woofers)'],
			['Inputs', 'HDMI eARC, Wi-Fi 6, Bluetooth 5.3, Ethernet'],
			['Voice', 'Amazon Alexa, Sonos Voice'],
			['Streaming', 'AirPlay 2, Spotify Connect, Tidal Connect']
		]
	),
	p(
		'rel-t7x',
		'T/7x Subwoofer',
		'REL',
		'home-audio',
		129900,
		"A sub you won't hear but will feel.",
		'A sealed-box musical sub with an 8-inch FibreAlloy down-firing driver, high-level Neutrik Speakon input, and the tight, fast character REL is known for.',
		[
			['Driver', '8" FibreAlloy down-firing (sealed)'],
			['Amplifier', '200 W Class A/B'],
			['Inputs', 'High-level Neutrik Speakon, low-level RCA, .1/LFE'],
			['Frequency response', '30 Hz – 120 Hz (−6 dB)'],
			['Finish', 'Piano black']
		]
	),

	// --- Storage ---
	p(
		'samsung-990-pro-2tb',
		'990 PRO 2 TB',
		'Samsung',
		'storage',
		21900,
		'Top-tier PCIe 4.0 NVMe.',
		"Samsung's flagship PCIe 4.0 SSD with the Pascal controller and V7 V-NAND. PS5-ready, with optional heatsink variants for tight M.2 slots.",
		[
			['Interface', 'PCIe 4.0 x4 · M.2 2280'],
			['Capacity', '2 TB'],
			['Sequential read', '7450 MB/s'],
			['Sequential write', '6900 MB/s'],
			['Endurance', '1200 TBW'],
			['Warranty', '5 years']
		]
	),
	p(
		'sandisk-extreme-pro-portable-4tb',
		'Extreme PRO Portable SSD V2 4 TB',
		'SanDisk',
		'storage',
		42900,
		'Pocket-sized NVMe over USB-C.',
		'A 4 TB rugged portable SSD with USB 3.2 Gen 2×2 (20 Gbps) and IP65 dust/water resistance. A common pick for 4K camera offloads in the field.',
		[
			['Interface', 'USB-C 3.2 Gen 2×2 (20 Gbps)'],
			['Capacity', '4 TB'],
			['Sequential read', '2000 MB/s'],
			['Sequential write', '2000 MB/s'],
			['Durability', 'IP65 · 2 m drop rated'],
			['Warranty', '5 years']
		]
	),
	p(
		'synology-ds423plus',
		'DiskStation DS423+',
		'Synology',
		'storage',
		59900,
		'A family NAS worth the install.',
		'A 4-bay consumer/prosumer NAS with two M.2 NVMe cache slots, DSM 7.2, and the Synology Photos app to replace iCloud for the whole household.',
		[
			['Bays', '4 × 3.5"/2.5" SATA'],
			['CPU', 'Intel Celeron J4125 (4-core)'],
			['Memory', '2 GB DDR4 (expandable to 6 GB)'],
			['Cache', '2× M.2 2280 NVMe'],
			['Network', '2× Gigabit (link aggregation)'],
			['OS', 'DSM 7.2']
		]
	),

	// --- Networking ---
	p(
		'tp-link-be9300',
		'Deco BE25 (Wi-Fi 7, 3-pack)',
		'TP-Link',
		'networking',
		39900,
		'Tri-band Wi-Fi 7 mesh that just works.',
		'A three-node tri-band Wi-Fi 7 mesh system with 2.5 GbE ports on every unit. Covers a typical 3-bedroom home with Multi-Link Operation for low-latency steering.',
		[
			['Standard', 'Wi-Fi 7 (BE9300 class)'],
			['Bands', 'Tri-band (2.4 / 5 / 6 GHz)'],
			['Ports', '2× 2.5 GbE per node'],
			['Coverage', 'Up to ~650 m² (3-pack)'],
			['Features', 'MLO, 4K-QAM, EasyMesh, HomeShield']
		]
	),
	p(
		'ubiquiti-udm-se',
		'UniFi Dream Machine Special Edition',
		'Ubiquiti',
		'networking',
		49900,
		'The self-hosted network nerd pick.',
		'An all-in-one 1U router, 8-port PoE switch, NVR, and UniFi controller. 3.5 Gbps IDS/IPS throughput and an SFP+ 10G uplink.',
		[
			['Routing', '3.5 Gbps IDS/IPS throughput'],
			['Ports', '8× 2.5 GbE + SFP+ (10G) WAN/LAN + RJ45 WAN'],
			['PoE', '8-port PoE+ (180 W total)'],
			['Storage', '128 GB eMMC + 3.5" HDD bay for NVR'],
			['Controller', 'UniFi Network built-in']
		]
	),
	p(
		'flint-2-gl-inet',
		'Flint 2 (GL-MT6000)',
		'GL.iNet',
		'networking',
		21900,
		'OpenWrt router, VPN-ready.',
		'A prosumer dual-band Wi-Fi 6 router running customised OpenWrt with hardware-accelerated WireGuard and OpenVPN. Dual 2.5 GbE and four Gigabit ports.',
		[
			['Standard', 'Wi-Fi 6 dual-band (AX6000)'],
			['Ports', '2× 2.5 GbE (WAN/LAN) + 4× Gigabit LAN'],
			['CPU', 'MediaTek MT7986A (4-core @ 2.0 GHz)'],
			['VPN', 'WireGuard (900 Mbps), OpenVPN (190 Mbps)'],
			['Firmware', 'OpenWrt 21.02 based']
		]
	),

	// --- Smart home ---
	p(
		'philips-hue-starter',
		'Hue White & Color Starter Kit (E27)',
		'Philips',
		'smart-home',
		19900,
		'The easy intro to smart lighting.',
		'Three 1100 lm White & Color Ambiance E27 bulbs, the Hue Bridge, and a Smart Button. Works with Matter, Apple Home, Alexa, Google Home, and SmartThings.',
		[
			['Bulbs', '3× White & Color E27 (1100 lm)'],
			['Hub', 'Hue Bridge 2.1'],
			['Protocols', 'Zigbee 3.0, Bluetooth, Matter (via Bridge)'],
			['Colors', '16 million · 2000–6500 K white'],
			['Extras', 'Hue Smart Button included']
		]
	),
	p(
		'aqara-hub-m3',
		'Hub M3',
		'Aqara',
		'smart-home',
		14900,
		'Matter + Thread + Zigbee in one box.',
		'A hub that bridges a stack of Zigbee 3.0 sensors to Matter, acts as a Thread border router, and supports HomeKit Secure Video with Ethernet/Wi-Fi uplink.',
		[
			['Protocols', 'Zigbee 3.0 · Thread · Matter controller/bridge'],
			['Connectivity', 'Ethernet + Wi-Fi 5'],
			['Video', 'HomeKit Secure Video (HSV)'],
			['IR', 'Built-in IR blaster'],
			['Backup', 'Local automation engine']
		]
	),
	p(
		'nest-learning-thermostat-gen5',
		'Nest Learning Thermostat (4th gen)',
		'Google',
		'smart-home',
		27900,
		'The smart thermostat that learns.',
		"Google's redesigned Nest Learning Thermostat with a larger edge-to-edge display, Matter and Thread support, and an improved Farsight for room-level detection.",
		[
			['Display', '2.7" circular LCD (edge-to-edge)'],
			['Sensors', 'Humidity, occupancy, proximity, ambient light'],
			['Protocols', 'Matter over Wi-Fi + Thread, Bluetooth LE'],
			['Companion', 'Nest Temperature Sensor included (EU)'],
			['Compatibility', 'OpenTherm + 24 V HVAC']
		]
	),
	p(
		'reolink-duo-3-poe',
		'Duo 3 PoE',
		'Reolink',
		'smart-home',
		24900,
		'16 MP dual-lens PoE camera.',
		'A PoE security camera with two sensors stitched into a 180° ultra-wide 16 MP feed. Person, vehicle and pet detection locally, microSD storage, no subscription.',
		[
			['Resolution', '16 MP (8 MP × 2) · 180° stitched'],
			['Video', '4K @ 20 fps H.265'],
			['Power', 'PoE (802.3af)'],
			['Storage', 'microSD up to 512 GB, Reolink NVR'],
			['Detection', 'Person / vehicle / pet (on-device AI)'],
			['Weather rating', 'IP66']
		]
	)
];

export function productsByCategory(slug: string): Product[] {
	return products.filter((p) => p.categorySlug === slug);
}

export function findProduct(slug: string): Product | undefined {
	return products.find((p) => p.slug === slug);
}

export function findCategory(slug: string): Category | undefined {
	return categories.find((c) => c.slug === slug);
}
