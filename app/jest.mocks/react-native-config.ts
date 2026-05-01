// (PR-A1) jest 환경에서 react-native-config 의 native bridge 가 없으니 빈 객체로 대체.
// 테스트가 특정 env 값을 요구하면 spec 안에서 jest.mock(...) 으로 덮어쓰면 된다.
export default {} as Record<string, string | undefined>;
