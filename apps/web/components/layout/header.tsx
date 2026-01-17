'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, ArrowRightLeft, ArrowDownUp } from 'lucide-react';
import { WalletButton } from '@/components/wallet/wallet-button';
import { StealthWalletButton } from '@/components/wallet/stealth-wallet-button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NETWORK } from '@/lib/constants';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transfer', label: 'Transfer', icon: ArrowRightLeft },
  { href: '/swap', label: 'Swap', icon: ArrowDownUp },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-8">
          <Shield className="h-6 w-6" />
          <span className="font-semibold">CloakCraft</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <Badge variant={NETWORK === 'devnet' ? 'secondary' : 'default'} className="hidden sm:flex">
            {NETWORK}
          </Badge>
          <StealthWalletButton />
          <WalletButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-t overflow-x-auto">
        <div className="flex items-center gap-1 px-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
