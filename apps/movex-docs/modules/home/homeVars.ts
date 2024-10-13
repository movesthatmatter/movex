import {
  ArrowPathIcon,
  LockClosedIcon,
  FlagIcon,
  BookOpenIcon,
  BoltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import themeConfig from '../../theme.config';

export const features = [
  {
    name: 'Serverless',
    description:
      'Movex manages the network logic, state-sharing protocols, server deployment and maintenance, along with various other essential functionalities.',
    icon: BoltIcon,
    link: {
      label: 'Learn More',
      url: 'docs/features/serverless',
    },
    color: 'orange-500',
  },
  {
    name: 'Realtime',
    description:
      'Movex utilizes the Observable Pattern to monitor state changes in registered resources and promptly notify the UI layer.',
    icon: ArrowPathIcon,
    link: {
      label: 'Learn More',
      url: '/docs/features/realtime',
    },
    color: 'blue-500',
  },
  {
    name: 'Private State',
    description:
      'At times, certain parts of the state need to remain hidden from peers until the right moment to reveal them—much like a game of cards.',
    icon: LockClosedIcon,
    link: {
      label: 'Learn More',
      url: '/docs/features/private_state',
    },
    color: 'yellow-300',
  },
  {
    name: 'Authoritative Server',
    description:
      'To safeguard app logic from potential bad actors, it is processed on the server while remaining abstracted from the developer.',
    icon: FlagIcon,
    link: {
      label: 'Learn More',
      url: '/docs/features/server_authoritative',
    },
    color: 'orange-500',
  },
  // {
  //   name: 'Typesafe Functional Programming',
  //   description:
  //     "Movex is entirely built in TypeScript. If you’re familiar with Redux or the React.useReducer() hook, you’ll feel right at home. If not, getting started with Movex is quick and easy!",
  //   icon: ShieldCheckIcon,
  //   link: {
  //     label: 'Learn More',
  //     url: '/docs/features/functional',
  //   },
  //   color: 'red-500',
  // },
  {
    name: 'Efficient Data Flow',
    description:
      'Movex ensures that only the minimum required data is transmitted with each update, optimizing performance.',
    icon: ShieldCheckIcon,
    link: {
      label: 'Learn More',
      url: 'https://www.movex.dev/docs/features/functional#determinstic-action-propagation',
    },
    color: 'orange-500',
  },
  {
    name: 'Open Source',
    description:
      'Movex is fully open source, inviting developers to contribute and collaborate! Your input is welcome as we build a robust and dynamic community around this project.',
    icon: BookOpenIcon,
    link: {
      label: 'Learn More',
      url: 'https://github.com/movesthatmatter/movex',
    },
    color: 'orange-500',
  },
];

export const faqs = [
  {
    q: 'What does "No Server Code" or "No Server Hassle" really mean?',
    a: 'This means you, the developer, don’t need to write, build, distribute, or maintain any server code. Your focus is solely on client-side/local code, as if you were developing for a single player or user, while Movex seamlessly manages the server component for you.',
    link: {
      label: 'See more here',
      url: '/docs/features/server_authoritative',
    },
  },
  {
    q: 'How can there be "Server Authoritative" without a server?',
    a: 'Spot on, detective! There is indeed a server running, but it’s fully abstracted by Movex and movex-service, so you can focus on development without any hassle.',
    link: {
      label: 'See more here',
      url: '/docs/features/server_authoritative',
    },
  },
  // {
  //   q: 'Can I use Movex with "X" framework or game engine?',
  //   a: "At the moment, we haven't tried it on any game engine (but will do that in the close future) but in theory it should work with any application (or game) as long as the codebase is in javascript/typescript.",
  // },
  {
    q: 'What can I build with Movex?',
    a: 'Movex employs Deterministic Action Propagation to seamlessly transmit Actions (small bits of data) between clients and servers. This approach is particularly effective for games or applications with infrequent state changes, such as turn-based games (e.g., Age of Empires). However, it may not suffice for fast-paced shooter games or applications requiring extensive user input transmitted over the network. Future enhancements are in the works to address these needs as well!',
    link: {
      label: 'Read more about Deterministic Propagation',
      url: '/docs/features/server_authoritative#determinstic-action-propagation-method',
    },
  },
  {
    q: 'Can I use Movex with React?',
    a: 'Yes. Just use `movex-react`.',
    link: {
      label: 'See how',
      url: '/docs/overview/get_started',
    },
  },
];

export const community = [
  {
    name: 'Discord',
    icon: { config: 'chat' }, // from nextra.useConfig()
    desc: 'Get your questions answered right away on Discord',
    link: themeConfig.chat?.link || '',
  },
  {
    name: 'Github',
    icon: { config: 'project' }, // from nextra.useConfig()
    desc: 'Contribute or Open Issues on our Github repo.',
    link: themeConfig.project?.link || '',
  },
  // {
  //   name: 'Twitter',
  //   icon: '',
  //   desc: 'Whatcha gonna\' say?',
  //   link: themeConfig.project?.link || '',
  // },
];
