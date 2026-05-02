import { toUserMessage } from './errorMessage';
import { ApiError } from './errors';

describe('toUserMessage', () => {
  it('maps duplicate nickname errors to a specific profile save message', () => {
    const err = new ApiError(409, {
      code: 'NICKNAME_TAKEN',
      message: 'Nickname already taken',
    });

    expect(toUserMessage(err)).toBe(
      '이미 사용 중인 닉네임이라 저장하지 못했어요.',
    );
  });
});
