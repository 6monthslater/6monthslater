export const parsePagination = (
  request: Request
): { page: number; pageSize: number } => {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);

  const page = parseInt(search.get("page") ?? "1", 10);
  const pageSize = parseInt(search.get("pageSize") ?? "10", 10);

  return { page, pageSize };
};
