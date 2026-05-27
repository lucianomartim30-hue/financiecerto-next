'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

const NO_FOOTER_PATHS = ['/imoveis'];

export default function FooterWrapper() {
  const pathname = usePathname();
  if (NO_FOOTER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  return <Footer />;
}
