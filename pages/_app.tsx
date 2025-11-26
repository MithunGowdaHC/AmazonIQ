import '../styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import { AuthProvider } from '../services/authContext';
import { Layout } from '../components/Layout';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Pages that should NOT have the sidebar layout
  const pagesWithoutLayout = ['/'];
  const shouldUseLayout = !pagesWithoutLayout.includes(router.pathname);

  return (
    <AuthProvider>
      {shouldUseLayout ? (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      ) : (
        <Component {...pageProps} />
      )}
    </AuthProvider>
  );
}
