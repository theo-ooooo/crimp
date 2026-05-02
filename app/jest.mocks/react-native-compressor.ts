// (PR-F1, PR #116 리뷰 I3) jest 환경 stub. 실코드는 Video.compress + getFileSize 만
// 사용 — 다른 export 는 누락. 라이브러리가 실제 노출하는 다른 surface 가 필요해지면
// 그때 추가.
export const Video = {
  compress: async (uri: string) => uri,
};
// 실코드와 일관성 위해 string 반환 (실제 라이브러리 contract 와 동일).
export const getFileSize = async () => '0';
