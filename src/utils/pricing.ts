/**
 * Pricing and token package definitions
 */

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  popular?: boolean;
  description: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 10000,
    price: 4.99,
    description: 'Perfect for trying out AI Mastermind',
  },
  {
    id: 'standard',
    name: 'Standard Pack',
    tokens: 50000,
    price: 19.99,
    popular: true,
    description: 'Best value for regular users',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    tokens: 150000,
    price: 49.99,
    description: 'For power users',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    tokens: 500000,
    price: 149.99,
    description: 'Unlimited possibilities',
  },
];

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  tokenAllowance: number;
  cloudSync: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      '1,000 tokens/month',
      'Basic widgets',
      'Local storage only',
      'Community support',
    ],
    tokenAllowance: 1000,
    cloudSync: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    interval: 'month',
    features: [
      '50,000 tokens/month',
      'Advanced widgets',
      'Cloud sync',
      'Priority support',
      'Custom themes',
    ],
    tokenAllowance: 50000,
    cloudSync: true,
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 99.99,
    interval: 'year',
    features: [
      '600,000 tokens/year',
      'Advanced widgets',
      'Cloud sync',
      'Priority support',
      'Custom themes',
      '2 months free',
    ],
    tokenAllowance: 600000,
    cloudSync: true,
  },
];

export class PricingService {
  static getPackageById(id: string): TokenPackage | undefined {
    return TOKEN_PACKAGES.find(pkg => pkg.id === id);
  }

  static getTierById(id: string): PricingTier | undefined {
    return PRICING_TIERS.find(tier => tier.id === id);
  }

  static calculateDiscount(originalPrice: number, discountedPrice: number): number {
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  }
}
