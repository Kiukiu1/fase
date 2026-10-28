export const PAGE_SIZE = 20;

export const offsetOf = (page: number, pageSize = PAGE_SIZE) =>
  (page - 1) * pageSize;

export const likeOf = (keyword: string) =>
  `%${keyword.replace(/[\\%_]/g, (char) => '\\' + char)}%`;
