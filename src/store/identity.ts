import AsyncStorage from '@react-native-async-storage/async-storage';

// Anonymous, account-free identity: a stable per-device id + a chosen display
// name. Used to key ELO ratings without a login system.

const ID_KEY = 'debateai:deviceId';
const NAME_KEY = 'debateai:displayName';

let cachedId = '';
let cachedName = '';

function genId(): string {
  return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function initIdentity(): Promise<{ id: string; name: string }> {
  let id = await AsyncStorage.getItem(ID_KEY);
  if (!id) {
    id = genId();
    await AsyncStorage.setItem(ID_KEY, id);
  }
  cachedId = id;
  cachedName = (await AsyncStorage.getItem(NAME_KEY)) ?? '';
  return { id, name: cachedName };
}

export function getDeviceId(): string {
  return cachedId;
}

export function getDisplayName(): string {
  return cachedName;
}

export async function setDisplayName(name: string): Promise<void> {
  cachedName = name.trim().slice(0, 24);
  await AsyncStorage.setItem(NAME_KEY, cachedName);
}
