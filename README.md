# The ~~Secret~~ Language App


![demo screenshot](/docs/img/demo.png)

## [Check out live website here](https://secret-language-app.netlify.app/)


***goal*: building a language learning app that I actually enjoy using**

## Running it

```bash
npm i
npm run dev
```

### Development Modes

This codebase supports multiple deployment variants using the `VITE_DEPLOY_FLAG` environment variable:

Run the dev server in different modes:

```bash
npm run dev:secret  # The Secret Language App
npm run dev:cram    # Cram MVP
```

Build for production:

```bash
npm run build:secret 
npm run build:cram   
```

## Features

- Local first, no data leaves the device
- Exercises are dynamically generated based on language data
- Add your own content and download pre-made lessons
- Supports any language
- State of the art spaced repetition built on top of [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- Integrate sources and immersion content from around the internet
- Learn with a (growing) number of different language learning methodologies
