import {
  CognitoIdentityProviderClient,
  ListUserPoolsCommand,
  ListUserPoolClientsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';

const useMockCognito = process.env.NODE_ENV === 'test' || process.env.USE_MOCK_COGNITO === 'true';
const endpoint = process.env.COGNITO_ENDPOINT || 'http://localhost:4566';
const region = process.env.AWS_REGION || 'us-east-1';

let cognitoClient: any;

if (useMockCognito) {
  cognitoClient = {
    send: async (command: any) => {
      const commandName = command.constructor.name;
      if (commandName === 'ListUserPoolsCommand') {
        return { UserPools: [{ Name: 'lms-user-pool', Id: 'us-east-1_mockpool' }] };
      }
      if (commandName === 'ListUserPoolClientsCommand') {
        return { UserPoolClients: [{ ClientName: 'lms-user-client', ClientId: 'mockclientid123' }] };
      }
      if (commandName === 'SignUpCommand') {
        return { UserSub: 'mock-sub-12345' };
      }
      if (commandName === 'AdminConfirmSignUpCommand') {
        return {};
      }
      if (commandName === 'InitiateAuthCommand') {
        const mockAccessToken = jwt.sign(
          {
            sub: 'mock-sub-12345',
            email: command.input.AuthParameters.USERNAME,
            name: 'Mock User',
            userId: 'mock-user-id',
          },
          process.env.JWT_SECRET || 'supersecretjwtkey123!',
          { expiresIn: '1h' }
        );
        return {
          AuthenticationResult: {
            AccessToken: mockAccessToken,
            RefreshToken: 'mock-refresh-token',
            IdToken: mockAccessToken,
            ExpiresIn: 3600,
          },
        };
      }
      return {};
    },
  };
} else {
  cognitoClient = new CognitoIdentityProviderClient({
    endpoint,
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
    },
  });
}

let cachedUserPoolId: string | null = null;
let cachedClientId: string | null = null;

export async function getCognitoParams(): Promise<{ userPoolId: string; clientId: string }> {
  if (useMockCognito) {
    return { userPoolId: 'us-east-1_mockpool', clientId: 'mockclientid123' };
  }
  if (cachedUserPoolId && cachedClientId) {
    return { userPoolId: cachedUserPoolId, clientId: cachedClientId };
  }

  try {
    const listPoolsRes = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 60 }));
    const pools = listPoolsRes.UserPools || [];
    const targetPool = pools.find((p: any) => p.Name === 'lms-user-pool');

    if (!targetPool) throw new Error("UserPool 'lms-user-pool' not found in LocalStack.");
    cachedUserPoolId = targetPool.Id;

    const listClientsRes = await cognitoClient.send(
      new ListUserPoolClientsCommand({ UserPoolId: cachedUserPoolId!, MaxResults: 60 })
    );
    const clients = listClientsRes.UserPoolClients || [];
    const targetClient = clients.find((c: any) => c.ClientName === 'lms-user-client');

    if (!targetClient) throw new Error("UserPoolClient 'lms-user-client' not found in LocalStack.");
    cachedClientId = targetClient.ClientId;

    return { userPoolId: cachedUserPoolId!, clientId: cachedClientId! };
  } catch (error) {
    console.error('Error retrieving Cognito Pool/Client IDs:', error);
    throw error;
  }
}

export { cognitoClient };
