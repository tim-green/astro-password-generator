# PassCraft

A password & passphrase generator that was built with Astro, a React island and Tailwind CSS.

## Features

- Generate a batch of passwords or passphrases at once (1-20 per batch)
- **Password mode:** toggle uppercase, lowercase, numbers, and symbols independently. With a
  length slider from 4-64 characters (the default 10)
- **Passphrase mode:** word count slider (3-10 words), the choice of separator, optional
  capitalisation and an optional random number
- Live entropy estimate and a strength label that updates as you change options
- One click copy per password. With a "Copied" confirmation
- Save any password to a persistent list and remove it later
- Settings, the current batch and saved passwords are all kept in `localStorage` - nothing is
  generated or sent over the network, ever (random values come from `crypto.getRandomValues`)
