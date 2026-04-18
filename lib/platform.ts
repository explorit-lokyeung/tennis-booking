export const PLATFORM_ADMIN_USER_ID = 'c87080df-1e1f-4765-a9f5-af832156e87a';

export function isPlatformAdmin(userId: string | undefined | null): boolean {
  return !!userId && userId === PLATFORM_ADMIN_USER_ID;
}
