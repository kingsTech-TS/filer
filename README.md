<div align="center">

# Filer

**Every file tool. One place.**

Convert documents, media and spreadsheets, remove photo backgrounds,<br />
zip and unzip files, generate favicons, and turn links into QR codes, all in the browser.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[Live app](https://filer-flame.vercel.app) · [API](https://filer-api.onrender.com/docs)

</div>

<br />

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Backend endpoints](#backend-endpoints)
- [Deployment](#deployment)

## Features

| Tool                  | What it does                                                                                     |
| :-------------------- | :----------------------------------------------------------------------------------------------- |
| **Convert**           | Converts 21 input types (PDF, Word, PowerPoint, Excel, CSV, images, audio and video). The output formats offered are loaded live for each file. |
| **Remove background** | Cuts the subject out of a PNG, JPG or WEBP photo and returns a transparent PNG with a preview.   |
| **Zip**               | Bundles up to 50 files of any type into one `.zip` with a custom name.                           |
| **Unzip**             | Lists every file inside a `.zip`, with its folder path, and downloads them one at a time.        |
| **Favicon**           | Builds a full favicon pack (ICO, PNG sizes, Apple and Android icons, manifest and `<head>` HTML) from text, an emoji or an image. Text can use any Google Font or an uploaded font file (TTF, OTF, TTC, WOFF, WOFF2). Includes a live light/dark preview. |
| **QR Code**           | Turns a link into a QR code (PNG and SVG) with custom colors, size, margin and error correction. Can shorten the link first with TinyURL, or just make a short link. |

All tools share:

- **Real upload and download progress.** Uploads report their percentage while sending, and downloads are streamed so their progress can be shown.
- **Animated stages.** Each tool has its own loader and an Upload → Process → Download step tracker.
- **Checks before uploading.** Unsupported file types and files over 25 MB are rejected in the browser, and the backend's own error messages are shown when something fails.
- **Reduced motion.** Animations turn off when the user's system asks for reduced motion.

## Tech stack

| Area      | Choice                                                             |
| :-------- | :----------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) with React 19         |
| Language  | TypeScript                                                         |
| Styling   | Tailwind CSS 4, using the [Geist](https://vercel.com/font) font    |
| Icons     | [lucide-react](https://lucide.dev)                                 |
| Backend   | [filer-api](https://filer-api.onrender.com/docs), a FastAPI service that uses CloudConvert and remove.bg |

## Getting started

**Requirements:** Node.js 20 or newer, and npm.

```bash
# 1. Install dependencies
npm install

# 2. Point the app at the API (see below)
echo "NEXT_PUBLIC_API_URL=https://filer-api.onrender.com" > .env

# 3. Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Script          | Description                      |
| :-------------- | :------------------------------- |
| `npm run dev`   | Start the development server     |
| `npm run build` | Create a production build        |
| `npm run start` | Serve the production build       |
| `npm run lint`  | Run ESLint                       |

> [!NOTE]
> The API is hosted on Render's free tier, so the first request after a quiet period can take up to a minute while the server starts. The app shows a friendly message if a request fails during that time.

## Environment variables

Create a `.env` file in the project root. Every variable is optional.

| Variable                       | Default                          | Description                                     |
| :----------------------------- | :------------------------------- | :---------------------------------------------- |
| `NEXT_PUBLIC_API_URL`          | `https://filer-api.onrender.com` | Base URL of the backend API                     |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | `25`                             | Per-file upload limit. Keep in sync with the API. |
| `NEXT_PUBLIC_MAX_ZIP_FILES`    | `50`                             | Maximum number of files per zip. Keep in sync with the API. |

> [!TIP]
> To work against a local backend, put `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`. Next.js reads env files only when it starts, so restart the dev server after changing them.

## Project structure

```text
filer/
├── app/
│   ├── globals.css          # Theme tokens and animation keyframes
│   ├── layout.tsx           # Fonts and metadata
│   └── page.tsx             # Landing page and tool tabs
├── components/
│   ├── tools/
│   │   ├── convert-tool.tsx # Convert and Remove background
│   │   ├── zip-tool.tsx
│   │   ├── unzip-tool.tsx
│   │   ├── favicon-tool.tsx
│   │   └── qr-tool.tsx      # QR codes and short links
│   ├── controls.tsx         # Form controls (segmented, slider, switch, color…)
│   ├── download-button.tsx  # Download buttons with streaming progress
│   ├── dropzone.tsx         # Drag-and-drop file picker
│   ├── stage-loader.tsx     # Animated loaders and step tracker
│   └── task-view.tsx        # Shared busy, error and result screen
├── hooks/
│   ├── use-task.ts          # Upload → process → result state, with cancellation
│   └── use-download.ts      # Download with progress
└── lib/
    ├── api.ts               # API client: uploads with progress, polling, errors
    ├── files.ts             # File types, sizes and validation
    └── tools.ts             # Tool definitions
```

## Backend endpoints

The frontend talks to [filer-api](https://filer-api.onrender.com/docs):

| Method | Endpoint                          | Used by                                |
| :----- | :-------------------------------- | :------------------------------------- |
| `GET`  | `/formats`                        | Convert: list the accepted input types |
| `GET`  | `/formats?input_format={ext}`     | Convert: list possible output formats  |
| `POST` | `/convert`                        | Convert                                |
| `GET`  | `/progress/{job_id}`              | Convert: poll conversion status        |
| `POST` | `/remove-background`              | Remove background                      |
| `POST` | `/zip`                            | Zip                                    |
| `POST` | `/unzip`                          | Unzip                                  |
| `GET`  | `/favicon/options`                | Favicon: shapes, fonts and limits      |
| `POST` | `/favicon/{text,emoji,image}`     | Favicon                                |
| `GET`  | `/qr/options`                     | QR Code: sizes, margins and limits     |
| `POST` | `/qr`                             | QR Code (optionally shortened first)   |
| `POST` | `/shorten`                        | QR Code: short link only               |
| `GET`  | `/download/{job_id}`              | Download a result                      |
| `GET`  | `/download/{job_id}/files/{i}`    | Download one file from an unzip, favicon or QR job |

## Deployment

The app is deployed on [Vercel](https://vercel.com):

1. Import the repository into Vercel.
2. Add `NEXT_PUBLIC_API_URL` under **Project → Settings → Environment Variables**.
3. Add the deployed domain to the API's CORS `allow_origins` list in `filer-api/main.py`. Otherwise the browser will block requests.

<br />

<div align="center">
<sub>Built with Next.js · Powered by CloudConvert, remove.bg and TinyURL</sub>
</div>
