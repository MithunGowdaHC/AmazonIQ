declare module 'next/router' {
  export function useRouter(): any;
  const router: any;
  export default router;
}

declare module 'next/link' {
  import * as React from 'react';
  const Link: React.ComponentType<any>;
  export default Link;
}
