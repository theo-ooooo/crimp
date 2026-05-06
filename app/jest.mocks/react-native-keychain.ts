const values = new Map<string, string>();

export const ACCESSIBLE = {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
};

export async function getGenericPassword(options?: { service?: string }) {
  const service = options?.service ?? '__default__';
  const password = values.get(service);
  if (!password) {
    return false;
  }
  return {
    username: 'crimp-token',
    password,
    service,
  };
}

export async function setGenericPassword(
  _username: string,
  password: string,
  options?: { service?: string },
) {
  const service = options?.service ?? '__default__';
  values.set(service, password);
  return true;
}

export async function resetGenericPassword(options?: { service?: string }) {
  const service = options?.service ?? '__default__';
  values.delete(service);
  return true;
}

export function __resetKeychainMock() {
  values.clear();
}
