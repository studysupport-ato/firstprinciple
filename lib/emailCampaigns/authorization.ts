export async function isEmailAdminAuthorized(
  requireAdmin: () => Promise<unknown>,
  isUnauthorized: (error: unknown) => boolean,
  reportAuthorizationError: () => void,
): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (error) {
    if (!isUnauthorized(error)) reportAuthorizationError();
    return false;
  }
}
