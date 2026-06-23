export function getAWSCredentials() {
  const useENVCredentials = !!process.env.AWS_ACCESS_KEY! || !!process.env.AMPLIFY_AWS_ACCESS_KEY!;

  if (useENVCredentials) {
    return {
      region: 'us-east-1',
      credentials: {
        accessKeyId: (process.env.AWS_ACCESS_KEY as string) || (process.env.AMPLIFY_AWS_ACCESS_KEY as string),
        secretAccessKey: (process.env.AWS_SECRET_KEY as string) || (process.env.AMPLIFY_AWS_SECRET_KEY as string),
      },
    };
  }

  return {
    region: 'us-east-1',
  };
}

export default getAWSCredentials;
