// (PR-F1) jest 환경 stub. 입력 URI 를 그대로 돌려줘 압축이 일어나지 않은 셈으로 친다.
export const Video = {
  compress: async (uri: string) => uri,
};
export const Image = {
  compress: async (uri: string) => uri,
};
export const getFileSize = async () => 0;
