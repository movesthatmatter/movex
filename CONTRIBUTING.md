# Contributing

First off, thank you for considering contributing to Movex. It's people like you that make a difference in open source. By contributing to Movex, you agree to abide by the [Code of Conduct](https://github.com/movesthatmatter/movex/blob/main/CODE_OF_CONDUCT.md).

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## What can I contribute

Movex is an open-source project and we love to receive contributions from our community — you!

Here are some ways you can contribute:
- Try building or deploying Movex and give feedback. You can follow this [Get Started](https://www.movex.dev/docs/overview/get_started) tutorial for an intro!
- Add new framework wrappers (e.g. libs/movex-vue, libs/movex-angular, etc.)
- Help with open issues or create your own
- Share your thoughts and suggestions with us
- Help create tutorials and blog posts
- Request a feature by submitting a proposal
- Report a bug
- Improve documentation - fix incomplete or missing docs, bad wording, examples or explanations.

## Responsibilities
* If you're making changes to the Movex core, ensure it runs correctly both on client AND server
* Create issues for any major changes and enhancements that you wish to make. Discuss things transparently and get community feedback.
* Ensure all regression tests are passing after your change
* Keep feature versions as small as possible, preferably one new feature per version.
* Be welcoming to newcomers and encourage diverse new contributors from all backgrounds.

## Before You Contribute

### Make sure your commits are signed using SSH, GPG os S/MIME

This is **very important** so github can trace your contribution correctly, and avoid the following merging block message: 
<img width="844" alt="Screenshot 2023-10-11 at 11 10 34 AM" src="https://github.com/movesthatmatter/movex/assets/2099521/d2d60b46-d609-4de6-a267-9bcfe63d08e6">

Please follow this guide to [learn more about signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification).

## Your First Contribution

Unsure where to begin contributing to Movex? You can start by looking through the _good-fist-issue_ and _help-wanted_ issues:
- Good first issues - issues which should only require a few lines of code, and a test or two.
- Help wanted issues - issues which should be a bit more involved than beginner issues.

> **Working on your first Pull Request?**
> You can learn how from this *free* series [How to Contribute to an Open Source Project on GitHub](https://kcd.im/pull-request)

# Development

**Important**: The project is a monorepo, meaning that it is a collection of multiple packages managed in the same repository. 

These packages are located at `/libs` and they are the following:
- movex (the movex core)
- movex-core-utils (utility functions shared between each library)
- movex-service (the CLI tool, able to start movex in dev and built it for production)
- movex-server (the node backend running on the server)
- movex-react (the react wrapper)

Based on the issue you're working on, one or more of these libraries will be touched.

Visit the issue tracker to find a list of open issues that need attention.

## Step 1. Clone the repo

Fork, then clone the repo:

git clone https://github.com/your-username/movex.git

## Step 2. Build the Project

This repo uses Yarn for all package management.

When working on a library in `/libs` there is no need to build anything!

## Step 3. Testing

`yarn test`

To continuously watch and run tests, run the following:

`yarn test --watch`

Alternatively, to skip the nx caches you can run:

`yarn test --watch -- --skip-nx-cache`

## Step 4. Commit your changes

This repo uses [commitizen](https://github.com/commitizen/cz-cli) to keep the commits structured and tidy.

To commit run the following:

`yarn commit`

Optionally, if you'd like to keep running `git commit` you can configure the git hooks as in this [tutorial](https://github.com/commitizen/cz-cli#optional-running-commitizen-on-git-commit).

## Step 5. Sending a Pull Request
For non-trivial changes, please open an issue with a proposal for a new feature or refactoring before starting on the work. We don't want you to waste your efforts on a pull request that we won't want to accept.

On the other hand, sometimes the best way to start a conversation is to send a pull request. Use your best judgement!

In general, the contribution workflow looks like this:

- Open a new issue in the Issue tracker.
- Fork the repo.
- Create a new feature branch based off the master branch.
- Make sure all tests pass and there are no linting errors.
- Submit a pull request, referencing any issues it addresses.
- Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, we'll try to get back to you as soon as possible. We may suggest some changes or improvements.

# Thank you for your contribution! 🙏
