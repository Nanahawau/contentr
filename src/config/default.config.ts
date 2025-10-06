import * as process from 'node:process';
import { registerAs } from '@nestjs/config';

export default registerAs('defaultConfig', () => ({
  port: parseInt(process.env.PORT || '') || 3000,
  openAIKey: process.env.OPEN_AI_KEY || '',
  openAITranscriptionModel: process.env.OPEN_AI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe',
  openAIContentGenerationModel: process.env.OPEN_AI_CONTENT_GENERATION_MODEL || '',
  uploadQueue: process.env.UPLOAD_QUEUE || 'uploadQueue',
  transcriptionQueue: process.env.TRANSCRIPTION_QUEUE || 'transcriptionQueue',
  llmQueue: process.env.LLM_QUEUE || 'llmQueue',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '') || 6379,
  removeOnCompleteValue:
    process.env.REMOVE_ON_COMPLETE_VALUE === 'true' || true,
  removeOnFailCount: parseInt(process.env.REMOVE_ON_FAIL_COUNT || '') || 2,
  flowProducerName: process.env.FLOW_PRODUCER_NAME || 'contentrFlowProducer',
  backOffType: process.env.BACKOFF_TYPE || 'exponential',
  backOffDelay: parseInt(process.env.BACKOFF_DELAY || '') || 5000,
  queueFailureAttempts: parseInt(process.env.QUEUE_FAILURE_ATTEMPTS || '') || 3,
}));
