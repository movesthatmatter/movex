<div align="center">
<picture width="400">
  <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2099521/242976573-84d1ea96-1859-43a7-ac0c-d2f1e0f1b882.png" width="400">
  <img alt="Movex Logo" src="https://user-images.githubusercontent.com/2099521/242976534-60d063cd-3283-45e3-aac5-bd8ed0eb8946.png" width="400">
</picture>
</div>

<div align="center">
  <h1>Serverless real-time data sharing infrastructure for frontend developers</h1>
  Build multiplayer games, chat apps or anything in between without worrying about the server side, backend logic or even the network! Works with React out of the box!
</div>

<br/>
<div align="center">

[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/dwyl/esta/issues)
![CI](https://github.com/movesthatmatter/movex/actions/workflows/node.js.yml/badge.svg)
![Type Script Compilation](https://github.com/movesthatmatter/movex/actions/workflows/tsc-compiler.yml/badge.svg)


[npm-url]: https://npmjs.org/package/movex
[npm-image]: https://img.shields.io/badge/dynamic/json?color=orange&label=movex&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmovesthatmatter%2Fmovex%2Fmain%2Flibs%2Fmovex%2Fpackage.json
[license-image]: https://img.shields.io/badge/license-MIT-green
[license-url]: https://github.com/movesthatmatter/movex/blob/main/LICENSE

</div>

## 🧐 Why Movex

__Movex let's you cut the development effort in half and ship faster by abstracting the backend logic and server-side away! 🎉__

With it's unique approach and set of features Movex gives you the freedom to focus only on the front-end while still maintaining all of the control over the App Logic, UI/UX and Authority over Data.

In addition it comes pre-packed with:
- the ability to keep parts of the shared state private to specific users. [See Secret State](https://www.movex.dev/docs/features/secret_state)
- ensures the minimun amount of data is sent over the wire with each update. [See Deterministic Action Propagation](https://www.movex.dev/docs/features/functional)
- keeps bad actors away by keeping the Data Reconciliation Logic out of the client reach. [See Authoritative Server](https://www.movex.dev/docs/features/server_authoritative)


## 🚀 Examples

- **Chat App** - https://github.com/GabrielCTroia/movex-next-chat
- **Multiplayer Rock Paper Scissors Game** - https://codesandbox.io/s/rps-demo-x877yl

## ⭐️ Features
- 🤯 __No Backend logic to manage__ - Movex takes care of it for you! [See how](https://www.movex.dev/docs/features/frontend_only).
- 👑 __Authoritative Server__
- 🤩 __Real-time synchronization__
- 🤐 __Secret State__
- 😎 __Follows the Flux API__
- 😍 __Works with Vanilla JS or any Framework__

## 🧙🏽‍♂️ How Movex works

At the client level, Movex adheres to the [Flux Pattern](https://medium.com/weekly-webtips/flux-pattern-architecture-in-react-35d0b55313f6) to react to UI changes. Additionally, it employs the ["Deterministic Action Propagation Method"](https://www.movex.dev/docs/features/functional#determinstic-action-propagation) to synchronize any state changes with the Global (Master) State which lives on the server. Consequently, this process instantly updates all other peers on the network, ensuring real-time data synchronization. [Learn More](https://www.movex.dev/docs/how).

<div align="center">
<picture width="600">
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/movesthatmatter/movex/assets/2099521/6d0f8707-b5b3-49f8-aea9-e7f47d70f18f" width="600">
  <img alt="Movex Logo" src="https://github.com/movesthatmatter/movex/assets/2099521/944a5c70-f6cf-42d3-a8b9-0b526099ca1e" width="600">
</picture>
</div>

## 👩‍💻 Getting Started

Visit the [Docs](https://www.movex.dev/docs/overview/get_started) to get started with Movex.

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
