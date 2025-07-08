import { Kafka, Producer, Consumer, KafkaConfig } from 'kafkajs';
import { logger } from '../utils/logger';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

const kafkaConfig: KafkaConfig = {
  clientId: 'incident-response-api',
  brokers: (process.env['KAFKA_BROKERS'] ? process.env['KAFKA_BROKERS'].split(',') : ['localhost:9092']),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
  connectionTimeout: 3000,
  authenticationTimeout: 3000,
};

export const connectKafka = async (): Promise<void> => {
  try {
    kafka = new Kafka(kafkaConfig);
    
    // Initialize producer
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    
    // Initialize consumer
    consumer = kafka.consumer({
      groupId: 'incident-response-api-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    
    await producer.connect();
    await consumer.connect();
    
    logger.info('Kafka connection established successfully');
  } catch (error) {
    logger.error('Kafka connection failed:', error);
    throw error;
  }
};

export const getProducer = (): Producer => {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call connectKafka() first.');
  }
  return producer;
};

export const getConsumer = (): Consumer => {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized. Call connectKafka() first.');
  }
  return consumer;
};

export const getKafka = (): Kafka => {
  if (!kafka) {
    throw new Error('Kafka not initialized. Call connectKafka() first.');
  }
  return kafka;
};

export const closeKafka = async (): Promise<void> => {
  try {
    if (producer) {
      await producer.disconnect();
    }
    if (consumer) {
      await consumer.disconnect();
    }
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error closing Kafka connections:', error);
  }
};

// Helper function to send messages to Kafka
export const sendKafkaMessage = async (
  topic: string,
  message: any,
  key?: string
): Promise<void> => {
  try {
    const kafkaProducer = getProducer();
    await kafkaProducer.send({
      topic,
      messages: [
        {
          key: key || 'default',
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.debug(`Message sent to Kafka topic: ${topic}`);
  } catch (error) {
    logger.error(`Failed to send message to Kafka topic ${topic}:`, error);
    throw error;
  }
}; 