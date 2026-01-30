/**
 * Backfill billing records for existing users.
 *
 * Creates a Stripe Customer + local Subscription (FREE plan) for every user
 * that does not yet have a subscription record.
 *
 * Usage:
 *   npx ts-node scripts/backfill-billing.ts
 *
 * Requires: DATABASE_URL, STRIPE_SECRET_KEY in environment
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const prisma = new PrismaClient();
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is required');
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });

  try {
    // Find users without a subscription record
    const usersWithoutBilling = await prisma.user.findMany({
      where: {
        subscription: null,
        deletedAt: null,
      },
      select: { id: true, email: true },
    });

    console.log(`Found ${usersWithoutBilling.length} users without billing records`);

    if (DRY_RUN) {
      console.log('DRY RUN — no changes will be made');
      for (const user of usersWithoutBilling) {
        console.log(`  Would create billing for: ${user.email} (${user.id})`);
      }
      return;
    }

    let created = 0;
    let errors = 0;

    for (const user of usersWithoutBilling) {
      try {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });

        // Create local subscription record
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId: customer.id,
            plan: 'FREE',
            status: 'ACTIVE',
          },
        });

        created++;
        console.log(`  Created billing for ${user.email} → ${customer.id}`);
      } catch (error) {
        errors++;
        console.error(`  Failed for ${user.email}: ${error}`);
      }
    }

    console.log(`\nDone: ${created} created, ${errors} errors`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
