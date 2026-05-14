import { prisma } from '../../infra/prisma/client.js';

function pad(num, size = 4) {
  return String(num).padStart(size, '0');
}

/**
 * Atomic sequence generator per school + key + year using Counter table.
 * Example output: ADM-2026-0001
 */
export async function nextSequence({ schoolId, key, prefix, year = new Date().getFullYear(), size = 4 }) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.counter.findUnique({
      where: { schoolId_key_year: { schoolId, key, year } },
    });

    if (!existing) {
      const created = await tx.counter.create({
        data: { schoolId, key, year, lastNumber: 1 },
      });
      return created.lastNumber;
    }

    const updated = await tx.counter.update({
      where: { id: existing.id },
      data: { lastNumber: { increment: 1 } },
    });
    return updated.lastNumber;
  });

  return `${prefix}-${year}-${pad(result, size)}`;
}