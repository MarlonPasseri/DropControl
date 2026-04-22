import { prisma } from "@/lib/prisma";

export async function getSecurityOverview(userId: string, email: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const securityWhere = {
    OR: [{ userId }, { email }],
  };

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      actorUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
  const securityEvents = await prisma.securityEvent.findMany({
    where: securityWhere,
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
  const auditCount24h = await prisma.auditLog.count({
    where: {
      actorUserId: userId,
      createdAt: {
        gte: since,
      },
    },
  });
  const warningCount24h = await prisma.securityEvent.count({
    where: {
      ...securityWhere,
      severity: {
        in: ["WARN", "ERROR", "CRITICAL"],
      },
      createdAt: {
        gte: since,
      },
    },
  });
  const failedSignIns24h = await prisma.securityEvent.count({
    where: {
      ...securityWhere,
      type: {
        in: ["SIGN_IN_FAILED", "SIGN_IN_RATE_LIMITED"],
      },
      createdAt: {
        gte: since,
      },
    },
  });

  return {
    auditLogs,
    securityEvents,
    auditCount24h,
    warningCount24h,
    failedSignIns24h,
  };
}
