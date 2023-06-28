import {
  ArrowPathIcon,
  LockClosedIcon,
  HeartIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

export const features = [
  {
    name: 'Server Authoritative. No Server Code',
    description:
      "It's important to keep the business logic outside the reach of potential bad actor clients, which is why all the state logic happens on an actual server. But there is no need for you to code, maintain or worry about the server.",
    icon: FlagIcon,
    link: {
      label: 'Learn More',
      url: '/docs/overview/server_authoritative',
    },
    color: 'orange-500',
  },
  {
    name: 'Secret State',
    description:
      'Sometimes you need to keep state fragments secret (or private) for a while, until the time is appropriate to reveal. Movex makes this a breeze!',
    icon: LockClosedIcon,
    link: {
      label: 'Learn More',
      url: '/docs/overview/secret_state',
    },
    color: 'yellow-300',
  },
  {
    name: 'Real-Time Sync',
    description:
      "The State is shared in real-time with all the peers subscribed to its Resource.",
    icon: ArrowPathIcon,
    link: {
      label: 'Learn More',
      url: '/docs/overview/realtime',
    },
    color: 'blue-500',
  },
  {
    name: 'Functional & Familiar',
    description:
      "If you know Redux or any flavour of Flux you'll feel right at home. If not Movex is quick to get started with.",
    icon: HeartIcon,
    link: {
      label: 'Learn More',
      url: '/docs/overview/functional',
    },
    color: 'red-500',
  },
];
