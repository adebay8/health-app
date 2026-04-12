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
    <div className="flex flex-col gap-8">
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border/50 pb-px">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm transition-colors',
              isActive(t)
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
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
