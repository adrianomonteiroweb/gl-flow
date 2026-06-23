import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { getAWSCredentials } from './credentials';

const lambda = new LambdaClient(getAWSCredentials());

export class Lambda {
  static async run(name: string, payload: any, options: any = {}) {
    const params = {
      FunctionName: name,
      Payload: payload && JSON.stringify(payload),
      LogType: 'Tail',
      InvocationType: 'Event',
      ...options,
    };

    const invoke_command = new InvokeCommand(params);
    return await lambda.send(invoke_command);
  }
}

export default Lambda;
