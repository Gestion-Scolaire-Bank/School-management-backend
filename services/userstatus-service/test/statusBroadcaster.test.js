const { registerClient, broadcast } = require('../src/realtime/statusBroadcaster');

function createFakeSocket(readyState = 1) {
  return {
    readyState,
    OPEN: 1,
    send: jest.fn(),
    on: jest.fn(),
  };
}

test('diffuse un message a tous les clients ouverts', () => {
  const client = createFakeSocket();
  registerClient(client);

  broadcast({ userId: 'user-1', statusType: 'MALADE' });

  expect(client.send).toHaveBeenCalledWith(JSON.stringify({ userId: 'user-1', statusType: 'MALADE' }));
});

test('ignore les clients qui ne sont pas ouverts (readyState != OPEN)', () => {
  const closedClient = createFakeSocket(3);
  registerClient(closedClient);

  broadcast({ test: true });

  expect(closedClient.send).not.toHaveBeenCalled();
});

test('retire un client de la diffusion a sa fermeture', () => {
  const client = createFakeSocket();
  let closeHandler;
  client.on = jest.fn((event, handler) => {
    if (event === 'close') {
      closeHandler = handler;
    }
  });

  registerClient(client);
  closeHandler();

  broadcast({ test: true });

  expect(client.send).not.toHaveBeenCalled();
});
