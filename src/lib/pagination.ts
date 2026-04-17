export const DEFAULT_PAGE_SIZE = 8;

export function parsePageParam(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const startOffset = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startOffset, startOffset + pageSize),
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}
