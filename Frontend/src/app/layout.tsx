import { NotificationHandler } from '@/components/NotificationHandler';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NotificationHandler />
          <Toaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 