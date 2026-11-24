// import { awsSecrets } from 'node-env-resolver-aws';
import { dotenv } from 'node-env-resolver/resolvers';
import { memoisedFunctions } from './envResolver';

// Mock dependencies
jest.mock('node-env-resolver/resolvers', () => ({
  dotenv: jest.fn(() => ({
    load: jest.fn(),
    name: 'dotenv',
  })),
  processEnv: jest.fn(() => ({
    load: jest.fn(),
    name: 'processEnv',
  })),
}));
jest.mock('node-env-resolver-aws', () => ({
  awsSecrets: jest.fn(() => ({
    load: jest.fn(),
    name: 'awsSecrets',
  })),
}));

describe.skip('envResolver', () => {
  // const mockAwsSecrets = awsSecrets({secretId: 'test-secret-id'}).load as jest.Mock;
  // const mockProcessEnv = processEnv().load as jest.Mock;
  const mockDotenv = dotenv().load as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnvVar', () => {
    it('should test correctly', async () => {
      // When 
      const value = {
        DB_NAME: 'test-value',
        DB_USER: 'test-user'
      }
      mockDotenv.mockResolvedValue(value);

      // Then
      const result = await memoisedFunctions.memoisedGetEnvVar('mongo');
      
      // Expect
      expect(result).toEqual(value);
    });
  });
});


  // describe('memoisedFunctions', () => {
  //   describe('memoisedGetEnvVar', () => {
  //     it('should retrieve and cache the value', async () => {
  //       const mockResult = { DB_NAME: 'test-db' };
  //       mockResolveAsync.mockResolvedValue(mockResult);

  //       // First call
  //       const result1 = await memoisedFunctions.memoisedGetEnvVar('mongo' as any);
  //       expect(result1).toEqual(mockResult);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(1);

  //       // Second call (should be cached)
  //       const result2 = await memoisedFunctions.memoisedGetEnvVar('mongo' as any);
  //       expect(result2).toEqual(mockResult);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(1); // Still 1
  //     });
      
  //     it('should expire cache after TTL (15 mins)', async () => {
  //       jest.useFakeTimers();
  //       const mockResult = { DB_NAME: 'test-db' };
  //       mockResolveAsync.mockResolvedValue(mockResult);

  //       await memoisedFunctions.memoisedGetEnvVar('mongo' as any);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(1);

  //       // Advance time past 15 minutes
  //       jest.advanceTimersByTime(15 * 60 * 1000 + 1);

  //       await memoisedFunctions.memoisedGetEnvVar('mongo' as any);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(2);
        
  //       jest.useRealTimers();
  //     });
  //   });

  //   describe('memoisedGetEnvVarWithConfig', () => {
  //      it('should retrieve and cache the value with config', async () => {
  //       const mockResult = { someKey: 'test-value' };
  //       mockResolveAsync.mockResolvedValue(mockResult);
  //       const config = { someKey:  string() };

  //       // First call
  //       const result1 = await memoisedFunctions.memoisedGetEnvVarWithConfig('custom-key', config);
  //       expect(result1).toEqual(mockResult);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(1);

  //       // Second call
  //       const result2 = await memoisedFunctions.memoisedGetEnvVarWithConfig('custom-key', config);
  //       expect(result2).toEqual(mockResult);
  //       expect(mockResolveAsync).toHaveBeenCalledTimes(1);
  //     });
  //   });
  // });