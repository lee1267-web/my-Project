// 검색어의 나머지 단어는 받아온 결과에서 다시 거르기 때문에, 한 페이지가 통째로 걸러질 수 있습니다.
// 그러면 결과가 뒤에 있는데도 "없어요"가 보이므로, 원하는 개수가 찰 때까지 다음 페이지를 더 가져옵니다.
// fetchPage(cursor) → { items, cursor, hasMore },  keep(item) → 남길지 여부
export async function collectPages(fetchPage, keep, { want = 12, maxPages = 5, cursor = null } = {}) {
  const items = [];
  let next = cursor;
  let hasMore = true;
  for (let page = 0; page < maxPages && hasMore && items.length < want; page++) {
    const res = await fetchPage(next);
    items.push(...res.items.filter(keep));
    next = res.cursor;
    hasMore = res.hasMore;
  }
  return { items, cursor: next, hasMore };
}
