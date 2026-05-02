// (PR-F3 follow-up) jest 환경에서 native module 부재 시 require 가 throw 하므로 stub.
// 테스트는 비디오 재생 자체를 검증하지 않으므로 빈 컴포넌트로 대체.
import * as React from 'react';

const Video: React.FC<unknown> = () => null;
export default Video;
