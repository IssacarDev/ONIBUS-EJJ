import type { Metadata } from 'next';
import './globals.css';
import './login.css';

export const metadata: Metadata = { title: 'EJJ | Fretamentos', description: 'Central de orçamentos de ônibus' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
