<div align="center">
<picture width="400">
  <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2099521/242976573-84d1ea96-1859-43a7-ac0c-d2f1e0f1b882.png" width="400">
  <img alt="Movex Logo" src="https://user-images.githubusercontent.com/2099521/242976534-60d063cd-3283-45e3-aac5-bd8ed0eb8946.png" width="400">
</picture>
</div>

<div align="center">
  <h1>Serverless Multiplayer Infrastructure for JavaScript Game Developers</h1>
  Build multiplayer games without worrying about server-side logic, backend infrastructure, or networking. Movex takes care of it all—works with React out of the box!
</div>

<br/>
<div align="center">

[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/dwyl/esta/issues)
![Tests](https://github.com/movesthatmatter/movex/actions/workflows/test.yml/badge.svg)
![Type Script Compilation](https://github.com/movesthatmatter/movex/actions/workflows/tsc-compiler.yml/badge.svg)


[npm-url]: https://npmjs.org/package/movex
[npm-image]: https://img.shields.io/badge/dynamic/json?color=orange&label=movex&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmovesthatmatter%2Fmovex%2Fmain%2Flibs%2Fmovex%2Fpackage.json
[license-image]: https://img.shields.io/badge/license-MIT-green
[license-url]: https://github.com/movesthatmatter/movex/blob/main/LICENSE

</div>

## 🧐 Why Movex

__Movex cuts your development effort in half and helps you ship faster by abstracting away backend logic and server-side complexity! 🎉__

With its unique approach and robust set of features, Movex gives you the freedom to focus solely on the front-end while still maintaining full control over the Game Logic, UI/UX, and Data Authority.

## ⭐️ Features:
- __Serverless:__
  Movex manages the network logic, state-sharing protocols, server deployment and maintenance, along with various other essential functionalities. [Learn more](https://www.movex.dev/docs/features/serverless).
- __Authoritative Server:__
  By keeping the data reconciliation logic on the server side, Movex keeps bad actors away, ensuring the integrity of your application. [Learn more](https://www.movex.dev/docs/features/server_authoritative).
- __Real-time synchronization:__
  By utilizing the Observable Pattern to monitor state changes in registered resources Movex promptly notifes the UI layer. [See more](https://www.movex.dev/docs/features/realtime)
- __Private State:__
  Movex allows parts of the shared state to remain private to specific users, ensuring that sensitive information is kept secure. [See more](https://www.movex.dev/docs/features/private_state)
- __Efficient Data Flow:__
  Movex ensures that only the minimum required data is transmitted with each update, optimizing performance. (See: [Deterministic Action Propagation](https://www.movex.dev/docs/features/functional#determinstic-action-propagation))


## 💜 Who uses Movex?
<a href="https://chessroulette.live" target="_blank" alt="Chessroulette | Conect. Play. Stream">
  <picture width="500">
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/movesthatmatter/chessroulette-web/master/src/components/Logo/assets/Logo_light_full.svg" width="250">
    <img alt="Chessroulette | Conect. Play. Stream" src="https://raw.githubusercontent.com/movesthatmatter/chessroulette-web/master/src/components/Logo/assets/Logo_dark_full.svg" width="250">
  </picture>
</a>

## 🚀 Examples & Demos
- **Multiplayer Rock Paper Scissors Game** - https://codesandbox.io/s/rps-demo-x877yl
- **Chat App** - https://github.com/GabrielCTroia/movex-next-chat

## 🧙🏽‍♂️ How Movex works
Movex follows the [Flux Pattern](https://medium.com/weekly-webtips/flux-pattern-architecture-in-react-35d0b55313f6) locally to respond to UI changes. It then employs the [Deterministic Propagation Method](https://www.movex.dev/docs/features/functional#determinstic-action-propagation) to synchronize state changes with the Global State(aka Master State) and all peers in the network. [Learn More](https://www.movex.dev/docs/how).

<div align="center">
<picture width="600">
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/movesthatmatter/movex/assets/2099521/6d0f8707-b5b3-49f8-aea9-e7f47d70f18f" width="600">
  <img alt="Movex Logo" src="https://github.com/movesthatmatter/movex/assets/2099521/944a5c70-f6cf-42d3-a8b9-0b526099ca1e" width="600">
</picture>
</div>

## 👩‍💻 Getting Started

#### 1. Install It

```bash
yarn add movex; yarn add --dev movex-service
```

####  2. Create the Movex Config File

```ts
export default {
  resources: {},
};
```

####  3. Start Movex in Dev Mode

```bash
npx movex dev
```

#### 4. Next Steps
To continue with the next steps see [Get Started Docs](https://www.movex.dev/docs/overview/get_started).

## Documentation 
Visit the [Docs](https://www.movex.dev/docs/overview/introduction) to get started with Movex.

## 🙏 Contributing

First off, thank you for showing an interest in contributing to the Movex project! We have created a [Contributing Guide](https://github.com/movesthatmatter/movex/blob/main/CONTRIBUTING.md) that will show you how to setup a development environment and how to open pull requests and submit changes.

- 🚀 Want to participate in **#hacktoberfest**?
We have a selection of [#hactoberfest issues](https://github.com/movesthatmatter/movex/issues?q=is%3Aissue+is%3Aopen+label%3Ahacktoberfest).

- Want to help with the code?
Please check out our [Good First Issue](https://github.com/movesthatmatter/movex/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) section.

- Don't wanna' code?
Any feedback is welcome and greatly appreciated so please don't hesitate to open an [issue](https://github.com/movesthatmatter/movex/issues).

- For any other help, you can write us on our [Discord](https://discord.gg/N8k447EmBh), [Twitter](https://twitter.com/gctroia) or just [open an issue](https://github.com/movesthatmatter/movex/issues)!

<br/>

> #### Before You Contribute, make sure your commits are signed using SSH, GPG os S/MIME
> This is **very important** for #hacktoberfest so Github can trace your contribution correctly.
> [Learn more about signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification).
>
> **ALSO:** Please see our [Requirements For Opening PRs](https://github.com/movesthatmatter/movex/blob/main/CONTRIBUTING.md#opening-pull-request-requirements).

## 🛡️ License

Movex is licensed under the MIT License - see the [LICENSE](https://github.com/movesthatmatter/movex/blob/main/LICENSE) file for details.

## 👽 Community

[Join our Discord](https://discord.gg/N8k447EmBh)

## 🥷 Thanks To All Contributors

Movex wouldn't be the same without you, so thank you all for your amazing efforts and contribution! 

<a href="https://github.com/movesthatmatter/movex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=movesthatmatter/movex&v=2" alt="Contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
