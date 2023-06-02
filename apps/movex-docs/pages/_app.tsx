import 'tailwindcss/tailwind.css'
import '../globals.css'

function MyApp({ Component, pageProps }) {
  console.log('now what?');

  return <Component {...pageProps} />
}

export default MyApp