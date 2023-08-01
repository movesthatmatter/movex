import {
  ArrowPathIcon,
  LockClosedIcon,
  HeartIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import themeConfig from '../../theme.config';

export const features = [
  {
    name: 'Authoritative Server',
    description:
      "It's important to keep the app logic outside the reach of potential bad actors, which is why it gets processed on a server. But there is no need for you to code, maintain or worry about that.",
    icon: FlagIcon,
    link: {
      label: 'Learn how it works',
      url: '/docs/features/server_authoritative',
    },
    color: 'orange-500',
  },
  {
    name: 'Secret State',
    description:
      'Sometimes you need to keep parts of the state secret from the rest of the peers until the time is appropriate to reveal, like a game of cards for example.',
    icon: LockClosedIcon,
    link: {
      label: 'Movex makes this a breeze',
      url: '/docs/features/secret_state',
    },
    color: 'yellow-300',
  },
  {
    name: 'Real-Time Sync',
    description:
      'A Movex Resource watches for state changes constantly and triggers updates to the UI as soon as a new change occurs by following the Observable pattern.',
    icon: ArrowPathIcon,
    link: {
      label: 'Learn More',
      url: '/docs/features/realtime',
    },
    color: 'blue-500',
  },
  {
    name: 'Typesafe Functional Programming',
    description:
      "Movex is built entirely in Typescript. If you know Redux or the `useReducer` hook you'll feel right at home. If not Movex is quick to get started with.",
    icon: HeartIcon,
    link: {
      label: 'Learn More',
      url: '/docs/features/functional',
    },
    color: 'red-500',
  },
];

export const faqs = [
  {
    q: 'What does "No Server Code" or "No Server Hassle" really mean?',
    a: "It means there that you, the developer, don't have to write, build, distribute or maintain any server code. You only have to concern with the client/local code as you'd be developing for single player/user and movex takes care of the server part seamlessly.",
    link: {
      label: 'See more here',
      url: '/docs/features/server_authoritative',
    },
  },
  {
    q: 'How can there be "Server Authoritative" without a server?',
    a: "Spot on, detective! There is in fact a server sunning, but it's just abstracted away by movex + movex-service so you don't have to bother with it.",
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
    q: 'What kind of games can I build with Movex?',
    a: "Movex uses Deterministic Action Propagation under the hood, which means it's propagating Actions (small bits of data) from client to server and server to client(s). This works great for games (or applications) with unfrequent changes (traffic) such as a turn-based game (e.g. Age of Empires) but will most likely not be enough for a shooter or something that requires a lot of user input sent over the network. There are some ideas to make that possible in the future as well.",
    link: {
      label: "Read more about Deterministic Propagation",
      url: "http://localhost:3000/docs/features/server_authoritative#determinstic-action-propagation-method"
    }
  },
  {
    q: 'Can I use Movex with React?',
    a: "Yes. Just use `movex-react`.",
    link: {
      label: "See how",
      url: "http://localhost:3000/docs/overview/get_started"
    }
  },
];

export const community = [
  {
    name: 'Discord',
    icon: '',
    desc: 'Get your questions answered right away on Discord',
    link: themeConfig.chat?.link || '',
  },
  {
    name: 'Github',
    icon: '',
    desc: 'Contribute or Open Issues on our Github repo.',
    link: themeConfig.project?.link || '',
  },
  // {
  //   name: 'Twitter',
  //   icon: '',
  //   desc: 'Whatcha gonna\' say?',
  //   link: themeConfig.project?.link || '',
  // },
]