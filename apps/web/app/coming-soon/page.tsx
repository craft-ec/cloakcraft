'use client';

import { Shield } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20 backdrop-blur-sm">
            <Shield className="w-16 h-16 text-purple-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            CLOAKCRAFT
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-gray-400 mb-12">
          Private DeFi on Solana
        </p>

        {/* Coming Soon */}
        <div className="mb-12">
          <span className="inline-block px-6 py-3 text-2xl md:text-3xl font-semibold text-white border border-purple-500/30 rounded-full bg-purple-500/10 backdrop-blur-sm">
            Coming Soon
          </span>
        </div>

        {/* Demo CTA */}
        <div className="space-y-4">
          <p className="text-gray-500 text-sm uppercase tracking-wider">
            Currently available on devnet
          </p>
          <a
            href="https://demo.cloak.craft.ec"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
          >
            Try the demo on devnet
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>

        {/* Footer */}
        <div className="mt-20 text-gray-600 text-sm">
          <p>Powered by Light Protocol & ZK Compression</p>
        </div>
      </div>

      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
}
