# zenoMovies

Modern movie and TV frontend built with React and Vite.

## Stack

- React 18 + Vite
- OMDb API for metadata and title search
- TMDb API for resolving playback IDs
- NexStream embed API for playback

## Run

```bash
npm install
npm run dev
```

## Environment

Create a `.env` file from `.env.example` if you want to manage the API keys through Vite environment variables.

## Deploy

The easiest option is Vercel or Netlify:

1. Push this project to GitHub.
2. Import the repo into Vercel or Netlify.
3. Set the build command to `npm run build`.
4. Set the publish directory to `dist`.
5. Add `VITE_OMDB_KEY`, `VITE_TMDB_KEY`, and `VITE_EMBED_API_KEY` in the hosting dashboard.

## Notes

- The app is branded as `zenoMovies` in the UI, package name, and page metadata.
- OMDb is used for metadata and TMDb is used to resolve playback IDs for NexStream.
