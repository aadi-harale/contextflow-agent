import './globals.css';
import './extra.css';

export const metadata = {
  title: 'ContextFlow',
  description: 'Privacy-preserving reimbursement agent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
