const { resolveStudentContact, resolveUserContact } = require('../src/directory/directoryClient');

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('resolveStudentContact', () => {
  test('interroge registration-service et retourne email/telephone du parent', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'parent@example.cm', phone: '+237600000000' }),
    });

    const contact = await resolveStudentContact('STU-1');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/registrations/STU-1'));
    expect(contact).toEqual({ email: 'parent@example.cm', phone: '+237600000000' });
  });

  test('leve une erreur si registration-service repond en echec', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(resolveStudentContact('STU-inconnu')).rejects.toThrow('404');
  });
});

describe('resolveUserContact', () => {
  test('interroge auth-service et retourne l email du compte', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'user@example.cm' }),
    });

    const contact = await resolveUserContact('user-1');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/users/user-1'));
    expect(contact).toEqual({ email: 'user@example.cm', phone: null });
  });

  test('leve une erreur si auth-service repond en echec', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(resolveUserContact('user-inconnu')).rejects.toThrow('500');
  });
});
