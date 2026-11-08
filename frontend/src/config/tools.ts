export interface ToolDefinition {
  id: string;
  name: string;
  slug: string;
  category: "stems" | "audio" | "creative";
  route: string;
  title: string;
  shortDesc: string;
  description: string;
  colorClass: string;
  iconName: string;
  badge?: string;
  seoTarget: string;
  keywords: string[];
  steps?: string[];
  faqs?: { q: string; a: string }[];
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "stems",
    name: "Stem Separator",
    slug: "stems",
    category: "stems",
    route: "/stems",
    title: "AI Stem Separator Online Free - Extract Vocals, Drums, Bass",
    shortDesc: "Isolate vocals, accompaniment, drums, and bass in your browser with zero server uploads.",
    description: "Separate vocals and instruments using client-side AI. Pitch and tempo control, chord detection, and multi-track player included free.",
    colorClass: "card-stem",
    iconName: "AudioLines",
    badge: "AI Powered",
    seoTarget: "AI Stem Separator Online Free",
    keywords: ["stem separator", "vocal remover", "acapella extractor", "karaoke maker", "split music online", "isolate instruments"],
    steps: [
      "Upload or drag-and-drop your audio or video file",
      "Select 2-stem (Vocals & Backing) or 4-stem (Vocals, Drums, Bass, Other) mode",
      "Wait for local in-browser AI processing to separate the stems",
      "Adjust individual stem volumes, mute/solo, change key/tempo, and export mix or stems"
    ],
    faqs: [
      {
        q: "Do my audio files get uploaded to a server?",
        a: "No! All stem separation runs 100% locally on your device using WebGPU/WebAssembly. Your audio never leaves your browser."
      },
      {
        q: "What formats are supported?",
        a: "MP3, WAV, AAC, M4A, FLAC, OGG, WebM, and standard video formats like MP4."
      }
    ]
  },
  {
    id: "cutter",
    name: "Audio Cutter",
    slug: "cutter",
    category: "audio",
    route: "/audio/cutter",
    title: "Free Online Audio Cutter & MP3 Trimmer",
    shortDesc: "Cut and trim audio files with interactive waveforms and millisecond precision.",
    description: "Trim audio tracks with waveform visualization, fade-in and fade-out effects, and instant high-fidelity export.",
    colorClass: "card-audio",
    iconName: "Scissors",
    seoTarget: "Free Online Audio Cutter",
    keywords: ["audio cutter", "mp3 trimmer", "cut songs", "ringtone maker", "audio split"],
    steps: [
      "Select your audio file",
      "Drag the trim markers on the interactive waveform",
      "Preview playback and optionally apply fade in/out",
      "Export your cut track as MP3 or WAV"
    ]
  },
  {
    id: "converter",
    name: "Audio Converter",
    slug: "converter",
    category: "audio",
    route: "/audio/converter",
    title: "Free Online Audio Converter - MP3, WAV, AAC, FLAC, OGG",
    shortDesc: "Convert between all popular audio formats with custom sample rate and bitrate settings.",
    description: "Convert MP3, WAV, AAC, M4A, FLAC, and OGG with full control over bitrate and sample rate directly in your browser.",
    colorClass: "card-audio",
    iconName: "RefreshCw",
    seoTarget: "Free Online Audio Converter",
    keywords: ["audio converter", "wav to mp3", "flac converter", "m4a to mp3", "online sound converter"],
    steps: [
      "Select an audio file",
      "Choose your desired output format (MP3, WAV, AAC, FLAC, OGG)",
      "Set your preferred bitrate and channel configuration",
      "Download your converted audio instantly"
    ]
  },
  {
    id: "vocal-remover",
    name: "AI Vocal Remover",
    slug: "vocal-remover",
    category: "audio",
    route: "/audio/vocal-remover",
    title: "Free AI Vocal Remover & Karaoke Instrumental Maker Online",
    shortDesc: "Separate vocals and music to create karaoke instrumental tracks or extract isolated acapellas.",
    description: "Extract clean acapella vocals or remove singing voices to create high-quality karaoke backing tracks with local AI. Zero server uploads.",
    colorClass: "card-vocal",
    iconName: "Mic2",
    badge: "AI Powered",
    seoTarget: "Free AI Vocal Remover Online",
    keywords: ["vocal remover", "remove vocals from song", "karaoke maker", "extract acapella", "instrumental extractor", "music minus one", "isolate vocals"],
    steps: [
      "Upload or drag an audio file (MP3, WAV, FLAC, M4A, etc.)",
      "Let the in-browser AI separate vocals from the instrumental accompaniment",
      "Mute or adjust the vocal fader to create your karaoke track",
      "Export the instrumental or acapella as MP3 or WAV"
    ],
    faqs: [
      {
        q: "How does the vocal remover work?",
        a: "It runs neural stem separation directly inside your browser using WebGPU and WebAssembly to isolate vocal frequencies from the backing accompaniment without uploading your song."
      },
      {
        q: "Can I download just the karaoke instrumental?",
        a: "Yes! You can download the isolated instrumental (karaoke), the isolated vocals (acapella), or any custom mix balance."
      }
    ]
  },
  {
    id: "video-to-audio",
    name: "Video to Audio Converter",
    slug: "video-to-audio",
    category: "audio",
    route: "/audio/video-to-audio",
    title: "Free Video to Audio Converter Online - Extract MP3 from MP4",
    shortDesc: "Convert MP4, WebM, MOV, and MKV videos to MP3, WAV, AAC, and FLAC audio.",
    description: "Fast in-browser video to audio extraction with custom bitrate and sample rate. Zero uploads, zero loss of quality.",
    colorClass: "card-video",
    iconName: "Video",
    seoTarget: "Video to Audio Converter Online Free",
    keywords: ["video to audio converter", "convert video to mp3", "extract audio from mp4", "mp4 to wav converter", "rip mp3 from video"],
    steps: [
      "Select or drag-and-drop your video file (MP4, WebM, MOV, MKV)",
      "Choose output audio format (MP3, WAV, AAC, FLAC, OGG) and quality bitrate",
      "Optionally select a specific start and end time to trim the audio",
      "Click Extract & Download to save the audio file locally"
    ]
  },
  {
    id: "merger",
    name: "Audio Merger",
    slug: "merger",
    category: "audio",
    route: "/audio/merger",
    title: "Free Online Audio Merger & Song Joiner",
    shortDesc: "Join and merge multiple audio files into a single continuous track with crossfades.",
    description: "Combine multiple audio tracks in any order with seamless crossfades and customizable gaps.",
    colorClass: "card-audio",
    iconName: "Layers",
    seoTarget: "Free Online Audio Merger",
    keywords: ["audio merger", "join mp3", "combine songs", "audio joiner online"]
  },
  {
    id: "split",
    name: "Split Audio",
    slug: "split",
    category: "audio",
    route: "/audio/split",
    title: "Free Online Audio Splitter - Split MP3 into Chunks or by Silence",
    shortDesc: "Split audio into equal chunks or detect silence intervals with instant ZIP download.",
    description: "Cut audio into multiple parts automatically. Choose equal duration segments or silence detection, then download all files as a ZIP.",
    colorClass: "card-audio",
    iconName: "Scissors",
    badge: "ZIP Export",
    seoTarget: "Split Audio Online Free",
    keywords: ["split audio", "split mp3", "cut audio by silence", "audio splitter online", "mp3 segmenter"],
    steps: [
      "Upload your audio track (MP3, WAV, FLAC, M4A)",
      "Choose split mode: Equal intervals or Silence threshold detection",
      "Preview cut points and adjust segment duration",
      "Export all split audio segments packaged into a single ZIP archive"
    ]
  },
  {
    id: "mix",
    name: "Mix Audio",
    slug: "mix",
    category: "audio",
    route: "/audio/mix",
    title: "Free Online Multi-Track Audio Mixer - Overlay & Balance Tracks",
    shortDesc: "Overlay several audio tracks with per-track volume, pan, and time offset.",
    description: "Combine vocal tracks, backing instruments, and sound effects. Adjust individual track volume, delays, and crossfade timing in your browser.",
    colorClass: "card-audio",
    iconName: "SlidersHorizontal",
    badge: "Multi-Track",
    seoTarget: "Mix Audio Online Free",
    keywords: ["mix audio", "audio mixer online", "overlay sound tracks", "combine voice and music", "multitrack mixer"],
    steps: [
      "Upload two or more audio tracks",
      "Adjust individual track volumes, mute/solo, and time offsets",
      "Preview the combined mix in real-time",
      "Export the blended master track as high-quality WAV or MP3"
    ]
  },
  {
    id: "compress",
    name: "Compress Audio",
    slug: "compress",
    category: "audio",
    route: "/audio/compress",
    title: "Free Online Audio Compressor - Reduce MP3 File Size",
    shortDesc: "Compress audio files to target sizes or bitrates without sacrificing clarity.",
    description: "Shrink large audio files for email, messaging, or web publishing with target size calculation.",
    colorClass: "card-audio",
    iconName: "Minimize2",
    seoTarget: "Free Online Audio Compressor",
    keywords: ["compress audio", "reduce mp3 size", "audio file shrinker"]
  },
  {
    id: "speed",
    name: "Audio Speed",
    slug: "speed",
    category: "audio",
    route: "/audio/speed",
    title: "Change Audio Speed & Tempo Online Without Pitch Shift",
    shortDesc: "Speed up or slow down any audio track from 0.5x to 2.0x.",
    description: "Practice music by slowing down difficult passages without altering the key, or speed up podcasts.",
    colorClass: "card-audio",
    iconName: "Gauge",
    seoTarget: "Audio Speed and Tempo Changer",
    keywords: ["audio speed changer", "slow down music", "speed up song", "tempo changer"]
  },
  {
    id: "volume",
    name: "Adjust Volume",
    slug: "volume",
    category: "audio",
    route: "/audio/volume",
    title: "Boost & Normalize Audio Volume Online",
    shortDesc: "Amplify quiet recordings, normalize peak levels, or apply smooth fades.",
    description: "Boost gain up to +20dB, normalize audio for loud playback, and preview waveforms in real-time.",
    colorClass: "card-audio",
    iconName: "Volume2",
    seoTarget: "Adjust Audio Volume Online",
    keywords: ["boost volume", "audio normalizer", "increase mp3 loudness", "amplify audio"]
  },
  {
    id: "blank",
    name: "Blank Audio",
    slug: "blank",
    category: "audio",
    route: "/audio/blank",
    title: "Generate Blank Audio & Silent Audio Files Online",
    shortDesc: "Generate silent WAV and MP3 files of exact durations.",
    description: "Create precision silence files for padding, testing sound systems, or multi-track synchronization.",
    colorClass: "card-audio",
    iconName: "Disc",
    seoTarget: "Generate Blank Audio Silent MP3",
    keywords: ["blank audio generator", "silent mp3", "generate silence", "silent wav file"]
  },
  {
    id: "photo-editor",
    name: "Edit a Photo",
    slug: "photo-editor",
    category: "creative",
    route: "/creative/photo-editor",
    title: "Online Photo Editor Canvas - Crop, Filters & Drawing",
    shortDesc: "Full-featured client-side canvas photo editor with crop, rotate, adjustments, and stickers.",
    description: "Edit photos with brightness, contrast, saturation adjustments, text overlays, drawing tools, and crop presets.",
    colorClass: "card-photo",
    iconName: "Image",
    seoTarget: "Online Photo Editor Canvas",
    keywords: ["photo editor", "online image editor", "crop photo", "image filters", "canvas photo edit"]
  },
  {
    id: "resize-image",
    name: "Resize Image",
    slug: "resize-image",
    category: "creative",
    route: "/creative/resize-image",
    title: "Bulk Image Resizer & Compressor - Target KB, Social Presets",
    shortDesc: "High-quality Lanczos downscaling, target file weight in KB, and social media dimensions.",
    description: "Resize single photos or batches of up to 50 images with social media presets (Instagram, YouTube, WhatsApp) and ZIP download.",
    colorClass: "card-resize",
    iconName: "Maximize",
    badge: "Batch ZIP",
    seoTarget: "Bulk Image Resizer & Compressor",
    keywords: ["resize image", "bulk image resizer", "compress image to 50kb", "instagram size converter", "lanczos resize"]
  },
  {
    id: "remove-watermark",
    name: "Remove Watermark",
    slug: "remove-watermark",
    category: "creative",
    route: "/creative/remove-watermark",
    title: "Free AI Watermark & Object Remover - Inpainting in Browser",
    shortDesc: "Brush over unwanted text, watermarks, or objects with instant AI inpainting.",
    description: "Erase watermarks, logos, dates, and unwanted objects privately on your device with interactive brush tools and before/after slider.",
    colorClass: "card-watermark",
    iconName: "Eraser",
    badge: "AI Inpaint",
    seoTarget: "Free AI Watermark & Object Remover",
    keywords: ["remove watermark", "ai inpainting", "object remover", "erase logo from photo", "clean image online"]
  },
  {
    id: "remove-video-watermark",
    name: "Remove Video Watermark",
    slug: "remove-video-watermark",
    category: "creative",
    route: "/creative/remove-video-watermark",
    title: "Free AI Video Watermark Remover - Erase TikTok, Reels & Logos Online",
    shortDesc: "Erase TikTok, Reels, CapCut, timestamps, and TV stamps seamlessly in-browser.",
    description: "Remove watermarks and logos from MP4, WebM, and MOV videos with client-side delogo inpainting and real-time canvas processing. Zero server uploads.",
    colorClass: "card-video",
    iconName: "Video",
    badge: "Video AI",
    seoTarget: "Free AI Video Watermark Remover Online",
    keywords: ["remove video watermark", "tiktok watermark remover", "erase logo from video", "video delogo online", "clean video without watermark"]
  },
  {
    id: "remove-background",
    name: "Backgrounds",
    slug: "remove-background",
    category: "creative",
    route: "/creative/remove-background",
    title: "AI Background Remover Transparent PNG & Color Replacer",
    shortDesc: "Remove backgrounds automatically and replace with custom solid colors, or transparent PNG.",
    description: "Extract subjects from backgrounds in one click. Export transparent PNGs or create studio product shots.",
    colorClass: "card-backgrounds",
    iconName: "Sparkles",
    badge: "AI Cutout",
    seoTarget: "AI Background Remover Transparent PNG",
    keywords: ["background remover", "transparent png maker", "remove background from image free", "ai cutout"]
  },
  {
    id: "make-collage",
    name: "Make a Collage",
    slug: "make-collage",
    category: "creative",
    route: "/creative/make-collage",
    title: "Free Photo Collage Maker Grid - Templates & Spacing",
    shortDesc: "Assemble photo grids with customizable padding, border radius, and stylish color palettes.",
    description: "Create photo collages with 2 to 6 image layouts, rounded corners, custom spacing, and high-resolution export.",
    colorClass: "card-collage",
    iconName: "Grid",
    seoTarget: "Free Photo Collage Maker Grid",
    keywords: ["photo collage maker", "image grid creator", "combine pictures", "photo split grid"]
  },
  {
    id: "apply-effects",
    name: "Apply Effects",
    slug: "apply-effects",
    category: "creative",
    route: "/creative/apply-effects",
    title: "Online Photo Filters & WebGL Effects - Glitch, Retro, Vignette",
    shortDesc: "Instant aesthetic filters: Retro, Cyberpunk, Cinematic LUT, Glitch, Vignette, and Grain.",
    description: "Apply real-time photo filters and shader effects with full intensity control and instant preview.",
    colorClass: "card-effects",
    iconName: "Wand2",
    seoTarget: "Online Photo Filters & WebGL Effects",
    keywords: ["photo filters", "glitch effect", "retro photo effect", "vignette filter", "cinematic photo filter"]
  },
  {
    id: "retouch",
    name: "Retouch",
    slug: "retouch",
    category: "creative",
    route: "/creative/retouch",
    title: "Free Face & Skin Retouch Online - Smooth Skin & Remove Blemishes",
    shortDesc: "Skin smoothing, blemish removal, and brightening for portraits and selfies.",
    description: "Touch up portraits privately in your browser. Smooth skin texture, remove minor blemishes, and brighten eyes and teeth with interactive slider controls.",
    colorClass: "card-retouch",
    iconName: "Smile",
    badge: "Portrait",
    seoTarget: "Face and Skin Retouch Online Free",
    keywords: ["face retouch", "skin smoothing online", "blemish remover", "brighten teeth photo", "portrait touchup free"],
    steps: [
      "Upload a portrait photo or selfie",
      "Adjust skin smoothing intensity and blemish reduction",
      "Fine-tune eye and smile brightness and warm tone",
      "Compare before and after with the interactive slider, then export"
    ]
  },
  {
    id: "video-editor",
    name: "Edit a Video",
    slug: "video-editor",
    category: "creative",
    route: "/creative/video-editor",
    title: "Browser Video Trimmer & Speed Editor - Clip, Trim & Speed",
    shortDesc: "Trim video clips, adjust playback speed, add overlays, and export MP4.",
    description: "Lightweight in-browser video editor. Cut out unwanted moments, change playback rate, and mute or extract audio.",
    colorClass: "card-video",
    iconName: "Video",
    seoTarget: "Browser Video Trimmer & Speed Editor",
    keywords: ["online video editor", "trim video online", "video speed changer", "mp4 cutter"]
  }
];

export const AUDIO_TOOLS = TOOLS.filter((t) => t.category === "audio");
export const CREATIVE_TOOLS = TOOLS.filter((t) => t.category === "creative");

