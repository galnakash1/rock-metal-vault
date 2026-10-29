#!/usr/bin/env node
// `npm run test:ui`: runs the unit tests in watch mode with the Vitest UI (@vitest/ui) and opens
// it in your browser already signed in.
//
// Why a script instead of `vitest --ui --open`: Vitest 5 protects the UI with a token. `--open`
// only opens the `?token=…` URL on the very first run on a machine; later runs open the bare URL
// and expect the browser to still hold the auth cookie, so a fresh browser (or cleared cookies)
// sees "Vitest UI requires authentication". This script always opens the token URL, which sets
// the cookie and redirects to the clean UI.
//
// Set BROWSER=none to only print the URL (Vite's convention).

import { spawn } from 'node:child_process'
import { startVitest } from 'vitest/node'

const vitest = await startVitest([], { ui: true, open: false, watch: true })

const port = vitest.vite.config.server.port
const url = new URL(vitest.config.uiBase, `http://localhost:${port}`)
url.searchParams.set('token', vitest.config.api.token)

console.log(`\n  Vitest UI: ${url.href}\n`)

if (process.env.BROWSER !== 'none') {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url.href]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url.href]]
        : ['xdg-open', [url.href]]
  // Opening the browser is a convenience: if it fails, the URL above still works.
  spawn(command, args, { stdio: 'ignore', detached: true })
    .on('error', () => {})
    .unref()
}
