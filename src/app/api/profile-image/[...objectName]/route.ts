import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCloudProfileImage } from "@/lib/profile-images";

type RouteContext = {
  params: Promise<{
    objectName: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { objectName } = await context.params;
  const image = await getCloudProfileImage(objectName.join("/"));

  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": image.cacheControl,
    },
  });
}
