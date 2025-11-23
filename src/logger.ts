import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
 
// Create a Winston logger
const logger = winston.createLogger({
level: 'info', // Set the desired log level
format: winston.format.json(),
defaultMeta: { service: 'express-app' }, // Customize as needed
transports: [
// Output logs to the console for local development
    new winston.transports.Console(),
 
// Send logs to CloudWatch Logs
    new WinstonCloudWatch({
        logGroupName: 'server-logs',
        logStreamName: 'server-logs',
        awsRegion: 'us-east-1', // Shouldn't have to replace this
        jsonMessage: true, // Ensure logs are formatted as JSON
    }),
],
});
 
export default logger;