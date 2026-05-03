import { Redirect } from 'expo-router';

// Always show the splash screen first — it handles auth redirect
export default function Index() {
  return <Redirect href="/splash" />;
}

