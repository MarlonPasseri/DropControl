import { SalesChannelProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getTikTokConnectionByUser(userId: string) {
  return prisma.salesChannelConnection.findFirst({
    where: {
      userId,
      provider: SalesChannelProvider.TIKTOK_SHOP,
    },
    include: {
      _count: {
        select: {
          productLinks: true,
          orderLinks: true,
        },
      },
      syncRuns: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
    },
  });
}
