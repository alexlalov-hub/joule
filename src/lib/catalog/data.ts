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
		'The fanless M4 MacBook Air is the default answer for anyone who writes, codes, or edits light video on the move. Eighteen-hour battery, a display that holds up outdoors, and near-silent operation under load.',
		[
			['Chip', 'Apple M4 (10-core CPU, 10-core GPU)'],
			['Memory', '16 GB unified'],
			['Storage', '512 GB SSD'],
			['Display', '13.6" Liquid Retina · 2560×1664'],
			['Battery', 'Up to 18 h'],
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
		'A pro machine that almost never spins its fans. Best-in-class 120 Hz mini-LED display, 24 GB RAM as standard, and Thunderbolt 5 for monster external rigs.',
		[
			['Chip', 'Apple M4 Pro (12-core CPU, 16-core GPU)'],
			['Memory', '24 GB unified'],
			['Storage', '1 TB SSD'],
			['Display', '14.2" Liquid Retina XDR · 120 Hz'],
			['Ports', '3× TB5, HDMI, SD'],
			['Weight', '1.60 kg']
		],
		{ rating: 4.9, reviewCount: 298 }
	),
	p(
		'xps-13-plus',
		'XPS 13 Plus (Ultra 7)',
		'Dell',
		'laptops',
		144900,
		'Edge-to-edge keyboard, OLED option.',
		"Dell's most daring thin-and-light. Capacitive function row, a glass-covered keyboard deck, and a gorgeous optional OLED.",
		[
			['CPU', 'Intel Core Ultra 7 155H'],
			['Memory', '16 GB LPDDR5X'],
			['Storage', '512 GB SSD'],
			['Display', '13.4" OLED · 3.5K · 60 Hz'],
			['Weight', '1.23 kg']
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
		'Every year it gets a little lighter and a little faster, and the keyboard stays the best in the business. 5G option for road warriors.',
		[
			['CPU', 'Intel Core Ultra 7 165U'],
			['Memory', '32 GB LPDDR5X'],
			['Storage', '1 TB SSD'],
			['Display', '14" 2.8K OLED · 120 Hz'],
			['Battery', 'Up to 14 h'],
			['Weight', '1.09 kg']
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
		'Microsoft finally cracked ARM on Windows. All-day battery, native x86 translation that actually works, and the long-missed haptic trackpad.',
		[
			['CPU', 'Snapdragon X Elite (12-core)'],
			['Memory', '16 GB LPDDR5X'],
			['Storage', '512 GB SSD'],
			['Display', '15" PixelSense · 120 Hz'],
			['Weight', '1.66 kg']
		],
		{ rating: 4.5, reviewCount: 142 }
	),
	p(
		'zephyrus-g14-2025',
		'ROG Zephyrus G14 (RTX 5070)',
		'ASUS',
		'laptops',
		219900,
		'A gaming laptop that fits a backpack.',
		'The G14 keeps its cult status: RTX 5070 performance in a 1.5 kg chassis with a 120 Hz OLED and surprisingly livable fan curves.',
		[
			['CPU', 'AMD Ryzen AI 9 HX 370'],
			['GPU', 'NVIDIA RTX 5070 Laptop'],
			['Memory', '32 GB DDR5X'],
			['Storage', '1 TB PCIe 4.0 SSD'],
			['Display', '14" OLED · 2.8K · 120 Hz'],
			['Weight', '1.50 kg']
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
		'Swappable expansion cards, a hot-swappable GPU module, and every part ships with a QR code to its spare. Built to last a decade.',
		[
			['CPU', 'AMD Ryzen 9 7940HS'],
			['GPU', 'Radeon RX 7700S (module)'],
			['Memory', '32 GB DDR5'],
			['Storage', '1 TB PCIe 4.0 SSD'],
			['Display', '16" · 2560×1600 · 165 Hz'],
			['Weight', '2.10 kg']
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
		'A palm-sized box that compresses RAW video faster than machines three times its size. Silent unless you really push it.',
		[
			['Chip', 'Apple M4 Pro'],
			['Memory', '24 GB unified'],
			['Storage', '512 GB SSD'],
			['Ports', '3× TB5, HDMI, 2.5GbE'],
			['Size', '12.7 × 12.7 × 5 cm']
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
		"The friendliest family desktop on the market. Seven colours, a magnetic cable, and a 4.5K display that's colour-accurate out of the box.",
		[
			['Chip', 'Apple M4 (10-core)'],
			['Memory', '16 GB unified'],
			['Storage', '512 GB SSD'],
			['Display', '24" 4.5K Retina'],
			['Webcam', '12 MP Center Stage']
		],
		{ rating: 4.7, reviewCount: 178 }
	),
	p(
		'beelink-ser8',
		'Beelink SER8 (Ryzen 7)',
		'Beelink',
		'desktops',
		72900,
		'A mini PC that punches up.',
		'Ryzen 8 cores in a 1-litre box. Good enough for a second dev machine, a living-room NAS, or a quiet HTPC.',
		[
			['CPU', 'AMD Ryzen 7 8845HS'],
			['Memory', '32 GB DDR5'],
			['Storage', '1 TB NVMe'],
			['Ports', 'USB4, 2× HDMI, 2.5GbE'],
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
		'Clean-cabled, quiet-fanned, and benchmark-verified before it leaves the factory. RTX 5080 paired with an 8-core X3D.',
		[
			['CPU', 'AMD Ryzen 7 9800X3D'],
			['GPU', 'NVIDIA RTX 5080'],
			['Memory', '32 GB DDR5-6000'],
			['Storage', '2 TB PCIe 5.0 SSD'],
			['PSU', '850 W Gold']
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
		'The one you buy for office work and forget about. 120 Hz IPS Black, factory calibrated, and a Thunderbolt 4 daisy chain that finally works.',
		[
			['Panel', '27" 4K IPS Black'],
			['Refresh', '120 Hz'],
			['Color', '100 % sRGB · 98 % DCI-P3'],
			['Ports', 'TB4 in/out, USB-C 90 W, DP, HDMI']
		],
		{ featured: true, rating: 4.8, reviewCount: 204 }
	),
	p(
		'lg-27gr95qe',
		'UltraGear 27GR95QE (QD-OLED)',
		'LG',
		'monitors',
		99900,
		'240 Hz QD-OLED for esports.',
		'The display that flipped the gaming monitor conversation. 0.03 ms, 1000-nit highlights, a properly anti-glare coat.',
		[
			['Panel', '27" QD-OLED'],
			['Resolution', '2560×1440'],
			['Refresh', '240 Hz'],
			['HDR', 'DisplayHDR True Black 400']
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
		'A reference monitor for colour work: 1152-zone mini-LED, 1600 nits, Calman auto-calibration, PANTONE-validated.',
		[
			['Panel', '32" 4K mini-LED'],
			['Peak brightness', '1600 nits'],
			['Color', '98 % Rec.2020'],
			['Ports', 'TB4, HDMI 2.1, DP 1.4']
		]
	),
	p(
		'gigabyte-m32u',
		'M32U',
		'Gigabyte',
		'monitors',
		55900,
		'4K 144 Hz at a sane price.',
		'A generalist 4K that covers gaming, photo, and everyday office without forcing a hard trade-off.',
		[
			['Panel', '32" 4K IPS'],
			['Refresh', '144 Hz'],
			['HDR', 'VESA HDR400'],
			['Ports', 'HDMI 2.1, DP 1.4, USB-C 18 W']
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
		'An enthusiast keyboard that went mainstream. Hall-effect switches you can tune per-key, heavy aluminium body, wireless if you want it.',
		[
			['Layout', '75 %'],
			['Switches', 'Gateron Nebula HE'],
			['Polling', '1000 Hz wired / 1000 Hz 2.4 GHz'],
			['Firmware', 'QMK/VIA']
		],
		{ featured: true, rating: 4.7, reviewCount: 312 }
	),
	p(
		'apple-magic-keyboard-usb-c',
		'Magic Keyboard with Touch ID (USB-C)',
		'Apple',
		'keyboards',
		17900,
		'Low-profile chiclet done right.',
		'The keyboard your laptop wishes its own keyboard was. Touch ID on the number row, USB-C charging, and the stability Apple peripherals finally have.',
		[
			['Layout', 'Full-size'],
			['Wireless', 'Bluetooth'],
			['Battery', '~1 month'],
			['Extras', 'Touch ID']
		]
	),
	p(
		'hhkb-studio',
		'HHKB Studio',
		'PFU',
		'keyboards',
		38900,
		'Topre meets a pointing stick.',
		'For the small-but-loud crowd. Topre switches, a pointing stick, and four mouse buttons. Compact but deeply opinionated.',
		[
			['Layout', '60 %'],
			['Switches', 'Topre 45 g'],
			['Wireless', 'BT 5.1'],
			['Extras', 'Pointing stick, gesture pads']
		]
	),
	p(
		'logi-mx-keys-s',
		'MX Keys S',
		'Logitech',
		'keyboards',
		11900,
		'The safe office pick.',
		'Quiet low-profile scissor keys, backlit with a proximity sensor, and Flow to hop between a Mac and a PC.',
		[
			['Layout', 'Full-size'],
			['Wireless', 'BT + Logi Bolt'],
			['Battery', 'Up to 10 days'],
			['Backlight', 'Auto-adjusting']
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
		'Still the mouse that gets recommended by default. Seven years of small refinements and a horizontal scroll wheel that has converted entire design teams.',
		[
			['Sensor', '8000 DPI'],
			['Buttons', '7 programmable'],
			['Wireless', 'BT + Logi Bolt'],
			['Battery', '70 days']
		],
		{ featured: true, rating: 4.8, reviewCount: 512 }
	),
	p(
		'razer-deathadder-v3-pro',
		'DeathAdder V3 Pro',
		'Razer',
		'mice',
		14900,
		'64 g of ergonomic speed.',
		'A lightweight esports mouse that still respects larger hands. Optical switches rated for 90 million clicks, 4000 Hz polling dongle included.',
		[
			['Sensor', 'Focus Pro 35K (30000 DPI)'],
			['Weight', '63 g'],
			['Polling', 'Up to 4000 Hz'],
			['Battery', '~90 h']
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
		"A 55 g ambidextrous mouse with BAMF 2.0, hybrid switches, and a honeycomb shell the dust doesn't get stuck in this time.",
		[
			['Sensor', 'BAMF 2.0 (26000 DPI)'],
			['Weight', '55 g'],
			['Polling', '1000 Hz'],
			['Battery', '80 h']
		]
	),
	p(
		'mx-vertical',
		'MX Vertical',
		'Logitech',
		'mice',
		9900,
		'57° grip. Wrist-friendly.',
		'Once you try a vertical grip for a week you rarely want to go back. Thumb rest, textured rubber, wire-free charging over USB-C.',
		[
			['Sensor', '4000 DPI'],
			['Grip angle', '57°'],
			['Wireless', 'BT + receiver'],
			['Battery', '4 months']
		]
	),

	// --- Headphones ---
	p(
		'sony-wh-1000xm6',
		'WH-1000XM6',
		'Sony',
		'headphones',
		39900,
		'Category-defining noise cancelling.',
		'Sixth-generation ANC with the best transparency mode Sony has shipped. LDAC, multipoint, and finally — a folding hinge again.',
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'Adaptive QN3'],
			['Battery', '30 h'],
			['Codecs', 'LDAC, LC3, AAC'],
			['Weight', '254 g']
		],
		{ featured: true, rating: 4.8, reviewCount: 487 }
	),
	p(
		'bose-qc-ultra',
		'QuietComfort Ultra',
		'Bose',
		'headphones',
		42900,
		'Still the comfort leader.',
		"They sit so lightly on the head you forget they're there. Immersive Audio is genuinely fun. aptX Adaptive support makes it an easy Android pick too.",
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'CustomTune adaptive'],
			['Battery', '24 h'],
			['Codecs', 'aptX Adaptive, SBC, AAC']
		]
	),
	p(
		'apple-airpods-pro-3',
		'AirPods Pro 3',
		'Apple',
		'headphones',
		25900,
		'The default iPhone pair.',
		"USB-C charging, even better ANC, hearing-aid mode in supported regions, and the smoothest iCloud handoff you'll find.",
		[
			['Type', 'In-ear, closed'],
			['ANC', 'H3 chip'],
			['Battery', '6 h bud / 30 h case'],
			['Codecs', 'AAC, PCM Lossless (with Vision Pro)']
		]
	),
	p(
		'sennheiser-hd660s2',
		'HD 660S2',
		'Sennheiser',
		'headphones',
		54900,
		'Reference open-back for deep listening.',
		"Sennheiser's beloved HD 600 lineage, updated with a more energetic bass response and the same refined midrange that made these a genre-defining pair.",
		[
			['Type', 'Over-ear, open-back'],
			['Impedance', '300 Ω'],
			['Drivers', '42 mm transducers'],
			['Weight', '260 g']
		]
	),
	p(
		'shure-aonic-50-gen2',
		'AONIC 50 Gen 2',
		'Shure',
		'headphones',
		34900,
		'Wireless + 24-bit USB audio.',
		'Studio lineage you can actually live with on a commute. Passes as wired DAC over USB-C, excellent microphone array for calls.',
		[
			['Type', 'Over-ear, closed'],
			['ANC', 'Adaptive'],
			['Battery', '45 h'],
			['Codecs', 'aptX Lossless, LDAC']
		]
	),
	p(
		'sony-linkbuds-s',
		'LinkBuds S',
		'Sony',
		'headphones',
		17900,
		'Tiny earbuds, big feature set.',
		'The smallest ANC earbud Sony makes, with 360 Reality Audio and multipoint. A great budget recommendation.',
		[
			['Type', 'In-ear, closed'],
			['ANC', 'Adaptive'],
			['Battery', '6 h bud / 20 h case'],
			['Codecs', 'LDAC, AAC']
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
		'The first Sonos built for Dolby Atmos Music. Surprisingly expressive bass for the size, Trueplay tuning over the mic, and wired line-in via a USB-C adapter.',
		[
			['Drivers', '6 custom'],
			['Inputs', 'Wi-Fi, BT, USB-C (line-in)'],
			['Voice', 'Amazon Alexa'],
			['Stereo', 'Pairable']
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
		'An active bookshelf pair with room correction and streaming built in. One of the most recommended audiophile speakers you can actually recommend to a friend.',
		[
			['Drivers', 'Uni-Q coaxial'],
			['Inputs', 'HDMI eARC, optical, coaxial, Wi-Fi, BT, RCA'],
			['Power', '280 W per side'],
			['Streaming', 'AirPlay 2, Chromecast, Roon, Tidal Connect']
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
		"Refined again: a fuller low end, USB-C, a proper handle, and a ruggedised rubber finish that survives a summer's worth of picnics.",
		[
			['Type', 'Portable 360°'],
			['Battery', '17 h'],
			['Water rating', 'IP55'],
			['Inputs', 'BT, 3.5 mm']
		]
	),
	p(
		'jbl-flip-7',
		'Flip 7',
		'JBL',
		'speakers',
		14900,
		'Party default.',
		'IP68, Auracast for linking multiple speakers, and punchy mids that carry over outdoor noise.',
		[
			['Type', 'Portable'],
			['Battery', '14 h'],
			['Water rating', 'IP68'],
			['Linking', 'Auracast']
		]
	),

	// --- Smartphones ---
	p(
		'iphone-17-pro',
		'iPhone 17 Pro',
		'Apple',
		'smartphones',
		129900,
		'A1 chip, vapor chamber cooling.',
		"Apple's most aggressive performance step in years. Brighter Pro Motion display, a redesigned camera bump, and the cooling headroom to match.",
		[
			['Chip', 'Apple A19 Pro'],
			['Display', '6.3" OLED · 120 Hz · 2500 nits'],
			['Storage', '256 GB / 512 GB / 1 TB'],
			['Battery', 'Up to 27 h video'],
			['Cameras', '48 MP + 48 MP UW + 48 MP 5× tele']
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
		'A titanium chassis, 200 MP main sensor, and seven years of OS updates. The productivity phone people keep for half a decade.',
		[
			['Chip', 'Snapdragon 8 Elite for Galaxy'],
			['Display', '6.8" QHD+ AMOLED · 120 Hz'],
			['Storage', '256 GB / 512 GB / 1 TB'],
			['Battery', '5000 mAh'],
			['Cameras', '200 MP + 50 MP tele + 10 MP + 12 MP UW']
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
		'The phone where the software is still the story. Tensor G5 runs on-device AI features that were cloud-only a year ago.',
		[
			['Chip', 'Tensor G5'],
			['Display', '6.7" LTPO OLED · 120 Hz'],
			['Storage', '128 GB / 256 GB / 512 GB'],
			['Battery', '5000 mAh'],
			['Cameras', '50 MP + 48 MP UW + 48 MP 5× tele']
		]
	),
	p(
		'oneplus-13',
		'OnePlus 13',
		'OnePlus',
		'smartphones',
		89900,
		'Fast charging, fast display.',
		'100 W wired, 50 W wireless, and a Hasselblad-tuned camera system. Classic OnePlus value.',
		[
			['Chip', 'Snapdragon 8 Elite'],
			['Display', '6.82" LTPO AMOLED · 120 Hz'],
			['Battery', '6000 mAh'],
			['Charging', '100 W wired · 50 W wireless']
		]
	),
	p(
		'fairphone-6',
		'Fairphone 6',
		'Fairphone',
		'smartphones',
		59900,
		'The ethical Android.',
		'Modular, repairable, and the only flagship-adjacent phone with a user-replaceable battery. Five years of updates, sourced responsibly.',
		[
			['Chip', 'Snapdragon 7s Gen 3'],
			['Display', '6.3" OLED · 120 Hz'],
			['Storage', '256 GB + microSD'],
			['Warranty', '5 years · replaceable parts']
		]
	),
	p(
		'iphone-se-4',
		'iPhone SE 4',
		'Apple',
		'smartphones',
		49900,
		'Small, sharp, affordable.',
		"The iPhone for people who don't want a phone the size of a paperback novel. A18 chip, USB-C, and Face ID finally.",
		[
			['Chip', 'Apple A18'],
			['Display', '6.1" OLED · 60 Hz'],
			['Storage', '128 GB / 256 GB / 512 GB'],
			['Cameras', '48 MP single']
		]
	),

	// --- Tablets ---
	p(
		'ipad-pro-m5-13',
		'iPad Pro 13" (M5)',
		'Apple',
		'tablets',
		139900,
		'Tandem OLED, pencil haptics.',
		'The closest a tablet gets to a laptop. Tandem OLED means movie-grade HDR without blooming, and the Magic Keyboard has a proper trackpad now.',
		[
			['Chip', 'Apple M5'],
			['Display', '13" Tandem OLED · 120 Hz'],
			['Storage', '256 GB → 2 TB'],
			['Connectivity', 'Wi-Fi 6E · optional 5G'],
			['Pencil', 'Apple Pencil Pro']
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
		'The iPad most people should buy. Pencil Pro support, a proper keyboard, and enough GPU for any creative app.',
		[
			['Chip', 'Apple M3'],
			['Display', '11" Liquid Retina'],
			['Storage', '128 GB → 1 TB']
		]
	),
	p(
		'galaxy-tab-s10-ultra',
		'Galaxy Tab S10 Ultra',
		'Samsung',
		'tablets',
		119900,
		'14-inch Android canvas.',
		'The biggest Android tablet on sale. Ships with S Pen, DeX desktop mode, and anti-reflective AMOLED.',
		[
			['Chip', 'MediaTek Dimensity 9300+'],
			['Display', '14.6" AMOLED 2X · 120 Hz'],
			['Storage', '256 GB → 1 TB + microSD']
		]
	),
	p(
		'remarkable-paper-pro',
		'reMarkable Paper Pro',
		'reMarkable',
		'tablets',
		57900,
		"A tablet that thinks it's paper.",
		"A colour e-ink tablet with a front-lit screen that doesn't pretend to do anything else. For writers and deep readers.",
		[
			['Display', '11.8" Canvas Color e-ink'],
			['Storage', '64 GB'],
			['Battery', 'Up to 2 weeks'],
			['Connectivity', 'Wi-Fi']
		]
	),

	// --- Smartwatches ---
	p(
		'apple-watch-ultra-3',
		'Apple Watch Ultra 3',
		'Apple',
		'smartwatches',
		84900,
		'Titanium + days of battery.',
		'Dual-frequency GPS, the best map app on any watch, and an always-on screen you can read under a Dubai summer sun.',
		[
			['Case', '49 mm titanium'],
			['Battery', 'Up to 72 h low-power'],
			['Sensors', 'ECG, SpO2, temperature'],
			['Connectivity', 'Cellular']
		],
		{ featured: true }
	),
	p(
		'apple-watch-series-11',
		'Apple Watch Series 11',
		'Apple',
		'smartwatches',
		44900,
		'Everyday health tracking.',
		'The baseline smartwatch most people want. Sleep apnea detection, fall detection, and new blood pressure trend monitoring.',
		[
			['Case', '42 / 46 mm'],
			['Battery', 'Up to 24 h'],
			['Sensors', 'ECG, SpO2, depth']
		]
	),
	p(
		'garmin-fenix-8',
		'Fenix 8',
		'Garmin',
		'smartwatches',
		104900,
		'Two-week battery, military rugged.',
		'The serious outdoors watch: full topo maps offline, multi-band GNSS, dive mode, and a battery that laughs at a weekend hike.',
		[
			['Battery', 'Up to 16 days smartwatch mode'],
			['GPS', 'Multi-band'],
			['Durability', '10 ATM, MIL-STD-810']
		]
	),
	p(
		'oura-ring-gen4',
		'Oura Ring Gen 4',
		'Oura',
		'smartwatches',
		39900,
		'Health data without the screen.',
		'For people who want the data without a watch on their wrist. Sleep, readiness, HRV, and temperature trends.',
		[
			['Battery', '8 days'],
			['Materials', 'Titanium'],
			['Water rating', '100 m']
		]
	),

	// --- Cameras ---
	p(
		'sony-a7cr',
		'α7CR (Full-frame)',
		'Sony',
		'cameras',
		279900,
		'61 MP in a compact body.',
		'High-resolution full-frame in a travel-friendly shell. AI subject detection, in-body stabilisation, and uncompressed RAW to a CFexpress card.',
		[
			['Sensor', '61 MP BSI full-frame'],
			['IBIS', '7 stops'],
			['Autofocus', 'AI subject recognition'],
			['Weight', '515 g']
		]
	),
	p(
		'fujifilm-x100vi',
		'X100VI',
		'Fujifilm',
		'cameras',
		179900,
		"A camera you'll actually carry.",
		'The reason Fujifilm is a cult brand. A fixed 35 mm (equiv.) rangefinder-style compact with IBIS and the film simulations.',
		[
			['Sensor', 'X-Trans CMOS 5 HR (40 MP)'],
			['Lens', '23 mm f/2'],
			['IBIS', '6 stops'],
			['Weight', '521 g']
		]
	),
	p(
		'canon-r50',
		'EOS R50',
		'Canon',
		'cameras',
		89900,
		'Mirrorless for upgraders.',
		'A modern, approachable APS-C mirrorless with dual-pixel autofocus. Great starting system.',
		[
			['Sensor', '24 MP APS-C'],
			['Autofocus', 'Dual Pixel CMOS AF II'],
			['Video', '4K 30p cropped']
		]
	),
	p(
		'dji-osmo-action-5-pro',
		'Osmo Action 5 Pro',
		'DJI',
		'cameras',
		34900,
		'Action cam with a front OLED.',
		'A GoPro rival with an OLED on the front and 47 GB of internal storage. Runs cold, shoots 4K 120, and mounts into the entire GoPro ecosystem.',
		[
			['Sensor', '1/1.3" CMOS'],
			['Video', '4K 120 · 10-bit D-Log M'],
			['Depth', '20 m without housing']
		]
	),

	// --- Drones ---
	p(
		'dji-air-3s',
		'DJI Air 3S',
		'DJI',
		'drones',
		119900,
		'Dual-camera prosumer drone.',
		'A 1" main sensor paired with a 70 mm tele. ActiveTrack 360 works well, and 45 minutes of flight on the Intelligent Battery is real.',
		[
			['Cameras', '1" 50 MP main + 70 mm tele'],
			['Flight time', '45 min'],
			['Transmission', 'O4']
		]
	),
	p(
		'dji-mini-4-pro',
		'DJI Mini 4 Pro',
		'DJI',
		'drones',
		95900,
		'Sub-250 g with omnidirectional sensing.',
		'Under the regulatory weight, above the usual compromises. 4K 60 HDR, all-around obstacle sensing, and a body you can fit into a jacket pocket.',
		[
			['Weight', '< 249 g'],
			['Cameras', '1/1.3" CMOS'],
			['Video', '4K 60 HDR'],
			['Flight time', '34 min']
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
		"A mid-gen refresh that actually feels like one. AI-upscaling (PSSR) adds real image clarity, and it's the quietest PlayStation yet.",
		[
			['Storage', '2 TB NVMe'],
			['GPU', 'RDNA-based, ~16.7 TF'],
			['Ports', 'HDMI 2.1, USB-C']
		],
		{ featured: true }
	),
	p(
		'nintendo-switch-2',
		'Nintendo Switch 2',
		'Nintendo',
		'gaming-consoles',
		47900,
		'The family console, refined.',
		'A bigger LCD, NVIDIA-powered upscaling at the dock, proper online matchmaking, and backward compatibility for most Switch 1 games.',
		[
			['Storage', '256 GB'],
			['Display', '8" 1080p 120 Hz LCD'],
			['Dock', '4K 60 HDR']
		]
	),
	p(
		'xbox-series-x-2tb',
		'Xbox Series X (2 TB)',
		'Microsoft',
		'gaming-consoles',
		54900,
		'Highest-storage refresh.',
		'Same silicon, new capacity and a matte black shell. Xbox Game Pass still the best value in gaming.',
		[
			['Storage', '2 TB NVMe'],
			['GPU', '12 TF RDNA 2'],
			['HDMI', '2.1 · 4K 120']
		]
	),
	p(
		'rog-ally-x',
		'ROG Ally X',
		'ASUS',
		'gaming-consoles',
		89900,
		'Windows handheld, properly cooled.',
		'The most usable Windows handheld so far. 80 Wh battery, a proper ZenBook-class fan system, and Bazzite if you want to ditch Windows.',
		[
			['SoC', 'Ryzen Z1 Extreme'],
			['Memory', '24 GB LPDDR5X'],
			['Storage', '1 TB NVMe'],
			['Battery', '80 Wh']
		]
	),

	// --- TVs ---
	p(
		'lg-g5-oled',
		'OLED G5 (65")',
		'LG',
		'tvs',
		289900,
		'Gallery OLED with four HDMI 2.1.',
		'The reference OLED of the year. Four HDMI 2.1 ports for gamers, new MLA panel for higher peak brightness, and a wall-flush mount.',
		[
			['Panel', '65" W-OLED MLA'],
			['Refresh', '165 Hz VRR'],
			['HDR', 'Dolby Vision · HDR10+'],
			['Ports', '4× HDMI 2.1']
		]
	),
	p(
		'sony-bravia-8-ii',
		'BRAVIA 8 II QD-OLED (65")',
		'Sony',
		'tvs',
		319900,
		'Motion + accuracy in one.',
		"Sony's QD-OLED flagship. The best motion processing on the market and factory calibration that clears Rec.709 inside a percent.",
		[
			['Panel', '65" QD-OLED'],
			['Processor', 'XR Cognitive'],
			['HDR', 'Dolby Vision · HDR10'],
			['Gaming', '4K 120, ALLM, VRR']
		]
	),
	p(
		'hisense-u8q',
		'U8Q Mini-LED (65")',
		'Hisense',
		'tvs',
		159900,
		'Value mini-LED that punches hard.',
		'3000+ nits peak brightness, Google TV, and aggressive local dimming. Very little left on the table against TVs twice the price.',
		[
			['Panel', '65" mini-LED QLED'],
			['Peak brightness', '3200 nits'],
			['Refresh', '144 Hz']
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
		'A popular choice for first-time Atmos builds. Nine channels on board, room correction worth the price on its own, HDMI 2.1 throughout.',
		[
			['Channels', '9.4'],
			['Room EQ', 'Audyssey MultEQ XT32'],
			['HDMI', '7 in / 3 out · 2.1']
		]
	),
	p(
		'sonos-arc-ultra',
		'Arc Ultra',
		'Sonos',
		'home-audio',
		99900,
		'Atmos soundbar, simplified setup.',
		'A single long bar that carries proper Atmos channels and pairs with a Sonos Sub without ever touching an HDMI setting.',
		[
			['Channels', '9.1.4'],
			['Inputs', 'HDMI eARC, Wi-Fi, AirPlay 2'],
			['Voice', 'Amazon Alexa']
		]
	),
	p(
		'rel-t7x',
		'T/7x Subwoofer',
		'REL',
		'home-audio',
		129900,
		"A sub you won't hear but will feel.",
		'A sealed 8" front-firing with a downward 10". Tight, musical, and the go-to recommendation for pairing with small bookshelves.',
		[
			['Drivers', '8" sealed + 10" passive'],
			['Amp', '200 W Class A/B'],
			['Inputs', 'High-level Neutrik, low-level RCA']
		]
	),

	// --- Storage ---
	p(
		'samsung-990-pro-2tb',
		'990 PRO 2 TB',
		'Samsung',
		'storage',
		22900,
		'Fast PCIe 4.0 internal.',
		'The go-to PCIe 4.0 NVMe for a PS5 or high-end PC. Consistent sustained writes and a massive SLC cache.',
		[
			['Interface', 'PCIe 4.0 x4'],
			['Capacity', '2 TB'],
			['Read', '7450 MB/s'],
			['Write', '6900 MB/s']
		]
	),
	p(
		'sandisk-extreme-pro-portable-4tb',
		'Extreme PRO Portable SSD 4 TB',
		'SanDisk',
		'storage',
		42900,
		'Pocket-sized NVMe on USB-C.',
		'A 4 TB pro-grade portable with IP55. Comfortably handles 4K camera offloads in the field.',
		[
			['Interface', 'USB-C 20 Gbps'],
			['Capacity', '4 TB'],
			['Read', '2000 MB/s'],
			['Water rating', 'IP55']
		]
	),
	p(
		'synology-ds423plus',
		'DiskStation DS423+',
		'Synology',
		'storage',
		59900,
		'A family NAS worth the install.',
		'Four-bay NAS with SSD cache slots, DSM 7.2, and Synology Photos to get everyone off iCloud.',
		[
			['Bays', '4'],
			['RAM', '2 GB ECC (expandable)'],
			['Network', '2× Gigabit'],
			['Apps', 'DSM 7.2']
		]
	),

	// --- Networking ---
	p(
		'tp-link-be9300',
		'Deco BE25 Pro (Wi-Fi 7)',
		'TP-Link',
		'networking',
		39900,
		'Tri-band mesh that just works.',
		'Wi-Fi 7 at a sane price. Three nodes cover a family home, with 2.5 GbE backhaul on each unit.',
		[
			['Bands', 'Tri-band Wi-Fi 7'],
			['Ports', '2× 2.5 GbE per node'],
			['Coverage', '~650 m² (3-pack)']
		]
	),
	p(
		'ubiquiti-udm-se',
		'Dream Machine Special Edition',
		'Ubiquiti',
		'networking',
		49900,
		'The self-hosted network nerd pick.',
		'Router, switch, PoE injector, NVR, and controller in one 1U box. Steep learning curve, enormous payoff.',
		[
			['Routing', '3.5 Gbps IPS'],
			['Ports', '8× 2.5 GbE + 10G SFP+'],
			['Extras', 'PoE, NVR, UniFi controller']
		]
	),
	p(
		'flint-2-gl-inet',
		'Flint 2 (GL-MT6000)',
		'GL.iNet',
		'networking',
		21900,
		'OpenWrt router, travel-ready.',
		'A prosumer router for the OpenWrt-curious. VPN-native, dual-2.5 GbE, and a clean web UI.',
		[
			['Bands', 'Wi-Fi 6 dual-band'],
			['Ports', '2× 2.5 GbE WAN/LAN + 4× Gigabit'],
			['VPN', 'WireGuard, OpenVPN hardware-accelerated']
		]
	),

	// --- Smart home ---
	p(
		'philips-hue-starter',
		'Hue White & Color Starter',
		'Philips',
		'smart-home',
		17900,
		'The easy intro to smart lighting.',
		'Four E27 bulbs, the Hue Bridge, and a dimmer. Works with Matter, HomeKit, Alexa, Google, the lot.',
		[
			['Bulbs', '4× White & Color E27'],
			['Hub', 'Hue Bridge'],
			['Protocols', 'Zigbee 3.0 · Matter']
		]
	),
	p(
		'aqara-hub-m3',
		'Hub M3',
		'Aqara',
		'smart-home',
		14900,
		'Matter border router for your Zigbee kit.',
		'A clean gateway between a mountain of Zigbee sensors and the Matter world. Supports HomeKit Secure Video too.',
		[
			['Protocols', 'Zigbee 3.0 · Thread · Matter'],
			['Video', 'HomeKit Secure Video compatible']
		]
	),
	p(
		'nest-learning-thermostat-gen5',
		'Nest Learning Thermostat (Gen 5)',
		'Google',
		'smart-home',
		22900,
		'The smart thermostat that learns.',
		'A new curved OLED face, Matter support, and the same self-learning schedule that saved millions of homes a noticeable bill.',
		[
			['Display', '2.7" AMOLED'],
			['Sensors', 'Humidity, proximity, occupancy'],
			['Protocols', 'Matter, Thread']
		]
	),
	p(
		'reolink-duo-3-poe',
		'Duo 3 PoE',
		'Reolink',
		'smart-home',
		24900,
		'16 MP dual-lens PoE camera.',
		'A bright-sensor dual-lens PoE cam that stitches to a single ultra-wide feed. No cloud subscription required.',
		[
			['Resolution', '16 MP (180° stitched)'],
			['Power', 'PoE'],
			['Storage', 'microSD up to 256 GB']
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
