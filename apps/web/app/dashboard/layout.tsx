'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/conditions', label: 'Conditions', exact: false },
  { href: '/dashboard/medications', label: 'Medications', exact: false },
  { href: '/dashboard/labs', label: 'Labs & Vitals', exact: false },
  { href: '/dashboard/visits', label: 'Visits', exact: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'border-b-2 px-3 py-2 text-sm transition-colors',
              isActive(t)
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
