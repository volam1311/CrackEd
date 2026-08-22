We’ve been developing the concept and UI for your hackathon project, *CrackEd* — essentially an educational video platform designed to make useful content more appealing to people accustomed to short-form, high-dopamine “brain rot” content.

### Tech stack

* *Frontend:* TypeScript, React, Tailwind CSS
* *Backend:* Python (FastAPI)

### CrackEd concept

The core idea is:

**Make educational content as clickable and engaging as brain-rot content, without turning the actual educational material into brain rot.**


The interface is inspired heavily by YouTube, but CrackEd controls how educational videos are *discovered, titled, presented, and optionally broken into smaller lessons*.

There are *two sources of videos*:

1. *YouTube videos*

   * Fetch videos from *whitelisted educational YouTube channels*.
   * Use the *YouTube Data API* to retrieve metadata.
   * Store things such as video ID, title, description, thumbnail, channel and duration.
   * Use AI to transform boring/technical titles into more engaging titles.
   * Potentially replace/present a more engaging thumbnail inside CrackEd.
   * Play the original YouTube video through an *iframe*.
   * CrackEd does *not download or modify the YouTube video itself*.

2. *User-uploaded videos*

   * Users upload their own educational videos.
   * Store them in the application's database/storage.
   * AI can generate/improve the title.
   * As an *optional/stretch feature*, CrackEd can preprocess the uploaded video:

     * Generate transcript.
     * Analyse topics in the transcript.
     * Find natural splitting points.
     * Break a long lecture into roughly *5–10 minute lessons*.
     * Generate a title for each resulting clip.
     * Potentially remove long pauses/filler.
     * Let the user review the suggested clips before publishing.

The rough uploaded-video pipeline we discussed was:

*Upload → Transcript → AI analysis → Suggested split points → Generate titles → Review → Publish*

### Scope

We settled around this *in-scope functionality*:

* Web application
* Upload videos
* Fetch videos from whitelisted YouTube channels
* YouTube iframe playback
* AI title preprocessing
* Educational video feed
* More engaging thumbnails
* Optional preprocessing/splitting of uploaded videos

And *out of scope*:

* Server hosting
* Subscriptions
* Advertising/revenue generation
* Downloading YouTube videos
* Editing or processing YouTube videos
* Mobile application

### UI direction

Initially, we explored a fairly feature-heavy CrackEd interface with things like Trending, Watch Later, Saved Videos, Help & Feedback, etc.

You then simplified the MVP considerably.

The current navigation/design should focus on only *three main pages*:

*Home — Fetch from YouTube — Upload Videos*

We removed unnecessary YouTube-like features such as likes, Saved Videos, Trending, Watch Later and Help & Feedback.

The visual direction became:

* YouTube-inspired
* Dark theme
* *CrackEd* branding
* Red accent colour
* Large engaging thumbnails
* Minimal navigation
* Modern cards
* Educational content presented almost like entertainment content

### Home

The Home page is essentially the CrackEd educational feed.

We designed sections such as:

*Today's Pick*

A larger featured educational video.

*Recommended for you*

A YouTube-style grid of educational videos with rewritten titles and engaging thumbnails.

*Continue Learning*

Videos that the user has partially watched, including progress indicators.

The intention is that the user shouldn't immediately feel like they're opening an LMS or university portal. It should feel closer to opening YouTube.

### Fetch from YouTube

This page is for managing the *YouTube ingestion pipeline*.

The user/admin can enter something such as:

*YouTube Channel URL / Channel ID → Add Channel*

CrackEd maintains a list of *whitelisted channels*, for example educational channels such as 3Blue1Brown or freeCodeCamp.

Then:

*Channel → YouTube API → Fetch metadata → AI processes titles → Save → CrackEd feed*

The UI also makes it clear that:

CrackEd only fetches metadata. Videos remain on YouTube and play through an iframe.


This helps keep the implementation aligned with your project scope.

### Upload Videos

This is the second content-ingestion method.

The basic page starts with:

*Drag & drop your video*

or

*Choose File*

After uploading, the video becomes available for AI preprocessing.

We designed the workflow roughly as:

*1 Upload → 2 Details → 3 Preprocess → 4 Review → 5 Publish*

The AI preprocessing could:

* Extract/generate transcript
* Detect topics
* Find good split points
* Generate titles
* Suggest ~5–10 minute clips
* Optionally remove pauses/filler

For example, instead of arbitrarily doing:

0–5 min → 5–10 min → 10–15 min

the transcript could identify:

00:00 Introduction
05:42 Supervised Learning
15:33 Linear Regression
25:49 Classification

and use those *semantic boundaries* to create better lessons.

### Video storage decision

Given the *15-hour hackathon time budget* and a team of 4, we decided against cloud storage (e.g. AWS S3) for uploaded videos — the setup overhead (IAM, bucket policies, credentials) isn't worth it for the timeline.

Instead:

* Uploaded videos are stored on the *local filesystem* of a single dev laptop (e.g. a `/uploads` folder on the backend server).
* The whole team runs against *one shared backend instance* (that laptop, exposed via ngrok/Tailscale, or deployed to a free host like Railway/Render) rather than everyone running separate local backends — this avoids needing to sync raw video files between machines.
* For local development/testing before that's wired up, the team shares a couple of small sample `.mp4` files (via a Drive link or committed to the repo) as consistent test fixtures.

### Most recent UI decision

You specifically asked that the designs *not be shown as one giant desktop application containing every feature*.

The final concept is therefore three distinct CrackEd screens:

**Home**
**Fetch from YouTube**
**Upload Videos**


And most recently, you asked for the visual designs to use a *1:1 aspect ratio*.

So overall, we’ve moved from a broad “educational YouTube” idea into a much more focused MVP:

*CrackEd = curated educational YouTube content + AI-powered presentation + user-uploaded educational content + optional AI lesson splitting.*
