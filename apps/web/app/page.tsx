'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NETWORK } from '@/lib/constants';
import { DevnetWarningBanner } from '@/components/devnet-warning-banner';

export default function LandingPage() {
  const { connected } = useWallet();
  const router = useRouter();

  // Redirect to dashboard when wallet is connected
  useEffect(() => {
    if (connected) {
      router.push('/dashboard');
    }
  }, [connected, router]);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Devnet Warning */}
      <DevnetWarningBanner />

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <span className="text-lg font-semibold">CloakCraft</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={NETWORK === 'devnet' ? 'secondary' : 'default'}>
              {NETWORK}
            </Badge>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Lock className="h-12 w-12" />
            </div>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Private Tokens on Solana
          </h1>

          <p className="mb-8 text-lg text-muted-foreground">
            Shield your tokens for privacy. Transfer without revealing your identity.
            Unshield when you need to spend publicly.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <WalletMultiButton />
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid max-w-4xl gap-8 px-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Shield"
            description="Deposit tokens into the privacy pool. Your balance becomes private."
          />
          <FeatureCard
            icon={<ArrowRight className="h-6 w-6" />}
            title="Transfer"
            description="Send tokens privately. Recipients are protected by stealth addresses."
          />
          <FeatureCard
            icon={<Lock className="h-6 w-6" />}
            title="Unshield"
            description="Withdraw to any public wallet. Break the link to your private balance."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built on Solana with Zero-Knowledge Proofs</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
