// Mock ioredis before importing redis module
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      on: jest.fn(),
    };
  });
});

let getCache, setCache, deleteCache, mockRedis;

describe('Redis Cache', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379';
    // Require the module AFTER setting REDIS_URL so it initializes
    const redisModule = require('./redis');
    getCache = redisModule.getCache;
    setCache = redisModule.setCache;
    deleteCache = redisModule.deleteCache;
    mockRedis = redisModule.default;
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it('sets cache properly', async () => {
    mockRedis.set.mockResolvedValue('OK');
    await setCache('test:key', { foo: 'bar' }, 300);
    expect(mockRedis.set).toHaveBeenCalledWith('test:key', JSON.stringify({ foo: 'bar' }), 'EX', 300);
  });

  it('gets cache properly', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ baz: 'qux' }));
    const result = await getCache('test:key');
    expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    expect(result).toEqual({ baz: 'qux' });
  });

  it('returns null if cache misses', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await getCache('test:key');
    expect(result).toBeNull();
  });

  it('deletes cache properly', async () => {
    mockRedis.del.mockResolvedValue(1);
    await deleteCache('test:key');
    expect(mockRedis.del).toHaveBeenCalledWith('test:key');
  });
});
